/**
 * ============================================================================
 * TRADUCTOR DE INVITACIONES ES→EN (función bilingüe)
 * ============================================================================
 * Traduce el TEXTO VISIBLE de una invitación terminada al inglés usando el
 * modelo HTML configurado en el admin. Reglas:
 *   - Nombres propios, fechas, números, direcciones y correos: intactos
 *     (son datos del usuario, no copy del diseño)
 *   - <script>/<style>/identificadores/URLs/base64: intactos
 *   - "Mis XV años" → "My Sweet Fifteen"; "quinceañera" se mantiene como
 *     término cultural cuando es sustantivo
 * IMPLEMENTACIÓN: trabaja sobre el STRING CRUDO (segmentos >texto<) — nunca
 * re-serializa el documento (linkedom corrompía imágenes base64 grandes).
 * Caché por hash del HTML para no re-traducir regeneraciones idénticas.
 * ============================================================================
 */
import { createHash } from 'crypto';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const CACHE_DIR = join(process.env.DATA_DIR || join(process.cwd(), 'server'), 'storage', 'translation-cache');

const fetchWithTimeout = async (url, opts = {}, ms = 90000) => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
};

const ENTIDADES = { '&aacute;': 'á', '&eacute;': 'é', '&iacute;': 'í', '&oacute;': 'ó', '&uacute;': 'ú', '&ntilde;': 'ñ', '&uuml;': 'ü', '&Ntilde;': 'Ñ', '&iquest;': '¿', '&iexcl;': '¡', '&amp;': '&', '&quot;': '"', '&#39;': "'", '&lt;': '<', '&gt;': '>' };
const decodificar = (s) => s.replace(/&(?:aacute|eacute|iacute|oacute|uacute|ntilde|uuml|Ntilde|iquest|iexcl|amp|quot|#39|lt|gt);/g, (m) => ENTIDADES[m] || m);
const escapar = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const TIENE_ES = /[áéíóúñü¿¡]|Mis |mis |para |de la |del |los |las |Falta|Bendición|Padrinos|Padres|Itinerario|Ubicación|Vestimenta|Confirmación|Regalos|Cuenta|Boda|Bautizo|Comunión|Cumpleaños|Gracias|Bienvenidos|Nos vemos|Te esperamos|Celular|Teléfono|Festejad|quinceañera/i;

/** Extrae segmentos de texto crudos candidatos (fuera de script/style). */
function extraerSegmentos(html) {
  // neutralizar script/style para que sus contenidos no casen como texto
  const limpio = html.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, (m) => '\u0000'.repeat(m.length));
  const out = [];
  const vistos = new Set();
  const re = />([^<>]{3,300})</g;
  let m;
  while ((m = re.exec(limpio)) !== null) {
    const texto = decodificar(m[1]).replace(/\s+/g, ' ').trim();
    if (texto.length < 3 || vistos.has(texto)) continue;
    if (!/[a-záéíóúñ]/i.test(texto)) continue;
    if (!TIENE_ES.test(texto)) continue;
    vistos.add(texto);
    out.push({ crudo: m[1], texto });
  }
  return out;
}

/** Traduce un lote de cadenas con Gemini. Devuelve Map(es → en). */
async function traducirLote(cadenas, { geminiKey, geminiModel }) {
  const model = geminiModel && geminiModel !== 'gemini-3.1-flash-preview' ? geminiModel : 'gemini-flash-latest';
  const payload = {
    contents: [{
      role: 'user',
      parts: [{
        text:
          'You are a professional translator for digital event invitations (Spanish → English).\n' +
          'Translate EACH string in the JSON array to natural, elegant English for an invitation UI.\n' +
          'STRICT RULES:\n' +
          '1. NEVER translate or alter personal names, dates, times, numbers, addresses, phones or emails — copy them unchanged.\n' +
          '2. ¿…?→? and ¡…!→!; keep the rest of the punctuation sensible for English.\n' +
          '3. "Mis XV años" → "My Sweet Fifteen"; "XV años" → "Sweet Fifteen"; "quinceañera" stays "quinceañera" when it is a noun.\n' +
          '4. Section names: Mis padres → My Parents, Mis padrinos → My Godparents, Cuenta regresiva → Countdown, Itinerario → Program, Ubicación → Location, Código de vestimenta → Dress code, Confirmación de asistencia → RSVP, Mesa de regalos → Gift registry, Galería → Gallery.\n' +
          '5. If a string is already English or has no translatable words, return it unchanged.\n' +
          'Respond with EXACTLY a JSON array of translated strings, same order, same count. No markdown.\n' +
          'JSON ARRAY:\n' + JSON.stringify(cadenas)
      }]
    }],
    generationConfig: { temperature: 0.15, maxOutputTokens: 8192 }
  };

  const res = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey }, body: JSON.stringify(payload) }
  );
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
  const data = await res.json();
  let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  text = text.replace(/```json|```/g, '').trim();
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1) throw new Error('Respuesta sin array JSON');
  const arr = JSON.parse(text.slice(start, end + 1));
  if (!Array.isArray(arr) || arr.length !== cadenas.length) throw new Error('Arreglo desalineado');
  const mapa = new Map();
  cadenas.forEach((c, i) => mapa.set(c, typeof arr[i] === 'string' && arr[i].trim() ? arr[i].trim() : c));
  return mapa;
}

/**
 * Traduce el HTML de una invitación al inglés.
 * @returns {Promise<{html:string, traducidos:number, cache:boolean}>}
 */
export async function traducirInvitacionAIngles(html, { geminiKey, geminiModel } = {}) {
  if (!html || !geminiKey) return { html, traducidos: 0, cache: false };

  const hash = createHash('sha1').update(html).digest('hex');
  const cacheFile = join(CACHE_DIR, `${hash}.json`);
  let mapa = new Map();
  let desdeCache = false;
  if (existsSync(cacheFile)) {
    try { mapa = new Map(Object.entries(JSON.parse(readFileSync(cacheFile, 'utf8')))); desdeCache = true; } catch { mapa = new Map(); }
  }

  const segmentos = extraerSegmentos(html);
  if (!segmentos.length) return { html, traducidos: 0, cache: desdeCache };

  const unicos = [...new Set(segmentos.map((s) => s.texto))];
  const pendientes = unicos.filter((c) => !mapa.has(c));

  const lotes = [];
  for (let i = 0; i < pendientes.length; i += 40) lotes.push(pendientes.slice(i, i + 40));
  const errores = [];
  const correr = async (cola) => {
    const trabajos = cola.splice(0, 2);
    await Promise.all(trabajos.map(async (lote) => {
      try {
        const r = await traducirLote(lote, { geminiKey, geminiModel });
        r.forEach((v, k) => mapa.set(k, v));
      } catch (e) {
        errores.push(e?.message || 'error');
      }
    }));
    if (cola.length) await correr(cola);
  };
  await correr(lotes);

  // Aplicar sobre el string CRUDO: reemplazo exacto del segmento original.
  // La entidad se codifica de vuelta (& < >) para no romper el HTML.
  let htmlFinal = html;
  let traducidos = 0;
  const reemplazos = [];
  for (const seg of segmentos) {
    const en = mapa.get(seg.texto);
    if (en && en !== seg.texto) reemplazos.push([seg.crudo, escapar(en)]);
  }
  // reemplazo único por segmento crudo (los repetidos comparten traducción)
  const vistosCrudo = new Set();
  for (const [de, a] of reemplazos) {
    if (vistosCrudo.has(de)) continue;
    vistosCrudo.add(de);
    if (htmlFinal.includes(de)) { htmlFinal = htmlFinal.split(de).join(a); traducidos++; }
  }

  try {
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(cacheFile, JSON.stringify(Object.fromEntries(mapa)));
  } catch { /* caché best-effort */ }

  if (errores.length) console.warn(`[TRANSLATE] ⚠ ${errores.length} lote(s) fallaron:`, errores[0]);
  console.log(`[TRANSLATE] es→en: ${traducidos} segmentos traducidos de ${unicos.length} únicos (${desdeCache ? 'caché' : 'primera pasada'})`);
  return { html: htmlFinal, traducidos, cache: desdeCache };
}
