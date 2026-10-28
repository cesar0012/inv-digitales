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
import { fillModule, joinNames, norm } from './fill.js';

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
