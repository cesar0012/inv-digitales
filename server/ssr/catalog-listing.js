/**
 * ============================================================================
 * CATALOG LISTING SSR — página principal del catálogo
 * ============================================================================
 * Hero con título + descripción arriba, cuadrícula de productos abajo.
 * Cada tarjeta usa el mismo sistema de diseño que la página de producto.
 * ============================================================================
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { hasOgScreenshot, ogScreenshotFile } from '../screenshotService.js';

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

/**
 * @param {Array} items — filas de catalogo con starred=1
 * @param {{ publicUrl: string }} ctx
 */
export function renderCatalogListing(items, ctx = {}) {
  const publicUrl = String(ctx.publicUrl || DEFAULT_PUBLIC_URL).replace(/\/+$/, '');
  const canonical = `${publicUrl}/catalogo/`;

  const cards = items.map((item) => {
    const og = hasOgScreenshot(item.slug)
      ? `${publicUrl}/storage/og/${ogScreenshotFile(item.slug)}`
      : '';
    const href = `/catalogo/${(item.event_type || 'invitacion').toLowerCase().replace(/[^a-z0-9]+/g, '-')}/${item.slug}`;
    return `
      <article class="card">
        ${og ? `<img src="${esc(og)}" alt="${esc(item.seo_title || item.title || 'Invitación digital')}" loading="lazy" width="600" height="750">` : `<div style="aspect-ratio:4/5;background:var(--bg-alt);display:grid;place-items:center;padding:20px;text-align:center;font-size:.9rem;color:var(--ink-soft)">${esc(item.event_type || 'Invitación')}</div>`}
        <div class="card-body">
          ${item.event_type ? `<p class="rel">${esc(item.event_type)}</p>` : ''}
          <h3><a href="${esc(href)}">${esc(item.seo_title || item.title || 'Invitación digital')}</a></h3>
          <p>${esc(item.theme || item.colors || 'Diseño personalizable')}</p>
        </div>
      </article>`;
  }).join('\n          ');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Catálogo de invitaciones digitales | ${BRAND_NAME}</title>
  <meta name="description" content="Explora nuestro catálogo de invitaciones digitales para bodas, XV años, bautizos y más. Personalízalas en minutos y compártelas por WhatsApp.">
  <link rel="canonical" href="${esc(canonical)}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="es_MX">
  <meta property="og:site_name" content="${BRAND_NAME}">
  <meta property="og:title" content="Catálogo de invitaciones digitales | ${BRAND_NAME}">
  <meta property="og:url" content="${esc(canonical)}">
  <meta name="twitter:card" content="summary_large_image">
  <script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': 'https://invitacionesmodernas.com/#organization', name: BRAND_NAME, url: 'https://invitacionesmodernas.com/' },
      { '@type': 'WebSite', '@id': `${publicUrl}/#website`, url: `${publicUrl}/`, name: BRAND_NAME },
      { '@type': 'CollectionPage', '@id': `${canonical}#webpage`, url: canonical, name: 'Catálogo de invitaciones digitales', inLanguage: 'es', isPartOf: { '@id': `${publicUrl}/#website` } }
    ]
  }).replace(/</g, '\\u003c')}</script>
  <style>${css()}</style>
</head>
<body>
  <a class="skip" href="#contenido">Saltar al contenido</a>

  <main id="contenido">
    <section class="hero" style="text-align:center;padding-top:clamp(64px,10vw,120px)" aria-labelledby="cat-h">
      <div class="wrap">
        <span class="eyebrow">Catálogo</span>
        <h1 id="cat-h" style="font-size:clamp(2rem,5vw,3.4rem)">Invitaciones digitales para tu celebración</h1>
        <div class="lead" style="max-width:640px;margin:0 auto 28px">
          <p>Explora diseños listos para bodas, XV años, bautizos y más. Cada invitación se personaliza en minutos, se comparte por WhatsApp y tus invitados la abren sin descargar nada.</p>
        </div>
        <div class="cta-row" style="justify-content:center">
          <a class="btn btn-primary" href="/editor">Crear invitación con IA</a>
        </div>
      </div>
    </section>

    <section class="alt" aria-labelledby="grid-h">
      <div class="wrap">
        <h2 id="grid-h" style="text-align:center">Diseños disponibles</h2>
        <div class="rule" style="margin:0 auto 20px"></div>
        <p style="text-align:center;color:var(--ink-soft);max-width:520px;margin:0 auto 40px">Elige un diseño y personalízalo con tus datos, o crea uno nuevo con IA desde cero.</p>
        <div class="cards">
          ${cards || '<p style="text-align:center;color:var(--ink-soft);grid-column:1/-1">Aún no hay invitaciones destacadas en el catálogo.</p>'}
        </div>
      </div>
    </section>

    <section class="final" aria-labelledby="final-h">
      <div class="wrap">
        <h2 id="final-h">¿No encuentras el diseño perfecto?</h2>
        <p>Describe tu fiesta y la IA crea una invitación única con las secciones que necesites.</p>
        <div class="cta-row" style="justify-content:center">
          <a class="btn btn-primary" href="/editor">Crear con IA</a>
        </div>
      </div>
    </section>
  </main>

  <footer>
    <div class="wrap">
      <span>&copy; ${new Date().getFullYear()} ${BRAND_NAME}</span>
      <span><a href="/">Inicio</a></span>
    </div>
  </footer>
</body>
</html>`;
}
