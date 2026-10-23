/**
 * ============================================================================
 * DEMO DE SETS — generación de invitaciones demo SIN consumir IA
 * ============================================================================
 * Proceso totalmente INDEPENDIENTE del flujo agéntico existente:
 *   1. Recibe los módulos HTML que el admin sube (usualmente 12 = un set).
 *   2. Los ordena (prefijo numérico del archivo o tipo conocido), inyecta una
 *      paleta de demo y re-fecha el countdown a +60 días para que se vea vivo.
 *   3. Resuelve las imágenes placeholder (loremflickr) con el proveedor
 *      gratuito configurado (Pexels / Picsum / Pollinations / local) en modo
 *      100% determinístico (agentic:false → NUNCA llama a Gemini) y las
 *      incrusta como data URIs base64.
 *   4. Devuelve UN solo HTML autocontenido, descargable y compartible para
 *      auditar visualmente cómo queda el set armado como invitación.
 *
 * Este servicio NO modifica nada del flujo existente: no escribe en la base
 * de datos (solo lee knowledge_base_modules para autodetectar el set y usa
 * la caché de imágenes de free-image-cache), no llama a ninguna IA y no
 * toca los módulos originales.
 * ============================================================================
 */
import db from './database.js';
import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync, rmSync } from 'fs';
import { dirname, join, resolve, sep } from 'path';
import { fileURLToPath } from 'url';
import AdmZip from 'adm-zip';
import { getFreeImageConfig, processHtmlWithFreeImages } from './freeImageService.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Paletas de demo (copiadas de modulos-1/sets-fotos/gen/styles.cjs — solo los
// valores de preview). Autocontenidas para que producción no dependa del repo.
// ---------------------------------------------------------------------------
export const DEMO_PALETTES = [
  { id: 'imperial', label: 'Imperial Dorado', vars: { '--primary-color': '#e8c15a', '--secondary-color': '#b98fd4', '--accent-color': '#f6e7b2', '--bg-color': '#241436', '--surface-color': '#2f1a47', '--surface-border-color': 'rgba(232,193,90,.4)', '--text-color': '#f7f1e6' } },
  { id: 'mariposas', label: 'Mariposas de Princesa', vars: { '--primary-color': '#9b6bc3', '--secondary-color': '#c9a8e0', '--accent-color': '#efd9f7', '--bg-color': '#f6effb', '--surface-color': '#ffffff', '--surface-border-color': 'rgba(155,107,195,.28)', '--text-color': '#4a3560' } },
  { id: 'glitter', label: 'Glitter Laser Púrpura', vars: { '--primary-color': '#d24db8', '--secondary-color': '#8a2be2', '--accent-color': '#ffd6f6', '--bg-color': '#22052e', '--surface-color': '#320a45', '--surface-border-color': 'rgba(210,77,184,.45)', '--text-color': '#fbeaff' } },
  { id: 'monolavanda', label: 'Moño Lavanda sobre Mármol', vars: { '--primary-color': '#8f7ab5', '--secondary-color': '#c9b8de', '--accent-color': '#efeaf6', '--bg-color': '#f4f1f8', '--surface-color': '#ffffff', '--surface-border-color': 'rgba(143,122,181,.25)', '--text-color': '#413a52' } },
  { id: 'arcoacuarela', label: 'Arco Floral Acuarela', vars: { '--primary-color': '#d4718f', '--secondary-color': '#9db787', '--accent-color': '#f4d8e0', '--bg-color': '#fdf8f6', '--surface-color': '#ffffff', '--surface-border-color': 'rgba(212,113,143,.24)', '--text-color': '#4d3a40' } },
  { id: 'azulfloral', label: 'Azul Floral Limpio', vars: { '--primary-color': '#3f5f8a', '--secondary-color': '#8aa8c8', '--accent-color': '#dbe7f3', '--bg-color': '#f7fafc', '--surface-color': '#ffffff', '--surface-border-color': 'rgba(63,95,138,.22)', '--text-color': '#2c3a4a' } },
  { id: 'rosabeige', label: 'Rosa Floral Beige', vars: { '--primary-color': '#c98a92', '--secondary-color': '#dbc3ae', '--accent-color': '#f0e4d3', '--bg-color': '#faf5ee', '--surface-color': '#ffffff', '--surface-border-color': 'rgba(201,138,146,.25)', '--text-color': '#4d3f3a' } },
  { id: 'telablanca', label: 'Tela Blanca con Flor', vars: { '--primary-color': '#8a8070', '--secondary-color': '#b8b0a0', '--accent-color': '#ece7dc', '--bg-color': '#faf8f4', '--surface-color': '#ffffff', '--surface-border-color': 'rgba(138,128,112,.24)', '--text-color': '#3a362e' } },
  { id: 'hortensia', label: 'Hortensias y Kraft', vars: { '--primary-color': '#5b7d9e', '--secondary-color': '#a3b8cc', '--accent-color': '#c8a878', '--bg-color': '#f6f3ec', '--surface-color': '#ffffff', '--surface-border-color': 'rgba(91,125,158,.24)', '--text-color': '#33404d' } },
  { id: 'navylaser', label: 'Navy Laser-Cut Corona', vars: { '--primary-color': '#c9a45c', '--secondary-color': '#8ea6c8', '--accent-color': '#e6d3a3', '--bg-color': '#101a2e', '--surface-color': '#16233d', '--surface-border-color': 'rgba(201,164,92,.4)', '--text-color': '#eef2f8' } },
  { id: 'orobotanico', label: 'Oro Botánico', vars: { '--primary-color': '#a8863d', '--secondary-color': '#7d9a6d', '--accent-color': '#eee4c8', '--bg-color': '#fdfcf7', '--surface-color': '#ffffff', '--surface-border-color': 'rgba(168,134,61,.26)', '--text-color': '#3c3626' } },
  { id: 'glicina', label: 'Glicina sobre Madera', vars: { '--primary-color': '#7b6ea6', '--secondary-color': '#a89ac9', '--accent-color': '#d9d0ea', '--bg-color': '#f5f2f9', '--surface-color': '#ffffff', '--surface-border-color': 'rgba(123,110,166,.24)', '--text-color': '#3d3649' } },
  { id: 'apiladas', label: 'Apiladas Florales', vars: { '--primary-color': '#d98a9c', '--secondary-color': '#a8c4b0', '--accent-color': '#f4e3e8', '--bg-color': '#fbf6f4', '--surface-color': '#ffffff', '--surface-border-color': 'rgba(217,138,156,.25)', '--text-color': '#4a343b' } },
  { id: 'peonias', label: 'Peonías Rosas', vars: { '--primary-color': '#c2455a', '--secondary-color': '#e8938f', '--accent-color': '#f7d6b8', '--bg-color': '#fdf0ec', '--surface-color': '#ffffff', '--surface-border-color': 'rgba(194,69,90,.22)', '--text-color': '#46282e' } },
  { id: 'otono', label: 'Otoño con Moño', vars: { '--primary-color': '#a4562c', '--secondary-color': '#c77f3d', '--accent-color': '#e0b45e', '--bg-color': '#f7ead8', '--surface-color': '#fffaf1', '--surface-border-color': 'rgba(164,86,44,.24)', '--text-color': '#3d2b1c' } },
  { id: 'navyfloral', label: 'Bautizo Navy Floral', vars: { '--primary-color': '#31517a', '--secondary-color': '#8298b5', '--accent-color': '#dbe4ee', '--bg-color': '#f5f8fb', '--surface-color': '#ffffff', '--surface-border-color': 'rgba(49,81,122,.22)', '--text-color': '#26354a' } },
  { id: 'griega', label: 'Griega Azul y Oro', vars: { '--primary-color': '#2f5d8a', '--secondary-color': '#7fb3d5', '--accent-color': '#d9b44a', '--bg-color': '#eef4f9', '--surface-color': '#ffffff', '--surface-border-color': 'rgba(47,93,138,.22)', '--text-color': '#253549' } },
  { id: 'encaje', label: 'Corona sobre Encaje', vars: { '--primary-color': '#8a7a94', '--secondary-color': '#c0b4cc', '--accent-color': '#efe9f2', '--bg-color': '#faf7fa', '--surface-color': '#ffffff', '--surface-border-color': 'rgba(138,122,148,.24)', '--text-color': '#3f3844' } },
  { id: 'caliz', label: 'Cáliz Dorado', vars: { '--primary-color': '#a8863d', '--secondary-color': '#c9b06a', '--accent-color': '#f3ecd4', '--bg-color': '#faf7ee', '--surface-color': '#ffffff', '--surface-border-color': 'rgba(168,134,61,.28)', '--text-color': '#43391f' } },
  { id: 'espejadas', label: 'Espejadas Oro y Plata', vars: { '--primary-color': '#b0a35e', '--secondary-color': '#9a9aa8', '--accent-color': '#ece7d2', '--bg-color': '#f6f5f0', '--surface-color': '#ffffff', '--surface-border-color': 'rgba(154,154,168,.3)', '--text-color': '#3a3830' } },
  { id: 'fabuloso', label: 'Fabuloso Dorado', vars: { '--primary-color': '#c9a227', '--secondary-color': '#e0c878', '--accent-color': '#fff6d8', '--bg-color': '#1f1a10', '--surface-color': '#2b2416', '--surface-border-color': 'rgba(201,162,39,.4)', '--text-color': '#f8f1dd' } },
  { id: 'rosa18', label: 'Rosa 18', vars: { '--primary-color': '#d16a8a', '--secondary-color': '#eda7bc', '--accent-color': '#fbe3ec', '--bg-color': '#fdf3f6', '--surface-color': '#ffffff', '--surface-border-color': 'rgba(209,106,138,.24)', '--text-color': '#4d3038' } },
  { id: 'negooro60', label: 'Negro y Oro 60', vars: { '--primary-color': '#d4af5f', '--secondary-color': '#a8873f', '--accent-color': '#f0d998', '--bg-color': '#12100c', '--surface-color': '#1d1812', '--surface-border-color': 'rgba(212,175,95,.4)', '--text-color': '#f0e8d8' } },
  { id: 'confeti25', label: 'Confeti Dorado 25', vars: { '--primary-color': '#e8b341', '--secondary-color': '#d98e4a', '--accent-color': '#fff3cf', '--bg-color': '#2a1a33', '--surface-color': '#3a2447', '--surface-border-color': 'rgba(232,179,65,.4)', '--text-color': '#fbf4e4' } },
  { id: 'premium', label: 'Vuelo · Paisajes del Cielo', vars: { '--primary-color': '#f4a259', '--secondary-color': '#8fbfdd', '--accent-color': '#e07a5f', '--bg-color': '#16233b', '--surface-color': '#1e2f4d', '--surface-border-color': 'rgba(244,162,89,.35)', '--text-color': '#f6f1e7' } },
  { id: 'neutra', label: 'Neutra (marfil y oro)', vars: { '--primary-color': '#a08a5a', '--secondary-color': '#8a8a8a', '--accent-color': '#efe9dc', '--bg-color': '#faf8f3', '--surface-color': '#ffffff', '--surface-border-color': 'rgba(160,138,90,.25)', '--text-color': '#33302a' } }
];

export function listDemoPalettes() {
  return DEMO_PALETTES.map(({ id, label, vars }) => ({
    id,
    label,
    swatch: [vars['--primary-color'], vars['--secondary-color'], vars['--bg-color'], vars['--text-color']]
  }));
}

// ---------------------------------------------------------------------------
// Detección del set subido (para sugerir su paleta): primero por el nombre de
// archivo (set-NN-key), luego por hash exacto del contenido contra el KB.
// Todo de solo lectura; si no se detecta → paleta neutra.
// ---------------------------------------------------------------------------
const sha1 = (s) => createHash('sha1').update(s).digest('hex');

export function detectDemoSet(files) {
  // 1) Nombre de archivo: ".../set-04-monolavanda/06-detalles.html" o similar
  for (const f of files) {
    const m = (f.originalname || '').match(/set-(\d+)-([a-z0-9]+)/i);
    if (m) {
      const p = DEMO_PALETTES.find((x) => x.id === m[2].toLowerCase());
      if (p) return { paletteId: p.id, source: 'filename' };
    }
  }
  // 2) Hash del contenido contra knowledge_base_modules (module_id sf-<key>-<tipo>)
  try {
    const rows = db
      .prepare("SELECT module_id, html_content FROM knowledge_base_modules WHERE module_id LIKE 'sf-%'")
      .all();
    const byHash = new Map(rows.map((r) => [sha1(r.html_content || ''), r.module_id]));
    for (const f of files) {
      const hit = byHash.get(sha1(f.buffer.toString('utf8')));
      if (hit) {
        const key = hit.replace(/^sf-/, '').replace(/-(portada|padres|ubicacion|itinerario|confirmacion|detalles|countdown|padrinos|corte|galeria|regalos|vestimenta)$/, '');
        const p = DEMO_PALETTES.find((x) => x.id === key);
        if (p) return { paletteId: p.id, source: 'knowledge-base' };
      }
    }
  } catch (e) {
    console.log(`[DEMO-SET] Autodetección por KB omitida: ${e.message}`);
  }
  return { paletteId: 'neutra', source: 'default' };
}

// ---------------------------------------------------------------------------
// Orden de módulos
// ---------------------------------------------------------------------------
const TIPO_ORDER = [
  'portada', 'padres', 'ubicacion', 'itinerario', 'confirmacion', 'detalles',
  'countdown', 'padrinos', 'corte', 'galeria', 'regalos', 'vestimenta'
];

function moduleOrderKey(originalname) {
  const name = (originalname || '').toLowerCase();
  // El RSVP cierra la invitación (sugerencia del equipo de revisión).
  if (name.includes('confirmacion')) return { n: 90, kind: 'tipo' };
  const num = name.match(/(\d{1,2})[-_.]/);
  if (num) return { n: parseInt(num[1], 10), kind: 'num' };
  const ti = TIPO_ORDER.findIndex((t) => name.includes(t));
  if (ti !== -1) return { n: ti + 1, kind: 'tipo' };
  return { n: 99, kind: 'none' };
}

export function sortModules(files) {
  return [...files].sort((a, b) => {
    const ka = moduleOrderKey(a.originalname);
    const kb_ = moduleOrderKey(b.originalname);
    if (ka.kind === 'none' && kb_.kind === 'none') return 0; // conserva orden de subida
    return ka.n - kb_.n;
  });
}

// ---------------------------------------------------------------------------
// Fecha demo: countdown a +60 días (determinístico, sin IA)
// ---------------------------------------------------------------------------
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const pad = (n) => String(n).padStart(2, '0');

// loremflickr sin keywords ("…/700/420/") queda fuera del extractor de slots
// del free-image-service; se le asigna un keyword de demo para que también
// termine incrustada en base64.
function normalizeKeywordlessLorem(body) {
  return body.replace(/loremflickr\.com\/(\d+)\/(\d+)\/(?=["')\s])/g, 'loremflickr.com/$1/$2/elegant,celebration');
}

function retargetDemoDates(body) {
  const target = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
  target.setHours(19, 0, 0, 0);
  const iso = `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}T19:00:00`;
  const humana = `${DIAS[target.getDay()][0].toUpperCase()}${DIAS[target.getDay()].slice(1)}, ${target.getDate()} de ${MESES[target.getMonth()]} de ${target.getFullYear()} · 7:00 pm`;
  let out = body;
  out = out.replace(/data-countdown-target="[^"]*"/g, `data-countdown-target="${iso}"`);
  out = out.replace(/(<time\b[^>]*datetime=")[^"]*(")/g, `$1${iso}$2`);
  out = out.replace(/window\.__countdownTarget\s*=\s*[^;]+;/, `window.__countdownTarget='${iso}';`);
  out = out.replace(/Fecha del evento · hora por confirmar/g, humana);
  return { body: out, iso, humana };
}

// ---------------------------------------------------------------------------
// Ensamblado del documento demo (un solo HTML autocontenido)
// ---------------------------------------------------------------------------
function paletteCss(p) {
  return `:root{${Object.entries(p.vars).map(([k, v]) => `${k}:${v}`).join(';')}}`;
}

function extractSection(html) {
  const s = html.indexOf('<section');
  const e = html.lastIndexOf('</section>');
  if (s === -1 || e === -1 || e < s) return null;
  return html.slice(s, e + '</section>'.length).trim();
}

export function assembleDemoDocument({ sections, palette, setLabel, fechaHumana }) {
  const body = sections.join('\n');
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Invitación Demo · ${setLabel}</title>
<meta name="robots" content="noindex">
<!--
  ═══════════════════════════════════════════════════════════════
  DEMO DE SET — generada SIN IA (proceso simulado e independiente)
  Set: ${setLabel} · Paleta: ${palette.label}
  Fecha de evento simulada: ${fechaHumana}
  Imágenes: proveedor gratuito, incrustadas en base64 (autocontenido)
  ═══════════════════════════════════════════════════════════════
-->
<style>
${paletteCss(palette)}
html { scroll-behavior: smooth; }
body { margin: 0; background: var(--bg-color, #fff); }
</style>
</head>
<body>
${body}
<div onclick="this.remove()" title="Clic para ocultar" style="position:fixed;right:14px;bottom:14px;z-index:2147483647;font:600 11px/1.4 -apple-system,'Segoe UI',Arial,sans-serif;color:#fff;background:rgba(17,17,17,.72);backdrop-filter:blur(6px);padding:8px 13px;border-radius:999px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.28);letter-spacing:.02em">DEMO · ${setLabel} · sin IA · ${fechaHumana}</div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Proceso principal
// ---------------------------------------------------------------------------
export async function buildDemoSet({ files, paletteId, provider }) {
  const t0 = Date.now();
  if (!Array.isArray(files) || !files.length) throw new Error('No se recibieron módulos');

  const sorted = sortModules(files);
  const sections = [];
  const skipped = [];
  for (const f of sorted) {
    const html = f.buffer.toString('utf8');
    const sec = extractSection(html);
    if (sec) sections.push(sec);
    else skipped.push(f.originalname);
  }
  if (!sections.length) throw new Error('Ningún archivo contiene un <section> válido');

  const det = detectDemoSet(files);
  const chosenId = paletteId && DEMO_PALETTES.some((p) => p.id === paletteId) ? paletteId : det.paletteId;
  const palette = DEMO_PALETTES.find((p) => p.id === chosenId);

  const { body, iso, humana } = retargetDemoDates(normalizeKeywordlessLorem(sections.join('\n')));
  let doc = assembleDemoDocument({ sections: [body], palette, setLabel: palette.label, fechaHumana: humana });

  // Imágenes → base64 con proveedor gratuito, SIN paso agéntico (cero IA).
  const cfg = getFreeImageConfig();
  const prov =
    provider && provider !== 'auto'
      ? provider
      : cfg.provider !== 'none' && cfg.provider !== 'pollinations-flux' && cfg.provider !== 'pollinations-turbo'
        ? cfg.provider
        : cfg.pexelsKey
          ? 'pexels'
          : 'picsum';

  const img = await processHtmlWithFreeImages(doc, {
    provider: prov,
    agentic: false,
    pexelsKey: cfg.pexelsKey,
    pollinationsToken: cfg.pollinationsToken
  });
  doc = img.html;

  const filename = `demo-set-${palette.id}-${new Date().toISOString().slice(0, 10)}.html`;
  return {
    ok: true,
    filename,
    html: doc,
    stats: {
      modulos: sections.length,
      omitidos: skipped,
      paleta: { id: palette.id, label: palette.label, origen: det.source, elegida: chosenId === det.paletteId ? 'auto' : 'manual' },
      proveedor: prov,
      imagenes: { total: img.total, reemplazadas: img.replaced, enCache: img.cached, fallbacks: img.fallbacks || 0, fallidas: img.failed },
      fechaEvento: iso,
      bytes: Buffer.byteLength(doc, 'utf8'),
      ms: Date.now() - t0
    }
  };
}

// ---------------------------------------------------------------------------
// LOTE: muchas colecciones a la vez (ZIP subido o carpeta del repo)
// ---------------------------------------------------------------------------
// Un archivo cuenta como módulo de colección si su contenido recortado
// EMPIEZA con <section (los módulos son fragmentos sección-raíz; los
// previews/index del catálogo empiezan con <!DOCTYPE y quedan fuera).
const esModuloDeColeccion = (name, content) =>
  /\.html?$/i.test(name) &&
  !/^index\.html?$/i.test(name.split(/[\\/]/).pop() || '') &&
  typeof content === 'string' &&
  content.trimStart().toLowerCase().startsWith('<section');

const sanitizeName = (s) =>
  (s || 'set')
    .replace(/[\\/]+/g, '-')
    .replace(/[^a-zA-Z0-9\-_.]/g, '')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'set';

/**
 * Agrupa entradas [{ path, buffer }] por carpeta contenedora.
 * Devuelve [{ folder, name, files: [{ originalname, buffer }] }]
 */
export function collectGroupsFromEntries(entries) {
  const byFolder = new Map();
  for (const e of entries) {
    if (!esModuloDeColeccion(e.path, e.content)) continue;
    const norm = e.path.replace(/\\/g, '/');
    const slash = norm.lastIndexOf('/');
    const folderPath = slash === -1 ? '' : norm.slice(0, slash);
    if (!byFolder.has(folderPath)) byFolder.set(folderPath, []);
    byFolder.get(folderPath).push({ originalname: norm.split('/').pop(), buffer: Buffer.from(e.content, 'utf8') });
  }
  const groups = [];
  const usedNames = new Map();
  for (const [folderPath, files] of [...byFolder.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const base = sanitizeName(folderPath.split('/').pop() || 'raiz');
    const n = (usedNames.get(base) || 0) + 1;
    usedNames.set(base, n);
    const name = n === 1 ? base : `${base}-${n}`;
    // originalname lleva "carpeta/archivo" para que la detección de paleta por
    // nombre (set-NN-key) siga funcionando en modo lote.
    groups.push({ folder: folderPath || name, name, files: files.map((f) => ({ ...f, originalname: `${folderPath ? folderPath.split('/').pop() + '/' : ''}${f.originalname}` })) });
  }
  return groups;
}

/** Grupos a partir de un ZIP subido (en memoria). */
export function groupsFromZipBuffer(zipBuffer) {
  const zip = new AdmZip(zipBuffer);
  const entries = zip
    .getEntries()
    .filter((e) => !e.isDirectory)
    .map((e) => ({ path: e.entryName, content: e.getData().toString('utf8') }));
  return collectGroupsFromEntries(entries);
}

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'gen', '_referencia', 'storage']);

function walkHtmlFiles(dir, root, out) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(name)) continue;
      walkHtmlFiles(full, root, out);
    } else if (/\.html?$/i.test(name)) {
      out.push({ path: full.slice(root.length + 1), content: readFileSync(full, 'utf8') });
    }
  }
}

/**
 * Grupos a partir de una carpeta DEL SERVIDOR (relativa a la raíz del
 * proyecto, p.ej. "modulos-1" o "modulos-1/sets-fotos"). Recorre en
 * profundidad y agrupa por carpeta contenedora. Rechaza rutas absolutas
 * o que escapen de la raíz del proyecto.
 */
export function groupsFromServerFolder(relDir) {
  const target = resolve(PROJECT_ROOT, relDir || '');
  if (!target.startsWith(PROJECT_ROOT + sep) && target !== PROJECT_ROOT) {
    throw new Error('La carpeta debe vivir dentro del proyecto');
  }
  if (!existsSync(target) || !statSync(target).isDirectory()) {
    throw new Error(`La carpeta "${relDir}" no existe en el servidor`);
  }
  const out = [];
  walkHtmlFiles(target, target, out);
  const groups = collectGroupsFromEntries(out);
  if (!groups.length) throw new Error(`No se encontraron módulos HTML (secciones) dentro de "${relDir}"`);
  return groups;
}

/** Ensambla un demo por grupo, secuencialmente (amable con el proveedor). */
export async function buildDemoSetBatch({ groups, paletteId, provider }) {
  const results = [];
  for (const g of groups) {
    const t0 = Date.now();
    try {
      const r = await buildDemoSet({ files: g.files, paletteId, provider });
      results.push({
        ok: true,
        folder: g.folder,
        name: g.name,
        filename: `demo-${g.name}.html`,
        html: r.html,
        stats: r.stats,
        ms: Date.now() - t0
      });
      console.log(`[DEMO-SET] ▸ ${g.name}: ${r.stats.modulos} módulos, ${r.stats.imagenes.reemplazadas}/${r.stats.imagenes.total} imgs, ${(r.stats.bytes / 1048576).toFixed(2)} MB`);
    } catch (e) {
      results.push({ ok: false, folder: g.folder, name: g.name, filename: `demo-${g.name}.html`, error: e.message, ms: Date.now() - t0 });
      console.log(`[DEMO-SET] ▸ ${g.name}: FALLO (${e.message})`);
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Persistencia de lotes (server/storage/demo-sets) + limpieza de antiguos
// ---------------------------------------------------------------------------
export const BATCH_DIR = join(__dirname, 'storage', 'demo-sets');

export function saveBatch(results) {
  const batchId = `lote-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const dir = join(BATCH_DIR, batchId);
  mkdirSync(dir, { recursive: true });
  const zip = new AdmZip();
  const manifest = [];
  for (const r of results) {
    if (r.ok) {
      writeFileSync(join(dir, r.filename), r.html);
      zip.addFile(r.filename, Buffer.from(r.html, 'utf8'));
    }
    manifest.push({
      id: r.name,
      folder: r.folder,
      filename: r.filename,
      ok: r.ok,
      error: r.error || null,
      modulos: r.stats ? r.stats.modulos : 0,
      paleta: r.stats ? r.stats.paleta : null,
      imagenes: r.stats ? r.stats.imagenes : null,
      bytes: r.stats ? r.stats.bytes : 0,
      ms: r.ms || 0
    });
  }
  writeFileSync(join(dir, 'manifiesto.json'), JSON.stringify(manifest, null, 1));
  zip.addFile('manifiesto.json', Buffer.from(JSON.stringify(manifest, null, 1), 'utf8'));
  const zipBuffer = zip.toBuffer();
  writeFileSync(join(dir, 'todos-los-demos.zip'), zipBuffer);

  // Limpieza: lotes con más de 24h
  try {
    for (const d of readdirSync(BATCH_DIR)) {
      const p = join(BATCH_DIR, d);
      try {
        if (statSync(p).isDirectory() && Date.now() - statSync(p).mtimeMs > 24 * 3600 * 1000) rmSync(p, { recursive: true, force: true });
      } catch { /* ignorar */ }
    }
  } catch { /* ignorar */ }

  return { batchId, manifest, zipBytes: zipBuffer.length, dir };
}
