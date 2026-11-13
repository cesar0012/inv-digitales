/**
 * ============================================================================
 * PRODUCT PAGE SSR — página de producto del catálogo
 * ============================================================================
 * Implementación fiel de product-page-reference/product-page-reference.html
 * (v1.0) siguiendo product-page-dev-guide.md:
 *   - HTML 100% server-rendered (guía §2): sin JS, demo y FAQ con <details>.
 *   - 12 secciones del Doc + planes + related + explore (guía §6).
 *   - data-slot en los elementos que vienen de datos; data-hva en los CTAs
 *     (guía §10).
 *   - Related products y explore links SIEMPRE desde la BD, nunca inventados
 *     (guía §7); se ocultan si no hay suficientes reales.
 *   - Un solo @graph con Organization, WebSite, WebPage, BreadcrumbList (4
 *     niveles), ImageObject, Product (offers solo con precio) y FAQPage
 *     (guía §8). Nunca ratings ni Event.
 *   - Sin tokens {{ }} ni palabras prohibidas en texto visible (guía §5).
 * ============================================================================
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { hasOgScreenshot, ogScreenshotFile } from '../screenshotService.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BRAND_NAME = 'Invitaciones Modernas';
export const DEFAULT_PUBLIC_URL = 'https://generador.invitacionesmodernas.com';

// CSS compartido (una sola lectura, cacheado) — copia exacta del reference
let _css = null;
const css = () => {
  if (!_css) {
    try { _css = readFileSync(join(__dirname, 'product-page.css'), 'utf8'); }
    catch { _css = ''; }
  }
  return _css;
};

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const parseJson = (raw, fb = null) => {
  if (raw == null) return fb;
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch { return fb; }
};
const stripTags = (html) => String(html || '').replace(/<[^>]*>/g, ' ').replace(/\s{2,}/g, ' ').trim();
const stripDates = (t) => String(t || '')
  .replace(/\s+(para el|el)\s+\d{1,2}\s+de\s+[a-záéíóúñ]+\s+de\s+\d{4}/gi, '')
  .replace(/,?\s+a\s+las?\s+\d{1,2}[:.]\d{2}\s*(hrs?|horas?)?/gi, '')
  .replace(/\s{2,}/g, ' ').trim();

const sanitizeHtml = (html) => String(html || '')
  .replace(/<script[\s\S]*?<\/script>/gi, '')
  .replace(/<style[\s\S]*?<\/style>/gi, '')
  .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
  .replace(/javascript:/gi, '');

// slug-segmento del evento: "Boda"→"boda", "XV años"→"xv-anos"
const slugify = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
export const eventKeyOf = (item) => {
  const slug = String(item.slug || '');
  if (slug.includes('/')) return slug.split('/')[0];
  return slugify(item.event_type) || 'invitacion';
};

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const dateOnly = (s) => { const m = String(s || '').match(/(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[1]}-${m[2]}-${m[3]}` : new Date().toISOString().slice(0, 10); };
const humanDate = (s) => { const m = String(s || '').match(/(\d{4})-(\d{2})-(\d{2})/); return m ? `${parseInt(m[3], 10)} de ${MESES[parseInt(m[2], 10) - 1]} de ${m[1]}` : ''; };

// gradiente SVG como placeholder de imagen de tarjeta (mismo patrón del reference)
const gradientPlaceholder = (c1, c2) => {
  const a = /^#([0-9a-f]{6})$/i.test(String(c1 || '')) ? c1 : '#fbeff0';
  const b = /^#([0-9a-f]{6})$/i.test(String(c2 || '')) ? c2 : '#b8324f';
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 5'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${a}'/><stop offset='1' stop-color='${b}'/></linearGradient></defs><rect width='4' height='5' fill='url(%23g)'/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg).replace(/'/g, '%27').replace(/%22/g, '"')}`;
};

// ---------------------------------------------------------------------------
// Detectar secciones incluidas desde el HTML de la invitación (guía §4:
// "modules must come from the actual invitation file")
// ---------------------------------------------------------------------------
const SECTION_LABELS = {
  portada: { label: 'Portada con tu nombre', note: 'Presentación principal con tu nombre.' },
  padres: { label: 'Mis padres', note: 'Un espacio para honrar a tus papás.' },
  padrinos: { label: 'Mis padrinos', note: 'Nombres de cada pareja de padrinos.' },
  countdown: { label: 'Cuenta regresiva', note: 'Días, horas y minutos para tu fiesta.' },
  itinerario: { label: 'Itinerario', note: 'Misa, recepción, vals, cena y baile.' },
  ubicacion: { label: 'Ubicación con mapa', note: 'El lugar y cómo llegar con un toque.' },
  confirmacion: { label: 'Confirmación de asistencia', note: 'Tus invitados confirman desde la invitación.' },
  galeria: { label: 'Galería de fotos', note: 'Tus fotos favoritas en una sola sección.' },
  regalos: { label: 'Mesa de regalos', note: 'Tu lista de regalos o un mensaje especial.' },
  vestimenta: { label: 'Código de vestimenta', note: 'Etiqueta, colores reservados y detalles.' },
  corte: { label: 'Corte de honor', note: 'Damas y chambelanes.' },
  detalles: { label: 'Detalles del evento', note: 'Información adicional de tu celebración.' }
};
const AGREGABLES = ['confirmacion', 'galeria', 'regalos', 'corte'];

function detectarSecciones(html) {
  if (!html) return { incluidas: [], agregables: [], tipos: new Set(), keyLabel: '', includedLabel: '' };
  const tipos = new Set();
  const ids = html.match(/data-gemini-id="([a-z]+)/g) || [];
  ids.forEach((m) => { const t = m.replace(/data-gemini-id="/, ''); if (SECTION_LABELS[t]) tipos.add(t); });
  const sections = html.match(/<section[^>]*data-gemini-id="([a-z]+)/g) || [];
  sections.forEach((s) => { const m = s.match(/data-gemini-id="([a-z]+)/); if (m && SECTION_LABELS[m[1]]) tipos.add(m[1]); });

  const incluidas = [...tipos].filter((t) => !AGREGABLES.includes(t)).map((t) => SECTION_LABELS[t]);
  const agregables = AGREGABLES.filter((t) => !tipos.has(t)).map((t) => SECTION_LABELS[t]);
  const keyLabel = incluidas.slice(0, 3).map((s) => s.label.split(' con')[0].split(' de ')[0]).join(', ');
  const includedLabel = incluidas.map((s) => s.label).join(', ');
  return { incluidas, agregables, tipos, keyLabel, includedLabel };
}

// ---------------------------------------------------------------------------
// Planes (desde la BD o defaults de 3 — guía §6: "Three plans only")
// ---------------------------------------------------------------------------
const PLAN_DEFAULTS = [
  { key: 'catalogo', name: 'Plan Catálogo', featured: false, designs: 5, changes: 10 },
  { key: 'creativa', name: 'Plan Creativa', featured: true, designs: 7, changes: 14 },
  { key: 'premium', name: 'Plan Premium', featured: false, designs: 10, changes: 20 }
];

function getPlanes(db) {
  try {
    const rows = db.prepare("SELECT * FROM plan_config WHERE plan_slug IN ('catalogo','creativa','premium') ORDER BY CASE plan_slug WHEN 'catalogo' THEN 1 WHEN 'creativa' THEN 2 ELSE 3 END").all();
    if (rows.length >= 2) {
      return rows.map((r) => ({
        key: r.plan_slug, name: r.plan_name || r.plan_slug,
        featured: r.plan_slug === 'creativa',
        designs: r.generation_credits || 5, changes: r.iteration_credits || 10,
        price: r.price || null, url: 'https://app.invitacionesmodernas.com/app/planes'
      }));
    }
  } catch { /* usar defaults */ }
  return PLAN_DEFAULTS.map((p) => ({ ...p, price: null, url: 'https://app.invitacionesmodernas.com/app/planes' }));
}

// ---------------------------------------------------------------------------
// FAQ — las 13 preguntas del reference (guía §5: "Same 13 questions from the
// doc, answers specific to this design"), adaptadas a los módulos detectados.
// Si el producto tiene faqs propias en seo_content_json (>=6), se usan.
// ---------------------------------------------------------------------------
function buildFaqs(modulos, eventoLabel) {
  const tiene = (t) => modulos.tipos.has(t);
  const rsvp = tiene('confirmacion')
    ? 'Sí. Tus invitados confirman su asistencia con un toque desde la propia invitación y tú ves las respuestas.'
    : 'Este diseño todavía no trae confirmación de asistencia, pero puedes agregarla con el mismo estilo de colores y letras.';
  const mapa = tiene('ubicacion')
    ? 'Sí. La sección de ubicación muestra el lugar de la fiesta con un mapa que tus invitados abren con un toque.'
    : 'Puedes agregar una sección de ubicación con mapa que tus invitados abren con un toque.';
  const countdown = tiene('countdown')
    ? 'Sí, incluye una cuenta regresiva que se actualiza sola cada vez que tus invitados abren el enlace.'
    : 'Puedes agregar una cuenta regresiva que se actualiza sola hasta la fecha de tu evento.';

  return [
    { q: '¿Puedo personalizar esta invitación digital?', a: `Sí. Cambias los nombres, la fecha, los horarios, los lugares, los nombres de los padres y padrinos, tus fotos y cada texto, y ves el resultado antes de compartirla.` },
    { q: '¿Puedo cambiar los colores?', a: 'Sí. Puedes ajustar los colores principales para que combinen con la decoración o el vestido, o pedir un cambio con IA para una sección en otro tono.' },
    { q: '¿Puedo agregar o quitar secciones?', a: 'Sí. Puedes ocultar las secciones que no uses y agregar otras, como confirmación de asistencia o galería de fotos. Algunas secciones dependen del plan que elijas.' },
    { q: '¿Puedo cambiar solo una sección?', a: 'Sí. Pides un cambio con IA para una sola sección, por ejemplo una cuenta regresiva más lujosa, y el resto de la invitación se queda igual.' },
    { q: '¿Puedo crear una invitación completamente nueva con IA?', a: 'Sí. Describes tu fiesta, colores, estilo y las secciones que quieres, y la IA crea un diseño nuevo desde cero.' },
    { q: '¿Mis invitados pueden confirmar asistencia desde la invitación?', a: rsvp },
    { q: '¿La invitación incluye un mapa?', a: mapa },
    { q: '¿Puedo agregar fotos?', a: 'Sí. Puedes subir tus fotos favoritas y agregar una galería si quieres mostrar más.' },
    { q: '¿Puedo hacer la invitación bilingüe?', a: 'Sí. Puedes escribir los textos en español y en inglés para que todos tus invitados entiendan cada detalle.' },
    { q: '¿Puedo compartirla por mensaje de texto o WhatsApp?', a: 'Sí. Compartes un solo enlace por WhatsApp, mensaje de texto, correo o redes sociales, sin límite de invitados.' },
    { q: '¿Se ve bien en el celular?', a: 'Sí. Está diseñada primero para el celular y también se ve bien en tabletas y computadoras.' },
    { q: '¿Mis invitados necesitan descargar una app?', a: 'No. La invitación se abre en el navegador del teléfono al tocar el enlace, sin descargas ni registros.' },
    { q: '¿Qué pasa después de personalizar la invitación?', a: 'Eliges tu plan, recibes tu enlace y lo compartes. Si después cambias un horario o un dato, el cambio se ve en el mismo enlace que ya enviaste.' }
  ];
}

// ---------------------------------------------------------------------------
// Related products (guía §7 — scoring sobre la BD, nunca links inventados)
// ---------------------------------------------------------------------------
function getRelated(db, item, limit = 4) {
  let rows;
  try {
    rows = db.prepare('SELECT filename, title, event_type, theme, colors, tags, slug, primary_color, secondary_color FROM catalogo WHERE starred = 1 AND slug IS NOT NULL').all();
  } catch { return []; }
  const colorTokens = (s) => [...new Set(String(s || '').toLowerCase().split(/[,/]|\sy\s/).map((t) => t.trim()).filter((t) => t.length > 2 && !['los', 'las', 'con'].includes(t)))];
  const curEvent = eventKeyOf(item);
  const curTheme = String(item.theme || '').toLowerCase().trim();
  const curColors = colorTokens(item.colors);
  const curTags = new Set((parseJson(item.tags, []) || []).map((t) => String(t).toLowerCase()));

  const candidates = rows
    .filter((r) => r.slug && r.slug !== item.slug)
    .map((r) => {
      const ev = eventKeyOf(r);
      const sameEvent = ev === curEvent;
      const sameTheme = curTheme && String(r.theme || '').toLowerCase().trim() === curTheme;
      const colors = colorTokens(r.colors);
      const sharesColor = curColors.some((c) => colors.some((cc) => cc === c || (c.length > 3 && cc.includes(c))));
      const sharesStyle = (parseJson(r.tags, []) || []).some((t) => curTags.has(String(t).toLowerCase()));
      let score = 0;
      if (sameEvent && sameTheme) score += 3;
      else if (sameEvent && sharesColor) score += 2;
      else if (sameEvent && sharesStyle) score += 2;
      else if (!sameEvent && sameTheme) score += 1;
      else if (!sameEvent && sharesColor) score += 1;
      let label = 'Otro evento · mismo tema';
      if (sameEvent && sameTheme) label = 'Mismo evento · estilo similar';
      else if (sameEvent && sharesColor) label = 'Mismo evento · mismos colores';
      else if (sameEvent) label = 'Mismo evento · otro tema';
      else if (sameTheme) label = 'Otro evento · mismo tema';
      else if (sharesColor) label = 'Otro evento · mismos colores';
      return { row: r, sameEvent, score, label };
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score);

  // top N con máximo limit-1 del mismo evento (para garantizar variedad)
  const picked = [];
  let sameEventCount = 0;
  for (const c of candidates) {
    if (picked.length >= limit) break;
    if (c.sameEvent && sameEventCount >= limit - 1) continue;
    if (c.sameEvent) sameEventCount++;
    picked.push(c);
  }
  return picked;
}

// ---------------------------------------------------------------------------
// Explore links (guía §7: solo hubs con >=2 productos publicados)
// ---------------------------------------------------------------------------
const EVENT_LABELS = { boda: 'Invitaciones de boda', 'xv-anos': 'Invitaciones de XV años', cumpleanos: 'Invitaciones de cumpleaños', 'baby-shower': 'Invitaciones de baby shower', bautizo: 'Invitaciones de bautizo', graduacion: 'Invitaciones de graduación' };
export function getExploreEvents(db) {
  try {
    const rows = db.prepare('SELECT event_type, slug FROM catalogo WHERE starred = 1 AND slug IS NOT NULL').all();
    const counts = new Map();
    rows.forEach((r) => {
      const k = eventKeyOf(r);
      counts.set(k, (counts.get(k) || 0) + 1);
    });
    return [...counts.entries()]
      .filter(([, n]) => n >= 2)
      .map(([k, n]) => ({ key: k, url: `/catalogo/${k}/`, label: EVENT_LABELS[k] || (rows.find((r) => eventKeyOf(r) === k)?.event_type ? `Invitaciones de ${rows.find((r) => eventKeyOf(r) === k).event_type.toLowerCase()}` : 'Invitaciones'), n }));
  } catch { return []; }
}

// ---------------------------------------------------------------------------
// Renderer principal — espejo de product-page-reference.html
// ---------------------------------------------------------------------------
export function renderProductPage(item, ctx = {}) {
  const db = ctx.db;
  const publicUrl = String(ctx.publicUrl || DEFAULT_PUBLIC_URL).replace(/\/+$/, '');
  const requestPath = ctx.requestPath || `/catalogo/${item.slug}`;
  const canonical = `${publicUrl}${requestPath}`;

  const seo = parseJson(item.seo_content_json, {}) || {};
  const sections = seo?.sections || {};
  const secHtml = (n) => sanitizeHtml(sections[`section_${n}`]?.html || '');

  // Detectar módulos desde la invitación
  const modulos = detectarSecciones(ctx.invitationHtml || '');

  // Meta
  const title = stripDates(item.seo_title || item.title || 'Invitación digital');
  const metaDesc = stripDates(item.meta_description || `Invitación digital de ${(item.event_type || 'celebración').toLowerCase()}. Personalízala en minutos y compártela por WhatsApp.`);
  const h1Text = seo?.h1 || item.h1 || item.seo_title || item.title || 'Invitación digital';
  const h1 = esc(h1Text);

  const eventoLabel = item.event_type || 'Invitación digital';
  const eventoKey = eventKeyOf(item);
  const eventoLow = eventoLabel.toLowerCase();
  const colorsLabel = item.colors || '';
  const styleTags = (parseJson(item.tags, []) || []).filter(Boolean);
  const styleLabel = styleTags.length ? styleTags.map((t) => String(t).toLowerCase()).join(', ') : 'Elegante';

  // hero_summary: dos frases (qué es + qué encuentran los invitados)
  const heroSummary = stripTags(secHtml(1)) || `Esta invitación digital de ${eventoLow}${colorsLabel ? ` combina ${colorsLabel}` : ''}${item.theme ? ` con tema de ${item.theme.toLowerCase()}` : ''}. Tus invitados la abren desde un enlace de WhatsApp${modulos.keyLabel ? ` y encuentran ${modulos.keyLabel.toLowerCase()}` : ' y ven todos los datos de tu celebración'}.`;

  // Planes, FAQ, related, explore
  const planes = getPlanes(db);
  const customFaqs = Array.isArray(sections.section_11?.faqs) ? sections.section_11.faqs : [];
  const faqs = customFaqs.length >= 6
    ? customFaqs.map((f) => ({ q: f.question || f.q, a: f.answer || f.a }))
    : buildFaqs(modulos, eventoLabel);
  const related = getRelated(db, item);
  const exploreEvents = getExploreEvents(db);

  // Iteration examples (guía §6 #7: 6 ejemplos)
  const prompts = Array.isArray(sections.section_7?.example_prompts) && sections.section_7.example_prompts.length
    ? sections.section_7.example_prompts
    : [
        'Agrega una sección de música que combine con este diseño.',
        'Haz la confirmación de asistencia más elegante.',
        'Crea una cuenta regresiva de lujo con detalles dorados.',
        'Agrega una galería de fotos más grande.',
        'Cambia el código de vestimenta a otros tonos.',
        'Agrega la mesa de regalos con la misma paleta.'
      ];

  // Colores del diseño → variables CSS + theme-color (reference: --accent del diseño)
  const c1 = /^#[0-9a-f]{6}$/i.test(item.primary_color || '') ? item.primary_color : '';
  const c2 = /^#[0-9a-f]{6}$/i.test(item.secondary_color || '') ? item.secondary_color : '';
  const accentOverride = (c1 || c2)
    ? `<style>:root{${c1 ? `--accent:${c1};` : ''}${c2 ? `--accent-2:${c2};` : ''}}</style>\n`
    : '';

  // OG image
  const ogImage = hasOgScreenshot(item.slug)
    ? `${publicUrl}/storage/og/${ogScreenshotFile(item.slug)}`
    : '';
  const heroImg = ogImage || gradientPlaceholder(c1 || '#fbeff0', c2 || '#b8324f');
  const heroAlt = `Invitación digital de ${eventoLow}${item.theme ? ` con tema de ${item.theme.toLowerCase()}` : ''}${colorsLabel ? ` en tonos ${colorsLabel}` : ''} vista en un celular`;

  // URL helpers
  const demoUrl = `${publicUrl}/preview/${item.filename}`;
  const customizeUrl = `/editor?filename=${encodeURIComponent(item.filename)}`;
  const editorHref = item.filename ? customizeUrl : '/editor';
  const aiUrl = '/editor';

  // Fechas
  const dateModified = dateOnly(item.created_at);
  const updatedHuman = humanDate(item.created_at);

  // JSON-LD
  const jsonLd = buildProductSchema(item, {
    h1: h1Text, title, metaDesc, canonical, ogImage, faqs, planes, publicUrl,
    dateModified, eventoLabel, colorsLabel, modulos
  });

  // ---- bloques ------------------------------------------------------------
  const faqHtml = faqs.map((f) => `
        <details><summary><h3>${esc(f.q)}</h3></summary><p>${esc(f.a)}</p></details>`).join('\n');

  const planesHtml = planes.map((p) => `
          <article class="plan${p.featured ? ' is-featured' : ''}">
            ${p.featured ? '<span class="badge">Recomendado</span>' : ''}
            <h3>${esc(p.name)}</h3>
            <p class="price">${p.price ? esc(p.price) : 'Consultar precio'} <small>MXN</small></p>
            <ul class="ticks">
              <li>1 invitación con este diseño</li>
              <li>${p.designs} diseños nuevos con IA</li>
              <li>${p.changes} cambios de sección con IA</li>
            </ul>
            <a class="btn ${p.featured ? 'btn-primary' : 'btn-ghost'}" href="${esc(p.url)}" data-slot="plans.${p.key}.url"
               data-hva="cta_click" data-hva-cta="plan_${p.key}" data-hva-location="plans">Elegir ${esc(p.name)}</a>
          </article>`).join('\n');

  const incluidasHtml = modulos.incluidas.map((s) => `<li><span class="ico" aria-hidden="true">✓</span><span>${esc(s.label)}<small>${esc(s.note)}</small></span></li>`).join('\n              ');
  const agregablesHtml = modulos.agregables.map((s) => `<li><span class="ico" aria-hidden="true">＋</span><span>${esc(s.label)}<small>${esc(s.note)}</small></span></li>`).join('\n              ');

  const promptsHtml = prompts.slice(0, 6).map((p) => `<li>“${esc(String(p).replace(/^“|”$/g, ''))}”</li>`).join('\n          ');

  const relatedHtml = related.map((c) => {
    const r = c.row;
    const img = hasOgScreenshot(r.slug)
      ? `${publicUrl}/storage/og/${ogScreenshotFile(r.slug)}`
      : gradientPlaceholder(r.primary_color, r.secondary_color);
    const alt = stripDates(r.seo_title || r.title || 'Invitación digital');
    return `
          <article class="card">
            <img src="${esc(img)}" alt="${esc(alt)}" width="400" height="500" loading="lazy">
            <div class="card-body">
              <p class="rel">${esc(c.label)}</p>
              <h3><a href="/catalogo/${esc(r.slug)}">${esc(alt)}</a></h3>
              <p>${esc(r.theme || r.colors || 'Diseño personalizable')}</p>
            </div>
          </article>`;
  }).join('\n');

  const exploreHtml = exploreEvents.length
    ? `
        <p class="group-label">Por tipo de evento</p>
        <ul class="pills" data-slot="explore.events[]">
${exploreEvents.map((e) => `          <li><a href="${esc(e.url)}">${esc(e.label)}</a></li>`).join('\n')}
        </ul>`
    : '';
  const exploreSection = exploreEvents.length ? `
    <!-- Doc §10 — solo hubs con >=2 diseños publicados; estilo/color/tema se muestran cuando existan -->
    <section aria-labelledby="explorar">
      <div class="wrap">
        <h2 id="explorar">Más estilos de invitaciones digitales para tu celebración</h2>
        <div class="rule"></div>${exploreHtml}
      </div>
    </section>` : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">

  <title data-slot="seo.title">${esc(title)}</title>
  <meta name="description" data-slot="seo.meta_description" content="${esc(metaDesc)}">
  <link rel="canonical" data-slot="page.canonical_url" href="${esc(canonical)}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <meta name="theme-color" content="${esc(c1 || '#b8324f')}">

  <meta property="og:type" content="product">
  <meta property="og:locale" content="es_MX">
  <meta property="og:site_name" content="${BRAND_NAME}">
  <meta property="og:title" content="${esc(h1Text)}">
  <meta property="og:description" content="${esc(metaDesc)}">
  <meta property="og:url" content="${esc(canonical)}">
  ${ogImage ? `<meta property="og:image" content="${esc(ogImage)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${esc(heroAlt)}">` : ''}
  <meta name="twitter:card" content="summary_large_image">

  <script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>
  ${accentOverride}<style>${css()}</style>
</head>

<body>
  <a class="skip" href="#contenido">Saltar al contenido</a>

  <nav class="crumbs wrap" aria-label="Migas de pan">
    <ol>
      <li><a href="/">Inicio</a></li>
      <li><a href="/catalogo/">Catálogo</a></li>
      <li><a href="/catalogo/${esc(eventoKey)}/" data-slot="taxonomy.event.url">Invitaciones de ${esc(eventoLow)}</a></li>
      <li aria-current="page" data-slot="copy.h1">${h1}</li>
    </ol>
  </nav>

  <main id="contenido">

    <!-- ========== Doc §1 HERO ========== -->
    <section class="hero" aria-labelledby="h1">
      <div class="wrap hero-grid">
        <div>
          <span class="eyebrow">Invitación digital · ${esc(eventoLabel)}</span>
          <h1 id="h1" data-slot="copy.h1">${h1}</h1>
          <p class="lead" data-slot="copy.hero_summary">${esc(heroSummary)}</p>

          <ul class="chips" aria-label="Resumen del diseño">
            <li><b>Evento:</b> <span data-slot="taxonomy.event.label">${esc(eventoLabel)}</span></li>
            ${item.theme ? `<li><b>Tema:</b> <span>${esc(item.theme)}</span></li>` : ''}
            ${colorsLabel ? `<li><b>Colores:</b> <span>${esc(colorsLabel)}</span></li>` : ''}
            ${modulos.keyLabel ? `<li><b>Incluye:</b> <span>${esc(modulos.keyLabel)}</span></li>` : ''}
          </ul>

          <div class="cta-row">
            <a class="btn btn-primary" href="${esc(editorHref)}" data-slot="urls.customize"
               data-hva="cta_click" data-hva-cta="customize" data-hva-location="hero">Personalizar esta invitación</a>
            <a class="btn btn-ghost" href="#demo" data-hva="cta_click" data-hva-cta="view_demo" data-hva-location="hero">Ver la invitación en vivo</a>
          </div>
          <p class="reassure">Sin descargas · Se comparte por WhatsApp · Cambias tus datos cuando quieras ·
            <a href="#crear-con-ia" data-hva="cta_click" data-hva-cta="generate_ai" data-hva-location="hero">¿Buscas otro estilo? Créala con IA</a></p>
        </div>

        <figure class="hero-media" style="margin:0">
          <img data-slot="images.preview.src" src="${esc(heroImg)}" alt="${esc(heroAlt)}"
               width="1200" height="630" fetchpriority="high" decoding="async">
        </figure>
      </div>
    </section>

    <!-- ========== Doc §2 QUICK PRODUCT DETAILS ========== -->
    <section class="alt" aria-labelledby="detalles">
      <div class="wrap">
        <h2 id="detalles">Detalles de esta invitación de ${esc(eventoLow)}</h2>
        <div class="rule"></div>
        <dl class="facts">
          <div><dt>Evento</dt><dd data-slot="taxonomy.event.label">${esc(eventoLabel)}</dd></div>
          ${item.theme ? `<div><dt>Tema</dt><dd>${esc(item.theme)}</dd></div>` : ''}
          <div><dt>Estilo</dt><dd>${esc(styleLabel)}</dd></div>
          ${colorsLabel ? `<div><dt>Colores principales</dt><dd>${esc(colorsLabel)}</dd></div>` : ''}
          ${modulos.includedLabel ? `<div><dt>Secciones incluidas</dt><dd>${esc(modulos.includedLabel)}</dd></div>` : ''}
          ${modulos.agregables.length ? `<div><dt>Puedes agregar</dt><dd>${esc(modulos.agregables.map((s) => s.label).join(', '))}</dd></div>` : ''}
          <div><dt>Idioma</dt><dd>Español (puedes agregar textos en inglés)</dd></div>
          <div><dt>Formato</dt><dd>Invitación digital interactiva, hecha para celular</dd></div>
          <div><dt>Cómo se entrega</dt><dd>Un enlace para compartir por WhatsApp, mensaje o redes sociales</dd></div>
          <div><dt>Dispositivos</dt><dd>Celular, tableta y computadora, sin instalar apps</dd></div>
        </dl>
      </div>
    </section>

    <!-- ========== Doc §3 WHAT THIS INVITATION IS ABOUT ========== -->
    <section aria-labelledby="sobre">
      <div class="wrap split">
        <div>
          <h2 id="sobre">Cómo es esta invitación digital de ${esc(eventoLow)}${item.theme ? ` con tema de ${esc(item.theme.toLowerCase())}` : ''}</h2>
          <div class="rule"></div>
          <div data-slot="copy.about_html">${secHtml(4) || `<p>Esta invitación fue creada para ${eventoLow === 'xv años' ? 'unos XV años' : `una ${eventoLow}`}${colorsLabel ? ` en ${colorsLabel}` : ''}${item.theme ? `, con tema de ${item.theme.toLowerCase()}` : ''}, pensada para que la primera pantalla se sienta como la entrada a la fiesta.</p><p>Tus invitados ven la presentación con tus nombres, siguen la cuenta regresiva y revisan cada momento de la celebración. Con un toque abren el mapa del lugar y saben qué código de vestimenta llevar.</p>`}</div>
        </div>
        <div>
          <h3>Por qué funciona para ${eventoLow === 'xv años' ? 'unos XV años' : `una ${eventoLow}`} ${styleLabel.split(',')[0]}</h3>
          <ul class="ticks" data-slot="copy.fit_points">
            <li>Todo lo importante de la fiesta en un solo enlace, fácil de reenviar.</li>
            ${modulos.tipos.has('itinerario') ? '<li>El itinerario ayuda a que nadie se pierda ningún momento de la celebración.</li>' : ''}
            ${modulos.tipos.has('vestimenta') ? '<li>El código de vestimenta evita dudas y llamadas de última hora.</li>' : ''}
            ${modulos.tipos.has('ubicacion') ? '<li>El mapa lleva a tus invitados al lugar sin confusiones.</li>' : ''}
            ${colorsLabel ? `<li>Los tonos ${colorsLabel} combinan con la decoración de tu celebración.</li>` : ''}
          </ul>
        </div>
      </div>
    </section>

    <!-- ========== Doc §4 INVITATION DEMO (iframe carga solo al abrirse) ========== -->
    <section class="alt" id="demo" aria-labelledby="demo-h">
      <div class="wrap">
        <h2 id="demo-h">Ve la invitación en vivo como la verán tus invitados</h2>
        <div class="rule"></div>
        <p>Abre la demostración para recorrer el diseño, las secciones y la experiencia completa antes de personalizarla para tu fiesta.</p>
        <details class="demo">
          <summary data-hva="cta_click" data-hva-cta="open_demo" data-hva-location="demo">Ver la invitación en vivo</summary>
          <div class="demo-body">
            <div class="phone">
              <iframe data-slot="urls.demo" src="${esc(demoUrl)}"
                      title="Demostración de la invitación de ${esc(eventoLow)}"
                      loading="lazy"></iframe>
            </div>
            <a class="btn-link" href="${esc(demoUrl)}" target="_blank" rel="noopener"
               data-hva="cta_click" data-hva-cta="demo_fullscreen" data-hva-location="demo">Abrir la demostración en pantalla completa</a>
          </div>
        </details>
      </div>
    </section>

    <!-- ========== Doc §5 INCLUDED SECTIONS (3 estados) ========== -->
    ${modulos.incluidas.length || modulos.agregables.length ? `
    <section aria-labelledby="secciones">
      <div class="wrap">
        <h2 id="secciones">Secciones incluidas en esta invitación de ${esc(eventoLow)}</h2>
        <div class="rule"></div>
        <p>Este diseño ya trae lo esencial para una invitación completa. Puedes dejarlo como está, ocultar secciones o agregar nuevas con el mismo estilo.</p>
        <div class="status-grid">
          ${modulos.incluidas.length ? `<div class="status is-included">
            <h3>Ya incluidas en el diseño</h3>
            <ul data-slot="modules.included[]">
              ${incluidasHtml}
            </ul>
          </div>` : ''}
          ${modulos.agregables.length ? `<div class="status is-available">
            <h3>Puedes agregarlas con el mismo estilo</h3>
            <ul data-slot="modules.available[]">
              ${agregablesHtml}
            </ul>
          </div>` : ''}
        </div>
        <p class="reassure">Algunas secciones dependen del plan que elijas. Te lo indicamos antes de pagar.</p>
      </div>
    </section>` : ''}

    <!-- ========== Doc §6 CUSTOMIZE THIS INVITATION (conversión principal) ========== -->
    <section class="alt" aria-labelledby="personalizar">
      <div class="wrap split">
        <div>
          <h2 id="personalizar">Cómo personalizar esta invitación con los datos de tu fiesta</h2>
          <div class="rule"></div>
          <p>Conservas este diseño y solo cambias tu información. Lo haces desde el navegador, en minutos y sin instalar nada.</p>
          <ol class="steps">
            <li><strong>Elige tu plan y abre el editor.</strong> El diseño ya viene cargado.</li>
            <li><strong>Escribe tus datos.</strong> Nombre, fecha, horarios, salón, dirección, padres y padrinos.</li>
            <li><strong>Agrega tus fotos y frases.</strong> Ajusta colores, idioma y el mensaje especial.</li>
            <li><strong>Revísala y compártela.</strong> Ves el resultado al instante y envías tu enlace.</li>
          </ol>
          <div class="cta-row">
            <a class="btn btn-primary" href="${esc(editorHref)}" data-slot="urls.customize"
               data-hva="cta_click" data-hva-cta="customize" data-hva-location="customize">Personalizar esta invitación</a>
          </div>
        </div>
        <div>
          <h3>Lo que puedes cambiar</h3>
          <ul class="ticks">
            <li>Nombre, fecha y horarios</li>
            <li>Salón, dirección y mapa</li>
            <li>Fotos, textos y mensaje especial</li>
            <li>Colores e idioma</li>
            <li>Itinerario y código de vestimenta</li>
            <li>Confirmación de asistencia, música y regalos</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- ========== Doc §7 CAMBIO DE UNA SECCIÓN ========== -->
    <section aria-labelledby="una-seccion">
      <div class="wrap">
        <h2 id="una-seccion">Cambia una sola sección sin rehacer toda la invitación</h2>
        <div class="rule"></div>
        <p>Si te encanta el diseño pero quieres mejorar una parte, pide un cambio con IA solo para esa sección. El resto de tu invitación se queda igual.</p>
        <ul class="requests" aria-label="Ejemplos de cambios que puedes pedir" data-slot="copy.iteration_examples[]">
          ${promptsHtml}
        </ul>
        <div class="cta-row">
          <a class="btn btn-ghost" href="${esc(editorHref)}&mode=iterar" data-slot="urls.request_section_change"
             data-hva="cta_click" data-hva-cta="request_section_change" data-hva-location="iteration">Pedir un cambio de sección</a>
        </div>
      </div>
    </section>

    <!-- ========== PLANES (Catálogo, Creativa, Premium) ========== -->
    <section class="alt" id="planes" aria-labelledby="planes-h">
      <div class="wrap">
        <h2 id="planes-h">Planes para obtener esta invitación de ${esc(eventoLow)}</h2>
        <div class="rule"></div>
        <p>Todos los planes incluyen este diseño personalizado y tu enlace para compartir. Los planes más altos te dan más cambios con IA y secciones adicionales.</p>
        <div class="plans" data-slot="plans[]">${planesHtml}
        </div>
      </div>
    </section>

    <!-- ========== Doc §8 CREAR CON IA (separado de personalizar) ========== -->
    <section id="crear-con-ia" aria-labelledby="ia-h">
      <div class="wrap">
        <h2 id="ia-h">Crea una invitación nueva con IA si buscas otro estilo</h2>
        <div class="rule"></div>
        <p>¿Quieres otro tema, otros colores u otra distribución? Describe tu fiesta y la IA diseña una invitación nueva desde cero, con las secciones que elijas.</p>
        <form class="ai-form" action="${esc(aiUrl)}" method="get" data-slot="urls.ai_generator">
          <label>Tipo de evento
            <select name="evento">
              <option value="boda"${eventoKey === 'boda' ? ' selected' : ''}>Boda</option>
              <option value="xv-anos"${eventoKey === 'xv-anos' ? ' selected' : ''}>XV años</option>
              <option value="bautizo"${eventoKey === 'bautizo' ? ' selected' : ''}>Bautizo</option>
              <option value="cumpleanos"${eventoKey === 'cumpleanos' ? ' selected' : ''}>Cumpleaños</option>
              <option value="baby-shower"${eventoKey === 'baby-shower' ? ' selected' : ''}>Baby shower</option>
              <option value="graduacion"${eventoKey === 'graduacion' ? ' selected' : ''}>Graduación</option>
            </select>
          </label>
          <label>Tema
            <input name="tema" type="text" placeholder="Ej. mariposas, jardín, Hollywood">
          </label>
          <label>Colores
            <input name="colores" type="text" placeholder="Ej. lila y plateado">
          </label>
          <label>Estilo y ambiente
            <input name="estilo" type="text" placeholder="Ej. moderno, divertido, de gala">
          </label>
          <label>Idioma
            <select name="idioma">
              <option value="es" selected>Español</option>
              <option value="es-en">Español e inglés</option>
            </select>
          </label>
          <label>Secciones que quieres
            <input name="secciones" type="text" placeholder="Ej. confirmación, galería, música">
          </label>
          <label class="full">Instrucciones especiales
            <textarea name="idea" placeholder="Cuéntanos cómo imaginas tu invitación"></textarea>
          </label>
          <div class="full">
            <button class="btn btn-primary" type="submit"
                    data-hva="cta_click" data-hva-cta="generate_ai" data-hva-location="ai_section">Crear una invitación nueva con IA</button>
          </div>
        </form>
      </div>
    </section>
${related.length >= 2 ? `
    <!-- ========== Doc §9 SIMILARES — solo productos reales publicados ========== -->
    <section class="alt" aria-labelledby="similares">
      <div class="wrap">
        <h2 id="similares">Invitaciones de ${esc(eventoLow)} parecidas a este diseño</h2>
        <div class="rule"></div>
        <div class="cards" data-slot="related[]">${relatedHtml}
        </div>
      </div>
    </section>` : ''}${exploreSection}
    <!-- ========== Doc §11 FAQ (texto idéntico al FAQPage del schema) ========== -->
    <section class="alt" aria-labelledby="faq-h">
      <div class="wrap faq">
        <h2 id="faq-h">Preguntas frecuentes sobre esta invitación de ${esc(eventoLow)}</h2>
        <div class="rule"></div>
        <div data-slot="faq[]">${faqHtml}
        </div>
      </div>
    </section>

    <!-- ========== Doc §12 FINAL CTA (ambas acciones) ========== -->
    <section class="final" aria-labelledby="final-h">
      <div class="wrap">
        <h2 id="final-h">Personaliza hoy tu invitación de ${esc(eventoLow)}</h2>
        <p>Conserva este diseño${item.theme ? ` de ${esc(item.theme.toLowerCase())}` : ''} y agrega los datos de tu fiesta, o crea una invitación nueva con IA si sueñas con otro estilo.</p>
        <div class="cta-row">
          <a class="btn btn-primary" href="${esc(editorHref)}" data-slot="urls.customize"
             data-hva="cta_click" data-hva-cta="customize" data-hva-location="final">Personalizar esta invitación</a>
          <a class="btn btn-ghost" href="#crear-con-ia" data-hva="cta_click" data-hva-cta="generate_ai" data-hva-location="final">Crear una invitación nueva con IA</a>
        </div>
      </div>
    </section>
  </main>

  <footer>
    <div class="wrap">
      <span>© ${new Date().getFullYear()} ${BRAND_NAME} · Todas las invitaciones son digitales.</span>
      <span>Última actualización: <time datetime="${esc(dateModified)}" data-slot="page.date_modified">${esc(updatedHuman)}</time> · <a href="/catalogo/">Ver todo el catálogo</a></span>
    </div>
  </footer>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// JSON-LD — un @graph por página (guía §8)
// ---------------------------------------------------------------------------
function buildProductSchema(item, { h1, title, metaDesc, canonical, ogImage, faqs, planes, publicUrl, dateModified, eventoLabel, colorsLabel, modulos }) {
  const desc = `Invitación digital de ${(eventoLabel || 'celebración').toLowerCase()}${colorsLabel ? ` que combina ${colorsLabel}` : ''}${item.theme ? ` con tema de ${item.theme.toLowerCase()}` : ''}.${modulos.includedLabel ? ` Incluye ${modulos.includedLabel.toLowerCase()}.` : ''} Se personaliza y se comparte por WhatsApp.`;
  const graph = [
    {
      '@type': 'Organization',
      '@id': 'https://invitacionesmodernas.com/#organization',
      name: BRAND_NAME,
      url: 'https://invitacionesmodernas.com/',
      description: 'Invitaciones digitales personalizables para bodas, XV años, bautizos, cumpleaños y celebraciones que se comparten por WhatsApp, sin descargas.'
    },
    {
      '@type': 'WebSite',
      '@id': `${publicUrl}/#website`,
      url: `${publicUrl}/`,
      name: BRAND_NAME,
      inLanguage: 'es',
      publisher: { '@id': 'https://invitacionesmodernas.com/#organization' }
    },
    {
      '@type': 'WebPage',
      '@id': `${canonical}#webpage`,
      url: canonical,
      name: title,
      description: metaDesc,
      inLanguage: 'es',
      isPartOf: { '@id': `${publicUrl}/#website` },
      breadcrumb: { '@id': `${canonical}#breadcrumb` },
      ...(ogImage ? { primaryImageOfPage: { '@id': `${canonical}#primaryimage` } } : {}),
      mainEntity: { '@id': `${canonical}#product` },
      dateModified
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${canonical}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${publicUrl}/` },
        { '@type': 'ListItem', position: 2, name: 'Catálogo', item: `${publicUrl}/catalogo/` },
        { '@type': 'ListItem', position: 3, name: `Invitaciones de ${(eventoLabel || 'invitación').toLowerCase()}`, item: `${publicUrl}/catalogo/${eventKeyOf(item)}/` },
        { '@type': 'ListItem', position: 4, name: h1 }
      ]
    },
    ...(ogImage ? [{
      '@type': 'ImageObject',
      '@id': `${canonical}#primaryimage`,
      contentUrl: ogImage,
      width: 1200,
      height: 630,
      caption: `Vista previa de ${h1}`
    }] : []),
    {
      '@type': 'Product',
      '@id': `${canonical}#product`,
      name: h1,
      description: desc,
      url: canonical,
      ...(ogImage ? { image: { '@id': `${canonical}#primaryimage` } } : {}),
      brand: { '@type': 'Brand', name: BRAND_NAME },
      category: `Invitaciones digitales de ${(eventoLabel || 'celebración').toLowerCase()}`,
      ...(colorsLabel ? { color: colorsLabel } : {}),
      // Una Offer por plan visible, SOLO con precio real (guía §8)
      offers: planes.filter((p) => p.price).map((p) => ({
        '@type': 'Offer',
        name: p.name,
        price: String(p.price),
        priceCurrency: 'MXN',
        availability: 'https://schema.org/InStock',
        url: `${canonical}#planes`
      }))
    }
  ];
  if (faqs.length) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${canonical}#faq`,
      mainEntity: faqs.map((f) => ({
        '@type': 'Question',
        name: String(f.q || ''),
        acceptedAnswer: { '@type': 'Answer', text: String(f.a || '') }
      }))
    });
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}

// ---------------------------------------------------------------------------
// 404 del catálogo — página real con noindex (guía §3)
// ---------------------------------------------------------------------------
export function renderCatalogNotFound(ctx = {}) {
  const publicUrl = String(ctx.publicUrl || DEFAULT_PUBLIC_URL).replace(/\/+$/, '');
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Invitación no encontrada | ${BRAND_NAME}</title>
  <meta name="robots" content="noindex, follow">
  <link rel="canonical" href="${esc(publicUrl)}/catalogo/">
  <style>${css()}</style>
</head>
<body>
  <main id="contenido">
    <section class="hero" style="text-align:center;padding-top:clamp(64px,10vw,120px)">
      <div class="wrap">
        <span class="eyebrow">Catálogo</span>
        <h1>Esta invitación no existe</h1>
        <p class="lead" style="max-width:520px;margin:0 auto 28px">El diseño que buscas no está en el catálogo o cambió de dirección. Explora los diseños disponibles o crea una invitación nueva con IA.</p>
        <div class="cta-row" style="justify-content:center">
          <a class="btn btn-primary" href="/catalogo/">Ver todo el catálogo</a>
          <a class="btn btn-ghost" href="/editor">Crear con IA</a>
        </div>
      </div>
    </section>
  </main>
  <footer>
    <div class="wrap"><span>&copy; ${new Date().getFullYear()} ${BRAND_NAME}</span><span><a href="/">Inicio</a></span></div>
  </footer>
</body>
</html>`;
}
