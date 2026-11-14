/**
 * ============================================================================
 * CATALOG LISTING SSR — /catalogo/ y /catalogo/:evento/
 * ============================================================================
 * Mismo sistema de diseño que la página de producto (product-page.css, copia
 * exacta del reference): hero con eyebrow + H1 + lead, grid de cards idéntico
 * al bloque "Doc §9 SIMILAR" del reference, pills de exploración solo con
 * categorías que existen, y CTA final.
 * ============================================================================
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { hasOgScreenshot, ogScreenshotFile } from '../screenshotService.js';
import { getExploreEvents } from './product-page.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BRAND_NAME = 'Invitaciones Modernas';
export const DEFAULT_PUBLIC_URL = 'https://generador.invitacionesmodernas.com';

let _css = null;
const css = () => {
  if (!_css) {
    try { _css = readFileSync(join(__dirname, 'product-page.css'), 'utf8'); }
    catch { _css = ''; }
  }
  return _css;
};

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const gradientPlaceholder = (c1, c2) => {
  const a = /^#([0-9a-f]{6})$/i.test(String(c1 || '')) ? c1 : '#fbeff0';
  const b = /^#([0-9a-f]{6})$/i.test(String(c2 || '')) ? c2 : '#b8324f';
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 5'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${a}'/><stop offset='1' stop-color='${b}'/></linearGradient></defs><rect width='4' height='5' fill='url(%23g)'/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg).replace(/'/g, '%27').replace(/%22/g, '"')}`;
};

/**
 * @param {Array} items — filas de catalogo con starred=1
 * @param {{ publicUrl?: string, eventKey?: string, eventLabel?: string, db?: object }} ctx
 *   eventKey presente ⇒ página de categoría (/catalogo/:evento/)
 */
export function renderCatalogListing(items, ctx = {}) {
  const publicUrl = String(ctx.publicUrl || DEFAULT_PUBLIC_URL).replace(/\/+$/, '');
  const isCategory = !!ctx.eventKey;
  const eventLabel = ctx.eventLabel || 'Invitación';
  const canonical = isCategory ? `${publicUrl}/catalogo/${ctx.eventKey}/` : `${publicUrl}/catalogo/`;

  const pageTitle = isCategory
    ? `Invitaciones digitales de ${eventLabel.toLowerCase()} | ${BRAND_NAME}`
    : `Catálogo de invitaciones digitales | ${BRAND_NAME}`;
  const pageDesc = isCategory
    ? `Invitaciones digitales de ${eventLabel.toLowerCase()} listas para personalizar: cambia nombres, fecha y fotos, y compártela por WhatsApp en minutos.`
    : 'Explora nuestro catálogo de invitaciones digitales para bodas, XV años, bautizos y más. Personalízalas en minutos y compártelas por WhatsApp.';
  const h1 = isCategory
    ? `Invitaciones digitales de ${eventLabel.toLowerCase()}`
    : 'Invitaciones digitales para tu celebración';

  // Nombre limpio para la tarjeta: el seo_title puede traer el sufijo de
  // marca ("| Invitaciones Modernas") que en una tarjeta sobra.
  const nombreLimpio = (item) => String(item.seo_title || item.title || 'Invitación digital')
    .replace(/\s*\|\s*Invitaciones Modernas\s*$/i, '')
    .trim() || 'Invitación digital';

  // Descripción: theme/colors vienen como texto o como JSON ("[]", '["a","b"]')
  // — nunca se imprime crudo: un "[]" suelto se ve como símbolos raros.
  const parseLista = (raw) => {
    if (!raw) return '';
    const s = String(raw).trim();
    if (!s || s === '[]' || s === '{}') return '';
    if (/^[[{]/.test(s)) {
      try { const v = JSON.parse(s); return Array.isArray(v) ? v.filter(Boolean).join(', ') : String(v || ''); } catch { return s; }
    }
    return s;
  };
  const descripcionDe = (item) => {
    const colores = parseLista(item.colors);
    if (item.theme && colores && item.theme !== colores) return `${item.theme} · ${colores}`;
    return item.theme || colores || 'Diseño personalizable';
  };

  const cards = items.map((item) => {
    const og = hasOgScreenshot(item.slug)
      ? `${publicUrl}/storage/og/${ogScreenshotFile(item.slug)}`
      : gradientPlaceholder(item.primary_color, item.secondary_color);
    const href = `/catalogo/${item.slug}`;
    const nombre = nombreLimpio(item);
    return `
      <article class="card">
        <img src="${esc(og)}" alt="${esc(nombre)}" loading="lazy" width="400" height="500">
        <div class="card-body">
          ${item.event_type ? `<p class="rel">${esc(item.event_type)}</p>` : ''}
          <h3><a href="${esc(href)}">${esc(nombre)}</a></h3>
          <p>${esc(descripcionDe(item))}</p>
        </div>
      </article>`;
  }).join('\n          ');

  // Pills de exploración: solo categorías con >=2 diseños publicados
  const explore = ctx.db ? getExploreEvents(ctx.db) : [];
  const exploreOthers = explore.filter((e) => !isCategory || e.key !== ctx.eventKey);
  const exploreHtml = exploreOthers.length ? `
    <section aria-labelledby="explorar-h">
      <div class="wrap">
        <h2 id="explorar-h" style="text-align:center">${isCategory ? 'Explora otros tipos de invitación' : 'Explora por tipo de evento'}</h2>
        <div class="rule" style="margin:0 auto 20px"></div>
        <ul class="pills" style="justify-content:center">
${exploreOthers.map((e) => `          <li><a href="${esc(e.url)}">${esc(e.label)}</a></li>`).join('\n')}
        </ul>
      </div>
    </section>` : '';

  const crumbs = isCategory
    ? `
  <nav class="crumbs wrap" aria-label="Migas de pan">
    <ol>
      <li><a href="/">Inicio</a></li>
      <li><a href="/catalogo/">Catálogo</a></li>
      <li aria-current="page">${esc(h1)}</li>
    </ol>
  </nav>`
    : '';

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': 'https://invitacionesmodernas.com/#organization', name: BRAND_NAME, url: 'https://invitacionesmodernas.com/', description: 'Invitaciones digitales personalizables que se comparten por WhatsApp, sin descargas.' },
      { '@type': 'WebSite', '@id': `${publicUrl}/#website`, url: `${publicUrl}/`, name: BRAND_NAME, inLanguage: 'es', publisher: { '@id': 'https://invitacionesmodernas.com/#organization' } },
      {
        '@type': 'CollectionPage', '@id': `${canonical}#webpage`, url: canonical, name: pageTitle,
        description: pageDesc, inLanguage: 'es', isPartOf: { '@id': `${publicUrl}/#website` },
        breadcrumb: { '@id': `${canonical}#breadcrumb` }
      },
      {
        '@type': 'BreadcrumbList', '@id': `${canonical}#breadcrumb`,
        itemListElement: isCategory ? [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${publicUrl}/` },
          { '@type': 'ListItem', position: 2, name: 'Catálogo', item: `${publicUrl}/catalogo/` },
          { '@type': 'ListItem', position: 3, name: h1 }
        ] : [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${publicUrl}/` },
          { '@type': 'ListItem', position: 2, name: 'Catálogo' }
        ]
      }
    ]
  };

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(pageTitle)}</title>
  <meta name="description" content="${esc(pageDesc)}">
  <link rel="canonical" href="${esc(canonical)}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="es_MX">
  <meta property="og:site_name" content="${BRAND_NAME}">
  <meta property="og:title" content="${esc(pageTitle)}">
  <meta property="og:description" content="${esc(pageDesc)}">
  <meta property="og:url" content="${esc(canonical)}">
  <meta name="twitter:card" content="summary_large_image">
  <script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>
  <style>${css()}</style>
</head>
<body>
  <a class="skip" href="#contenido">Saltar al contenido</a>
${crumbs}
  <main id="contenido">
    <section class="hero" style="text-align:center;padding-top:${isCategory ? '24px' : 'clamp(64px,10vw,120px)'}" aria-labelledby="cat-h">
      <div class="wrap">
        <span class="eyebrow">${isCategory ? 'Catálogo · ' + esc(eventLabel) : 'Catálogo'}</span>
        <h1 id="cat-h" style="font-size:clamp(2rem,5vw,3.4rem)">${esc(h1)}</h1>
        <div class="lead" style="max-width:640px;margin:0 auto 28px">
          <p>${isCategory
            ? `Diseños de invitaciones digitales de ${eventLabel.toLowerCase()} listos para personalizar con tus datos, tus fotos y tus colores. Tus invitados las abren desde un enlace de WhatsApp, sin descargas.`
            : 'Explora diseños listos para bodas, XV años, bautizos y más. Cada invitación se personaliza en minutos, se comparte por WhatsApp y tus invitados la abren sin descargar nada.'}</p>
        </div>
        <div class="cta-row" style="justify-content:center">
          <a class="btn btn-primary" href="/editor" data-hva="cta_click" data-hva-cta="generate_ai" data-hva-location="catalog_hero">Crear invitación con IA</a>
        </div>
      </div>
    </section>

    <section class="alt" aria-labelledby="grid-h">
      <div class="wrap">
        <h2 id="grid-h" style="text-align:center">${isCategory ? `Diseños de ${esc(eventLabel.toLowerCase())}` : 'Diseños disponibles'}</h2>
        <div class="rule" style="margin:0 auto 20px"></div>
        <p style="text-align:center;color:var(--ink-soft);max-width:520px;margin:0 auto 40px">Elige un diseño y personalízalo con tus datos, o crea uno nuevo con IA desde cero.</p>
        <div class="cards cards--catalog">
          ${cards || `<p style="text-align:center;color:var(--ink-soft);grid-column:1/-1">Aún no hay invitaciones destacadas en el catálogo.</p>`}
        </div>
      </div>
    </section>
${exploreHtml}
    <section class="final" aria-labelledby="final-h">
      <div class="wrap">
        <h2 id="final-h">¿No encuentras el diseño perfecto?</h2>
        <p>Describe tu fiesta y la IA crea una invitación única con las secciones que necesites.</p>
        <div class="cta-row" style="justify-content:center">
          <a class="btn btn-primary" href="/editor" data-hva="cta_click" data-hva-cta="generate_ai" data-hva-location="catalog_final">Crear con IA</a>
        </div>
      </div>
    </section>
  </main>

  <footer>
    <div class="wrap">
      <span>&copy; ${new Date().getFullYear()} ${BRAND_NAME} · Todas las invitaciones son digitales.</span>
      <span><a href="/">Inicio</a></span>
    </div>
  </footer>
</body>
</html>`;
}
