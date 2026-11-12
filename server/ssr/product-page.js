/**
 * ============================================================================
 * PRODUCT PAGE SSR — página de producto del catálogo
 * ============================================================================
 * Renderiza la página completa server-side con el diseño de
 * product-page-reference.html. Toda la data viene del catálogo (tabla
 * `catalogo`) y del `seo_content_json` (copy generado por IA).
 * El crawler ve TODO sin JavaScript; no hay SPA que reemplazar.
 * ============================================================================
 */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { hasOgScreenshot, ogScreenshotFile } from '../screenshotService.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BRAND_NAME = 'Invitaciones Modernas';
export const DEFAULT_PUBLIC_URL = 'https://generador.invitacionesmodernas.com';

// CSS compartido (una sola lectura, cacheado)
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
const stripDates = (t) => String(t || '')
  .replace(/\s+(para el|el)\s+\d{1,2}\s+de\s+[a-záéíóúñ]+\s+de\s+\d{4}/gi, '')
  .replace(/,?\s+a\s+las?\s+\d{1,2}[:.]\d{2}\s*(hrs?|horas?)?/gi, '')
  .replace(/\s{2,}/g, ' ').trim();

const sanitizeHtml = (html) => String(html || '')
  .replace(/<script[\s\S]*?<\/script>/gi, '')
  .replace(/<style[\s\S]*?<\/style>/gi, '')
  .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
  .replace(/javascript:/gi, '');

// ---------------------------------------------------------------------------
// Detectar secciones incluidas desde el HTML de la invitación
// ---------------------------------------------------------------------------
const SECTION_LABELS = {
  portada: { label: 'Portada con tu nombre', note: 'Presentación principal con tu nombre.' },
  padres: { label: 'Mis padres', note: 'Un espacio para honrar a tus papás.' },
  padrinos: { label: 'Mis padrinos', note: 'Nombres de cada pareja de padrinos.' },
  countdown: { label: 'Cuenta regresiva', note: 'Días, horas y minutos para tu fiesta.' },
  itinerario: { label: 'Itinerario', note: 'Horarios de cada momento de la celebración.' },
  ubicacion: { label: 'Ubicación con mapa', note: 'El lugar y cómo llegar con un toque.' },
  confirmacion: { label: 'Confirmación de asistencia', note: 'Tus invitados confirman desde la invitación.' },
  galeria: { label: 'Galería de fotos', note: 'Tus fotos favoritas en una sola sección.' },
  regalos: { label: 'Mesa de regalos', note: 'Tu lista de regalos o un mensaje especial.' },
  vestimenta: { label: 'Código de vestimenta', note: 'Etiqueta, colores y detalles.' },
  corte: { label: 'Corte de honor', note: 'Damas y chambelanes.' },
  detalles: { label: 'Detalles del evento', note: 'Información adicional.' }
};
const AGREGABLES = ['confirmacion', 'galeria', 'regalos', 'corte'];

function detectarSecciones(html) {
  if (!html) return { incluidas: [], agregables: [], keyLabel: '' };
  const tipos = new Set();
  const ids = html.match(/data-gemini-id="([a-z]+)/g) || [];
  ids.forEach((m) => { const t = m.replace(/data-gemini-id="/, ''); if (SECTION_LABELS[t]) tipos.add(t); });
  // también por gemini-id en <section class="sf..." data-gemini-id="portada-...">
  const sections = html.match(/<section[^>]*data-gemini-id="([a-z]+)/g) || [];
  sections.forEach((s) => { const m = s.match(/data-gemini-id="([a-z]+)/); if (m && SECTION_LABELS[m[1]]) tipos.add(m[1]); });

  const incluidas = [...tipios].filter((t) => !AGREGABLES.includes(t)).map((t) => SECTION_LABELS[t]);
  const agregables = AGREGABLES.filter((t) => !tipos.has(t)).map((t) => SECTION_LABELS[t]);
  const keyLabel = incluidas.slice(0, 3).map((s) => s.label.split(' con')[0].split(' de ')[0]).join(', ');
  return { incluidas, agregables, keyLabel };
}

// ---------------------------------------------------------------------------
// Planes (desde la BD o defaults de 3)
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
// FAQ defaults (13 preguntas del doc — respuestas por producto via seo_content_json)
// ---------------------------------------------------------------------------
const FAQ_DEFAULTS = [
  { q: '¿Puedo personalizar esta invitación digital?', a: 'Sí. Cambias nombre, fecha, horarios, lugar, fotos y textos desde el editor, sin instalar nada.' },
  { q: '¿Cómo la comparto con mis invitados?', a: 'Se comparte como un enlace por WhatsApp, mensaje o redes sociales. Tus invitados la abren en su celular al instante.' },
  { q: '¿Necesito descargar una app?', a: 'No. Funciona directamente en el navegador de cualquier celular, tableta o computadora.' },
  { q: '¿Puedo cambiar los colores del diseño?', a: 'Sí, puedes ajustar la paleta de colores desde el editor para que combine con tu decoración.' },
  { q: '¿La invitación tiene cuenta regresiva?', a: 'Sí, incluye una cuenta regresiva que se actualiza automáticamente hasta la fecha de tu evento.' },
  { q: '¿Puedo escribir textos en inglés?', a: 'Sí, puedes escribir todos los textos en español, inglés o ambos idiomas.' },
  { q: '¿Puedo agregar o quitar secciones?', a: 'Sí, puedes ocultar secciones existentes y agregar nuevas como galería de fotos, música o mesa de regalos.' },
  { q: '¿Cómo funciona la confirmación de asistencia?', a: 'Si tu plan la incluye, tus invitados confirman con un toque desde la propia invitación, sin llamadas.' },
  { q: '¿Puedo pedir un cambio en una sola sección?', a: 'Sí, con los cambios de sección con IA pides ajustar solo una parte del diseño sin afectar el resto.' },
  { q: '¿Cuánto tiempo tarda en estar lista?', a: 'La personalización de datos toma minutos. Los diseños nuevos con IA tardan uno a tres minutos.' },
  { q: '¿La invitación caduca?', a: 'Tu invitación permanece disponible durante el periodo de tu plan. Te avisamos antes de cualquier cambio.' },
  { q: '¿Puedo ver la invitación antes de pagar?', a: 'Sí, puedes ver la demostración completa y personalizar antes de elegir tu plan.' },
  { q: '¿Qué pasa si necesito ayuda?', a: 'Nuestro equipo te acompaña por WhatsApp durante todo el proceso de personalización.' }
];

// ---------------------------------------------------------------------------
// Renderer principal
// ---------------------------------------------------------------------------
export function renderProductPage(item, ctx = {}) {
  const db = ctx.db;
  const publicUrl = String(ctx.publicUrl || DEFAULT_PUBLIC_URL).replace(/\/+$/, '');
  const requestPath = ctx.requestPath || `/catalogo/${item.slug}`;
  const canonical = `${publicUrl}${requestPath}`;

  const seo = parseJson(item.seo_content_json, {}) || {};
  const sections = seo?.sections || {};
  const secHtml = (n) => sanitizeHtml(sections[`section_${n}`]?.html || '');
  const secTitle = (n, fb) => sections[`section_${n}`]?.title || fb;

  // Detectar módulos desde la invitación
  const invitationHtml = ctx.invitationHtml || '';
  const modulos = detectarSecciones(invitationHtml);

  // FAQ: usar las del seo_content_json si existen, sino defaults
  const faqs = Array.isArray(sections.section_11?.faqs) && sections.section_11.faqs.length >= 4
    ? sections.section_11.faqs
    : FAQ_DEFAULTS;

  // Planes
  const planes = getPlanes(db);

  // OG image
  const ogImage = hasOgScreenshot(item.slug)
    ? `${publicUrl}/storage/og/${ogScreenshotFile(item.slug)}`
    : '';

  // Meta
  const title = stripDates(item.seo_title || item.title || 'Invitación digital');
  const metaDesc = stripDates(item.meta_description || '');
  const h1 = esc(seo?.h1 || item.h1 || item.seo_title || item.title || 'Invitación digital');

  // Evento label
  const eventoLabel = item.event_type || 'Invitación digital';

  // Iteration examples
  const prompts = Array.isArray(sections.section_7?.example_prompts) && sections.section_7.example_prompts.length
    ? sections.section_7.example_prompts
    : ['Agrega una sección de música que combine con este diseño.', 'Haz la confirmación de asistencia más elegante.', 'Cambia la paleta a tonos más cálidos.'];
  const promptsHtml = prompts.slice(0, 6).map((p) => `<li>${esc(String(p))}</li>`).join('\n          ');

  // JSON-LD
  const jsonLd = buildProductSchema(item, { h1: h1.replace(/&amp;/g, '&'), title, metaDesc, canonical, ogImage, faqs, planes, publicUrl });

  // Modules HTML
  const incluidasHtml = modulos.incluidas.length
    ? modulos.incluidas.map((s) => `<li><span class="ico" aria-hidden="true">✓</span><span>${esc(s.label)}<small>${esc(s.note)}</small></span></li>`).join('\n              ')
    : '';
  const agregablesHtml = modulos.agregables.length
    ? modulos.agregables.map((s) => `<li><span class="ico" aria-hidden="true">＋</span><span>${esc(s.label)}<small>${esc(s.note)}</small></span></li>`).join('\n              ')
    : '';

  // FAQ HTML
  const faqHtml = faqs.map((f) => `
        <details>
          <summary><h3>${esc(f.question || f.q)}</h3></summary>
          <p>${esc(f.answer || f.a)}</p>
        </details>`).join('\n');

  // Planes HTML
  const planesHtml = planes.map((p) => `
          <article class="plan${p.featured ? ' is-featured' : ''}">
            ${p.featured ? '<span class="badge">Recomendado</span>' : ''}
            <h3>${esc(p.name)}</h3>
            <p class="price">${p.price ? esc(p.price) : 'Consulta'} <small>MXN</small></p>
            <ul class="ticks">
              <li>1 invitación con este diseño</li>
              <li>${p.designs} diseños nuevos con IA</li>
              <li>${p.changes} cambios de sección con IA</li>
            </ul>
            <a class="btn ${p.featured ? 'btn-primary' : 'btn-ghost'}" href="${esc(p.url)}"
               data-hva="cta_click" data-hva-cta="plan_${p.key}" data-hva-location="plans">Elegir ${esc(p.name)}</a>
          </article>`).join('\n');

  // Preview/demo URL
  const demoUrl = `${publicUrl}/preview/${item.filename}`;
  const customizeUrl = `/editor?filename=${encodeURIComponent(item.filename)}`;
  const editorHref = item.filename ? customizeUrl : '/editor';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(metaDesc)}">
  <link rel="canonical" href="${esc(canonical)}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <meta property="og:type" content="product">
  <meta property="og:locale" content="es_MX">
  <meta property="og:site_name" content="${BRAND_NAME}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(metaDesc)}">
  <meta property="og:url" content="${esc(canonical)}">
  ${ogImage ? `<meta property="og:image" content="${esc(ogImage)}">` : ''}
  <meta name="twitter:card" content="summary_large_image">
  <script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>
  <style>${css()}</style>
</head>
<body>
  <a class="skip" href="#contenido">Saltar al contenido</a>

  <nav class="crumbs wrap" aria-label="Migas de pan">
    <ol>
      <li><a href="/">Inicio</a></li>
      <li><a href="/catalogo/">Catálogo</a></li>
      <li aria-current="page">${esc(eventoLabel)}</li>
    </ol>
  </nav>

  <main id="contenido">

    <section class="hero" aria-labelledby="h1">
      <div class="wrap hero-grid">
        <div>
          <span class="eyebrow">Invitación digital · ${esc(eventoLabel)}</span>
          <h1 id="h1">${h1}</h1>
          <div class="lead">${secHtml(1) || `<p>Invitación digital de ${esc(eventoLabel.toLowerCase())}. Se personaliza en minutos y se comparte por WhatsApp.</p>`}</div>
          <ul class="chips">
            <li><b>Evento:</b> ${esc(eventoLabel)}</li>
            ${item.theme ? `<li><b>Tema:</b> ${esc(item.theme)}</li>` : ''}
            ${item.colors ? `<li><b>Colores:</b> ${esc(item.colors)}</li>` : ''}
            ${modulos.keyLabel ? `<li><b>Incluye:</b> ${esc(modulos.keyLabel)}</li>` : ''}
          </ul>
          <div class="cta-row">
            <a class="btn btn-primary" href="${esc(editorHref)}" data-hva="cta_click" data-hva-cta="customize" data-hva-location="hero">Personalizar esta invitación</a>
            <a class="btn btn-ghost" href="#demo">Ver la invitación en vivo</a>
          </div>
          <p class="reassure">Sin descargas · Se comparte por WhatsApp · <a href="#crear-con-ia">Crea otra con IA</a></p>
        </div>
        ${ogImage ? `<figure class="hero-media"><img src="${esc(ogImage)}" alt="${h1}" width="1200" height="630" fetchpriority="high" decoding="async"></figure>` : ''}
      </div>
    </section>

    <section class="alt" aria-labelledby="detalles">
      <div class="wrap">
        <h2 id="detalles">Detalles de esta invitación</h2>
        <div class="rule"></div>
        <dl class="facts">
          <div><dt>Evento</dt><dd>${esc(eventoLabel)}</dd></div>
          ${item.theme ? `<div><dt>Tema</dt><dd>${esc(item.theme)}</dd></div>` : ''}
          ${item.colors ? `<div><dt>Colores</dt><dd>${esc(item.colors)}</dd></div>` : ''}
          ${modulos.incluidas.length ? `<div><dt>Secciones incluidas</dt><dd>${modulos.incluidas.map((s) => esc(s.label)).join(', ')}</dd></div>` : ''}
          ${modulos.agregables.length ? `<div><dt>Puedes agregar</dt><dd>${modulos.agregables.map((s) => esc(s.label)).join(', ')}</dd></div>` : ''}
          <div><dt>Formato</dt><dd>Invitación digital interactiva, hecha para celular</dd></div>
          <div><dt>Cómo se entrega</dt><dd>Un enlace para compartir por WhatsApp</dd></div>
        </dl>
      </div>
    </section>

    <section aria-labelledby="sobre">
      <div class="wrap split">
        <div>
          <h2 id="sobre">Cómo es esta invitación digital</h2>
          <div class="rule"></div>
          <div>${secHtml(4) || `<p>Una invitación digital completa que tus invitados abren desde un enlace en WhatsApp. Incluye todo lo esencial de tu evento en un solo lugar.</p>`}</div>
        </div>
        <div>
          <h3>Por qué funciona</h3>
          <ul class="ticks">
            <li>Todo lo importante en un solo enlace</li>
            <li>La cuenta regresiva mantiene la expectación</li>
            <li>El mapa evita perdidos y llamadas</li>
            <li>Se comparte con un toque por WhatsApp</li>
          </ul>
        </div>
      </div>
    </section>

    <section class="alt" id="demo" aria-labelledby="demo-h">
      <div class="wrap">
        <h2 id="demo-h">Ve la invitación en vivo</h2>
        <div class="rule"></div>
        <p>Abre la demostración para recorrer el diseño completo antes de personalizarla.</p>
        <details class="demo">
          <summary data-hva="cta_click" data-hva-cta="open_demo" data-hva-location="demo">Ver la invitación en vivo</summary>
          <div class="demo-body">
            <div class="phone">
              <iframe src="${esc(demoUrl)}" title="Demostración de la invitación" loading="lazy"></iframe>
            </div>
            <a class="btn-link" href="${esc(demoUrl)}" target="_blank" rel="noopener">Abrir en pantalla completa</a>
          </div>
        </details>
      </div>
    </section>

    ${modulos.incluidas.length || modulos.agregables.length ? `
    <section aria-labelledby="secciones">
      <div class="wrap">
        <h2 id="secciones">Secciones de esta invitación</h2>
        <div class="rule"></div>
        <div class="status-grid">
          ${modulos.incluidas.length ? `<div class="status is-included"><h3>Ya incluidas</h3><ul>${incluidasHtml}</ul></div>` : ''}
          ${modulos.agregables.length ? `<div class="status is-available"><h3>Puedes agregarlas</h3><ul>${agregablesHtml}</ul></div>` : ''}
        </div>
      </div>
    </section>` : ''}

    <section class="alt" aria-labelledby="personalizar">
      <div class="wrap split">
        <div>
          <h2 id="personalizar">Cómo personalizar esta invitación</h2>
          <div class="rule"></div>
          <ol class="steps">
            <li><strong>Elige tu plan y abre el editor.</strong> El diseño ya viene cargado.</li>
            <li><strong>Escribe tus datos.</strong> Nombre, fecha, horarios y lugar.</li>
            <li><strong>Agrega tus fotos.</strong> Ajusta colores y el mensaje especial.</li>
            <li><strong>Revísala y compártela.</strong> Ves el resultado al instante.</li>
          </ol>
          <div class="cta-row">
            <a class="btn btn-primary" href="${esc(editorHref)}" data-hva="cta_click" data-hva-cta="customize" data-hva-location="customize">Personalizar esta invitación</a>
          </div>
        </div>
        <div>
          <h3>Lo que puedes cambiar</h3>
          <ul class="ticks">
            <li>Nombre, fecha y horarios</li>
            <li>Salón, dirección y mapa</li>
            <li>Fotos, textos y mensaje especial</li>
            <li>Colores e idioma</li>
          </ul>
        </div>
      </div>
    </section>

    <section aria-labelledby="una-seccion">
      <div class="wrap">
        <h2 id="una-seccion">Cambia una sola sección con IA</h2>
        <div class="rule"></div>
        <p>Si te encanta el diseño pero quieres mejorar una parte, pide un cambio solo para esa sección.</p>
        <ul class="requests">${promptsHtml}</ul>
      </div>
    </section>

    <section class="alt" id="planes" aria-labelledby="planes-h">
      <div class="wrap">
        <h2 id="planes-h">Planes para obtener esta invitación</h2>
        <div class="rule"></div>
        <div class="plans">${planesHtml}</div>
      </div>
    </section>

    <section id="crear-con-ia" aria-labelledby="ia-h">
      <div class="wrap">
        <h2 id="ia-h">Crea una invitación nueva con IA</h2>
        <div class="rule"></div>
        <p>¿Buscas otro estilo? Describe tu fiesta y la IA diseña una invitación nueva desde cero.</p>
        <div class="cta-row">
          <a class="btn btn-ghost" href="/editor" data-hva="cta_click" data-hva-cta="generate_ai" data-hva-location="ai">Crear con IA</a>
        </div>
      </div>
    </section>

    <section class="alt" aria-labelledby="faq-h">
      <div class="wrap">
        <h2 id="faq-h">Preguntas frecuentes</h2>
        <div class="rule"></div>
        <div class="faq" style="margin:0 auto">${faqHtml}</div>
      </div>
    </section>

    <section class="final" aria-labelledby="final-h">
      <div class="wrap">
        <h2 id="final-h">Personaliza esta invitación hoy</h2>
        <p>Tu invitación digital lista en minutos, sin descargas y con todo lo que tu evento necesita.</p>
        <div class="cta-row">
          <a class="btn btn-primary" href="${esc(editorHref)}" data-hva="cta_click" data-hva-cta="customize" data-hva-location="final">Personalizar esta invitación</a>
          <a class="btn btn-ghost" href="/editor" data-hva="cta_click" data-hva-cta="generate_ai" data-hva-location="final">Crear con IA</a>
        </div>
      </div>
    </section>
  </main>

  <footer>
    <div class="wrap">
      <span>&copy; ${new Date().getFullYear()} ${BRAND_NAME}</span>
      <span><a href="/catalogo/">Ver todo el catálogo</a></span>
    </div>
  </footer>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// JSON-LD Product Schema
// ---------------------------------------------------------------------------
function buildProductSchema(item, { h1, title, metaDesc, canonical, ogImage, faqs, planes, publicUrl }) {
  const graph = [
    {
      '@type': 'Organization',
      '@id': `https://invitacionesmodernas.com/#organization`,
      name: BRAND_NAME,
      url: 'https://invitacionesmodernas.com/',
      description: 'Invitaciones digitales personalizables que se comparten por WhatsApp, sin descargas.'
    },
    {
      '@type': 'WebSite',
      '@id': `${publicUrl}/#website`,
      url: `${publicUrl}/`,
      name: BRAND_NAME,
      publisher: { '@id': `https://invitacionesmodernas.com/#organization` }
    },
    {
      '@type': 'WebPage',
      '@id': `${canonical}#webpage`,
      url: canonical,
      name: title,
      description: metaDesc,
      inLanguage: 'es',
      isPartOf: { '@id': `${publicUrl}/#website` },
      dateModified: item.created_at || new Date().toISOString().slice(0, 10)
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${publicUrl}/` },
        { '@type': 'ListItem', position: 2, name: 'Catálogo', item: `${publicUrl}/catalogo/` },
        { '@type': 'ListItem', position: 3, name: h1 }
      ]
    },
    {
      '@type': 'Product',
      '@id': `${canonical}#product`,
      name: h1,
      description: metaDesc,
      url: canonical,
      ...(ogImage ? { image: [ogImage] } : {}),
      brand: { '@type': 'Brand', name: BRAND_NAME },
      offers: planes.filter((p) => p.price).map((p) => ({
        '@type': 'Offer',
        name: p.name,
        price: p.price,
        priceCurrency: 'MXN',
        availability: 'https://schema.org/InStock',
        url: canonical
      }))
    }
  ];
  if (faqs.length) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({
        '@type': 'Question',
        name: String(f.question || f.q || ''),
        acceptedAnswer: { '@type': 'Answer', text: String(f.answer || f.a || '') }
      }))
    });
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}
