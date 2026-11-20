/**
 * ============================================================================
 * CATALOG LISTING SSR — /catalogo/ y /catalogo/:evento/
 * ============================================================================
 * Mismo sistema de diseño que la página de producto (product-page.css).
 * Compra (CRO review 2026-11-19):
 *   - C1: NINGÚN enlace público lleva a /editor ni / (login admin). Los CTAs
 *     de IA apuntan a los planes del sitio digital con etiqueta honesta.
 *   - C3: header con logo → sitio digital, Precios y WhatsApp.
 *   - C4: precio "Desde $X USD · pago único" en cada card (sitePlans).
 *   - C10: franja de 3 pasos bajo el hero + "Pago único · Precios en USD".
 *   - C2: GA4 + Clarity (mismos IDs del sitio digital) con eventos del
 *     embudo (view_item_list / select_item / filter_select / cta_click).
 * ============================================================================
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { hasOgScreenshot, ogScreenshotFile } from '../screenshotService.js';
import { getExploreEvents } from './product-page.js';
import { PLANES_PUBLICOS } from './sitePlans.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BRAND_NAME = 'Invitaciones Modernas';
export const DEFAULT_PUBLIC_URL = 'https://generador.invitacionesmodernas.com';

// Sitio digital (fuente de precios, calculadora y retorno del visitante)
const DIGITAL_HOME = 'https://digital.invitacionesmodernas.com/es-us/';
const DIGITAL_PRECIOS = 'https://digital.invitacionesmodernas.com/es-us/#precios';
const DIGITAL_COMO = 'https://digital.invitacionesmodernas.com/es-us/#como-funciona';
const WHATSAPP_URL = 'https://wa.me/16232086099';

// Medición (C2): misma propiedad GA4 que el sitio digital para medir el
// embudo completo digital → generador → checkout. Clarity para sesiones.
export const GA4_ID = 'G-RWPQEFQ878';
export const CLARITY_ID = 'z5inbiskc8';

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

// Precio mínimo de los planes reales (C4): "Desde $30 USD · pago único"
const precioDesde = () => {
  const precios = PLANES_PUBLICOS.map((p) => p.price).filter((n) => typeof n === 'number');
  const min = precios.length ? Math.min(...precios) : null;
  return min != null ? { txt: `Desde $${min} USD`, nota: 'Pago único por evento' } : null;
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
  // C9: promesas alineadas al inventario (hoy: bodas y XV años)
  const pageDesc = isCategory
    ? `Invitaciones digitales de ${eventLabel.toLowerCase()} listas para personalizar: cambia nombres, fecha y fotos, y compártela por WhatsApp en minutos.`
    : 'Explora diseños de invitaciones digitales para bodas y XV años. Personalízalas en minutos con tus datos y compártelas por WhatsApp.';
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

  const precio = precioDesde();

  const cards = items.map((item, idx) => {
    const og = hasOgScreenshot(item.slug)
      ? `${publicUrl}/storage/og/${ogScreenshotFile(item.slug)}`
      : gradientPlaceholder(item.primary_color, item.secondary_color);
    const href = `/catalogo/${item.slug}`;
    const nombre = nombreLimpio(item);
    return `
      <article class="card" data-item-slug="${esc(item.slug || '')}" data-item-event="${esc(item.event_type || '')}" data-item-position="${idx + 1}">
        <a class="card-link" href="${esc(href)}" aria-label="${esc(nombre)}">
          <img src="${esc(og)}" alt="${esc(nombre)}" loading="lazy" width="400" height="500">
        </a>
        <div class="card-body">
          ${item.event_type ? `<p class="rel">${esc(item.event_type)}</p>` : ''}
          <h3><a href="${esc(href)}">${esc(nombre)}</a></h3>
          <p>${esc(descripcionDe(item))}</p>
          ${precio ? `<p class="card-price">${esc(precio.txt)} <small>· ${esc(precio.nota)}</small></p>` : ''}
          <a class="btn btn-ghost card-cta" href="${esc(href)}">Ver diseño</a>
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
      <li><a href="${DIGITAL_HOME}">Inicio</a></li>
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
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: DIGITAL_HOME },
          { '@type': 'ListItem', position: 2, name: 'Catálogo', item: `${publicUrl}/catalogo/` },
          { '@type': 'ListItem', position: 3, name: h1 }
        ] : [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: DIGITAL_HOME },
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
  <!-- C2: GA4 (misma propiedad que el sitio digital, cross-domain) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=${GA4_ID}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${GA4_ID}', { send_page_view: false });
  </script>
  <!-- C2: Clarity (sesiones y heatmaps) -->
  <script>
    (function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${CLARITY_ID}");
  </script>
</head>
<body>
  <a class="skip" href="#contenido">Saltar al contenido</a>

  <!-- C3: header con retorno al sitio digital (el visitante vino de ahí) -->
  <header class="cat-header">
    <div class="wrap cat-header__row">
      <a class="cat-header__logo" href="${DIGITAL_HOME}" aria-label="Invitaciones Modernas — inicio">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 21s-7.5-4.9-10-9.3C.3 8.6 2.2 5 5.7 5c2 0 3.4 1 4.3 2.4h4C14.9 6 16.3 5 18.3 5c3.5 0 5.4 3.6 3.7 6.7C19.5 16.1 12 21 12 21z" fill="url(#hg)" stroke="#b8324f" stroke-width="1.2"/><defs><linearGradient id="hg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f472b6"/><stop offset="1" stop-color="#fb7185"/></linearGradient></defs></svg>
        <span>Invitaciones Modernas</span>
      </a>
      <nav class="cat-header__nav" aria-label="Principal">
        <a href="/catalogo/" aria-current="page">Catálogo</a>
        <a href="${DIGITAL_PRECIOS}">Precios</a>
        <a href="${DIGITAL_COMO}">Cómo funciona</a>
      </nav>
      <a class="cat-header__wa" href="${WHATSAPP_URL}" target="_blank" rel="noopener" aria-label="WhatsApp +1 623-208-6099">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.2 1.2-1.7 1.2-.4 0-1 0-1.9-.4a10 10 0 0 1-4.3-3.6c-.6-.9-.9-1.7-.9-2.4 0-.8.4-1.4.7-1.7.2-.3.5-.4.7-.4h.5c.2 0 .4 0 .5.4l.7 1.6c.1.2 0 .4-.1.5l-.3.4c-.1.1-.2.3-.1.5.3.6 1.5 2.1 3 2.7.2.1.4 0 .5-.1l.5-.5c.2-.2.4-.2.6-.1l1.5.7c.2.1.4.2.4.4 0 .3 0 .8-.4 1.1z"/></svg>
        <span class="cat-header__wa-num">+1 623-208-6099</span>
      </a>
    </div>
  </header>
${crumbs}
  <main id="contenido">
    <section class="hero" style="text-align:center;padding-top:${isCategory ? '24px' : 'clamp(40px,6vw,72px)'}" aria-labelledby="cat-h">
      <div class="wrap">
        <span class="eyebrow">${isCategory ? 'Catálogo · ' + esc(eventLabel) : 'Catálogo'}</span>
        <h1 id="cat-h" style="font-size:clamp(2rem,5vw,3.4rem)">${esc(h1)}</h1>
        <div class="lead" style="max-width:640px;margin:0 auto 20px">
          <p>${isCategory
            ? `Diseños de invitaciones digitales de ${eventLabel.toLowerCase()} listos para personalizar con tus datos, tus fotos y tus colores. Tus invitados las abren desde un enlace de WhatsApp, sin descargas.`
            : 'Diseños listos para bodas y XV años. Cada invitación se personaliza en minutos con tus datos y se comparte por WhatsApp.'}</p>
        </div>
        ${precio ? `<p class="cat-precio" style="margin:0 0 24px"><strong>${esc(precio.txt)}</strong> · ${esc(precio.nota)}</p>` : ''}
        <div class="cta-row" style="justify-content:center">
          <a class="btn btn-primary" href="${DIGITAL_PRECIOS}" data-hva="cta_click" data-hva-cta="generate_ai" data-hva-location="catalog_hero">Diseñar con IA desde $55</a>
        </div>
      </div>
    </section>

    <!-- C10: cómo funciona en 3 pasos -->
    <section class="alt" aria-labelledby="como-h" style="padding:clamp(28px,4vw,44px) 0">
      <div class="wrap">
        <ol class="steps steps--3">
          <li><strong>Elige un diseño</strong><small>O crea el tuyo con IA</small></li>
          <li><strong>Agrega los datos de tu fiesta</strong><small>Nombres, fecha, lugar y fotos</small></li>
          <li><strong>Compártela por WhatsApp</strong><small>Tus invitados la abren sin descargar nada</small></li>
        </ol>
      </div>
    </section>

    <section class="alt" aria-labelledby="grid-h" style="padding-top:0">
      <div class="wrap">
        <h2 id="grid-h" style="text-align:center">${isCategory ? `Diseños de ${esc(eventLabel.toLowerCase())}` : 'Diseños disponibles'}</h2>
        <div class="rule" style="margin:0 auto 20px"></div>
        <p style="text-align:center;color:var(--ink-soft);max-width:520px;margin:0 auto 32px">Toca un diseño para verlo en vivo y personalizarlo${precio ? ' · ' + esc(precio.txt.toLowerCase()) : ''}.</p>
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
          <a class="btn btn-primary" href="${DIGITAL_PRECIOS}" data-hva="cta_click" data-hva-cta="generate_ai" data-hva-location="catalog_final">Diseñar con IA desde $55</a>
        </div>
      </div>
    </section>
  </main>

  <footer>
    <div class="wrap">
      <span>&copy; ${new Date().getFullYear()} ${BRAND_NAME} · Todas las invitaciones son digitales.</span>
      <span><a href="${DIGITAL_HOME}">Inicio</a> · <a href="${DIGITAL_PRECIOS}">Precios</a> · <a href="${WHATSAPP_URL}" target="_blank" rel="noopener">WhatsApp</a></span>
    </div>
  </footer>

  <!-- C2: eventos del embudo del catálogo (GA4) -->
  <script>
  (function () {
    function track(name, params) {
      if (typeof gtag === 'function') gtag('event', name, params || {});
    }
    // view_item_list al cargar
    var items = Array.prototype.slice.call(document.querySelectorAll('.card[data-item-slug]')).map(function (c) {
      return { item_id: c.getAttribute('data-item-slug') || '', item_category: c.getAttribute('data-item-event') || '', index: c.getAttribute('data-item-position') || '' };
    });
    track('view_item_list', { item_list_name: ${JSON.stringify(isCategory ? 'catalogo-' + ctx.eventKey : 'catalogo')}, items: items });
    // select_item al tocar una card
    document.addEventListener('click', function (e) {
      var card = e.target.closest ? e.target.closest('.card[data-item-slug]') : null;
      if (!card) return;
      track('select_item', {
        item_id: card.getAttribute('data-item-slug') || '',
        item_category: card.getAttribute('data-item-event') || '',
        index: card.getAttribute('data-item-position') || ''
      });
    });
    // cta_click en CTAs marcados con data-hva
    document.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a[data-hva-cta]') : null;
      if (!a) return;
      track('cta_click', { cta: a.getAttribute('data-hva-cta'), location: a.getAttribute('data-hva-location') || '' });
    });
    gtag('event', 'page_view', { page_title: document.title, page_location: location.href });
  })();
  </script>
</body>
</html>`;
}
