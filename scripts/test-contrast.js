/**
 * Test del ajuste de contraste texto/fondo sobre imágenes generadas (Nano Banana).
 *
 * Valida:
 *   1. Colorimetría WCAG (ratios conocidos).
 *   2. analyzeBackground sobre PNGs sintéticos (oscuro/claro) y rechazo de no-PNG.
 *   3. pickTextColorForLuminance: preferencia por el color del cliente cuando
 *      contrasta cómodamente; blanco/negro cuando no.
 *   4. applyTextContrast end-to-end: fix scoped solo en el módulo afectado,
 *      respeto de módulos con tarjeta opaca (var(--surface-color)), y ciclo
 *      completo theming→contraste→re-theming (el rebind elimina el fix y el
 *      análisis lo recrea si sigue aplicando).
 *
 * Uso: node scripts/test-contrast.js
 */
import { PNG } from 'pngjs';
import {
  relativeLuminance, contrastRatio, parseHexColor,
  analyzeBackground, pickTextColorForLuminance, applyTextContrast
} from '../server/contrastService.js';
import { applyPostRagTheme } from '../theming/apply-theme.js';

const failures = [];
let passed = 0;
const ok = (cond, msg) => {
  if (cond) { passed += 1; console.log('  ✅ ' + msg); }
  else { failures.push(msg); console.log('  ❌ ' + msg); }
};

const makePng = (rgb, w = 64, h = 64) => {
  const png = new PNG({ width: w, height: h });
  for (let i = 0; i < w * h; i++) {
    png.data[i * 4] = rgb[0]; png.data[i * 4 + 1] = rgb[1]; png.data[i * 4 + 2] = rgb[2]; png.data[i * 4 + 3] = 255;
  }
  return PNG.sync.write(png).toString('base64');
};

// ============================================================================
console.log('\n=== 1. Colorimetría WCAG ===');
{
  const white = relativeLuminance(255, 255, 255);
  const black = relativeLuminance(0, 0, 0);
  ok(Math.abs(contrastRatio(white, black) - 21) < 0.01, `blanco vs negro ≈ 21 (${contrastRatio(white, black).toFixed(2)})`);
  ok(Math.abs(contrastRatio(white, white) - 1) < 0.001, 'mismo color = ratio 1');
  ok(contrastRatio(relativeLuminance(...parseHexColor('#3d5390')), relativeLuminance(...parseHexColor('#1c2a4a'))) < 3.5,
    'azul del texto vs azul oscuro de fondo: ratio insuficiente (el caso del usuario)');
}

// ============================================================================
console.log('\n=== 2. analyzeBackground (PNGs sintéticos) ===');
{
  const dark = analyzeBackground(makePng([28, 42, 74]));   // azul noche
  const light = analyzeBackground(makePng([220, 228, 240])); // azul muy claro
  ok(dark && dark.median < 0.1, `fondo azul oscuro → luminancia baja (${dark?.median.toFixed(3)})`);
  ok(light && light.median > 0.7, `fondo claro → luminancia alta (${light?.median.toFixed(3)})`);
  ok(analyzeBackground(Buffer.from('fakejpegdata').toString('base64')) === null, 'no-PNG → null (degradación segura)');
}

// ============================================================================
console.log('\n=== 3. pickTextColorForLuminance ===');
{
  const darkLum = relativeLuminance(28, 42, 74);
  // accent crema claro del cliente: contrasta cómodo → gana sobre blanco
  const pickClient = pickTextColorForLuminance(darkLum, '#f2d0a4');
  ok(pickClient.source === 'client' && pickClient.hex === '#f2d0a4' && pickClient.ratio >= 4.5,
    `fondo oscuro + accent del cliente cómodo → accent (${pickClient.ratio.toFixed(1)})`);
  // accent azulado (no contrasta) → blanco
  const pickWhite = pickTextColorForLuminance(darkLum, '#3b4f7a');
  ok(pickWhite.source === 'white', `fondo oscuro + accent que no contrasta → blanco (${pickWhite.ratio.toFixed(1)})`);
  // fondo claro → negro
  const lightLum = relativeLuminance(220, 228, 240);
  const pickBlack = pickTextColorForLuminance(lightLum, '#e8e2d5');
  ok(pickBlack.source === 'black', `fondo claro sin accent válido → negro (${pickBlack.ratio.toFixed(1)})`);
}

// ============================================================================
console.log('\n=== 4. applyTextContrast end-to-end ===');
const darkBg = makePng([28, 42, 74], 96, 96);   // foto azul noche (el caso del usuario)
const goodBg = makePng([240, 236, 228], 96, 96); // fondo claro
const doc = `<!DOCTYPE html><html><head><style>:root { --primary-color: #1a2f5c; --text-color: #3d5390; --accent-color: #f2d0a4; --bg-color: #faf6f0; }</style></head><body>
  <section data-gemini-id="countdown-azul" memory_usage="protected" memory_type="background">
    <style>.ca { background-image: url('data:image/png;base64,${darkBg}'); color: var(--text-color); } .ca h2 { color: var(--primary-color); }</style>
    <div><h2 memory_type="text" memory_usage="custom">Falta poco</h2></div>
  </section>
  <section data-gemini-id="countdown-claro" memory_usage="protected" memory_type="background">
    <style>.cc { background-image: url('data:image/png;base64,${goodBg}'); color: var(--text-color); }</style>
    <div><h2 memory_type="text" memory_usage="custom">Otro módulo</h2></div>
  </section>
  <section data-gemini-id="portada-tarjeta" memory_usage="protected" memory_type="background">
    <style>.pt { background-image: url('data:image/png;base64,${darkBg}'); } .pt .card { background: var(--surface-color); color: var(--text-color); }</style>
    <div class="card"><h1 memory_type="text" memory_usage="custom">Nombres</h1></div>
  </section>
</body></html>`;

const clientColors = { primary: '#1a2f5c', text: '#3d5390', accent: '#f2d0a4', background: '#faf6f0' };

let result = await applyTextContrast(doc, clientColors);
{
  ok(result.fixes.length === 1, `exactamente 1 fix (el módulo azul) — ${result.fixes.length}`);
  const fix = result.fixes[0];
  ok(fix?.geminiId === 'countdown-azul', 'fix scoped al módulo con fondo azul generado');
  ok(fix?.overrides['--text-color'] === '#f2d0a4', `--text-color → accent del cliente (${fix?.overrides['--text-color']})`);
  ok(fix?.overrides['--primary-color'] === '#f2d0a4', '--primary-color (títulos) también ajustado');
  ok(/--secondary-color: color-mix\(in srgb, #f2d0a4 72%, rgb\(/.test(result.html), '--secondary-color derivada del tono real de la foto');
  ok(result.html.includes('[data-gemini-id="countdown-azul"] { --text-color: #f2d0a4;'), 'override inyectado con selector scoped por data-gemini-id');
  ok(result.html.includes('data-contrast-fix="countdown-azul"'), 'style marcado con data-contrast-fix (auditable)');
  ok(!result.html.includes('data-contrast-fix="countdown-claro"'), 'módulo con fondo que SÍ contrasta: sin fix');
  ok(!result.html.includes('data-contrast-fix="portada-tarjeta"'), 'módulo con tarjeta opaca (var(--surface-color)): sin fix');
  ok(result.html.includes('data-gemini-id="countdown-claro"'), 'documento íntegro (los otros módulos siguen)');
}

// ============================================================================
console.log('\n=== 5. Ciclo theming → contraste → re-theming (idempotencia) ===');
{
  // El re-theming elimina los overrides (rebind de variables reservadas): el
  // <style> marcado queda vacío (elemento inofensivo) y sin declaraciones.
  const rethemed = await applyPostRagTheme(result.html, { colors: clientColors }, { push: () => {} });
  const emptied = rethemed.html.match(/<style[^>]*data-contrast-fix[^>]*>([\s\S]*?)<\/style>/);
  ok(!emptied || !/--(text|primary|secondary)-color\s*:/.test(emptied[1]), 're-theming vacía los overrides de contraste (rebind)');
  // …y el análisis los recrea si siguen aplicando.
  const again = await applyTextContrast(rethemed.html, clientColors);
  ok(again.fixes.length === 1 && again.fixes[0].geminiId === 'countdown-azul', 'el análisis recrea el fix del módulo azul');
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
