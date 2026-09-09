/**
 * ============================================================================
 * SSR DE CATÁLOGO — capa de contenido rastreable para las páginas de producto
 * ============================================================================
 * Problema que resuelve: la ruta /catalogo/:eventType/:slug solo inyectaba
 * meta tags al head y el body era el <div id="root"> vacío de la SPA. Los
 * crawlers sin JavaScript (GPTBot, ClaudeBot, PerplexityBot, rastreadores
 * clásicos) veían un documento en blanco: sin H1, sin copy, sin FAQ.
 *
 * Este módulo pinta una CAPA ESTÁTICA SEMÁNTICA dentro de <div id="root">
 * construida desde seo_content_json (que ya vive en la BD): H1, secciones,
 * FAQs en <details>/<summary> (acordeón nativo sin JS) y CTA reales como
 * <a href>. La SPA de React (createRoot) reemplaza este contenido al montar,
 * así el usuario final sigue viendo la experiencia interactiva y el crawler
 * recibe HTML completo.
 *
 * Defensas incluidas:
 *  - meta_description: se le eliminan fechas/horas específicas heredadas de
 *    generaciones viejas ("para el 25 de septiembre de 2026, a las 14:00").
 *  - og:image: NUNCA el .html del histórico (bug anterior); solo una imagen
 *    real si existe storage/og/og-default.jpg (sirviéndose en /storage/og).
 *  - html de secciones: saneado server-side (sin <script>/<style>, atributos
 *    on*, javascript:) aunque el prompt ya lo restringe.
 *  - Todo texto dinámico pasa por escapeHtml/escapeAttr.
 */
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const BRAND_NAME = 'Invitaciones Modernas';

// ----------------------------------------------------------------------------
// Utilidades de escape y saneamiento
// ----------------------------------------------------------------------------
const escapeHtml = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/**
 * Elimina fechas y horas específicas de un texto de metadata (herencia de
 * generaciones viejas). "…para el 25 de septiembre de 2026, a las 14:00
 * horas en…" → "…en…". Determinista y conservador: solo quita segmentos.
 */
export function stripEventDates(text) {
  if (!text) return '';
  return String(text)
    .replace(/\s+(para el|el|el pr[oó]ximo)\s+\d{1,2}\s+de\s+[a-záéíóúñ]+\s+de\s+\d{4}/gi, '')
    .replace(/\s+(el|del)\s+\d{1,2}\s+de\s+[a-záéíóúñ]+\s+de\s+\d{4}/gi, '')
    .replace(/,?\s+a\s+las?\s+\d{1,2}[:.]\d{2}\s*(hrs|horas|hr|h)?/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Sanea el html de una sección generada por IA antes de incrustarlo en el
 * SSR: elimina scripts/estilos, atributos on* y URLs javascript:. El prompt
 * ya restringe a p/h3/ul/ol/li/strong/em/br — esto es defensa extra.
 */
export function sanitizeSeoHtml(html) {
  if (!html) return '';
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript:/gi, '');
}

const parseJsonSafe = (raw, fallback = null) => {
  if (raw == null) return fallback;
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch { return fallback; }
};

// ----------------------------------------------------------------------------
// CSS autocontenido de la capa estática (prefijo ssr- para no chocar con la SPA)
// ----------------------------------------------------------------------------
const SSR_CSS = `
  .ssr-page{font-family:Inter,system-ui,-apple-system,sans-serif;color:#1f2937;background:#fff;margin:0}
  .ssr-hero{background:linear-gradient(135deg,#0f172a,#1e293b);color:#fff;padding:64px 24px;text-align:center}
  .ssr-eyebrow{display:inline-block;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);border-radius:9999px;padding:6px 16px;font-size:14px;color:rgba(255,255,255,.85);margin-bottom:24px}
  .ssr-hero h1{font-size:clamp(1.9rem,4.5vw,3.2rem);line-height:1.15;margin:0 0 20px;font-weight:700}
  .ssr-hero .ssr-copy{max-width:640px;margin:0 auto 28px;color:rgba(255,255,255,.78);font-size:1.05rem;line-height:1.75}
  .ssr-cta{display:inline-block;background:linear-gradient(135deg,#e11d48,#f43f5e);color:#fff!important;text-decoration:none;font-weight:600;padding:14px 30px;border-radius:16px;font-size:1.05rem}
  .ssr-badges{margin-top:24px;color:rgba(255,255,255,.55);font-size:.85rem}
  .ssr-section{padding:56px 24px;max-width:760px;margin:0 auto}
  .ssr-section--alt{background:#f9fafb}
  .ssr-section h2{font-size:clamp(1.35rem,3vw,1.8rem);font-weight:700;color:#111827;margin:0 0 16px;text-align:center}
  .ssr-copy{color:#4b5563;font-size:1.05rem;line-height:1.75}
  .ssr-copy p{margin:0 0 14px}.ssr-copy p:last-child{margin:0}
  .ssr-copy h3{font-size:1.1rem;font-weight:600;color:#1f2937;margin:18px 0 8px}
  .ssr-copy ul{margin:0 0 14px;padding:0;list-style:none}
  .ssr-copy ul li{position:relative;padding-left:24px;margin-bottom:8px}
  .ssr-copy ul li:before{content:'\\2713';position:absolute;left:0;color:#e11d48;font-weight:700}
  .ssr-prompts{margin:20px 0 0;padding-left:20px;color:#4b5563}
  .ssr-prompts li{margin-bottom:10px;line-height:1.6}
  .ssr-faq{border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;background:#fff}
  .ssr-faq details{border-bottom:1px solid #e5e7eb}
  .ssr-faq details:last-child{border-bottom:0}
  .ssr-faq summary{cursor:pointer;padding:18px 20px;font-weight:600;color:#1f2937;list-style:none;display:flex;align-items:center;gap:10px}
  .ssr-faq summary::-webkit-details-marker{display:none}
  .ssr-faq summary:before{content:'+';color:#6366f1;font-weight:700;font-size:1.1rem}
  .ssr-faq details[open] summary:before{content:'\\2212'}
  .ssr-faq .ssr-answer{padding:0 20px 18px 46px;color:#4b5563;line-height:1.7}
  .ssr-footer{background:#030712;color:rgba(255,255,255,.4);text-align:center;padding:28px 24px;font-size:.85rem}
  .ssr-footer a{color:rgba(255,255,255,.6)}
`;

// ----------------------------------------------------------------------------
// Cuerpo estático
// ----------------------------------------------------------------------------
function renderSsrBody(item, seo, publicUrl) {
  const sections = seo?.sections || {};
  const sectionHtml = (n) => sanitizeSeoHtml(sections[`section_${n}`]?.html || '');
  const sectionTitle = (n, fallback) => escapeHtml(sections[`section_${n}`]?.title || fallback || '');
  const editorHref = `/editor?filename=${encodeURIComponent(item.filename || '')}`;
  const faqs = Array.isArray(sections.section_11?.faqs) ? sections.section_11.faqs : [];
  const prompts = Array.isArray(sections.section_7?.example_prompts) ? sections.section_7.example_prompts : [];
  const h1 = escapeHtml(seo?.h1 || item.seo_title || item.title || 'Invitación digital');

  const block = (title, html, alt = false, extra = '') => (html || extra) ? `
    <section class="ssr-section${alt ? ' ssr-section--alt' : ''}">
      <h2>${title}</h2>
      <div class="ssr-copy">${html}</div>
      ${extra}
    </section>` : '';

  const faqHtml = faqs.length ? `
    <section class="ssr-section ssr-section--alt">
      <h2>${sectionTitle(11, 'Preguntas frecuentes')}</h2>
      <div class="ssr-faq">
        ${faqs.map((f) => `
        <details>
          <summary>${escapeHtml(f.question || '')}</summary>
          <div class="ssr-answer">${escapeHtml(f.answer || '')}</div>
        </details>`).join('')}
      </div>
    </section>` : '';

  const promptsHtml = prompts.length
    ? `<ol class="ssr-prompts">${prompts.map((p) => `<li>${escapeHtml(String(p))}</li>`).join('')}</ol>`
    : '';

  return `
<div id="ssr-catalogo" class="ssr-page">
  <style>${SSR_CSS}</style>
  <header class="ssr-hero">
    <span class="ssr-eyebrow">${escapeHtml(item.event_type || 'Invitación digital')}</span>
    <h1>${h1}</h1>
    <div class="ssr-copy">${sectionHtml(1)}</div>
    <a class="ssr-cta" href="${editorHref}">Personalizar esta invitación</a>
    <div class="ssr-badges">Sin descargas &middot; Comparte por WhatsApp &middot; 100% digital</div>
  </header>
  ${block(sectionTitle(4, '¿Cómo se ve esta invitación?'), sectionHtml(4), false)}
  ${block(sectionTitle(5, 'Personaliza esta plantilla con tus datos'), sectionHtml(5), true)}
  ${block(sectionTitle(6, '¿Por qué elegir esta invitación?'), sectionHtml(6), false)}
  ${block(sectionTitle(7, 'Ejemplos de personalización'), sectionHtml(7), true, promptsHtml)}
  ${faqHtml}
  ${block(sectionTitle(12, 'Crea tu invitación hoy'), sectionHtml(12), false, `<p style="text-align:center;margin-top:20px"><a class="ssr-cta" href="${editorHref}">Personalizar esta invitación</a></p>`)}
  <footer class="ssr-footer">
    &copy; ${new Date().getFullYear()} ${BRAND_NAME} &middot; <a href="/catalogo">Ver todo el catálogo</a>
  </footer>
</div>`;
}

// ----------------------------------------------------------------------------
// JSON-LD (Product + BreadcrumbList + FAQPage + Organization)
// ----------------------------------------------------------------------------
function buildJsonLd(item, seo, { publicUrl, requestPath, ogImage }) {
  const canonical = `${publicUrl}${requestPath}`;
  const metaDesc = stripEventDates(item.meta_description || '') || `${BRAND_NAME}: invitación digital personalizable.`;
  const sections = seo?.sections || {};
  const faqs = Array.isArray(sections.section_11?.faqs) ? sections.section_11.faqs : [];

  // Product: base del structured_data guardado (si existe y parsea), asegurando
  // campos críticos. Nunca inventa precios: offers sale sin price hasta que
  // plan_config tenga columna de precio.
  const stored = parseJsonSafe(item.structured_data, null);
  const product = {
    '@type': 'Product',
    ...(stored && typeof stored === 'object' ? stored : {}),
    name: seo?.h1 || item.seo_title || item.title || 'Invitación digital',
    description: metaDesc,
    url: canonical,
    ...(ogImage ? { image: [ogImage] } : {}),
    brand: { '@type': 'Brand', name: BRAND_NAME },
    offers: {
      '@type': 'Offer',
      url: canonical,
      availability: 'https://schema.org/InStock',
      priceCurrency: 'MXN',
      ...((stored?.offers && typeof stored.offers === 'object') ? stored.offers : {})
    }
  };
  delete product['@context']; // el grafo lo aporta el script contenedor

  const breadcrumb = {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${publicUrl}/` },
      { '@type': 'ListItem', position: 2, name: 'Catálogo', item: `${publicUrl}/catalogo` },
      { '@type': 'ListItem', position: 3, name: product.name, item: canonical }
    ]
  };

  const graph = [
    { '@type': 'Organization', '@id': `${publicUrl}/#organization`, name: BRAND_NAME, url: `${publicUrl}/` },
    product,
    breadcrumb
  ];
  // sameAs OMITIDO a propósito: hay conflicto de marca (miquinceaneravip vs
  // invitacionesmodernasusa) — se unifica cuando el usuario decida la marca
  // canónica y entonces se añade aquí.
  if (faqs.length > 0) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({
        '@type': 'Question',
        name: String(f.question || ''),
        acceptedAnswer: { '@type': 'Answer', text: String(f.answer || '') }
      }))
    });
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}

// ----------------------------------------------------------------------------
// Render principal: head + body sobre el dist/index.html
// ----------------------------------------------------------------------------
/**
 * @param {string} distHtml contenido de dist/index.html
 * @param {object} item fila de catálogo (slug, seo_title, meta_description,
 *                 structured_data, seo_content_json, filename, event_type, title, h1)
 * @param {{ publicUrl: string, requestPath: string }} ctx
 * @returns {string} HTML listo para enviar
 */
export function renderCatalogoSsr(distHtml, item, { publicUrl = '', requestPath = '' }) {
  let html = distHtml;

  const seo = parseJsonSafe(item.seo_content_json, null) || {};
  const metaDesc = stripEventDates(item.meta_description || '');
  const canonical = `${publicUrl}${requestPath}`;

  // og:image: SOLO una imagen real si existe el asset por defecto en storage/og.
  // Nunca el .html del histórico (bug anterior: social previews muertos).
  const ogDefaultPath = join(__dirname, '..', 'storage', 'og', 'og-default.jpg');
  const ogImage = existsSync(ogDefaultPath) ? `${publicUrl}/storage/og/og-default.jpg` : '';

  // --- Head ---
  const title = escapeHtml(item.seo_title || item.title || 'Invitaciones Digitales');
  html = html.replace(/<title[^>]*>[\s\S]*?<\/title>/i, `<title>${title}</title>`);

  const headTags = [
    `<meta name="description" content="${escapeHtml(metaDesc)}">`,
    `<link rel="canonical" href="${escapeHtml(canonical)}">`,
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:description" content="${escapeHtml(metaDesc)}">`,
    `<meta property="og:type" content="product">`,
    `<meta property="og:url" content="${escapeHtml(canonical)}">`,
    ...(ogImage ? [`<meta property="og:image" content="${escapeHtml(ogImage)}">`] : []),
    `<meta name="twitter:card" content="summary_large_image">`,
    `<script type="application/ld+json">${JSON.stringify(buildJsonLd(item, seo, { publicUrl, requestPath, ogImage })).replace(/</g, '\\u003c')}</script>`
  ].join('\n  ');

  // Limpiar og:/description previos (del propio dist o de inyecciones viejas)
  html = html
    .replace(/<meta\s+property=["']og:(title|description|image|type|url)["'][^>]*>/gi, '')
    .replace(/<meta\s+name=["']description["'][^>]*>/i, '')
    .replace(/<link\s+rel=["']canonical["'][^>]*>/i, '')
    .replace(/<meta\s+name=["']twitter:card["'][^>]*>/i, '')
    .replace(/<script\s+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, '');

  html = html.replace('</head>', `  ${headTags}\n</head>`);

  // --- Body: capa estática dentro de #root (createRoot la reemplaza al montar) ---
  const rootDiv = html.match(/<div id="root"><\/div>/);
  if (rootDiv) {
    html = html.replace('<div id="root"></div>', `<div id="root">${renderSsrBody(item, seo, publicUrl)}</div>`);
  }
  // Si el dist no tiene el div exacto, NO se inserta el body (evita duplicar
  // contenido junto a la SPA montada); el head ya quedó completo.

  return html;
}
