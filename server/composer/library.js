/**
 * ============================================================================
 * CERTIFIED MODULE LIBRARY — designs (sets) available to the composer
 * ============================================================================
 * A "design" is one coherent set of certified modules (portada, padres,
 * padrinos, corte, ubicacion, itinerario, countdown, vestimenta, regalos,
 * galeria, confirmacion…) that share a visual style. The composer never
 * writes module HTML: it only picks modules from here and fills their slots.
 *
 * Sources, in order of precedence:
 *   1. knowledge_base_modules rows imported from the sets (module_id
 *      "sf-<key>-<type>"): an inactive row removes that module; an active row
 *      supplies the HTML (so admins can manage modules from the panel).
 *   2. The module files in modulos-1/sets-fotos/set-NN-name/NN-type.html.
 * ============================================================================
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import db from '../database.js';
import { DEMO_PALETTES } from '../demoSetService.js';
import { normalizeText } from '../eventKnowledge/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = resolve(__dirname, '..', '..');
const SETS_ROOT = join(PROJECT_ROOT, 'modulos-1', 'sets-fotos');
const SHOTS_ROOT = join(PROJECT_ROOT, 'shots-sets-fotos');
const CONFIG = JSON.parse(readFileSync(join(__dirname, 'library-config.json'), 'utf-8'));

export const MODULE_TYPES = [
  'portada', 'countdown', 'padres', 'padrinos', 'corte', 'ubicacion', 'itinerario',
  'vestimenta', 'regalos', 'galeria', 'confirmacion', 'detalles'
];

const titleCase = (s) => s.replace(/[-_]+/g, ' ').replace(/\b\p{L}/gu, (c) => c.toUpperCase());

/** Pull tags / descripcion / style_name out of the module's moduleMetadata script. */
export function parseModuleMetadata(html) {
  const m = html.match(/moduleMetadata\s*=\s*\{([\s\S]*?)\}\s*;?/);
  const out = { tags: [], descripcion: '', style_name: '' };
  if (!m) return out;
  const grab = (k) => {
    const mm = m[1].match(new RegExp(k + "\\s*:\\s*['\"]([^'\"]*)['\"]"));
    return mm ? mm[1] : '';
  };
  out.descripcion = grab('descripcion');
  out.style_name = grab('style_name');
  const tags = m[1].match(/tags\s*:\s*\[([^\]]*)\]/);
  if (tags) out.tags = tags[1].split(',').map((t) => t.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
  return out;
}

/** The module's <section>…</section>, without anything around it. */
export function extractSection(html) {
  const s = html.indexOf('<section');
  const e = html.lastIndexOf('</section>');
  if (s === -1 || e === -1 || e < s) return null;
  return html.slice(s, e + '</section>'.length).trim();
}

const paletteFor = (key) => DEMO_PALETTES.find((p) => p.id === key) || null;

/** Fallback colors written inside the CSS (var(--primary-color,#hex)). */
function swatchFromCss(html) {
  const pick = (name) => {
    const m = html.match(new RegExp(`var\\(--${name}-color\\s*,\\s*(#[0-9a-fA-F]{3,8})`));
    return m ? m[1] : null;
  };
  return ['primary', 'secondary', 'bg', 'text'].map(pick).filter(Boolean);
}

function dbOverrides() {
  const map = new Map();
  try {
    const rows = db.prepare("SELECT module_id, html_content, is_active FROM knowledge_base_modules WHERE module_id LIKE 'sf-%'").all();
    for (const r of rows) map.set(r.module_id, r);
  } catch {
    /* table missing in a fresh database: files only */
  }
  return map;
}

let cache = null;
let cacheAt = 0;
const CACHE_MS = 60 * 1000;

/**
 * Scan the library. Returns Map<setId, design> where design =
 * { id, key, number, label, eventTypes[], generic, modules: Map<type, module>, palette, swatch, screenshot }
 */
export function loadLibrary({ reload = false } = {}) {
  if (cache && !reload && Date.now() - cacheAt < CACHE_MS) return cache;
  const designs = new Map();
  if (!existsSync(SETS_ROOT)) {
    cache = designs;
    cacheAt = Date.now();
    return designs;
  }
  const overrides = dbOverrides();
  for (const dir of readdirSync(SETS_ROOT).sort()) {
    const m = dir.match(/^set-(\d+)-(.+)$/);
    if (!m) continue;
    if (CONFIG.blockedSets[dir]) continue;
    const full = join(SETS_ROOT, dir);
    if (!statSync(full).isDirectory()) continue;
    const key = m[2];
    const modules = new Map();
    const tagEvents = new Set();
    let styleName = '';
    let swatch = [];
    for (const file of readdirSync(full).filter((f) => f.endsWith('.html')).sort()) {
      const type = MODULE_TYPES.find((t) => file.endsWith(`-${t}.html`));
      if (!type) continue;
      const moduleId = `sf-${key}-${type}`;
      const override = overrides.get(moduleId);
      if (override && override.is_active === 0) continue;
      const html = override?.html_content || readFileSync(join(full, file), 'utf-8');
      const section = extractSection(html);
      if (!section || !/data-gemini-id=/.test(section)) continue;
      const meta = parseModuleMetadata(html);
      for (const tag of meta.tags) {
        const ev = CONFIG.tagToEvent[normalizeText(tag)] || CONFIG.tagToEvent[tag.toLowerCase()];
        if (ev) tagEvents.add(ev);
      }
      if (!styleName && meta.style_name) styleName = meta.style_name;
      if (!swatch.length) swatch = swatchFromCss(html);
      modules.set(type, { id: moduleId, type, setId: dir, file: `sets-fotos/${dir}/${file}`, section, meta });
    }
    if (!modules.has('portada')) continue; // not usable without a cover
    const affinity = CONFIG.eventAffinity[dir];
    const eventTypes = affinity ? affinity : [...tagEvents];
    const palette = paletteFor(key);
    const shotFile = `shot-mobile-${dir}.png`;
    designs.set(dir, {
      id: dir,
      key,
      number: parseInt(m[1], 10),
      label: palette?.label || titleCase(key),
      styleName,
      eventTypes,
      generic: eventTypes.length === 0,
      modules,
      palette,
      swatch: palette ? [palette.vars['--primary-color'], palette.vars['--secondary-color'], palette.vars['--bg-color'], palette.vars['--text-color']] : swatch,
      screenshot: existsSync(join(SHOTS_ROOT, shotFile)) ? shotFile : null
    });
  }
  cache = designs;
  cacheAt = Date.now();
  return designs;
}

/** Designs offered for an event type: designs made for it first, then all-purpose ones. */
export function designsForEvent(packId) {
  const out = [];
  for (const d of loadLibrary().values()) {
    const match = d.eventTypes.includes(packId);
    if (!match && !d.generic) continue;
    out.push({ design: d, match });
  }
  out.sort((a, b) => (b.match - a.match) || (a.design.number - b.design.number));
  return out.map((x) => x.design);
}

export function designSummary(d, packId) {
  return {
    id: d.id,
    label: d.label,
    madeFor: d.eventTypes.includes(packId),
    eventTypes: d.eventTypes,
    modules: [...d.modules.keys()],
    swatch: d.swatch,
    screenshot: d.screenshot ? `/api/designs/${encodeURIComponent(d.id)}/screenshot` : null
  };
}

export function getDesign(id) {
  return loadLibrary().get(id) || null;
}

export const SCREENSHOTS_DIR = SHOTS_ROOT;
