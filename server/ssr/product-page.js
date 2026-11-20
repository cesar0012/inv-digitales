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
import { extraerPerfilDiseno, construirSeoDesdePerfil, construirZonaDeDiseno, notaDeSeccion } from './designProfile.js';
// import { PLANES_PUBLICOS } from './sitePlans.js'; — NO: los planes salen del
// ADMIN (plan_config, dinámicos) como el usuario pidió. sitePlans.js queda
// solo como referencia del sitio de precios.

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
  // TODOS los planes configurados en el admin (1..N): la página refleja la
  // tabla plan_config tal cual en cada request — si el admin crea, borra o
  // edita planes, el catálogo lo muestra sin tocar código. La cuadrícula se
  // adapta al número de planes (CSS auto-fit). Fallback a los 3 defaults
  // solo si la tabla está vacía (instalación fresca).
  try {
    const rows = db.prepare("SELECT * FROM plan_config ORDER BY CASE plan_slug WHEN 'catalogo' THEN 1 WHEN 'creativa' THEN 2 WHEN 'premium' THEN 3 ELSE 4 END, created_at, rowid").all();
    if (rows.length) {
      return rows.map((r) => ({
        key: r.plan_slug, name: r.plan_name || r.plan_slug,
        featured: r.plan_slug === 'creativa',
        designs: r.generation_credits || 5, changes: r.iteration_credits || 10,
        price: r.price ?? null, url: 'https://app.invitacionesmodernas.com/app/planes'
      }));
    }
  } catch { /* usar defaults */ }
  return PLAN_DEFAULTS.map((p) => ({ ...p, price: null, url: 'https://app.invitacionesmodernas.com/app/planes' }));
}

// ---------------------------------------------------------------------------
// FAQ — 13 preguntas con respuestas ALINEADAS A LOS PLANES REALES (F6):
// ninguna promesa aplica a "todos los planes" cuando es de un plan concreto.
// Al menos 2 respuestas mencionan el tema o los colores del diseño (F1).
// ---------------------------------------------------------------------------
function buildFaqs(modulos, eventoLabel, zona = null) {
  const tiene = (t) => modulos.tipos.has(t);
  const tema = zona?.tema || '';
  const temaLow = tema ? tema.toLowerCase() : '';
  const colores = zona?.colores || '';
  const rsvp = tiene('confirmacion')
    ? 'Sí, con el Plan Creativo o el Plan Premium tus invitados confirman su asistencia desde la propia invitación y tú ves la lista de respuestas.'
    : 'La confirmación de asistencia se incluye en los planes Creativo y Premium; este diseño se puede complementar con ella manteniendo el mismo estilo.';
  const mapa = tiene('ubicacion')
    ? `Sí. La sección de ubicación muestra el lugar de la fiesta con un mapa que tus invitados abren con un toque${temaLow ? `, integrado al estilo ${temaLow} del diseño` : ''}.`
    : 'Puedes agregar una sección de ubicación con mapa que tus invitados abren con un toque.';
  const countdown = tiene('countdown')
    ? `Sí, incluye una cuenta regresiva que se actualiza sola cada vez que tus invitados abren el enlace${colores ? `, con los tonos ${colores} del diseño` : ''}.`
    : 'Puedes agregar una cuenta regresiva que se actualiza sola hasta la fecha de tu evento.';

  return [
    { q: '¿Puedo personalizar esta invitación digital?', a: `Sí. Cambias los nombres, la fecha, los horarios, los lugares, los nombres de los padres y padrinos, tus fotos y cada texto, y ves el resultado antes de compartirla.` },
    { q: '¿Hay límite de invitados?', a: 'Sí: Creativo hasta 100 y Premium hasta 200 (+2 USD por cada 25 extra).' },
    { q: '¿Puedo cambiar los colores?', a: `En los planes Creativo y Premium${colores ? `; este diseño combina ${colores}` : ''}.` },
    { q: '¿Puedo agregar o quitar secciones?', a: 'Sí. Confirmación de asistencia y galería: planes Creativo y Premium.' },
    { q: '¿Puedo cambiar solo una sección?', a: 'Sí: 10 cambios con Creativo y 20 con Premium, dejando el resto del diseño igual.' },
    { q: '¿Puedo crear una invitación completamente nueva con IA?', a: 'Sí: Creativo incluye 2 rediseños y Premium 10 — describes tu fiesta y la IA crea el diseño.' },
    { q: '¿Mis invitados pueden confirmar asistencia desde la invitación?', a: rsvp },
    { q: '¿La invitación incluye un mapa?', a: mapa },
    { q: '¿Puedo agregar fotos?', a: 'Sí. Puedes subir tus fotos favoritas; con los planes Creativo y Premium también puedes agregar una galería completa.' },
    { q: '¿Puedo hacer la invitación bilingüe?', a: 'Sí. Puedes escribir los textos en español y en inglés para que todos tus invitados entiendan cada detalle.' },
    { q: '¿Puedo compartirla por mensaje de texto o WhatsApp?', a: 'Tu enlace se comparte con cualquier plan; el envío automático (SMS, y WhatsApp en Premium) va con Creativo y Premium.' },
    { q: '¿Se ve bien en el celular?', a: `Sí. Está diseñada primero para el celular${temaLow ? ` y el tema de ${temaLow} se ve igual de bien en pantallas grandes` : ''}.` },
    { q: '¿Mis invitados necesitan descargar una app?', a: 'No. La invitación se abre en el navegador del teléfono al tocar el enlace, sin descargas ni registros.' }
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

  // PERFIL DE DISEÑO (F1): guardado en catalogo.design_profile o extraído
  // al vuelo del HTML real de la invitación. Todo el copy de la zona de
  // diseño sale de aquí — dos diseños distintos producen textos distintos.
  const perfil = parseJson(item.design_profile, null)
    || (ctx.invitationHtml ? extraerPerfilDiseno(ctx.invitationHtml, item) : null);
  const zona = perfil ? construirZonaDeDiseno(perfil) : null;
  const seoPerfil = perfil ? construirSeoDesdePerfil(perfil) : null;

  // Meta — se limpia cualquier "[]" que el copy guardado arrastre (colors
  // vacío serializado) para no mostrar símbolos sueltos al usuario.
  const limpiarVacios = (s) => stripDates(s)
    .replace(/invitaci[oó]n digital de invitaci[oó]n digital/gi, 'invitación digital')
    .replace(/\s*\[\]\s*/g, ' ')
    .replace(/\s+en\s+,/gi, ',')
    .replace(/\bcombina\s*,/gi, 'combina')
    .replace(/,\s*,/g, ',')
    .replace(/\s{2,}/g, ' ')
    .trim();
  // Con perfil, el SEO viene DEL PERFIL (query primaria única por página,
  // sin truncados "..." ni fugas de placeholders del demo). El copy guardado
  // solo se usa como fallback cuando no hay perfil.
  const title = limpiarVacios(seoPerfil?.title || item.seo_title || item.title || 'Invitación digital');
  const metaDesc = limpiarVacios(seoPerfil?.meta || item.meta_description || `Invitación digital de ${(item.event_type || 'celebración').toLowerCase()}. Personalízala en minutos y compártela por WhatsApp.`);
  const h1Text = limpiarVacios(seoPerfil?.h1 || seo?.h1 || item.h1 || item.seo_title || item.title || 'Invitación digital');
  const h1 = esc(h1Text);

  // Evento: el perfil manda (se leyó del contenido real de la invitación —
  // F4); si no hay perfil, del event_type o del slug.
  const EVENTO_DE_SLUG = { boda: 'Boda', 'xv-anos': 'XV años', bautizo: 'Bautizo', comunion: 'Primera comunión', confirmacion: 'Confirmación', 'baby-shower': 'Baby shower', cumpleanos: 'Cumpleaños', graduacion: 'Graduación' };
  const esEventoGenerico = !item.event_type || /^(invitaci[oó]n digital|general|invitaci[oó]n|evento)$/i.test(item.event_type.trim());
  const eventoKey = perfil?.event?.key || eventKeyOf(item);
  const eventoLabel = perfil?.event?.label || (esEventoGenerico ? (EVENTO_DE_SLUG[eventoKey] || 'Invitación digital') : item.event_type);
  const eventoLow = eventoLabel.toLowerCase();
  // colors viene como texto plano o como JSON ('[]' vacío, '["rosa","coral"]'):
  // nunca se usa crudo — el "[]" se ve como símbolos raros en la página.
  // Con perfil, los colores son los REALES del CSS de la invitación (F7).
  const parseListaColores = (raw) => {
    if (!raw) return '';
    const s = String(raw).trim();
    if (!s || s === '[]' || s === '{}') return '';
    if (/^[[{]/.test(s)) {
      try { const v = JSON.parse(s); return Array.isArray(v) ? v.filter(Boolean).join(', ') : String(v || ''); } catch { return s; }
    }
    return s;
  };
  const colorsLabel = zona?.colores || parseListaColores(item.colors);
  const themeLabel = zona?.tema || (item.theme && !/^\[/.test(item.theme) ? item.theme : '');
  const styleTags = (parseJson(item.tags, []) || []).filter(Boolean).map((t) => String(t).replace(/^\[+|\]+$/g, '').trim()).filter(Boolean);
  const styleLabel = styleTags.length ? styleTags.map((t) => t.toLowerCase()).join(', ') : 'elegante';

  // hero_summary: DOS frases construidas desde el perfil (qué es este
  // diseño + qué viven los invitados), o fallback genérico sin perfil.
  const heroSummary = zona?.hero || stripTags(secHtml(1)) || `Esta invitación digital de ${eventoLow}${colorsLabel ? ` combina ${colorsLabel}` : ''}${themeLabel ? ` con tema de ${themeLabel.toLowerCase()}` : ''}. Tus invitados la abren desde un enlace de WhatsApp${modulos.keyLabel ? ` y encuentran ${modulos.keyLabel.toLowerCase()}` : ' y ven todos los datos de tu celebración'}.`;
  const heroSummaryLimpia = limpiarVacios(heroSummary);

  // Planes: TODOS los configurados en el ADMIN (plan_config, dinámicos, 1..N).
  // SIN precios visibles en las cards — el precio se consulta en la página de
  // planes (app.invitacionesmodernas.com/app/planes), a donde llevan los
  // botones.
  const planes = getPlanes(db);
  const customFaqs = Array.isArray(sections.section_11?.faqs) ? sections.section_11.faqs : [];
  const faqs = customFaqs.length >= 6
    ? customFaqs.map((f) => ({ q: f.question || f.q, a: f.answer || f.a }))
    : buildFaqs(modulos, eventoLabel, zona);
  const related = getRelated(db, item);
  const exploreEvents = getExploreEvents(db);

  // Iteration examples (guía §6 #7): desde el perfil (mencionan el tema y
  // los colores REALES del diseño) o fallback genérico.
  const prompts = zona?.ejemplos
    || (Array.isArray(sections.section_7?.example_prompts) && sections.section_7.example_prompts.length
      ? sections.section_7.example_prompts
      : [
          'Agrega una sección de música que combine con este diseño.',
          'Haz la confirmación de asistencia más elegante.',
          'Crea una cuenta regresiva de lujo con el mismo estilo.',
          'Agrega una galería de fotos más grande.',
          'Cambia el código de vestimenta a otros tonos.',
          'Agrega la mesa de regalos con la misma paleta.'
        ]);

  // Colores del diseño → variables CSS + theme-color. Con perfil son los
  // extraídos del CSS real de la invitación (F7).
  const c1 = perfil?.colors?.main?.[0]?.hex || (/^#[0-9a-f]{6}$/i.test(item.primary_color || '') ? item.primary_color : '');
  const c2 = perfil?.colors?.main?.[1]?.hex || (/^#[0-9a-f]{6}$/i.test(item.secondary_color || '') ? item.secondary_color : '');
  const accentOverride = (c1 || c2)
    ? `<style>:root{${c1 ? `--accent:${c1};` : ''}${c2 ? `--accent-2:${c2};` : ''}}</style>\n`
    : '';

  // OG image
  const ogImage = hasOgScreenshot(item.slug)
    ? `${publicUrl}/storage/og/${ogScreenshotFile(item.slug)}`
    : '';
  const heroImg = ogImage || gradientPlaceholder(c1 || '#fbeff0', c2 || '#b8324f');
  const heroAlt = zona?.alt || `Invitación digital de ${eventoLow}${themeLabel ? ` con tema de ${themeLabel.toLowerCase()}` : ''}${colorsLabel ? ` en tonos ${colorsLabel}` : ''} vista en un celular`;

  // URL helpers
  const demoUrl = `${publicUrl}/preview/${item.filename}`;
  // El editor lee el filename del PATH PARAM (/editor/:filename), no de query
  // params — si se manda como ?filename=… el editor abre el generador de
  // invitaciones nuevas en vez de editar esta.
  const customizeUrl = `/editor/${encodeURIComponent(item.filename)}`;
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

  // Cards de planes SIN precio: del admin (plan_config) con nombre y
  // beneficios (créditos). El precio se consulta en la página de planes,
  // a donde lleva el botón de cada card.
  const planesHtml = planes.map((p) => `
          <article class="plan${p.featured ? ' is-featured' : ''}">
            ${p.featured ? '<span class="badge">Recomendado</span>' : ''}
            <h3>${esc(p.name)}</h3>
            <ul class="ticks">
              <li>1 invitación con este diseño</li>
              <li>${p.designs} diseños nuevos con IA</li>
              <li>${p.changes} cambios de sección con IA</li>
            </ul>
            <a class="btn ${p.featured ? 'btn-primary' : 'btn-ghost'}" href="${esc(p.url)}" data-slot="plans.${p.key}.url"
               data-hva="cta_click" data-hva-cta="plan_${p.key}" data-hva-location="plans">Elegir ${esc(p.name)}</a>
          </article>`).join('\n');

  // Secciones incluidas: con perfil se listan los TÍTULOS REALES del diseño
  // y notas por evento (F11) — cada diseño describe sus propias secciones.
  const incluidasHtml = (perfil?.sections_actual || []).length
    ? perfil.sections_actual.map((s) => `<li><span class="ico" aria-hidden="true">✓</span><span>${esc(s.own_title)}<small>${esc(notaDeSeccion(s.key, perfil.event.key, perfil))}</small></span></li>`).join('\n              ')
    : modulos.incluidas.map((s) => `<li><span class="ico" aria-hidden="true">✓</span><span>${esc(s.label)}<small>${esc(s.note)}</small></span></li>`).join('\n              ');
  const agregablesHtml = modulos.agregables.map((s) => `<li><span class="ico" aria-hidden="true">＋</span><span>${esc(s.label)}<small>${esc(s.note)}</small></span></li>`).join('\n              ');

  const promptsHtml = prompts.slice(0, 6).map((p) => `<li>“${esc(String(p).replace(/^“|”$/g, ''))}”</li>`).join('\n          ');

  const relatedHtml = related.map((c) => {
    const r = c.row;
    const img = hasOgScreenshot(r.slug)
      ? `${publicUrl}/storage/og/${ogScreenshotFile(r.slug)}`
      : gradientPlaceholder(r.primary_color, r.secondary_color);
    const alt = stripDates(String(r.seo_title || r.title || 'Invitación digital').replace(/\s*\|\s*Invitaciones Modernas\s*$/i, ''));
    return `
          <article class="card">
            <img src="${esc(img)}" alt="${esc(alt)}" width="400" height="500" loading="lazy">
            <div class="card-body">
              <p class="rel">${esc(c.label)}</p>
              <h3><a href="/catalogo/${esc(r.slug)}">${esc(alt)}</a></h3>
              <p>${esc((() => { const c = String(r.colors || '').trim(); const colores = (c && c !== '[]' && c.startsWith('[')) ? (() => { try { return JSON.parse(c).filter(Boolean).join(', '); } catch { return c; } })() : (c === '[]' ? '' : c); return r.theme || colores || 'Diseño personalizable'; })())}</p>
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
  <!-- Bilingüe: versión EN espejo en /en/catalogo/… — Google envía a cada
       visitante al idioma de su navegador (hreflang + x-default=es base) -->
  <link rel="alternate" hreflang="es" href="${esc(publicUrl)}/catalogo/${esc(item.slug)}">
  <link rel="alternate" hreflang="en" href="${esc(publicUrl)}/en/catalogo/${esc(item.slug)}">
  <link rel="alternate" hreflang="x-default" href="${esc(publicUrl)}/catalogo/${esc(item.slug)}">
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
  <!-- C2: GA4 (misma propiedad que el sitio digital) + Clarity -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-RWPQEFQ878"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-RWPQEFQ878', { send_page_view: false });
  </script>
  <script>
    (function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","z5inbiskc8");
  </script>
</head>

<body>
  <a class="skip" href="#contenido">Saltar al contenido</a>

  <nav class="crumbs wrap" aria-label="Migas de pan">
    <ol>
      <li><a href="https://digital.invitacionesmodernas.com/es-us/">Inicio</a></li>
      <li><a href="/catalogo/">Catálogo</a></li>
      <li><a href="/catalogo/${esc(eventoKey)}/" data-slot="taxonomy.event.url">Invitaciones de ${esc(eventoLow)}</a></li>
      <li aria-current="page" data-slot="copy.h1">${h1}</li>
    </ol>
  </nav>

  <main id="contenido">

    <!-- ========== Doc §1 HERO ========== -->
    <section class="hero" aria-labelledby="h1" data-design-zone="hero">
      <div class="wrap hero-grid">
        <div>
          <span class="eyebrow">Invitación digital · ${esc(eventoLabel)}</span>
          <h1 id="h1" data-slot="copy.h1">${h1}</h1>
          <p class="lead" data-slot="copy.hero_summary"><!--dz-->${esc(heroSummaryLimpia)}<!--/dz--></p>

          <ul class="chips" aria-label="Resumen del diseño">
            <li><b>Evento:</b> <span data-slot="taxonomy.event.label">${esc(eventoLabel)}</span></li>
            ${item.theme ? `<li><b>Tema:</b> <span>${esc(item.theme)}</span></li>` : ''}
            ${colorsLabel ? `<li><b>Colores:</b> <span>${esc(colorsLabel)}</span></li>` : ''}
            ${modulos.keyLabel ? `<li><b>Incluye:</b> <span>${esc(modulos.keyLabel)}</span></li>` : ''}
          </ul>

          <div class="cta-row">
            <a class="btn btn-primary" href="${esc(editorHref)}" data-slot="urls.customize"
               data-hva="cta_click" data-hva-cta="customize" data-hva-location="hero">Personalizar esta invitación</a>
            <a class="btn btn-ghost" href="${esc(demoUrl)}" target="_blank" rel="noopener"
               data-hva="cta_click" data-hva-cta="view_demo" data-hva-location="hero">Ver la invitación en vivo</a>
          </div>
          <p class="reassure">Sin descargas · Se comparte por WhatsApp · Cambias tus datos cuando quieras ·
            <a href="#crear-con-ia" data-hva="cta_click" data-hva-cta="generate_ai" data-hva-location="hero">¿Buscas otro estilo? Créala con IA</a></p>
        </div>

        <figure class="hero-media hero-media--live" style="margin:0">
          <!-- Vista VIVA de la invitación en marco de teléfono — TAP para
               abrirla en pantalla completa. La imagen estática solo queda
               como og:image para redes sociales. -->
          <a class="hero-phone" href="${esc(demoUrl)}" target="_blank" rel="noopener"
             aria-label="${esc(heroAlt)} — abrir en pantalla completa"
             data-hva="cta_click" data-hva-cta="open_demo" data-hva-location="hero_phone">
            <iframe src="${esc(demoUrl)}" title="${esc(heroAlt)}" loading="lazy"></iframe>
          </a>
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
          ${themeLabel ? `<div><dt>Tema</dt><dd>${esc(themeLabel)}</dd></div>` : ''}
          <div><dt>Estilo</dt><dd>${esc(styleLabel)}</dd></div>
          ${colorsLabel ? `<div><dt>Colores principales</dt><dd>${esc(colorsLabel)}</dd></div>` : ''}
          ${perfil?.sections_actual?.length ? `<div><dt>Secciones de este diseño</dt><dd>${esc(perfil.sections_actual.map((s) => s.own_title).join(', '))}</dd></div>` : (modulos.includedLabel ? `<div><dt>Secciones incluidas</dt><dd>${esc(modulos.includedLabel)}</dd></div>` : '')}
          ${perfil?.signature_lines?.filter(Boolean).length ? `<div><dt>Frases del diseño</dt><dd>${esc(perfil.signature_lines.filter(Boolean).slice(0, 3).map((l) => `“${l}”`).join(' '))}</dd></div>` : ''}
          ${perfil?.itinerary_sample?.length ? `<div><dt>Programa de ejemplo</dt><dd>${esc(perfil.itinerary_sample.join(' · '))}</dd></div>` : ''}
          ${modulos.agregables.length ? `<div><dt>Puedes agregar</dt><dd>${esc(modulos.agregables.map((s) => s.label).join(', '))} (según plan)</dd></div>` : ''}
          <div><dt>Idioma</dt><dd>Español (puedes agregar textos en inglés)</dd></div>
          <div><dt>Formato</dt><dd>Invitación digital interactiva, hecha para celular</dd></div>
          <div><dt>Cómo se entrega</dt><dd>Un enlace para compartir por WhatsApp, mensaje o redes sociales</dd></div>
          <div><dt>Dispositivos</dt><dd>Celular, tableta y computadora, sin instalar apps</dd></div>
        </dl>
      </div>
    </section>

    <!-- ========== Doc §3 WHAT THIS INVITATION IS ABOUT (desde el perfil) ========== -->
    <section aria-labelledby="sobre" data-design-zone="about">
      <div class="wrap split">
        <div>
          <h2 id="sobre">Cómo es esta invitación digital de ${esc(eventoLow)}${themeLabel ? ` con tema de ${esc(themeLabel.toLowerCase())}` : ''}</h2>
          <div class="rule"></div>
          <div data-slot="copy.about_html"><!--dz-->${zona ? `<p>${esc(zona.about1)}</p><p>${esc(zona.about2)}</p>${(perfil?.signature_lines || []).filter(Boolean).length > 1 ? `<blockquote style="margin:14px 0 0;padding:10px 16px;border-left:3px solid var(--accent);font-style:italic;color:var(--ink-soft)">${perfil.signature_lines.filter(Boolean).slice(0, 3).map((l) => `“${esc(l)}”`).join(' · ')}</blockquote>` : ''}` : (secHtml(4) || `<p>Esta invitación fue creada para ${eventoLow === 'xv años' ? 'unos XV años' : `una ${eventoLow}`}${colorsLabel ? ` en ${colorsLabel}` : ''}, pensada para que la primera pantalla se sienta como la entrada a la fiesta.</p><p>Tus invitados ven la presentación con tus nombres, siguen la cuenta regresiva y revisan cada momento de la celebración. Con un toque abren el mapa del lugar y saben qué código de vestimenta llevar.</p>`)}<!--/dz--></div>
        </div>
        <div>
          <h3>Por qué funciona para ${eventoLow === 'xv años' ? 'unos XV años' : `una ${eventoLow}`} ${styleLabel.split(',')[0]}</h3>
          <ul class="ticks" data-slot="copy.fit_points"><!--dz-->
${(zona?.porQue || [
              'Todo lo importante de la fiesta en un solo enlace, fácil de reenviar.',
              modulos.tipos.has('itinerario') ? 'El itinerario ayuda a que nadie se pierda ningún momento de la celebración.' : '',
              modulos.tipos.has('vestimenta') ? 'El código de vestimenta evita dudas y llamadas de última hora.' : '',
              modulos.tipos.has('ubicacion') ? 'El mapa lleva a tus invitados al lugar sin confusiones.' : '',
              colorsLabel ? `Los tonos ${colorsLabel} combinan con la decoración de tu celebración.` : ''
            ].filter(Boolean)).map((t) => `            <li>${esc(t)}</li>`).join('\n')}
          <!--/dz--></ul>
        </div>
      </div>
    </section>

    <!-- ========== Doc §4 DEMO: ahora VIVE en el hero (hero-phone) — el botón
         "Ver la invitación en vivo" y el propio teléfono la abren en pantalla
         completa. Esta sección de panel desplegable se eliminó. ========== -->

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
          <a class="btn btn-ghost" href="${esc(editorHref)}?mode=iterar" data-slot="urls.request_section_change"
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

  <!-- Login condicional: DOS escenarios.
       Con sesión (cookie de la app, verificada contra /api/auth/me) los CTAs
       "Personalizar esta invitación" llevan AL EDITOR. Sin sesión llevan a
       los planes de app.invitacionesmodernas.com. La sesión del usuario vive
       en cookie httpOnly (no en localStorage), por eso se verifica por API.
       El HTML servidor conserva el href del editor para crawlers. -->
  <script>
  (function () {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(function (r) { return r.ok ? r.json() : { authenticated: false }; })
      .then(function (d) {
        if (!d || !d.authenticated) {
          var planes = 'https://app.invitacionesmodernas.com/app/planes';
          document.querySelectorAll('a[data-hva-cta="customize"]').forEach(function (a) { a.href = planes; });
        }
      })
      .catch(function () { /* fallo de red: se conserva el editor (la app
                              redirige a su login si no hay sesión) */ });
  })();
  </script>

  <!-- C2: eventos del embudo en la página de producto (GA4) -->
  <script>
  (function () {
    function track(name, params) { if (typeof gtag === 'function') gtag('event', name, params || {}); }
    var itemId = ${JSON.stringify(String(item.slug || ''))};
    track('view_item', { item_id: itemId, item_category: ${JSON.stringify(String(eventoLabel || ''))} });
    // demo_open: el teléfono del hero y el botón "Ver la invitación en vivo"
    document.querySelectorAll('a[data-hva-cta="open_demo"], a[data-hva-cta="view_demo"]').forEach(function (a) {
      a.addEventListener('click', function () { track('demo_open', { item_id: itemId }); });
    });
    // plan_select / begin_checkout / cta_click por delegación
    document.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a[data-hva-cta]') : null;
      if (!a) return;
      var cta = a.getAttribute('data-hva-cta') || '';
      if (/^plan_/.test(cta)) track('plan_select', { item_id: itemId, plan: cta.replace('plan_', '') });
      if (cta === 'customize') track('begin_checkout', { item_id: itemId });
      track('cta_click', { cta: cta, location: a.getAttribute('data-hva-location') || '' });
    });
    gtag('event', 'page_view', { page_title: document.title, page_location: location.href });
  })();
  </script>
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
      ...(colorsLabel ? { color: colorsLabel } : {})
      // Sin offers: las cards no muestran precio (se consulta en la página de
      // planes) y la guía §8 exige que sin precio visible no haya Offer.
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
