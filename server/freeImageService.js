/**
 * ============================================================================
 * PROVEEDORES DE IMÁGENES GRATUITOS — proceso agéntico independiente
 * ============================================================================
 * Alternativa a Nano Banana para resolver las imágenes de una invitación
 * SIN consumir tokens de la API de Gemini Image.
 *
 * PROVEEDORES (todos gratuitos):
 *   - pollinations-flux  : IA generativa (Flux) vía pollinations.ai, SIN API key ← RECOMENDADO
 *   - pollinations-turbo : IA generativa más rápida (turbo), SIN API key
 *   - picsum             : fotografía real curada, determinística por seed, SIN API key
 *   - pexels             : banco de fotos premium (API key gratuita del admin)
 *   - local-stock        : biblioteca local img/ por tipo de evento (cero red)
 *
 * FLUJO (por invitación, cuando free_image_provider != 'none'):
 *   1. La orquestación corre en modo loremflickr → NUNCA llama a Nano Banana.
 *   2. Este servicio extrae todos los slots de imagen (loremflickr / GEMINI_GENERATE).
 *   3. Paso agéntico: UNA llamada al modelo HTML de Gemini redacta prompts
 *      editoriales en inglés, consistentes con el estilo del evento.
 *      (fallback determinístico si no hay key o falla la llamada)
 *   4. Cada slot se resuelve con el proveedor elegido, con caché en disco
 *      (server/storage/free-image-cache) para regeneraciones instantáneas.
 *   5. Las URLs se sustituyen por data URIs → invitación autocontenida.
 *
 * El flujo Nano Banana original (imageToBase64.js + nanoBananaService.js)
 * NO se modifica: con free_image_provider = 'none' este servicio es un no-op.
 * ============================================================================
 */
import db from './database.js';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, 'storage', 'free-image-cache');
const IMG_ROOT = join(__dirname, '..', 'img');

// ---------------------------------------------------------------------------
// Registro de proveedores (fuente de verdad para admin UI y validación)
// ---------------------------------------------------------------------------
export const FREE_IMAGE_PROVIDERS = [
  {
    id: 'pollinations-flux',
    label: 'Pollinations · Flux (IA)',
    desc: 'IA generativa gratuita con prompts del agente Gemini. Sin token: marca de agua pequeña + 1 img/15s; con token gratuito de auth.pollinations.ai: sin marca y 1 img/5s.',
    needsKey: false,
    optionalToken: true
  },
  {
    id: 'pollinations-turbo',
    label: 'Pollinations · Turbo (IA)',
    desc: 'IA gratuita más rápida, calidad menor que Flux. Mismos límites/tokens que Flux.',
    needsKey: false,
    optionalToken: true
  },
  {
    id: 'picsum',
    label: 'Picsum (fotografía real)',
    desc: 'Fotografía real curada de alta calidad, determinística. Sin API key, ~1s por imagen. Ojo: el contenido es aleatorio (no sigue las keywords).',
    needsKey: false
  },
  {
    id: 'pexels',
    label: 'Pexels (banco premium)',
    desc: 'Fotos reales premium SIEMPRE a tema (usa las keywords del agente). Sin marca de agua, ~1s/imagen, 200/hora gratis ≈ 13 invitaciones/hora. El más estable para producción.',
    needsKey: true,
    recommended: true
  },
  {
    id: 'local-stock',
    label: 'Biblioteca local (img/)',
    desc: 'Fotos curadas por tipo de evento en el servidor. Cero red, instantáneo y sin límites.',
    needsKey: false
  }
];
const VALID_PROVIDERS = new Set(['none', ...FREE_IMAGE_PROVIDERS.map((p) => p.id)]);

// ---------------------------------------------------------------------------
// Config (columnas propias free_image_* de admin_config — el flujo Nano
// Banana jamás las lee)
// ---------------------------------------------------------------------------
export function getFreeImageConfig() {
  const row = db
    .prepare('SELECT free_image_provider, free_image_pexels_key, free_image_pollinations_token, free_image_agentic FROM admin_config WHERE id = 1')
    .get() || {};
  return {
    provider: VALID_PROVIDERS.has(row.free_image_provider) ? row.free_image_provider : 'none',
    pexelsKey: (row.free_image_pexels_key || '').trim(),
    pollinationsToken: (row.free_image_pollinations_token || '').trim(),
    agentic: row.free_image_agentic !== 0
  };
}

export function saveFreeImageConfig({ provider, pexels_key, pollinations_token, agentic }) {
  const prov = VALID_PROVIDERS.has(provider) ? provider : 'none';
  const sets = ['free_image_provider = ?', 'free_image_agentic = ?'];
  const params = [prov, agentic === false || agentic === 0 ? 0 : 1];
  // Keys con merge conservador: vacío = conservar la actual.
  if (typeof pexels_key === 'string' && pexels_key.trim() !== '') {
    sets.push('free_image_pexels_key = ?');
    params.push(pexels_key.trim());
  }
  if (typeof pollinations_token === 'string' && pollinations_token.trim() !== '') {
    sets.push('free_image_pollinations_token = ?');
    params.push(pollinations_token.trim());
  }
  db.prepare(`UPDATE admin_config SET ${sets.join(', ')} WHERE id = 1`).run(...params);
  return { provider: prov };
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
const sha1 = (s) => createHash('sha1').update(s).digest('hex');
const intHash = (s) => {
  const h = sha1(s);
  return parseInt(h.slice(0, 8), 16) % 2147483647;
};

async function runWithConcurrency(jobs, limit) {
  const results = new Array(jobs.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, jobs.length)) }, async () => {
    while (next < jobs.length) {
      const i = next++;
      results[i] = await jobs[i]().catch((e) => ({ __error: e.message }));
    }
  });
  await Promise.all(workers);
  return results;
}

async function fetchWithTimeout(url, opts, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Extracción de slots de imagen del HTML final
// ---------------------------------------------------------------------------
const LOREM_URL_RE = /https?:\/\/loremflickr\.com\/(\d+)\/(\d+)\/([a-zA-Z0-9,%\-+.]+)/g;
const GEMGEN_RE = /GEMINI_GENERATE:([^"')\n]{3,200})/g;

export function extractImageSlots(html) {
  const slots = [];
  const seen = new Set();
  let m;
  LOREM_URL_RE.lastIndex = 0;
  while ((m = LOREM_URL_RE.exec(html)) !== null) {
    const url = m[0];
    if (seen.has(url)) continue;
    seen.add(url);
    slots.push({
      url,
      w: Math.min(parseInt(m[1], 10) || 1024, 1600),
      h: Math.min(parseInt(m[2], 10) || 768, 1200),
      keywords: (m[3] || '').split(',').map((k) => decodeURIComponent(k).trim()).filter(Boolean)
    });
  }
  GEMGEN_RE.lastIndex = 0;
  while ((m = GEMGEN_RE.exec(html)) !== null) {
    const token = m[0];
    if (seen.has(token)) continue;
    seen.add(token);
    slots.push({ url: token, w: 1024, h: 768, keywords: [], explicitPrompt: m[1].trim() });
  }
  return slots;
}

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------
const STYLE_TAIL = ', professional editorial photography, complete scene with full background, soft elegant lighting, no text, no words, no watermark, no borders';

export function heuristicPrompt(slot) {
  const kw = (slot.keywords || []).slice(0, 4).join(', ');
  const base = slot.explicitPrompt || kw || 'elegant celebration decoration';
  return `${base}${STYLE_TAIL}`;
}

/**
 * Paso agéntico: usa el modelo HTML de Gemini ya configurado para redactar
 * un prompt editorial en inglés por slot, consistente con el evento y tema.
 * Una sola llamada para toda la invitación. Devuelve null si falla
 * (el llamador cae al prompt heurístico determinístico).
 */
export async function craftPromptsWithGemini(slots, { eventType, theme, geminiKey, geminiModel }) {
  if (!geminiKey || !geminiKey.trim()) return null;
  const model = geminiModel || 'gemini-3.1-pro-preview';
  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text:
              'Eres el director de arte de invitaciones digitales premium. Para CADA slot de imagen (en el mismo orden) ' +
              'escribe UN prompt en inglés para un generador de imágenes fotográficas. Reglas: fotografía editorial ' +
              'elegante, escena completa con fondo (nunca objetos flotantes ni stickers), coherente con el tipo de evento ' +
              'y el tema, sin personas reconocibles ni rostros cerrados salvo que el slot lo pida, sin texto ni marcas de agua. ' +
              `Contexto: tipo de evento "${eventType || 'celebración elegante'}", tema/estilo "${theme || 'clásico elegante'}".\n` +
              `Slots: ${JSON.stringify(slots.map((s, i) => ({ i, keywords: s.keywords, size: `${s.w}x${s.h}` })))}\n` +
              `Responde EXACTAMENTE un array JSON de ${slots.length} strings (los prompts), sin markdown ni explicaciones.`
          }
        ]
      }
    ],
    generationConfig: { temperature: 0.8, maxOutputTokens: 2048 }
  };
  try {
    const res = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey.trim() },
        body: JSON.stringify(payload)
      },
      45000
    );
    if (!res.ok) {
      console.log(`[FREE-IMAGES] Agente Gemini de prompts HTTP ${res.status} — usando prompts heurísticos`);
      return null;
    }
    const data = await res.json();
    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    text = text.replace(/```json|```/g, '').trim();
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start === -1 || end === -1) return null;
    const arr = JSON.parse(text.slice(start, end + 1));
    if (!Array.isArray(arr) || arr.length < slots.length) return null;
    return arr.slice(0, slots.length).map((p) => (typeof p === 'string' && p.trim() ? `${p.trim()}${STYLE_TAIL}` : null));
  } catch (e) {
    console.log(`[FREE-IMAGES] Agente Gemini de prompts falló (${e.message}) — usando prompts heurísticos`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Proveedores: cada uno devuelve { buffer, mime }
// ---------------------------------------------------------------------------
const POLLINATIONS_MODELS = { 'pollinations-flux': 'flux', 'pollinations-turbo': 'turbo' };

// Tier anónimo de pollinations.ai: aguanta ~1 imagen y penaliza las ráfagas
// con HTTP 402 (cuota por ventana, se regenera sola). Con token gratuito de
// auth.pollinations.ai (Seed tier) el límite sube a 1/5s y desaparece la
// marca de agua. Estrategia:
//   - concurrencia 1 + pacing entre requests (5s con token, 15s anónimo)
//   - tras 2 respuestas 402 seguidas se abre el circuit-breaker y los slots
//     restantes caen directo al fallback picsum (la invitación nunca queda
//     sin imágenes).
const pollinationsGate = { nextSlotAt: 0, consecutive402: 0, circuitOpen: false };

async function fetchPollinations(prompt, provider, { w, h, seed, token }) {
  if (pollinationsGate.circuitOpen) {
    const err = new Error('pollinations circuit abierto (cuota agotada)');
    err.circuitOpen = true;
    throw err;
  }
  const intervalMs = token ? 5000 : 15000;
  const wait = pollinationsGate.nextSlotAt - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));

  const model = POLLINATIONS_MODELS[provider] || 'flux';
  const url =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
    `?width=${w}&height=${h}&seed=${seed}&model=${model}&nologo=true&referrer=linksocially`;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const backoffs = [12000];
  let lastErr = null;
  for (let attempt = 0; attempt <= backoffs.length; attempt++) {
    pollinationsGate.nextSlotAt = Date.now() + intervalMs;
    if (attempt > 0) await new Promise((r) => setTimeout(r, backoffs[attempt - 1]));
    try {
      const res = await fetchWithTimeout(url, { redirect: 'follow', headers }, 120000);
      if (res.status === 402) {
        pollinationsGate.consecutive402++;
        if (pollinationsGate.consecutive402 >= 2) {
          pollinationsGate.circuitOpen = true;
          console.log('[FREE-IMAGES] ⚠ Circuit-breaker pollinations: cuota agotada, resto → fallback picsum');
        }
        lastErr = new Error('pollinations HTTP 402 (cuota agotada)');
        continue;
      }
      if (res.status === 401 || res.status === 403) {
        // Token inválido: seguir anónimo no sirve (nologo no aplica) → al fallback.
        lastErr = new Error(`pollinations HTTP ${res.status} (token inválido)`);
        continue;
      }
      if (res.status === 429 || res.status >= 500) {
        lastErr = new Error(`pollinations HTTP ${res.status}`);
        continue;
      }
      if (!res.ok) throw new Error(`pollinations HTTP ${res.status}`);
      const mime = (res.headers.get('content-type') || '').split(';')[0];
      if (!mime.startsWith('image/')) throw new Error(`pollinations devolvió ${mime || 'sin content-type'}`);
      pollinationsGate.consecutive402 = 0;
      return { buffer: Buffer.from(await res.arrayBuffer()), mime };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('pollinations falló');
}

async function fetchPicsum({ w, h, seed }) {
  const res = await fetchWithTimeout(`https://picsum.photos/seed/${seed}/${w}/${h}`, { redirect: 'follow' }, 25000);
  if (!res.ok) throw new Error(`picsum HTTP ${res.status}`);
  const mime = (res.headers.get('content-type') || '').split(';')[0];
  if (!mime.startsWith('image/')) throw new Error(`picsum devolvió ${mime || 'sin content-type'}`);
  return { buffer: Buffer.from(await res.arrayBuffer()), mime };
}

const SEARCH_STOPWORDS = new Set([
  'the', 'a', 'an', 'of', 'with', 'and', 'or', 'in', 'on', 'for', 'at', 'by', 'no', 'text', 'words',
  'watermark', 'borders', 'complete', 'scene', 'full', 'background', 'soft', 'elegant', 'lighting',
  'professional', 'editorial', 'photography'
]);

function promptToSearchTerms(prompt, keywords) {
  const words = (prompt || '')
    .toLowerCase()
    .replace(/[^a-z0-9áéíóúñü,\s]/g, ' ')
    .split(/[\s,]+/)
    .filter((w) => w.length > 2 && !SEARCH_STOPWORDS.has(w));
  const terms = words.slice(0, 5);
  if (terms.length >= 2) return terms.join(' ');
  return (keywords && keywords.slice(0, 3).join(' ')) || 'elegant celebration flowers';
}

async function fetchPexels(prompt, keywords, { seed, pexelsKey }) {
  if (!pexelsKey) throw new Error('Pexels requiere API key (gratuita en pexels.com/api)');
  const q = encodeURIComponent(promptToSearchTerms(prompt, keywords));
  const res = await fetchWithTimeout(
    `https://api.pexels.com/v1/search?query=${q}&per_page=15&orientation=landscape`,
    { headers: { Authorization: pexelsKey } },
    25000
  );
  if (!res.ok) throw new Error(`pexels HTTP ${res.status}`);
  const data = await res.json();
  const photos = data?.photos || [];
  if (!photos.length) throw new Error(`pexels sin resultados para "${q}"`);
  const pick = photos[seed % photos.length];
  const src = pick.src?.large2x || pick.src?.large || pick.src?.original;
  if (!src) throw new Error('pexels sin src disponible');
  const imgRes = await fetchWithTimeout(src, { redirect: 'follow' }, 25000);
  if (!imgRes.ok) throw new Error(`pexels imagen HTTP ${imgRes.status}`);
  return { buffer: Buffer.from(await imgRes.arrayBuffer()), mime: 'image/jpeg' };
}

// --- Biblioteca local img/<carpetas por evento> ---
function normalizeEventRoot(eventType) {
  const n = (eventType || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (n.includes('baby')) return 'baby';
  if (n.includes('boda') || n.includes('wedding') || n.includes('matri')) return 'boda';
  if (n.includes('xv') || n.includes('quince') || n.includes('15')) return 'xv';
  if (n.includes('cumple') || n.includes('birthday')) return 'cumple';
  if (n.includes('comunion') || n.includes('comunio') || n.includes('confirmac')) return 'comunion';
  if (n.includes('bauti') || n.includes('bautism')) return 'bautizo';
  return 'boda';
}

let localStockCache = null;
function listLocalStockImages(eventType) {
  if (localStockCache) return localStockCache;
  const out = [];
  try {
    for (const dir of readdirSync(IMG_ROOT, { withFileTypes: true })) {
      if (!dir.isDirectory()) continue;
      const nameNorm = dir.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      for (const f of readdirSync(join(IMG_ROOT, dir.name))) {
        if (!/\.(jpe?g|png|webp)$/i.test(f)) continue;
        out.push({ path: join(IMG_ROOT, dir.name, f), folderNorm: nameNorm });
      }
    }
  } catch (e) {
    console.error('[FREE-IMAGES] Error listando img/:', e.message);
  }
  localStockCache = out;
  return out;
}

function fetchLocalStock(eventType, { seed }) {
  const all = listLocalStockImages(eventType);
  if (!all.length) throw new Error('No hay imágenes en la biblioteca local img/');
  const root = normalizeEventRoot(eventType);
  const matching = all.filter((f) => f.folderNorm.includes(root));
  const pool = matching.length ? matching : all;
  const pick = pool[seed % pool.length];
  const ext = pick.path.split('.').pop().toLowerCase();
  const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  return { buffer: readFileSync(pick.path), mime, localPath: pick.path };
}

// ---------------------------------------------------------------------------
// Caché en disco (regeneraciones y prompts repetidos = costo cero)
// ---------------------------------------------------------------------------
function cachePath(key, ext) {
  return join(CACHE_DIR, `${key}.${ext}`);
}

function readCache(key) {
  for (const ext of ['jpeg', 'png', 'webp']) {
    const p = cachePath(key, ext);
    if (existsSync(p)) {
      const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      return { buffer: readFileSync(p), mime, cached: true };
    }
  }
  return null;
}

function writeCache(key, { buffer, mime }) {
  try {
    if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
    const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpeg';
    writeFileSync(cachePath(key, ext), buffer);
  } catch (e) {
    console.error('[FREE-IMAGES] Error escribiendo caché:', e.message);
  }
}

// ---------------------------------------------------------------------------
// Resolución de un slot (con fallback automático a picsum: la invitación
// nunca se queda sin imagen aunque el proveedor principal falle)
// ---------------------------------------------------------------------------
async function resolveSlot(slot, prompt, opts) {
  const { provider } = opts;
  try {
    return await generateWithProvider(slot, prompt, opts);
  } catch (e) {
    if (provider === 'picsum' || provider === 'local-stock') throw e;
    console.error(`[FREE-IMAGES] ⚠ ${provider} falló (${e.message}) → fallback picsum para este slot`);
    const fb = await generateWithProvider(slot, prompt, { ...opts, provider: 'picsum' });
    return { ...fb, fallback: true };
  }
}

async function generateWithProvider(slot, prompt, { provider, eventType, pexelsKey, pollinationsToken, idx }) {
  const seed = intHash(`${provider}|${prompt}|${slot.w}x${slot.h}|${idx}`);
  const cacheKey = sha1(`${provider}|${prompt}|${slot.w}x${slot.h}|${seed}`);

  if (provider !== 'local-stock') {
    const hit = readCache(cacheKey);
    if (hit) return { ...hit, dataUri: `data:${hit.mime};base64,${hit.buffer.toString('base64')}` };
  }

  let result;
  if (POLLINATIONS_MODELS[provider]) {
    result = await fetchPollinations(prompt, provider, { w: slot.w, h: slot.h, seed, token: pollinationsToken });
  } else if (provider === 'picsum') {
    result = await fetchPicsum({ w: slot.w, h: slot.h, seed });
  } else if (provider === 'pexels') {
    result = await fetchPexels(prompt, slot.keywords, { seed, pexelsKey });
  } else if (provider === 'local-stock') {
    result = fetchLocalStock(eventType, { seed });
  } else {
    throw new Error(`Proveedor desconocido: ${provider}`);
  }

  if (provider !== 'local-stock') writeCache(cacheKey, result);
  return { ...result, cached: false, dataUri: `data:${result.mime};base64,${result.buffer.toString('base64')}` };
}

// ---------------------------------------------------------------------------
// Proceso principal: sustituye todos los slots del HTML
// ---------------------------------------------------------------------------
export async function processHtmlWithFreeImages(html, opts = {}) {
  const t0 = Date.now();
  const provider = opts.provider;
  if (!POLLINATIONS_MODELS[provider] && !['picsum', 'pexels', 'local-stock'].includes(provider)) {
    throw new Error(`Proveedor gratuito no válido: ${provider}`);
  }
  if (!html || !html.includes('<!DOCTYPE')) {
    return { html, total: 0, replaced: 0, failed: 0, cached: 0, promptMode: 'skip', ms: 0 };
  }

  const slots = extractImageSlots(html);
  if (!slots.length) {
    return { html, total: 0, replaced: 0, failed: 0, cached: 0, promptMode: 'none', ms: Date.now() - t0 };
  }

  // Paso agéntico (una llamada Gemini) con fallback heurístico por slot.
  let agenticPrompts = null;
  let promptMode = 'heuristic';
  if (opts.agentic !== false) {
    agenticPrompts = await craftPromptsWithGemini(slots, {
      eventType: opts.eventType,
      theme: opts.theme,
      geminiKey: opts.geminiKey,
      geminiModel: opts.geminiModel
    });
    if (agenticPrompts) promptMode = 'agentic';
  }
  const prompts = slots.map((s, i) => (agenticPrompts && agenticPrompts[i]) || heuristicPrompt(s));

  const concurrency = POLLINATIONS_MODELS[provider] ? 1 : provider === 'local-stock' ? 8 : 5;
  console.log(
    `[FREE-IMAGES] Proveedor "${provider}": resolviendo ${slots.length} imagen(es), prompts=${promptMode}, concurrencia=${concurrency}`
  );

  const results = await runWithConcurrency(
    slots.map((s, i) => () => resolveSlot(s, prompts[i], {
      provider,
      eventType: opts.eventType,
      pexelsKey: opts.pexelsKey,
      pollinationsToken: opts.pollinationsToken,
      idx: i
    })),
    concurrency
  );

  let out = html;
  let replaced = 0;
  let failed = 0;
  let cached = 0;
  let fallbacks = 0;
  const failedKeywords = [];
  for (let i = 0; i < slots.length; i++) {
    const r = results[i];
    if (r && r.dataUri) {
      out = out.split(slots[i].url).join(r.dataUri);
      replaced++;
      if (r.cached) cached++;
      if (r.fallback) fallbacks++;
    } else {
      failed++;
      failedKeywords.push(slots[i].keywords.join(',') || slots[i].url.slice(0, 60));
      console.error(`[FREE-IMAGES] ⚠ Slot ${i} falló (${r && r.__error ? r.__error : 'sin imagen'}) — se conserva la URL loremflickr`);
    }
  }

  return {
    html: out,
    total: slots.length,
    replaced,
    failed,
    cached,
    fallbacks,
    promptMode,
    failedKeywords,
    ms: Date.now() - t0
  };
}

// ---------------------------------------------------------------------------
// Test del admin: genera UNA imagen de muestra y devuelve latencia + preview
// ---------------------------------------------------------------------------
export async function testFreeImageProvider(provider, opts = {}) {
  if (!VALID_PROVIDERS.has(provider) || provider === 'none') {
    throw new Error('Proveedor no válido');
  }
  const t0 = Date.now();
  const keywords = (opts.keywords || 'elegant wedding flowers, romantic decoration')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
  const slot = { url: '(test)', w: 640, h: 427, keywords };

  let prompt = heuristicPrompt(slot);
  let promptMode = 'heuristic';
  if (opts.agentic !== false && (POLLINATIONS_MODELS[provider] || provider === 'pexels')) {
    const agentic = await craftPromptsWithGemini([slot], {
      eventType: opts.eventType,
      theme: opts.theme,
      geminiKey: opts.geminiKey,
      geminiModel: opts.geminiModel
    });
    if (agentic && agentic[0]) {
      prompt = agentic[0];
      promptMode = 'agentic';
    }
  }

  const result = await resolveSlot(slot, prompt, {
    provider,
    eventType: opts.eventType,
    pexelsKey: opts.pexelsKey,
    pollinationsToken: opts.pollinationsToken,
    idx: 0
  });

  return {
    ok: true,
    provider,
    promptMode,
    prompt,
    cached: Boolean(result.cached),
    fallback: Boolean(result.fallback),
    localPath: result.localPath || null,
    latencyMs: Date.now() - t0,
    bytes: result.buffer.length,
    dataUri: result.dataUri
  };
}
