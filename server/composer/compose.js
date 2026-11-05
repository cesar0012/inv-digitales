/**
 * ============================================================================
 * INVITATION COMPOSER — event-first, module-only composition
 * ============================================================================
 *   1. Event selection   → the event's knowledge pack (eventKnowledge/)
 *   2. Knowledge (RAG)   → fields, roles, module plan and copy for that event
 *   3. Data              → the customer's structured, unlimited-row form data
 *   4. Module selection  → certified modules from the chosen design (library.js)
 *   5. Graphics          → image slots stay as placeholders here; the create
 *                          route sends them to Nano Banana (compileAllImagesToBase64)
 *   6. Content           → fill.js writes the data into the module slots
 *   7. Composition       → one responsive HTML document, noindex, with metadata
 *
 * The AI never writes the invitation's structure: if a module type is
 * missing, it is skipped and reported, never generated free-form.
 * ============================================================================
 */

import { resolvePack, validateEventData, moduleConditionMet } from '../eventKnowledge/index.js';
import { getDesign, designsForEvent } from './library.js';
import { fillModule, joinNames, norm, parseSection } from './fill.js';
import { parseHTML } from 'linkedom';

const HEX = /^#[0-9a-fA-F]{6}$/;
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const SKIP_REASONS = {
  rsvp: 'Tu plan no incluye confirmación de asistencia (RSVP).',
  data: 'Sin datos para esta sección.',
  flag: 'No se pidió.',
  missingModule: 'El diseño no tiene esta sección.',
  noSlots: 'El diseño no tiene espacio para estos datos.'
};

function skipReason(when) {
  if (when === 'rsvp') return SKIP_REASONS.rsvp;
  if (String(when).startsWith('flag:')) return SKIP_REASONS.flag;
  return SKIP_REASONS.data;
}

/** A module of this type from the chosen design, or from the closest other design. */
function pickModule(design, type, packId) {
  if (design.modules.has(type)) return { module: design.modules.get(type), borrowed: false };
  for (const other of designsForEvent(packId)) {
    if (other.id !== design.id && other.modules.has(type)) return { module: other.modules.get(type), borrowed: other.id };
  }
  return { module: null, borrowed: false };
}

function paletteBlocks(design, preferences) {
  const blocks = [];
  if (design.palette) {
    blocks.push(`<style data-design-palette="${escapeHtml(design.key)}">:root{${Object.entries(design.palette.vars).map(([k, v]) => `${k}:${v}`).join(';')}}</style>`);
  }
  const overrides = [];
  if (HEX.test(preferences.primaryColor || '')) overrides.push(`  --primary-color: ${preferences.primaryColor} !important;`);
  if (HEX.test(preferences.secondaryColor || '')) overrides.push(`  --secondary-color: ${preferences.secondaryColor} !important;`);
  if (overrides.length) {
    // Same block format the editor's palette panel reads and writes.
    blocks.push(`<style data-editor-color-vars="true">/* Paleta del editor */\n:root, [data-gemini-id] {\n${overrides.join('\n')}\n}</style>`);
  }
  return blocks.join('\n');
}

function assemble({ pack, design, data, sections, preferences, report }) {
  const names = pack.honorees === 2 ? joinNames([data.persona1, data.persona2]) : norm(data.nombre);
  const title = [names, pack.label].filter(Boolean).join(' · ') || 'Invitación';
  const metadata = {
    version: 1,
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    eventType: pack.label,
    theme: design.label,
    primaryColor: HEX.test(preferences.primaryColor || '') ? preferences.primaryColor : (design.swatch[0] || '#f472b6'),
    secondaryColor: HEX.test(preferences.secondaryColor || '') ? preferences.secondaryColor : (design.swatch[1] || '#fb7185'),
    hiddenModules: [],
    elementStyles: {},
    composition: { pack: pack.id, design: design.id, modules: report.modules.map((m) => m.id) }
  };
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow, noarchive">
<title>${escapeHtml(title)}</title>
<!-- Invitaciones Modernas · composición modular (sin HTML generado por IA) · diseño ${escapeHtml(design.id)} -->
${paletteBlocks(design, preferences)}
<style>
html { scroll-behavior: smooth; }
body { margin: 0; background: var(--bg-color, #fff); color: var(--text-color, #222); }
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
</style>
</head>
<body>
${sections.join('\n')}
<script type="application/json" id="invitation-editor-metadata">${JSON.stringify(metadata).replace(/</g, '\\u003c')}</script>
</body>
</html>`;
}

/**
 * Compose an invitation. Never calls an AI model.
 * @returns {{ html, pack, design, data, missing, report }}
 */
export function composeInvitation({ eventType, designId, data: rawData = {}, preferences = {}, hasRsvp = false }) {
  const pack = resolvePack(eventType);
  const { data, missing } = validateEventData(pack, rawData);
  const design = (designId && getDesign(designId)) || designsForEvent(pack.id)[0];
  if (!design) throw new Error('No hay diseños disponibles en la biblioteca.');

  const isoDateTime = data.fecha ? `${data.fecha}T${data.hora || '12:00'}:00` : null;
  const ctx = { pack, data, isoDateTime, adapting: !design.eventTypes.includes(pack.id) };
  const sections = [];
  const report = { modules: [], skipped: [], warnings: [] };

  for (const step of pack.modules) {
    if (!moduleConditionMet(step.when, data, { hasRsvp })) {
      report.skipped.push({ type: step.type, reason: skipReason(step.when) });
      continue;
    }
    const { module, borrowed } = pickModule(design, step.type, pack.id);
    if (!module) {
      report.skipped.push({ type: step.type, reason: SKIP_REASONS.missingModule });
      continue;
    }
    const runs = step.repeatPer ? (data[step.repeatPer] || []).map((item, i) => ({ item, instance: i + 1 })) : [{}];
    for (const run of runs) {
      const result = fillModule(module, { ...ctx, adapting: ctx.adapting || !!borrowed }, run);
      if (!result.ok) {
        report.skipped.push({ type: step.type, reason: SKIP_REASONS.noSlots });
        continue;
      }
      sections.push(result.html);
      report.modules.push({ type: step.type, id: module.id, borrowedFrom: borrowed || null, instance: run.instance || 1 });
      for (const w of result.warnings) report.warnings.push({ type: step.type, ...w });
    }
  }

  let html = assemble({ pack, design, data, sections, preferences, report });
  if (isoDateTime) html = html.replace(/window\.__countdownTarget\s*=\s*[^;]+;/g, `window.__countdownTarget='${isoDateTime}';`);
  const placeholderImages = (html.match(/loremflickr\.com/g) || []).length;
  return { html, pack: pack.id, design: design.id, data, missing, report: { ...report, placeholderImages } };
}

// ---------------------------------------------------------------------------
// FILL SOBRE HTML YA GENERADO (flujo combinado: base agéntica + datos del
// wizard). Recibe la invitación producida por el proceso agéntico (que ya
// eligió los módulos del rack, los adaptó y resolvió imágenes/tema) y escribe
// los datos del pack del evento con los mismos WRITERS certificados de
// fill.js. No llama IA, no cuesta crédito: es el motor de la vista previa
// en vivo y del cierre del wizard.
// ---------------------------------------------------------------------------
const KNOWN_TYPES = new Set(['portada', 'padres', 'ubicacion', 'itinerario', 'confirmacion', 'detalles', 'countdown', 'padrinos', 'corte', 'galeria', 'regalos', 'vestimenta']);

/** Tipo de una <section>: prefijo del data-gemini-id; fallback al tipo del
 *  moduleMetadata (el agéntico lo deja como script inerte o activo). */
function typeOfSection(sec) {
  const gid = sec.getAttribute('data-gemini-id') || '';
  const prefix = gid.split('-')[0];
  if (KNOWN_TYPES.has(prefix)) return prefix;
  for (const sc of sec.querySelectorAll('script')) {
    const m = (sc.textContent || '').match(/(?:module_type|tipo)\s*:\s*['"]([a-z]+)['"]/i);
    if (m && KNOWN_TYPES.has(m[1].toLowerCase())) return m[1].toLowerCase();
  }
  return null;
}

export function fillProvidedHtml({ html, eventType, data: rawData = {}, preferences = {}, hasRsvp = false }) {
  const pack = resolvePack(eventType);
  const { data, missing } = validateEventData(pack, rawData);
  const full = /^<!DOCTYPE/i.test(html) || /<html[\s>]/i.test(html) ? html : `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head><body>${html}</body></html>`;
  const { document } = parseHTML(full);
  const body = document.body || document.documentElement;

  const isoDateTime = data.fecha ? `${data.fecha}T${data.hora || '12:00'}:00` : null;
  const ctx = { pack, data, isoDateTime, adapting: false };
  const report = { modules: [], skipped: [], warnings: [] };
  const planByType = new Map(pack.modules.map((s) => [s.type, s]));
  const instancias = new Map();   // nº de secciones vistas por tipo
  const ultimoHtml = new Map();   // última sección llenada por tipo (plantilla para clonar)
  const ultimoNodo = new Map();   // último nodo insertado por tipo (ancla para clonar)

  // Llena una sección y devuelve { html, warnings } | null (sin insertar nada).
  const llenar = (sectionHtml, type, id, extra = {}) => {
    const r = fillModule({ section: sectionHtml, id, type }, ctx, extra);
    return r.ok ? { html: r.html, warnings: r.warnings } : null;
  };
  // Inserta los nodos de htmlStr ANTES de ref (o al final si ref es null) y
  // devuelve el último nodo insertado.
  const insertarEn = (htmlStr, ref) => {
    const wrap = document.createElement('div');
    wrap.innerHTML = htmlStr;
    const nodes = Array.from(wrap.childNodes).filter((n) => n.nodeType === 1 || (n.nodeType === 3 && (n.textContent || '').trim()));
    if (!nodes.length) return null;
    if (ref && ref.parentNode === body) { for (const nd of nodes) body.insertBefore(nd, ref); }
    else { body.append(...nodes); }
    return nodes[nodes.length - 1];
  };

  // Solo secciones hijas directas del body (los módulos van como hermanos).
  for (const sec of Array.from(body.children)) {
    if (String(sec.tagName).toUpperCase() !== 'SECTION') continue;
    const type = typeOfSection(sec);
    if (!type) continue; // sección sin tipo conocido: intacta
    const step = planByType.get(type);
    if (step && !moduleConditionMet(step.when, data, { hasRsvp })) {
      report.skipped.push({ type, reason: skipReason(step.when) });
      sec.remove();
      continue;
    }
    const n = (instancias.get(type) || 0) + 1;
    instancias.set(type, n);
    let extra = {};
    if (step && step.repeatPer) {
      const item = (data[step.repeatPer] || [])[n - 1];
      if (!item) { report.skipped.push({ type, reason: SKIP_REASONS.data }); sec.remove(); continue; }
      extra = { item, instance: n };
    }
    const id = sec.getAttribute('data-gemini-id') || type;
    const siguiente = sec.nextSibling; // hueco exacto de la sección
    const plantilla = sec.outerHTML;
    sec.remove();
    const done = llenar(plantilla, type, id, extra);
    if (!done) { report.skipped.push({ type, reason: SKIP_REASONS.noSlots }); continue; }
    const last = insertarEn(done.html, siguiente && siguiente.parentNode === body ? siguiente : null);
    ultimoHtml.set(type, done.html);
    if (last) ultimoNodo.set(type, last);
    report.modules.push({ type, id, borrowedFrom: null, instance: n });
    for (const w of done.warnings) report.warnings.push({ type, ...w });
  }

  // Ítems repetidos sin sección propia (2ª ubicación, 3er par de padrinos…):
  // se clona la última sección llenada del tipo y se rellena tras ella.
  for (const step of pack.modules) {
    if (!step.repeatPer) continue;
    const items = data[step.repeatPer] || [];
    const base = instancias.get(step.type) || 0;
    const extraItems = items.slice(base);
    if (!extraItems.length || !ultimoHtml.has(step.type)) continue;
    let ancla = ultimoNodo.get(step.type);
    for (let i = 0; i < extraItems.length; i++) {
      const done = llenar(ultimoHtml.get(step.type), step.type, step.type, { item: extraItems[i], instance: base + i + 1 });
      if (!done) continue;
      const last = insertarEn(done.html, ancla && ancla.parentNode === body ? ancla.nextSibling : null);
      if (last) { ancla = last; ultimoNodo.set(step.type, last); }
      report.modules.push({ type: step.type, id: step.type, borrowedFrom: null, instance: base + i + 1 });
      for (const w of done.warnings) report.warnings.push({ type: step.type, ...w });
    }
  }

  let finalHtml = '<!DOCTYPE html>\n' + (document.documentElement ? document.documentElement.outerHTML : body.innerHTML);
  // Paleta del cliente: el mismo bloque que el editor lee y escribe.
  const overrides = [];
  if (HEX.test(preferences.primaryColor || '')) overrides.push(`  --primary-color: ${preferences.primaryColor} !important;`);
  if (HEX.test(preferences.secondaryColor || '')) overrides.push(`  --secondary-color: ${preferences.secondaryColor} !important;`);
  if (overrides.length) {
    const block = `<style data-editor-color-vars="true">/* Paleta del editor */\n:root, [data-gemini-id] {\n${overrides.join('\n')}\n}</style>`;
    finalHtml = /<style data-editor-color-vars/.test(finalHtml)
      ? finalHtml.replace(/<style data-editor-color-vars[^]*?<\/style>/, block)
      : (/<\/head>/i.test(finalHtml) ? finalHtml.replace(/<\/head>/i, `${block}\n</head>`) : finalHtml.replace(/(<body[^>]*>)/i, `$1${block}`));
  }
  if (isoDateTime) {
    finalHtml = finalHtml.replace(/window\.__countdownTarget\s*=\s*[^;]+;/g, `window.__countdownTarget='${isoDateTime}';`);
    finalHtml = finalHtml.replace(/data-countdown-target="[^"]*"/g, `data-countdown-target="${isoDateTime}"`);
  }
  const placeholderImages = (finalHtml.match(/loremflickr\.com/g) || []).length;
  return { html: finalHtml, pack: pack.id, data, missing, report: { ...report, placeholderImages } };
}
