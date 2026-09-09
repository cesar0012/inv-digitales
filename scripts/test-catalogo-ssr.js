/**
 * Test del SSR de catálogo (server/ssr/catalogo-ssr.js).
 *
 * Valida la corrección del problema de rastreabilidad (crawl sin JS veía un
 * body vacío) y las defensas incorporadas:
 *   1. stripEventDates elimina fechas/horas heredadas de meta_description.
 *   2. sanitizeSeoHtml neutraliza script, atributos on y URLs javascript.
 *   3. renderCatalogoSsr produce: H1 en body, FAQ en <details>/<summary>,
 *      canonical, og:image válido (nunca .html), JSON-LD con grafo
 *      Product+BreadcrumbList+FAQPage+Organization, y preserva los scripts
 *      del dist (la SPA sigue montando).
 *   4. Casos borde: item sin seo_content_json, dist sin #root.
 *
 * Uso: node scripts/test-catalogo-ssr.js
 */
import { renderCatalogoSsr, stripEventDates, sanitizeSeoHtml } from '../server/ssr/catalogo-ssr.js';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OG_DIR = join(__dirname, '..', 'server', 'storage', 'og');

const failures = [];
let passed = 0;
const ok = (cond, msg) => {
  if (cond) { passed += 1; console.log('  ✅ ' + msg); }
  else { failures.push(msg); console.log('  ❌ ' + msg); }
};

const DIST_HTML = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Invitaciones Digitales</title><script type="module" src="/assets/app.js"></script></head><body><div id="root"></div></body></html>`;

// ============================================================================
console.log('\n=== 1. stripEventDates (metadata heredada con fecha/hora) ===');
{
  const dirty = 'Crea tu invitación de boda para el 25 de septiembre de 2026 en Palacio Blanco, a las 14:00 horas. ¡Descúbrela!';
  const clean = stripEventDates(dirty);
  ok(!/2026|septiembre|14:00/.test(clean), `fecha y hora eliminadas: "${clean}"`);
  ok(/invitación de boda/.test(clean), 'el resto del copy se conserva');
  ok(stripEventDates('') === '' && stripEventDates(null) === '', 'entradas vacías seguras');
}

// ============================================================================
console.log('\n=== 2. sanitizeSeoHtml (defensa server-side del html de IA) ===');
{
  const evil = `<p>Texto</p><script>alert(1)</script><p onclick="roba()">con evento</p><a href="javascript:x">y</a><style>.x{}</style>`;
  const clean = sanitizeSeoHtml(evil);
  ok(!/<script|<style/i.test(clean), 'sin <script>/<style>');
  ok(!/onclick/i.test(clean), 'sin atributos on*');
  ok(!/javascript:/i.test(clean), 'sin URLs javascript:');
  ok(/<p>Texto<\/p>/.test(clean), 'contenido legítimo conservado');
}

// ============================================================================
console.log('\n=== 3. renderCatalogoSsr: SSR completo ===');
const faqs = [
  { question: '¿Cómo personalizo la plantilla?', answer: 'Abre el editor y cambia textos, colores y fotos con tus datos.' },
  { question: '¿Cómo la comparto?', answer: 'Por WhatsApp o cualquier mensajero, como enlace.' },
  { question: '¿Necesito instalar algo?', answer: 'No, es 100% digital.' },
  { question: '¿En qué dispositivos se ve?', answer: 'En cualquier teléfono o computadora.' }
];
const item = {
  slug: 'boda/boda-tradicional-floral',
  seo_title: 'Invitación digital de Boda floral | Ana <y> Carlos',
  meta_description: 'Crea tu invitación de boda para el 25 de septiembre de 2026 en Hacienda San Antonio, a las 18:00 horas. Personalizable.',
  structured_data: JSON.stringify({ '@context': 'https://schema.org', '@type': 'Product', name: 'Boda Floral' }),
  seo_content_json: JSON.stringify({
    h1: 'Invitación de Boda Elegante para Ana y Carlos',
    sections: {
      section_1: { title: 'Invitación digital de boda', html: '<p>Diseño floral elegante <strong>100% digital</strong>.</p><ul><li>Personalizable</li><li>Compartible por WhatsApp</li></ul>' },
      section_4: { title: '¿Cómo se ve?', html: '<p>Estilo floral clásico con tonos beige.</p>' },
      section_5: { title: 'Personaliza', html: '<p>Cambia nombres, fecha y colores en el editor.</p>' },
      section_6: { title: 'Por qué elegirla', html: '<p>Entrega inmediata y sin descargas.</p>' },
      section_7: { title: 'Ejemplos', html: '<p>Ideas rápidas:</p>', example_prompts: ['Cámbialo a tonos azules', 'Agrega los nombres de mis padrinos'] },
      section_11: { title: 'Preguntas frecuentes', html: '', faqs },
      section_12: { title: 'Crea la tuya', html: '<p>Empieza en segundos.</p>' }
    }
  }),
  filename: 'invitacion_123.html',
  event_type: 'Boda Tradicional',
  title: 'Boda Tradicional - Floral'
};
let html;
{
  html = renderCatalogoSsr(DIST_HTML, item, { publicUrl: 'https://generador.invitacionesmodernas.com', requestPath: '/catalogo/boda/boda-tradicional-floral' });

  // Body rastreable
  ok(/<h1[^>]*>Invitación de Boda Elegante/.test(html), 'H1 de la plantilla presente en el body');
  ok((html.match(/<details>/g) || []).length === 4, '4 FAQs como <details> (acordeón nativo sin JS)');
  ok(/<summary>¿Cómo personalizo la plantilla\?<\/summary>/.test(html), 'preguntas de FAQ en <summary>');
  ok(/href="\/editor\?filename=invitacion_123\.html"/.test(html), 'CTA como <a href> real al editor');
  ok(/Ejemplos/.test(html) && /<li>Cámbialo a tonos azules<\/li>/.test(html), 'example_prompts renderizados como lista');
  ok(/100% digital|Personalizable/.test(html), 'contenido de secciones presente');
  ok(/ssr-page/.test(html) && /ssr-hero/.test(html), 'capa estática con estilos propios (self-contained)');

  // Head
  ok(/<link rel="canonical" href="https:\/\/generador\.invitacionesmodernas\.com\/catalogo\/boda\/boda-tradicional-floral">/.test(html), 'canonical absoluto');
  ok(!/25 de septiembre|14:00|18:00/.test(html.match(/<meta name="description"[^>]*>/)?.[0] || ''), 'meta description sin fecha ni hora');
  ok(!/storage\/historico.*\.html/.test(html), 'og:image NUNCA apunta al .html del histórico');
  ok((html.match(/<meta property="og:image"/g) || []).length <= 1, 'og:image presente a lo más una vez (solo si existe asset real)');

  // JSON-LD
  const ldMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  ok(!!ldMatch, 'JSON-LD presente en el HTML servido');
  if (ldMatch) {
    const ld = JSON.parse(ldMatch[1]);
    const types = (ld['@graph'] || []).map((g) => g['@type']);
    ok(types.includes('Product') && types.includes('BreadcrumbList') && types.includes('FAQPage') && types.includes('Organization'),
      `grafo con Product+BreadcrumbList+FAQPage+Organization (${types.join(', ')})`);
    const faqNode = ld['@graph'].find((g) => g['@type'] === 'FAQPage');
    ok(faqNode?.mainEntity?.length === 4, 'FAQPage con las 4 preguntas');
    const prod = ld['@graph'].find((g) => g['@type'] === 'Product');
    ok(!prod['@context'], 'Product sin @context duplicado (lo aporta el grafo)');
    ok(prod.offers && !('price' in prod.offers), 'Offer sin precio inventado (hasta que plan_config tenga precio)');
    ok(!('sameAs' in (ld['@graph'].find((g) => g['@type'] === 'Organization') || {})), 'Organization sin sameAs (marca canónica pendiente de decisión)');
  }

  // Escape de contenido peligroso
  ok(!/<script>alert/.test(html) && !/<title>[^<]*<y>/.test(html), 'title con <y> escapado');
  ok(html.includes('<script type="module" src="/assets/app.js"></script>'), 'scripts del dist conservados (la SPA sigue montando)');
  ok(/<div id="root">[\s\S]*ssr-page/.test(html), 'capa SSR DENTRO de #root (createRoot la reemplaza al montar)');
}

// ============================================================================
console.log('\n=== 4. Casos borde ===');
{
  const minimal = renderCatalogoSsr(DIST_HTML, { seo_title: 'Solo título', filename: 'x.html' }, { publicUrl: 'https://g.mx', requestPath: '/catalogo/general/x' });
  ok(minimal.includes('<title>Solo título</title>') && minimal.includes('ssr-hero'), 'item sin seo_content_json: head + hero mínimo con H1');
  ok((minimal.match(/<details>/g) || []).length === 0, 'sin FAQ no se emite acordeón');

  const noRoot = renderCatalogoSsr('<!DOCTYPE html><html><head><title>x</title></head><body><main id="app"></main></body></html>', item, { publicUrl: 'https://g.mx', requestPath: '/catalogo/boda/x' });
  ok(!noRoot.includes('ssr-page'), 'dist sin <div id="root"></div>: NO inserta body (evita duplicar junto a la SPA)');
  ok(noRoot.includes('application/ld+json'), 'pero el head completo (meta + JSON-LD) sí se sirve');

  // Robustez: seo_content_json corrupto
  const corrupt = renderCatalogoSsr(DIST_HTML, { ...item, seo_content_json: '{invalid json' }, { publicUrl: 'https://g.mx', requestPath: '/catalogo/boda/x' });
  ok(corrupt.includes('ssr-hero'), 'seo_content_json corrupto: no rompe, sirve fallback');
}

// ============================================================================
console.log('\n=== 5. og:image con prioridad screenshot > default > omitir ===');
{
  const slug = 'boda/boda-tradicional-floral';
  const shotFile = join(OG_DIR, slug.replace(/\//g, '-') + '.jpg');
  const created = !existsSync(shotFile);
  try {
    if (created) writeFileSync(shotFile, 'jpg-test');
    const withShot = renderCatalogoSsr(DIST_HTML, item, { publicUrl: 'https://g.mx', requestPath: `/catalogo/${slug}` });
    const og = withShot.match(/<meta property="og:image" content="([^"]*)">/);
    ok(!!og && og[1] === 'https://g.mx/storage/og/boda-boda-tradicional-floral.jpg',
      `og:image usa el screenshot de la plantilla (${og?.[1]})`);
  } finally {
    if (created && existsSync(shotFile)) unlinkSync(shotFile);
  }
  // Sin screenshot ni default → omitido (ya validado en sección 3, re-verificación rápida)
  const noOg = renderCatalogoSsr(DIST_HTML, item, { publicUrl: 'https://g.mx', requestPath: `/catalogo/${slug}` });
  ok(!/<meta property="og:image"/.test(noOg), 'sin screenshot ni default: og:image omitido (nunca el .html del histórico)');
}

// ============================================================================
console.log('\n=== RESULTADO ===');
if (failures.length === 0) {
  console.log(`✅ TEST PASSED: ${passed} verificaciones superadas`);
} else {
  console.log(`❌ TEST FAILED: ${failures.length} verificación(es) fallida(s):`);
  for (const f of failures) console.log('   • ' + f);
  process.exit(1);
}
