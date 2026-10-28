/**
 * ============================================================================
 * EVENT KNOWLEDGE — the event-specific "RAG" packs
 * ============================================================================
 * Each event type (quinceañera, boda, bautizo…) has a knowledge pack in
 * ./packs/<id>.json describing:
 *   - sections and fields the customer fills in, including repeatable groups
 *     (parents, padrinos, damas, chambelanes, locations, itinerary, gifts)
 *     with no fixed limit;
 *   - the module plan: which certified module types the invitation uses and
 *     under which condition (always, when there is data, when the plan has RSVP);
 *   - labels and copy used to adapt generic modules to that event.
 *
 * Packs are retrieved by event type (with aliases), validated, and handed to
 * the composer. They are plain JSON so they can later move to the database or
 * be edited from the admin panel without code changes.
 * ============================================================================
 */

import { readdirSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKS_DIR = join(__dirname, 'packs');

export const EVENT_ORDER = ['quinceanera', 'boda', 'bautizo', 'comunion', 'confirmacion', 'cumpleanos', 'baby_shower', 'otro'];

const LIMITS = { text: 200, textarea: 1000, url: 500, repeatItems: 60 };

const clone = (x) => JSON.parse(JSON.stringify(x));
export const normalizeText = (s) =>
  String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

let cache = null;

function resolveSection(section, base) {
  if (!section.ref) return clone(section);
  const src = base.sections[section.ref];
  if (!src) throw new Error(`Sección base desconocida: ${section.ref}`);
  const out = clone(src);
  if (section.title) out.title = section.title;
  if (section.description) out.description = section.description;
  // overrideOptions: { "padrinos.rol": [...] } or { "codigo_vestimenta": [...] }
  for (const [path, options] of Object.entries(section.overrideOptions || {})) {
    const [fieldKey, itemKey] = path.split('.');
    const field = out.fields.find((f) => f.key === fieldKey);
    if (!field) continue;
    const target = itemKey ? (field.itemFields || []).find((f) => f.key === itemKey) : field;
    if (target) target.options = options;
  }
  for (const [fieldKey, extra] of Object.entries(section.extraItemFields || {})) {
    const field = out.fields.find((f) => f.key === fieldKey);
    if (field) field.itemFields = [...(field.itemFields || []), ...clone(extra)];
  }
  if (Array.isArray(section.extraFields)) out.fields = [...out.fields, ...clone(section.extraFields)];
  return out;
}

export function loadPacks({ reload = false } = {}) {
  if (cache && !reload) return cache;
  const base = JSON.parse(readFileSync(join(PACKS_DIR, '_base.json'), 'utf-8'));
  const packs = new Map();
  for (const file of readdirSync(PACKS_DIR)) {
    if (!file.endsWith('.json') || file.startsWith('_')) continue;
    const raw = JSON.parse(readFileSync(join(PACKS_DIR, file), 'utf-8'));
    const pack = { ...raw, sections: raw.sections.map((s) => resolveSection(s, base)) };
    packs.set(pack.id, pack);
  }
  cache = packs;
  return packs;
}

/** Map any event name used in the apps ("XV Años", "Boda Gay - Hombres"…) to a pack. */
export function resolvePack(eventType) {
  const packs = loadPacks();
  const t = normalizeText(eventType);
  if (packs.has(t)) return packs.get(t);
  for (const pack of packs.values()) {
    if (normalizeText(pack.label) === t) return pack;
    if ((pack.aliases || []).some((a) => normalizeText(a) === t)) return pack;
  }
  if (/\bxv\b|quince/.test(t)) return packs.get('quinceanera');
  if (/boda|casamiento|matrimonio|wedding/.test(t)) return packs.get('boda');
  if (/bautiz|bautism/.test(t)) return packs.get('bautizo');
  if (/comunion/.test(t)) return packs.get('comunion');
  if (/confirmacion/.test(t)) return packs.get('confirmacion');
  if (/baby/.test(t)) return packs.get('baby_shower');
  if (/cumple|birthday/.test(t)) return packs.get('cumpleanos');
  return packs.get('otro');
}

export function listEventTypes() {
  const packs = loadPacks();
  return EVENT_ORDER.filter((id) => packs.has(id)).map((id) => {
    const p = packs.get(id);
    return { id: p.id, label: p.label, description: p.description, honorees: p.honorees };
  });
}

/** The pack as the client needs it (form + module plan; no internal copy). */
export function packForClient(pack) {
  return {
    id: pack.id,
    label: pack.label,
    description: pack.description,
    honorees: pack.honorees,
    sections: pack.sections,
    modules: pack.modules.map((m) => ({ type: m.type, when: m.when }))
  };
}

// ---------------------------------------------------------------------------
// Validation and cleaning of the customer's data
// ---------------------------------------------------------------------------

const cleanValue = (field, raw) => {
  if (raw === undefined || raw === null) return field.type === 'checkbox' ? false : '';
  if (field.type === 'checkbox') return raw === true || raw === 'true' || raw === 1 || raw === '1';
  let v = String(raw).replace(/\u0000/g, '').trim();
  if (field.type === 'date') return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '';
  if (field.type === 'time') return /^\d{1,2}:\d{2}$/.test(v) ? v.padStart(5, '0') : '';
  if (field.type === 'url') {
    if (!v) return '';
    if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
    try {
      const u = new URL(v);
      return /^https?:$/.test(u.protocol) ? u.toString().slice(0, LIMITS.url) : '';
    } catch {
      return '';
    }
  }
  if (field.type === 'select' && !field.allowCustom && Array.isArray(field.options) && field.options.length && !field.options.includes(v)) {
    return '';
  }
  return v.slice(0, field.type === 'textarea' ? LIMITS.textarea : LIMITS.text);
};

const isEmptyItem = (item) => Object.values(item).every((v) => v === '' || v === false || v === null || v === undefined);

/**
 * Clean the data against the pack's fields. Unknown keys are dropped, repeat
 * groups lose empty rows. Returns { data, missing } where `missing` lists the
 * required fields still empty (labels ready for the UI).
 */
export function validateEventData(pack, input = {}) {
  const data = {};
  const missing = [];
  for (const section of pack.sections) {
    for (const field of section.fields) {
      if (field.type === 'repeat') {
        const cap = Math.min(LIMITS.repeatItems, field.max || LIMITS.repeatItems);
        const rows = Array.isArray(input[field.key]) ? input[field.key].slice(0, LIMITS.repeatItems) : [];
        const items = [];
        rows.forEach((row) => {
          const item = {};
          for (const f of field.itemFields || []) item[f.key] = cleanValue(f, row && row[f.key]);
          if (!isEmptyItem(item)) items.push(item);
        });
        items.forEach((item, idx) => {
          for (const f of field.itemFields || []) {
            if (f.required && !item[f.key]) missing.push({ key: `${field.key}.${idx}.${f.key}`, label: `${field.itemLabel || field.key} ${idx + 1}: ${f.label}` });
          }
        });
        if ((field.min || 0) > items.length) missing.push({ key: field.key, label: `${section.title}: agrega al menos ${field.min}` });
        // Each place becomes its own module with an AI background, so a hard cap
        // keeps one credit from turning into dozens of image calls.
        data[field.key] = items.slice(0, cap);
      } else {
        data[field.key] = cleanValue(field, input[field.key]);
        if (field.required && !data[field.key]) missing.push({ key: field.key, label: field.label });
      }
    }
  }
  return { data, missing };
}

/** Does the data satisfy a module condition from the pack's module plan? */
export function moduleConditionMet(when, data, { hasRsvp = false } = {}) {
  if (!when || when === 'always') return true;
  if (when === 'rsvp') return !!hasRsvp;
  if (when.startsWith('flag:')) return data[when.slice(5)] === true;
  if (when.startsWith('data:')) {
    return when.slice(5).split('|').some((k) => {
      const v = data[k];
      return Array.isArray(v) ? v.length > 0 : !!(v && String(v).trim());
    });
  }
  return false;
}
