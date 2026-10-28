/**
 * RAG VISUAL — método de generación de invitaciones a partir de una IMAGEN de
 * referencia (rack de fotos).
 *
 * Convivencia con lo existente (REGLA DE ORO):
 *  - El flujo RAG Modular / Agent Orchestrator / generateWithGemini NO se
 *    modifica en nada. Este servicio se usa ÚNICAMENTE cuando el administrador
 *    activa `visual_rack_enabled` y el modelo pasó el test de visión; si algo
 *    falla, /api/generate-html cae al flujo anterior sin interrupción.
 *  - De moduleGeneratorService solo se IMPORTA validateGeneratedModule
 *    (función pura de solo lectura) para reutilizar el mismo gate de calidad.
 *
 * Proveedor de IA configurable:
 *  - 'gemini'  → API key de Google existente (html_google_api_key) + modelo
 *                visual propio (visual_rack_gemini_model).
 *  - 'openai'  → cualquier endpoint compatible OpenAI (Z.AI/GLM, OpenRouter,
 *                etc.): baseUrl + apiKey + model. Debe pasar el TEST DE VISIÓN
 *                (una imagen diminuta conocida) antes de poder guardarse.
 */
import db from './database.js';
import { validateGeneratedModule } from './moduleGeneratorService.js';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { deflateSync } from 'zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const VISUAL_RAG_DIR = join(__dirname, 'storage', 'visual-rag');
export const VISUAL_GENERATIONS_DIR = join(__dirname, 'storage', 'visual-rack-generations');
for (const d of [VISUAL_RAG_DIR, VISUAL_GENERATIONS_DIR]) {
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const CALL_TIMEOUT_MS = 240000;

/* ============================================================
 * Configuración
 * ============================================================ */

export function getVisualConfig() {
  const row = db.prepare('SELECT * FROM admin_config WHERE id = 1').get() || {};
  return {
    enabled: row.visual_rack_enabled === 1,
    provider: row.visual_rack_provider || 'gemini',
    geminiModel: row.visual_rack_gemini_model || 'gemini-3.8-flash',
    openaiBaseUrl: row.visual_rack_openai_base_url || '',
    openaiModel: row.visual_rack_openai_model || '',
    openaiApiKey: row.visual_rack_openai_api_key || '',
    visionVerified: row.visual_rack_vision_verified === 1,
    visionSig: row.visual_rack_vision_sig || '',
    googleApiKey: row.html_google_api_key || ''
  };
}

/**
 * Resuelve el proveedor efectivo. `overrides` trae valores del request
 * (para probar ANTES de guardar); los vacíos caen a los guardados.
 */
export function resolveProviderConfig(overrides = {}) {
  const cfg = getVisualConfig();
  const provider = overrides.provider === 'openai' || overrides.provider === 'gemini'
    ? overrides.provider : cfg.provider;
  if (provider === 'openai') {
    return {
      provider: 'openai',
      baseUrl: (overrides.baseUrl || cfg.openaiBaseUrl || '').trim(),
      apiKey: (overrides.apiKey || cfg.openaiApiKey || '').trim(),
      model: (overrides.model || cfg.openaiModel || '').trim()
    };
  }
  return {
    provider: 'gemini',
    baseUrl: GEMINI_ENDPOINT,
    apiKey: (overrides.apiKey || cfg.googleApiKey || '').trim(),
    model: (overrides.model || cfg.geminiModel || 'gemini-3.8-flash').trim()
  };
}

/** Firma estable de una config de proveedor (para exigir test aprobado). */
export function providerSignature(p) {
  const key4 = (p.apiKey || '').slice(-6);
  return createHash('sha1').update(`${p.provider}|${p.baseUrl}|${p.model}|${key4}`).digest('hex');
}

export function markVisionVerified(sig) {
  db.prepare(`UPDATE admin_config SET visual_rack_vision_sig = ?, visual_rack_vision_verified = 1 WHERE id = 1`).run(sig);
}

export function clearVisionVerified() {
  db.prepare(`UPDATE admin_config SET visual_rack_vision_sig = '', visual_rack_vision_verified = 0 WHERE id = 1`).run();
}

/* ============================================================
 * Llamada de visión unificada (Gemini REST u OpenAI-compatible)
 * ============================================================ */

function normalizeOpenAiUrl(baseUrl) {
  let u = (baseUrl || '').trim().replace(/\/+$/, '');
  if (!u) return '';
  if (/\/chat\/completions$/.test(u)) return u;
  return `${u}/chat/completions`;
}

async function callVisionGemini(p, { system, text, imageB64, mime, temperature, maxTokens }) {
  const url = `${GEMINI_ENDPOINT}/${p.model}:generateContent`;
  const parts = [{ text: `${system}\n\n${text}` }];
  if (imageB64) parts.push({ inline_data: { mime_type: mime || 'image/png', data: imageB64 } });
  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: typeof temperature === 'number' ? temperature : 0.75,
      topP: 0.95,
      maxOutputTokens: maxTokens || 16384
    }
  };
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': p.apiKey },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(CALL_TIMEOUT_MS)
  });
  if (!resp.ok) {
    const errText = (await resp.text()).slice(0, 400);
    throw new Error(`Gemini ${resp.status}: ${errText}`);
  }
  const data = await resp.json();
  const cand = data.candidates?.[0]?.content?.parts || [];
  const textParts = cand.filter((x) => typeof x.text === 'string' && x.thought !== true).map((x) => x.text);
  const out = textParts.join('').trim();
  if (!out) throw new Error('Gemini no devolvió texto (posible bloqueo de seguridad)');
  return out;
}

async function callVisionOpenAi(p, { system, text, imageB64, mime, temperature, maxTokens }) {
  const url = normalizeOpenAiUrl(p.baseUrl);
  if (!url) throw new Error('Falta base URL del proveedor OpenAI-compatible');
  const content = [{ type: 'text', text }];
  if (imageB64) {
    content.push({ type: 'image_url', image_url: { url: `data:${mime || 'image/png'};base64,${imageB64}` } });
  }
  const body = {
    model: p.model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content }
    ],
    temperature: typeof temperature === 'number' ? temperature : 0.75,
    max_tokens: maxTokens || 16384,
    stream: false
  };
  // GLM (Z.AI) y familia: desactivar pensamiento para respuestas directas.
  if (/\/glm\/|glm-/i.test(p.model)) body.thinking = { type: 'disabled' };
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${p.apiKey}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(CALL_TIMEOUT_MS)
  });
  if (!resp.ok) {
    const errText = (await resp.text()).slice(0, 400);
    throw new Error(`Proveedor ${resp.status}: ${errText}`);
  }
  const data = await resp.json();
  const out = (data.choices?.[0]?.message?.content || '').trim();
  if (!out) throw new Error('El proveedor no devolvió texto');
  return out;
}

export async function callVision(providerCfg, opts) {
  if (providerCfg.provider === 'openai') return callVisionOpenAi(providerCfg, opts);
  return callVisionGemini(providerCfg, opts);
}

/* ============================================================
 * Test de visión (imagen diminuta conocida: cuadrado ROJO 32×32)
 * ============================================================ */

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return ~c >>> 0;
}
function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}
/** PNG RGB sólido ROJO de 32×32, construido sin dependencias. */
export function makeRedTestPng() {
  const W = 32, H = 32;
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    const row = y * (1 + W * 3);
    raw[row] = 0; // filtro none
    for (let x = 0; x < W; x++) {
      raw[row + 1 + x * 3] = 220; // R
      raw[row + 2 + x * 3] = 30;  // G
      raw[row + 3 + x * 3] = 38;  // B
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
}

/**
 * Ejecuta el test de visión: envía el cuadrado rojo y exige que el modelo
 * lo identifique. Devuelve {ok, answer, error}. Si ok, marca la firma como
 * verificada en admin_config.
 */
export async function runVisionTest(overrides = {}) {
  const p = resolveProviderConfig(overrides);
  if (!p.model) return { ok: false, error: 'Falta el nombre del modelo' };
  if (!p.apiKey) return { ok: false, error: 'Falta la API key del proveedor' };
  if (p.provider === 'openai' && !p.baseUrl) return { ok: false, error: 'Falta la base URL' };
  try {
    const png = makeRedTestPng();
    const answer = await callVision(p, {
      system: 'Respondes en español, con una sola palabra, sin puntuación.',
      text: '¿De qué color es el cuadrado de esta imagen? Responde únicamente el nombre del color en español.',
      imageB64: png.toString('base64'),
      mime: 'image/png',
      temperature: 0,
      maxTokens: 2000
    });
    const norm = (answer || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const ok = norm.includes('rojo') || norm.includes('red') || norm.includes('roja');
    if (ok) markVisionVerified(providerSignature(p));
    return { ok, answer: (answer || '').slice(0, 120), expected: 'rojo' };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/* ============================================================
 * Biblioteca RAG Visual (imágenes de referencia + análisis IA)
 * ============================================================ */

const EXT_BY_MIME = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

function parseJsonArray(str, fallback = []) {
  try {
    const v = JSON.parse(str);
    return Array.isArray(v) ? v : fallback;
  } catch { return fallback; }
}
function rowToItem(row) {
  if (!row) return null;
  return {
    id: row.id,
    filename: row.filename,
    url: `/storage/visual-rag/${row.filename}`,
    mimeType: row.mime_type,
    descripcion: row.descripcion || '',
    styleName: row.style_name || '',
    tags: parseJsonArray(row.tags),
    palette: parseJsonArray(row.palette),
    eventTypes: parseJsonArray(row.event_types),
    suitable: row.suitable === 1,
    analysisNotes: row.analysis_notes || '',
    analysisSource: row.analysis_source || 'ia',
    isActive: row.is_active === 1,
    createdAt: row.created_at
  };
}

export function listVisualItems({ onlyActive = false, onlySuitable = false } = {}) {
  let rows = db.prepare('SELECT * FROM visual_rag_items ORDER BY id DESC').all();
  if (onlyActive) rows = rows.filter((r) => r.is_active === 1);
  if (onlySuitable) rows = rows.filter((r) => r.suitable === 1);
  return rows.map(rowToItem);
}

const ANALYSIS_SYSTEM = `Eres un director de arte experto en invitaciones digitales (bodas, XV años, bautizos, cumpleaños).
Analizas una IMAGEN de diseño de invitación y respondes SOLO un JSON válido, sin markdown, con esta forma exacta:
{"suitable": true|false, "style_name": "...", "descripcion": "...", "tags": ["..."], "palette": ["#rrggbb"], "event_types": ["..."], "analysis_notes": "..."}
- suitable: true si la imagen sirve como REFERENCIA DE DISEÑO para generar invitaciones (tiene identidad visual clara: paleta, tipografía, composición). false si es una foto casual, un screenshot, un meme, algo ilegible o sin relación.
- style_name: nombre corto del estilo (máx 40 chars, español).
- descripcion: 1-2 frases en español describiendo la estética (paleta, tipografía, ornamentos, disposición).
- tags: 5-10 etiquetas en español, minúsculas (ej: "floral", "dorado", "minimalista", "acuarela").
- palette: 3-6 colores hex dominantes.
- event_types: tipos de evento a los que calza, de: boda, xv, bautizo, cumpleanos, baby-shower, comunion, general.
- analysis_notes: observaciones útiles para replicar el diseño (tipografía script/serif, marcos, texturas).`;

export async function analyzeImage(providerCfg, imageB64, mime) {
  const raw = await callVision(providerCfg, {
    system: ANALYSIS_SYSTEM,
    text: 'Analiza esta imagen de referencia para el RAG Visual y responde solo el JSON.',
    imageB64, mime,
    temperature: 0.2,
    maxTokens: 2000
  });
  const first = raw.indexOf('{');
  const last = raw.lastIndexOf('}');
  if (first === -1 || last <= first) throw new Error('El modelo no devolvió JSON válido');
  const parsed = JSON.parse(raw.slice(first, last + 1));
  return {
    suitable: parsed.suitable !== false,
    style_name: String(parsed.style_name || '').slice(0, 60),
    descripcion: String(parsed.descripcion || '').slice(0, 400),
    tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 12).map(String) : [],
    palette: Array.isArray(parsed.palette) ? parsed.palette.slice(0, 8).map(String) : [],
    event_types: Array.isArray(parsed.event_types) ? parsed.event_types.slice(0, 6).map(String) : [],
    analysis_notes: String(parsed.analysis_notes || '').slice(0, 500)
  };
}

/** Guarda la imagen en disco + fila con análisis IA (o manual si la IA falla). */
export async function createVisualItem({ buffer, mimeType, providerCfg }) {
  const ext = EXT_BY_MIME[mimeType] || 'png';
  const filename = `ref_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  writeFileSync(join(VISUAL_RAG_DIR, filename), buffer);

  let analysis = null;
  let source = 'manual';
  let analysisNotes = '';
  try {
    analysis = await analyzeImage(providerCfg, buffer.toString('base64'), mimeType);
    source = 'ia';
  } catch (e) {
    analysisNotes = `Análisis IA no disponible: ${e.message}`;
  }

  const info = db.prepare(`
    INSERT INTO visual_rag_items (filename, mime_type, descripcion, style_name, tags, palette, event_types, suitable, analysis_notes, analysis_source, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `).run(
    filename, mimeType,
    analysis?.descripcion || '',
    analysis?.style_name || 'Sin analizar',
    JSON.stringify(analysis?.tags || []),
    JSON.stringify(analysis?.palette || []),
    JSON.stringify(analysis?.event_types || []),
    analysis ? (analysis.suitable ? 1 : 0) : 1,
    analysis?.analysis_notes || analysisNotes,
    source
  );
  return rowToItem(db.prepare('SELECT * FROM visual_rag_items WHERE id = ?').get(info.lastInsertRowid));
}

export function updateVisualItem(id, patch = {}) {
  const row = db.prepare('SELECT * FROM visual_rag_items WHERE id = ?').get(id);
  if (!row) return null;
  db.prepare(`
    UPDATE visual_rag_items SET
      descripcion = ?, style_name = ?, tags = ?, palette = ?, event_types = ?,
      suitable = ?, is_active = ?, analysis_notes = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    patch.descripcion ?? row.descripcion,
    patch.styleName ?? row.style_name,
    JSON.stringify(patch.tags ?? parseJsonArray(row.tags)),
    JSON.stringify(patch.palette ?? parseJsonArray(row.palette)),
    JSON.stringify(patch.eventTypes ?? parseJsonArray(row.event_types)),
    (patch.suitable ?? (row.suitable === 1)) ? 1 : 0,
    (patch.isActive ?? (row.is_active === 1)) ? 1 : 0,
    patch.analysisNotes ?? row.analysis_notes,
    id
  );
  return rowToItem(db.prepare('SELECT * FROM visual_rag_items WHERE id = ?').get(id));
}

export function deleteVisualItem(id) {
  const row = db.prepare('SELECT * FROM visual_rag_items WHERE id = ?').get(id);
  if (!row) return false;
  try { unlinkSync(join(VISUAL_RAG_DIR, row.filename)); } catch { /* ya no existe */ }
  db.prepare('DELETE FROM visual_rag_items WHERE id = ?').run(id);
  return true;
}

export function getVisualItemFile(id) {
  const row = db.prepare('SELECT * FROM visual_rag_items WHERE id = ?').get(id);
  if (!row || row.is_active !== 1) return null;
  const p = join(VISUAL_RAG_DIR, row.filename);
  if (!existsSync(p)) return null;
  return { buffer: readFileSync(p), mimeType: row.mime_type, item: rowToItem(row) };
}

/**
 * Resuelve la imagen de referencia para una generación:
 * 1) id elegido por el cliente en el rack visual
 * 2) primera imagen adjunta del cliente (inspiración)
 * 3) una imagen apta al azar de la biblioteca (el flujo nunca se rompe)
 */
export async function resolveVisualReference({ referenceId, attachments }) {
  if (referenceId) {
    const f = getVisualItemFile(Number(referenceId));
    if (f) return { b64: f.buffer.toString('base64'), mime: f.mimeType, kind: 'library', itemId: Number(referenceId) };
  }
  if (Array.isArray(attachments)) {
    for (const a of attachments) {
      const dataUrl = a?.dataUrl || a?.data || '';
      const m = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(String(dataUrl));
      if (m) return { b64: m[2], mime: m[1], kind: 'attachment', itemId: null };
    }
  }
  const pool = listVisualItems({ onlyActive: true, onlySuitable: true });
  if (pool.length > 0) {
    const pick = pool[Math.floor(Math.random() * pool.length)];
    const f = getVisualItemFile(pick.id);
    if (f) return { b64: f.buffer.toString('base64'), mime: f.mimeType, kind: 'library', itemId: pick.id };
  }
  return null;
}

/* ============================================================
 * Generación de la invitación (12 módulos) desde la imagen
 * ============================================================ */

const MODULE_ORDER = [
  'portada', 'padres', 'ubicacion', 'itinerario', 'confirmacion', 'detalles',
  'countdown', 'padrinos', 'corte', 'galeria', 'regalos', 'vestimenta'
];

const MODULE_SPECS = {
  portada: `Módulo PORTADA. data-gemini-id="portada-nombre" (o portada-novia/portada-novio). Requiere: fondo con loremflickr (memory_source="generated") + UNA imagen grande de contenido (<img> con memory_source="library", data-library-category="bodas", data-asset-type="retrato-principal"). Título con el nombre(s) del evento en tipografía protagonista.`,
  padres: `Módulo PADRES. data-gemini-id="padres-padre" (o padres-novia/padres-novio). Requiere: fondo loremflickr + al menos UN <img> de retrato de familia (memory_source="library", data-library-category="bodas", data-asset-type="retrato-familia"). Dos bloques (familia de cada lado) con nombres placeholder.`,
  ubicacion: `Módulo UBICACIÓN. data-gemini-id="ubicacion-ceremonia" (o ubicacion-mapa/ubicacion-recepcion). Requiere OBLIGATORIAMENTE: un iframe de mapa con src="https://www.google.com/maps?q=...&output=embed" + UN <img> del lugar (memory_source="library"). Dirección y hora en <address>/<time>.`,
  itinerario: `Módulo ITINERARIO. data-gemini-id="itinerario-agenda". Requiere fondo loremflickr. 4 hitos con hora (<time>) y descripción, en layout NO lineal (camino, escalonado, círculos...).`,
  confirmacion: `Módulo CONFIRMACIÓN. data-gemini-id="confirmacion-texto". Requiere fondo loremflickr. Dos botones <a> a WhatsApp (confirmar / no podré) + fecha límite.`,
  detalles: `Módulo DETALLES. data-gemini-id="detalles-vestimenta" (o detalles-regalo). Requiere: UN <img> de inspiración (memory_source="library", data-library-category="bodas", data-asset-type="vestimenta") + código de vestimenta + paleta de colores sugerida + datos de mesa de regalos.`,
  countdown: `Módulo COUNTDOWN. data-gemini-id="countdown-<nombre-descriptivo>". Requiere: atributo data-countdown-target="YYYY-MM-DDTHH:MM:SS" en la raíz + 4 elementos con data-countdown-unit="days|hours|minutes|seconds" (texto inicial "--") + un <script> IIFE que: lea data-countdown-target (ignorando valores YYYY), haga fallback a window.__countdownTarget/window.countdown_target, limpie window.__countdownIntervals, actualice cada segundo y exponga window.updateCountdown. Fecha visible en <time>.`,
  padrinos: `Módulo PADRINOS. data-gemini-id="padrinos-<nombre>" (prefijo obligatorio "padrinos-"). Requiere: fondo loremflickr + retratos <img> (memory_source="library", data-library-category="bodas", data-asset-type="retrato-padrino"). Madrina y padrino con nombre placeholder.`,
  corte: `Módulo CORTE (momentos clave). data-gemini-id="corte-<nombre>" (prefijo "corte-"). Requiere fondo loremflickr. 3 momentos (vals/mañanitas o pastel/brindis) con hora <time>.`,
  galeria: `Módulo GALERÍA. data-gemini-id="galeria-<nombre>" (prefijo "galeria-"). Requiere MÍNIMO 4 <img> loremflickr (memory_source="library", data-library-category="bodas", data-asset-type="galeria") + lightbox simple al hacer clic (div fijo + JS).`,
  regalos: `Módulo REGALOS. data-gemini-id="regalos-<nombre>" (prefijo "regalos-"). Requiere fondo loremflickr. Mesa de regalos con enlace + CLABE placeholder + botón WhatsApp.`,
  vestimenta: `Módulo VESTIMENTA. data-gemini-id="vestimenta-<nombre>" (prefijo "vestimenta-"). Requiere fondo loremflickr. Código de vestimenta + paleta de colores (círculos/barras) + lista de tips.`
};

const CONTRACT_RULES = `REGLAS DE CONTRATO (obligatorias, el módulo pasa por un validador estricto):
1. Devuelve EXACTAMENTE un elemento raíz <section class="<prefijo-unico>" data-gemini-id="..." memory_type="background" memory_usage="protected" memory_source="generated" path="placeholder"> ... </section> y NADA más (sin <!DOCTYPE>, sin <html>, sin explicaciones).
2. CSS 100% dentro de un <style> en el módulo, con selectores únicos con tu prefijo. Usa las variables genéricas en :root del section: --primary-color, --secondary-color, --accent-color, --bg-color, --surface-color, --surface-border-color, --text-color (defínelas con la paleta de la imagen de referencia).
3. Todas las imágenes y fondos usan placeholders loremflickr (https://loremflickr.com/W/H/palabras,clave) con path="placeholder". Fondos: background url(loremflickr) en el CSS del raíz. <img> de contenido: memory_type="image" memory_usage="custom" memory_source="library" + path="placeholder" + data-library-category + data-asset-type + alt descriptivo + loading="lazy".
4. Textos editables: envuélvelos en elementos con memory_type="text" memory_usage="custom" (y memory_key descriptivo cuando aplique). Contenido placeholder en ESPAÑOL, genérico (ej: "Nombre Papa & Nombre Mama", "Fecha del evento").
5. Responsive REAL: tamaños con clamp(), layout con grid/flex y al menos un @media (max-width:640px). Animaciones sutiles <=0.5s + @media (prefers-reduced-motion:reduce).
6. Al final, <script>var moduleMetadata = { module_type: '<tipo>', module_name: '<data-gemini-id>', style_name: '<nombre del estilo de la imagen>', descripcion: '<máx 200 chars>', tags: ['<tipo>', ...], tipo: '<tipo>' };</script> con el tipo EXACTO de la lista válida.
7. HTML semántico (<section>, <header>, <figure>, <time>, <address>), autocontenido, sin librerías externas salvo las estrictamente necesarias.`;

const FINGERPRINT_SYSTEM = `Eres un director de arte. Recibes la IMAGEN DE REFERENCIA de un diseño de invitación y respondes SOLO un JSON válido (sin markdown) con esta forma:
{"paleta": ["#rrggbb"], "fondo": "#rrggbb o descripción", "tipografia": {"titulos": "serif|script|sans|display", "cuerpo": "serif|sans", "mood": "..."}, "mood": "2-4 palabras", "ornamentos": ["..."], "layout": "descripción de la composición", "formato": "vertical|tarjeta|papel", "elementos_clave": ["..."]}
Extrae con precisión los colores hex reales de la imagen y los rasgos visuales que hay que replicar.`;

const MODULE_SYSTEM = `Eres un diseñador senior de módulos HTML para invitaciones digitales. Recibirás: (1) una IMAGEN DE REFERENCIA con el diseño a replicar, (2) un fingerprint JSON de ese diseño y (3) el tipo de módulo a crear.

Tu tarea: generar UN módulo HTML que capture la estética EXACTA de la imagen (paleta real, tipografía equivalente con font stacks del sistema o Google-safe, ornamentos CSS/SVG similares, disposición y aire). NO copies textos de la imagen: usa placeholders genéricos en español. Sé atrevido y fino a la vez: el módulo debe verse premium y fiel al estilo.

${CONTRACT_RULES}`;

function extractSectionHtml(raw) {
  let t = String(raw || '').replace(/```html\s*/gi, '').replace(/```/g, '').trim();
  const first = t.search(/<section[\s>]/i);
  const last = t.toLowerCase().lastIndexOf('</section>');
  if (first >= 0 && last > first) {
    t = t.slice(first, last + 10);
  }
  return t.trim();
}

/** Post-proceso: garantiza script de countdown si el modelo lo omitió. */
const COUNTDOWN_SCRIPT = `
<script>
  (function () {
    var el = null;
    try { el = document.currentScript.closest('[data-gemini-id^="countdown"]'); } catch (e) {}
    if (!el) el = document.querySelector('[data-gemini-id^="countdown"]');
    if (!el || el.dataset.cdFixed === '1') return;
    el.dataset.cdFixed = '1';
    var targetAttr = el.getAttribute('data-countdown-target');
    var target = NaN;
    if (targetAttr && targetAttr.indexOf('YYYY') === -1) {
      var parsed = new Date(targetAttr);
      if (!isNaN(parsed.getTime())) target = parsed.getTime();
    }
    if (isNaN(target)) {
      if (window.__countdownTarget) { var _p = new Date(window.__countdownTarget); if (!isNaN(_p.getTime())) target = _p.getTime(); }
      else if (window.countdown_target) { var _p2 = new Date(window.countdown_target); if (!isNaN(_p2.getTime())) target = _p2.getTime(); }
    }
    var intervalId = null;
    (window.__countdownIntervals = window.__countdownIntervals || []).forEach(clearInterval);
    window.__countdownIntervals = [];
    function pad2(n) { return n < 10 ? '0' + n : '' + n; }
    function setUnit(unit, value) { var node = el.querySelector('[data-countdown-unit="' + unit + '"]'); if (node) node.textContent = value; }
    function tick() {
      var diff = target - Date.now();
      if (diff < 0) diff = 0;
      setUnit('days', Math.floor(diff / 86400000));
      setUnit('hours', pad2(Math.floor((diff % 86400000) / 3600000)));
      setUnit('minutes', pad2(Math.floor((diff % 3600000) / 60000)));
      setUnit('seconds', pad2(Math.floor((diff % 60000) / 1000)));
      if (diff === 0 && intervalId !== null) { clearInterval(intervalId); intervalId = null; window.__countdownIntervals = []; }
    }
    function start(newTarget) {
      if (newTarget) target = new Date(newTarget).getTime();
      (window.__countdownIntervals || []).forEach(clearInterval);
      window.__countdownIntervals = [];
      intervalId = null;
      if (!Number.isFinite(target)) return;
      tick();
      if (target > Date.now()) { intervalId = setInterval(tick, 1000); window.__countdownIntervals.push(intervalId); }
    }
    start();
    window.updateCountdown = start;
  })();
</script>`;

function ensureCountdownScript(moduleHtml) {
  if (/data-gemini-id="countdown/i.test(moduleHtml) && !/window\.updateCountdown/.test(moduleHtml)) {
    return moduleHtml.replace(/<\/section>\s*$/i, `${COUNTDOWN_SCRIPT}\n</section>`);
  }
  return moduleHtml;
}

function buildEventContext(editorConfig = {}, prompt = '', hasRsvp) {
  const lines = [];
  if (editorConfig.eventType) lines.push(`- Tipo de evento: ${editorConfig.eventType}`);
  if (editorConfig.theme) lines.push(`- Tema/estilo pedido por el cliente: ${editorConfig.theme}`);
  if (editorConfig.eventDate) lines.push(`- Fecha: ${editorConfig.eventDate}`);
  if (editorConfig.eventTime) lines.push(`- Hora: ${editorConfig.eventTime}`);
  if (editorConfig.eventDetails) lines.push(`- Detalles del cliente: ${String(editorConfig.eventDetails).slice(0, 400)}`);
  if (prompt) lines.push(`- Contexto adicional: ${String(prompt).slice(0, 600)}`);
  if (hasRsvp === false) lines.push('- El plan NO incluye RSVP: el módulo de confirmación pide confirmar por WhatsApp sin formulario.');
  return lines.join('\n');
}

async function generateOneModule(providerCfg, { tipo, spec, fingerprint, reference, context, fonts, attempt, lastErrors }) {
  const retryNote = attempt > 0 && lastErrors?.length
    ? `\n\n⚠️ INTENTO ${attempt + 1}: el intento anterior RECHAZADO por el validador: ${lastErrors.join(' | ')}. Corrige EXACTAMENTE eso sin cambiar la estética.`
    : '';
  const fontNote = fonts?.fontBase
    ? `\n- Tipografías globales del sistema: base="${fonts.fontBase}", títulos="${fonts.fontHeading || fonts.fontBase}". Puedes enlazar esa Google Font en el <style> si calza con el diseño.`
    : '';
  const userText = `IMAGEN DE REFERENCIA (el diseño a replicar):

FINGERPRINT DEL DISEÑO: ${JSON.stringify(fingerprint)}

MÓDULO A GENERAR: ${tipo}
${spec}

CONTEXTO DEL EVENTO:
${context || '- (genérico)'}${fontNote}${retryNote}

Genera ahora el módulo HTML completo (solo el <section>...</section> con su <style>, contenido y scripts).`;

  const raw = await callVision(providerCfg, {
    system: MODULE_SYSTEM,
    text: userText,
    imageB64: reference.b64,
    mime: reference.mime,
    temperature: attempt === 0 ? 0.75 : 0.55,
    maxTokens: 16384
  });
  return extractSectionHtml(raw);
}

function assembleDocument(modulesByTipo, { editorConfig, fonts }) {
  const order = MODULE_ORDER.filter((t) => modulesByTipo[t]);
  const body = order.map((t) => modulesByTipo[t]).join('\n');
  const base = fonts?.fontBase || 'Georgia, serif';
  const heading = fonts?.fontHeading || base;
  const fontLink = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(base).replace(/%20/g, '+')}${heading !== base ? `&family=${encodeURIComponent(heading).replace(/%20/g, '+')}` : ''}:wght@300;400;500;600;700&display=swap`;
  const meta = {
    version: 1,
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    eventType: editorConfig?.eventType || '',
    theme: editorConfig?.theme || '',
    primaryColor: editorConfig?.primaryColor || '#f472b6',
    secondaryColor: editorConfig?.secondaryColor || '#fb7185',
    hiddenModules: [],
    elementStyles: {}
  };
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Invitación</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${fontLink}" rel="stylesheet">
<style>
  :root { --font-base: '${base}'; --font-heading: '${heading}'; }
  html, body { margin: 0; padding: 0; }
  body { font-family: var(--font-base), Georgia, serif; background: #ffffff; }
</style>
</head>
<body>
${body}
<script type="application/json" id="invitation-editor-metadata">${JSON.stringify(meta)}</script>
</body>
</html>`;
}

function archiveGeneration({ userId, editorConfig, providerCfg, reference, modulesReport, html }) {
  const ts = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}`;
  const dirName = `${stamp}_user-${userId || 'anon'}`;
  const dir = join(VISUAL_GENERATIONS_DIR, dirName);
  mkdirSync(dir, { recursive: true });
  const files = [];
  modulesReport.forEach((m, i) => {
    const fname = `${String(i + 1).padStart(2, '0')}-${m.tipo}.html`;
    writeFileSync(join(dir, fname), m.html, 'utf-8');
    files.push({ tipo: m.tipo, file: fname, valid: m.valid, attempts: m.attempts });
  });
  // Copia de la imagen de referencia (para reutilizarla como rack en el futuro).
  let referenceFile = '';
  try {
    const ext = EXT_BY_MIME[reference.mime] || 'png';
    referenceFile = `reference.${ext}`;
    writeFileSync(join(dir, referenceFile), Buffer.from(reference.b64, 'base64'));
  } catch { /* sin referencia */ }
  const manifest = {
    createdAt: ts.toISOString(),
    userId: userId || null,
    eventType: editorConfig?.eventType || '',
    theme: editorConfig?.theme || '',
    provider: providerCfg.provider,
    model: providerCfg.model,
    reference: { kind: reference.kind, itemId: reference.itemId, file: referenceFile },
    modules: files
  };
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');
  writeFileSync(join(dir, 'invitacion-completa.html'), html, 'utf-8');
  return { dir: dirName, manifest };
}

export function listGenerations() {
  if (!existsSync(VISUAL_GENERATIONS_DIR)) return [];
  const out = [];
  for (const name of readdirSync(VISUAL_GENERATIONS_DIR)) {
    const p = join(VISUAL_GENERATIONS_DIR, name);
    try {
      if (!statSync(p).isDirectory()) continue;
      const mf = join(p, 'manifest.json');
      if (!existsSync(mf)) continue;
      const manifest = JSON.parse(readFileSync(mf, 'utf-8'));
      out.push({ dir: name, ...manifest, moduleCount: (manifest.modules || []).length });
    } catch { /* manifest corrupto: ignorar */ }
  }
  return out.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

/** Entradas {filename, content} para zip (reusa el buildZip de index.js). */
export function buildGenerationZipEntries() {
  const entries = [];
  for (const gen of listGenerations()) {
    const dirPath = join(VISUAL_GENERATIONS_DIR, gen.dir);
    for (const f of readdirSync(dirPath)) {
      try {
        if (!statSync(join(dirPath, f)).isFile()) continue;
        entries.push({ filename: `${gen.dir}/${f}`, content: readFileSync(join(dirPath, f), 'utf-8') });
      } catch { /* ignorar */ }
    }
  }
  return entries;
}

/**
 * GENERACIÓN COMPLETA: fingerprint + 12 módulos (validados con el mismo gate
 * del RAG Modular) + ensamblado + archivo por módulo en storage.
 * Lanza error si quedó insalvable; el caller cae al flujo modular existente.
 */
export async function generateVisualInvitation({
  config, editorConfig = {}, prompt = '', reference, userId, hasRsvp
}) {
  const providerCfg = resolveProviderConfig();
  if (providerCfg.provider === 'openai' && !providerCfg.apiKey) {
    throw new Error('RAG Visual: falta API key del proveedor OpenAI-compatible');
  }
  if (!providerCfg.apiKey) throw new Error('RAG Visual: falta API key');
  if (!reference?.b64) throw new Error('RAG Visual: sin imagen de referencia');

  console.log(`🖼️ [VISUAL] Generando desde imagen (${reference.kind}) con ${providerCfg.provider}:${providerCfg.model}`);

  // 1) Fingerprint del diseño.
  const fpRaw = await callVision(providerCfg, {
    system: FINGERPRINT_SYSTEM,
    text: 'Analiza esta invitación de referencia y responde solo el JSON.',
    imageB64: reference.b64,
    mime: reference.mime,
    temperature: 0.2,
    maxTokens: 2000
  });
  let fingerprint = {};
  try {
    const f = fpRaw.indexOf('{'), l = fpRaw.lastIndexOf('}');
    fingerprint = JSON.parse(fpRaw.slice(f, l + 1));
  } catch { fingerprint = { paleta: [], mood: 'según imagen' }; }
  console.log(`🖼️ [VISUAL] Fingerprint: ${JSON.stringify(fingerprint).slice(0, 200)}`);

  // 2) Módulos.
  const fonts = { fontBase: config?.default_font_base, fontHeading: config?.default_font_heading };
  const context = buildEventContext(editorConfig, prompt, hasRsvp);
  const tipos = MODULE_ORDER.filter((t) => !(t === 'confirmacion' && hasRsvp === false));

  const results = new Array(tipos.length).fill(null);
  const CONCURRENCY = 3;
  let cursor = 0;
  async function worker() {
    while (cursor < tipos.length) {
      const idx = cursor++;
      const tipo = tipos[idx];
      let html = '';
      let valid = false;
      let attempts = 0;
      let errors = [];
      for (let a = 0; a < 3 && !valid; a++) {
        attempts = a + 1;
        try {
          html = await generateOneModule(providerCfg, {
            tipo,
            spec: MODULE_SPECS[tipo],
            fingerprint,
            reference,
            context,
            fonts,
            attempt: a,
            lastErrors: errors
          });
          html = ensureCountdownScript(html);
          const check = validateGeneratedModule(html, tipo);
          if (check.valid) valid = true;
          else errors = check.errors || ['inválido'];
        } catch (e) {
          errors = [e.message];
        }
      }
      results[idx] = { tipo, html: valid ? html : '', valid, attempts, errors };
      console.log(`🖼️ [VISUAL] ${tipo}: ${valid ? '✅' : '❌'} (intentos ${attempts})${valid ? '' : ' — ' + errors.join(' | ')}`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const okModules = results.filter((r) => r && r.valid);
  if (okModules.length < Math.min(10, tipos.length)) {
    throw new Error(`RAG Visual: solo ${okModules.length}/${tipos.length} módulos válidos; cayendo al flujo modular`);
  }

  // 3) Ensamblar en orden.
  const modulesByTipo = {};
  for (const r of results) if (r && r.valid) modulesByTipo[r.tipo] = r.html;
  const html = assembleDocument(modulesByTipo, { editorConfig, fonts });

  // 4) Archivo por módulo (referencia futura para el rack modular).
  let archive = null;
  try {
    archive = archiveGeneration({ userId, editorConfig, providerCfg, reference, modulesReport: okModules, html });
    console.log(`🖼️ [VISUAL] Archivo guardado en ${archive.dir}`);
  } catch (e) {
    console.error('⚠️ [VISUAL] No se pudo archivar la generación:', e.message);
  }

  return { html, archive, fingerprint };
}
