/**
 * Test del subsistema de Tematización Post-RAG.
 *
 * Ejecuta un caso real con 2 módulos de Countdown/ + 1 fixture con literales
 * y un contenedor con :root preexistente, verificando que:
 *   (a) los colores cambian vía override centralizado (:root + link),
 *   (b) las fuentes quedan unificadas hacia var(--font-base/--font-heading),
 *   (c) los bloques memory_usage="protected" NO se modifican (colores),
 *   (d) las redefiniciones locales de variables reservadas se rebindan,
 *   (e) el contrato rechaza entradas maliciosas/incompletas,
 *   (f) el proceso continúa ante módulos corruptos (resiliencia),
 *   (g) el re-theming es idempotente (sin duplicar link ni variables).
 *
 * Uso: node theming/test-theme.js
 */
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import {
  runThemeRequest,
  validateThemeRequest,
  applyPostRagTheme
} from './apply-theme.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const failures = [];
let passed = 0;

const ok = (cond, msg) => {
  if (cond) { passed += 1; console.log('  ✅ ' + msg); }
  else { failures.push(msg); console.log('  ❌ ' + msg); }
};

const read = async (p) => readFile(p, 'utf-8');

// ============================================================================
console.log('\n=== 1. Ejecución del request de ejemplo ===');
const request = JSON.parse(await read(join(__dirname, 'example-request.json')));
const logEntries = [];
const logger = { entries: logEntries, push(e) { logEntries.push(e); } };
const { manifest } = await runThemeRequest(request, { baseDir: __dirname, logger });

ok(manifest.summary.modulesTotal === 3, 'manifiesto: 3 módulos procesados');
ok(manifest.summary.modulesOk === 3 && manifest.summary.modulesFailed === 0, 'manifiesto: 0 fallos de módulos');
ok(manifest.summary.colorSubstitutions > 0, `manifiesto: sustituciones de color > 0 (${manifest.summary.colorSubstitutions})`);
ok(manifest.summary.fontSubstitutions > 0, `manifiesto: sustituciones de fuente > 0 (${manifest.summary.fontSubstitutions})`);
ok(/Playfair\+Display.*Cormorant\+Garamond|Cormorant\+Garamond.*Playfair\+Display/.test(manifest.theme.googleFontsUrl || ''),
  `URL de Google Fonts correcta (${manifest.theme.googleFontsUrl})`);

// ============================================================================
console.log('\n=== 2. Contenedor final: override centralizado (Paso 2) ===');
const containerOut = await read(manifest.container.output);
ok(containerOut.includes('--primary-color: #8A4F3D'), ':root --primary-color del cliente');
ok(containerOut.includes('--text-color: #2E2A26'), ':root --text-color del cliente');
ok(containerOut.includes('--accent-color: #B98A5E'), ':root --accent-color del cliente');
ok(containerOut.includes('--bg-color: #FAF6F0'), ':root --bg-color del cliente');
ok(containerOut.includes('--background-color: #FAF6F0'), ':root --background-color (alias legacy)');
ok(containerOut.includes('--surface-color: #FFFFFF'), ':root --surface-color opcional');
ok(containerOut.includes('--border-color: #E5DCCF'), ':root --border-color opcional');
ok(containerOut.includes('--secondary-color: color-mix(in srgb, var(--text-color) 72%, var(--bg-color))'),
  ':root --secondary-color derivada del cliente (texto atenuado)');
ok(containerOut.includes("--font-base: 'Playfair Display', sans-serif"), ':root --font-base');
ok(containerOut.includes("--font-heading: 'Cormorant Garamond', serif"), ':root --font-heading');
ok(containerOut.includes('--legacy-var: 7'), 'fusión :root preserva variables no reservadas (--legacy-var)');
ok(!containerOut.includes('#deadbe'), 'fusión :root reemplaza el valor viejo (--primary-color: #deadbe)');
const fontLinkCount = (containerOut.match(/data-theme-font="1"/g) || []).length;
ok(fontLinkCount === 1, `<link> de Google Fonts inyectado UNA sola vez (${fontLinkCount})`);
ok(containerOut.includes('family=Playfair+Display') && containerOut.includes('family=Cormorant+Garamond'), 'link con ambas familias');
ok(/body\s*\{[^}]*font-family:\s*var\(--font-base\)/.test(containerOut), 'body hereda var(--font-base)');

// ============================================================================
console.log('\n=== 3. Módulo var-driven (Countdown/countdown-01): NO tocar ===');
const srcC1 = await read(join(__dirname, '..', 'Countdown', 'countdown-01.html'));
const outC1 = await read(manifest.modules[0].output);
const styleOf = (html) => (html.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || '';
ok(styleOf(srcC1) === styleOf(outC1), 'bloque <style> protected byte-idéntico (nada que tocar)');
ok(outC1.includes('--countdown-panel: color-mix(in srgb, var(--bg-color) 82%, transparent)'), 'variable derivada --countdown-panel preservada');

console.log('\n=== 3b. Countdown/countdown-05: fallbacks protegidos intactos ===');
const outC5 = await read(manifest.modules[1].output);
ok(outC5.includes('var(--bg-color, #f4efe8)'), 'fallbacks var(--bg-color, #f4efe8) intactos (protected)');

// ============================================================================
console.log('\n=== 4. Fixture con literales: sustitución + protección (Paso 3/4) ===');
const outFx = await read(manifest.modules[2].output);

// (c) override de colores en protected (nueva política overrideProtectedColors)
ok(outFx.includes('background-color: var(--surface-color)'), 'protected: background-color #112233 → var(--surface-color)');
ok(outFx.includes('color: var(--text-color)'), 'protected: color #445566 → var(--text-color)');
ok(outFx.includes('border: 3px dotted var(--border-color)'), 'protected: border #999999 → var(--border-color)');
for (const lit of ['#112233', '#445566', '#999999']) {
  ok(!outFx.includes(lit), `protected: literal ${lit} sustituido`);
}

// (c2) lo que SÍ se preserva en protected: contraste y capas
ok(outFx.includes('color: #ffffff'), 'protected: color #ffffff (contraste sobre overlay) PRESERVADO');
ok(outFx.includes('background: rgba(0,0,0,.55)'), 'protected: overlay rgba(0,0,0,.55) PRESERVADO');
ok(outFx.includes('--panel-tone: #abcdef'), 'protected: variable no reservada --panel-tone intacta');
ok(outFx.includes('color: var(--accent-color)'), 'protected: declaración var-driven intacta');

// (d) paleta propia de módulo adaptado (--ink/--paper/--serif-adaptada)
ok(!outFx.includes('color: var(--ink)'), 'adaptado: color var(--ink) → var(--text-color)');
ok(!outFx.includes('background-color: var(--paper)'), 'adaptado: background-color var(--paper) → var(--surface-color)');
ok(!outFx.includes('font-family: var(--serif-adaptada)'), 'adaptado: font-family var(--serif-adaptada) → var(--font-base)');
ok(outFx.includes('--ink: #242321'), 'adaptado: definición local --ink intacta (queda muerta, sin usos)');

// (d2) rebind de variables reservadas (fusión sin duplicar)
ok(!outFx.includes('--primary-color: #123456'), 'rebind: --primary-color: #123456 eliminado');
ok(!outFx.includes('--text-color: #654321'), 'rebind: --text-color: #654321 eliminado');
ok(!outFx.includes('--secondary-color: #555544'), 'rebind: --secondary-color local eliminada (gobierna la global derivada)');

// unificación de fuentes (incluida protected, documentada)
ok(outFx.includes('font-family: var(--font-base)'), 'fuente unificada a var(--font-base)');
ok(!outFx.includes('Comic Sans MS'), "fuente protected 'Comic Sans MS' unificada (política overrideProtectedFonts)");
ok(!outFx.includes('Georgia'), "fuente custom 'Georgia' unificada");

// sustitución de literales en contexto custom
ok(outFx.includes('background-color: var(--surface-color)'), 'custom: background-color → var(--surface-color)');
ok(outFx.includes('border-color: var(--border-color)'), 'custom: border-color → var(--border-color)');
ok(outFx.includes('border: 2px solid var(--border-color)'), 'custom: shorthand border → var(--border-color)');
for (const lit of ['#333333', '#fff7ee', '#cccccc', '#c99999']) {
  ok(!outFx.includes(lit), `custom: literal ${lit} sustituido`);
}

// inline styles
ok(outFx.includes('color: var(--text-color); font-family: var(--font-heading)'), 'inline h3: color + font-heading (elemento h1-h6)');
ok(!outFx.includes('#a11a11'), 'inline h3: #a11a11 sustituido');
ok(!outFx.includes('Times New Roman'), "inline h3: 'Times New Roman' sustituida");
ok(outFx.includes('background-color: var(--surface-color);'), 'inline p: background-color → var(--surface-color)');
ok(outFx.includes('background: rgba(0,0,0,.5)'), 'overlay rgba(0,0,0,.5) PRESERVADO (semántica de capa)');
ok(!outFx.includes('#222222'), 'inline overlay: #222222 (opaco) sustituido');

// ============================================================================
console.log('\n=== 5. Manifiesto: contrato para el editor (Paso 5) ===');
const fxReport = manifest.modules[2];
const titleEntry = fxReport.elements.find(e => e.elementId === 'detalles-regalo__fixture-title');
ok(!!titleEntry, 'elementId derivado data-gemini-id + memory_key (detalles-regalo__fixture-title)');
ok(titleEntry && /Times New Roman/.test(titleEntry.originalFont || ''), 'currentFont/originalFont registrados para el editor');
ok(fxReport.changes.varRebinds.some(r => r.var === '--primary-color' && r.originalValue === '#123456'),
  'varRebinds con valor original (revertible)');
ok(fxReport.changes.varRebinds.some(r => r.var === '--secondary-color' && r.originalValue === '#555544'),
  'varRebinds de --secondary-color local');
ok(fxReport.changes.protectedColorOverrides >= 3, `overrides de color en protected contabilizados (${fxReport.changes.protectedColorOverrides})`);
ok(fxReport.changes.fontReplacements.some(r => /Comic Sans/.test(r.original)), 'reemplazos de fuente en hojas de estilo registrados con selector');
ok(manifest.container.injected.includes('root-override') && manifest.container.injected.includes('font-link') && manifest.container.injected.includes('body-font'),
  'contenedor: inyecciones registradas en manifiesto');

// ============================================================================
console.log('\n=== 6. Validación del contrato: rechazo de entradas inválidas ===');
const neg1 = await validateThemeRequest({ colors: { primary: '#111111', text: '#222222', accent: '#333333' }, modules: ['a.html'] });
ok(!neg1.valid && neg1.errors.some(e => e.path === '$.colors' || e.path === '$.colors.background'), 'falta rol background → rechazado');

const neg2 = await validateThemeRequest({
  colors: { primary: '#111111', text: '#fff; } body { background: url(evil)', accent: '#333333', background: '#ffffff' },
  modules: ['a.html']
});
ok(!neg2.valid, 'color con intento de inyección CSS → rechazado por patrón');

const neg3 = await validateThemeRequest({
  colors: { primary: '#111111', text: '#222222', accent: '#333333', background: '#ffffff', gradient: 'linear-gradient(x)' },
  modules: ['a.html']
});
ok(!neg3.valid, 'rol no permitido (additionalProperties) → rechazado');

const neg4 = await validateThemeRequest({
  colors: { primary: '#111111', text: '#222222', accent: '#333333', background: '#ffffff' },
  font: { base: "Inter'); } body { background: red" },
  modules: ['a.html']
});
ok(!neg4.valid, 'nombre de fuente con inyección → rechazado por patrón');

const neg5 = await validateThemeRequest({ colors: { primary: '#111111', text: '#222222', accent: '#333333', background: '#ffffff' }, modules: [] });
ok(!neg5.valid, 'modules vacío → rechazado');

// ============================================================================
console.log('\n=== 7. Resiliencia: módulo inexistente no aborta el resto ===');
const resilienceRequest = {
  colors: request.colors,
  font: request.font,
  fontOptions: request.fontOptions,
  modules: [...request.modules, 'no-existe.html'],
  output: './test-output-resilience',
  dryRun: true
};
const resilience = await runThemeRequest(resilienceRequest, { baseDir: __dirname, logger: { entries: [], push() {} } });
ok(resilience.manifest.summary.modulesFailed === 1, 'módulo inexistente marcado como error');
ok(resilience.manifest.summary.modulesOk === 3, 'el resto de módulos se procesó con éxito');
ok(resilience.manifest.modules[3].status === 'error' && resilience.manifest.modules[3].error, 'fallo reportado con mensaje estructurado');

// ============================================================================
console.log('\n=== 8. Idempotencia: re-theming del documento (orquestador) ===');
const { html: themedOnce } = await applyPostRagTheme(containerOut, {
  colors: request.colors, font: request.font, fontOptions: request.fontOptions
}, { push() {} });
const linksAfterRetheme = (themedOnce.match(/data-theme-font="1"/g) || []).length;
ok(linksAfterRetheme === 1, `re-theming: sigue habiendo UN solo <link> (${linksAfterRetheme})`);
ok(themedOnce.includes('--primary-color: #8A4F3D') && !themedOnce.includes('#deadbe'), 're-theming: valores del :root estables');
const baseDecls = (themedOnce.match(/--font-base:\s*'Playfair Display', sans-serif;/g) || []).length;
ok(baseDecls >= 1 && (themedOnce.match(/body\s*\{[^}]*font-family:\s*var\(--font-base\)/g) || []).length === 1,
  're-theming: body con var(--font-base) sin duplicar');

// ============================================================================
console.log('\n=== 9. Smoke del CLI ===');
const cli = spawnSync(process.execPath, [join(__dirname, 'apply-theme.js'), '--help'], { encoding: 'utf-8' });
ok(cli.status === 0 && /Tematizaci/.test(cli.stdout), 'CLI --help responde con exit 0');

// ============================================================================
console.log('\n=== RESULTADO ===');
if (failures.length === 0) {
  console.log(`✅ TEST PASSED: ${passed} verificaciones superadas`);
  console.log('   Salidas de inspección en theming/test-output/');
} else {
  console.log(`❌ TEST FAILED: ${failures.length} verificación(es) fallida(s):`);
  for (const f of failures) console.log('   • ' + f);
  process.exit(1);
}
