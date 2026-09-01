/**
 * Test de la optimización de velocidad del orquestador modular (RAG).
 *
 * La optimización reemplaza los loops secuenciales por un pool de concurrencia
 * limitada (runWithConcurrency) que PRESERVA el orden de los resultados, y
 * reorganiza resolvePlaceholders en 3 fases (extraer → pool de generación →
 * aplicar). Este test verifica que la equivalencia con el flujo original:
 *
 *   1. runWithConcurrency preserva el índice de entrada == salida aunque las
 *      tareas tarden distinto (crítico: el orden de ensamblado de módulos es
 *      el contrato con el editor y el RAG modular).
 *   2. La concurrencia real nunca supera el límite (rate limits de la API).
 *   3. El speedup es real (N tareas de N·t ms terminan en ~N/limit·t ms).
 *   4. resolvePlaceholders: smoke de fases sin red (loremflickr temprano y
 *      library sin assets → placeholders preservados, HTML intacto).
 *   5. buildPlaceholderPrompt: la extracción de la lógica de prompts produce
 *      el mismo prompt por tipo de módulo (template + theme).
 *
 * Uso: node scripts/test-perf-orchestrator.js
 */
import { parseHTML } from 'linkedom';
import { runWithConcurrency, resolvePlaceholders, buildPlaceholderPrompt } from '../server/agentOrchestrator.js';

const failures = [];
let passed = 0;
const ok = (cond, msg) => {
  if (cond) { passed += 1; console.log('  ✅ ' + msg); }
  else { failures.push(msg); console.log('  ❌ ' + msg); }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ============================================================================
console.log('\n=== 1. runWithConcurrency: orden preservado ===');
{
  const durations = [70, 20, 90, 40, 10, 60, 30, 80, 50, 25, 15, 95];
  const results = await runWithConcurrency(
    durations.map((d, i) => async () => { await sleep(d); return `mod-${i};${d}ms`; }),
    4
  );
  ok(results.length === durations.length, `devuelve ${durations.length} resultados (${results.length})`);
  ok(results.every((r, i) => r.startsWith(`mod-${i};`)), 'índice de entrada == índice de salida aunque las tareas tarden distinto');
}

// ============================================================================
console.log('\n=== 2. runWithConcurrency: límite de concurrencia respetado ===');
{
  let active = 0;
  let maxActive = 0;
  const results = await runWithConcurrency(
    Array.from({ length: 12 }, (_, i) => async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await sleep(25);
      active -= 1;
      return i;
    }),
    3
  );
  ok(maxActive <= 3, `concurrencia máxima observada ${maxActive} <= límite 3 (rate limits)`);
  ok(results.every((r, i) => r === i), 'resultados en orden con límite 3');
}

// ============================================================================
console.log('\n=== 3. runWithConcurrency: speedup real ===');
{
  const N = 8;
  const perTaskMs = 100;
  const limit = 4;
  const t0 = Date.now();
  await runWithConcurrency(Array.from({ length: N }, () => async () => { await sleep(perTaskMs); }), limit);
  const elapsed = Date.now() - t0;
  const sequentialMs = N * perTaskMs; // 800ms
  // Con límite 4: ~2 rondas ⇒ ~200ms (+ margen). Secuencial: 800ms.
  ok(elapsed < sequentialMs / 2, `8 tareas de 100ms en ${elapsed}ms con límite 4 (secuencial: ${sequentialMs}ms)`);
}

// ============================================================================
console.log('\n=== 4. resolvePlaceholders: smoke de fases sin red ===');
{
  const html = `<!DOCTYPE html><html><head><style></style></head><body>
    <section data-gemini-id="portada-nombre" memory_type="background" memory_usage="protected" memory_source="generated" path="placeholder">
      <style>.portada { background-image: url('https://loremflickr.com/1920/1080/nature'); }</style>
      <h1 memory_type="text" memory_usage="custom">Nombres</h1>
    </section>
    <figure memory_type="image" memory_usage="custom" memory_source="library" path="placeholder">
      <img src="https://loremflickr.com/600/400/flowers" alt="Deco" />
    </figure>
  </body></html>`;

  // (a) loremflickr: retorno temprano idéntico al flujo original
  const early = await resolvePlaceholders(html, 'Boda Tradicional', 'floral', '', 'gemini-3.1-flash-image-preview', 'loremflickr');
  ok(early === html, 'imageProvider=loremflickr devuelve el HTML sin cambios (comportamiento original)');

  // (b) library: ejercita fases 1 y 3 SIN llamar a Nano Banana (no hay red en
  //     el test). mapCategoryToFolder resuelve a una carpeta real (/img/...),
  //     así que el reemplazo de assets de librería debe aplicar en orden DOM
  //     con índices deterministas, igual que el flujo secuencial original.
  const noGenHtml = html.replace('memory_source="generated"', 'memory_source="library"');
  const resolved = await resolvePlaceholders(noGenHtml, 'Boda Tradicional', 'floral', 'invalid-key-for-test', 'gemini-3.1-flash-image-preview', 'gemini');
  ok(typeof resolved === 'string' && /\/img\/[^"']+\.(jpg|jpeg|png|webp)/i.test(resolved), 'library: assets reemplazados desde /img/ (fases 1+3)');
  ok(!resolved.includes('loremflickr.com/1920'), 'library: background loremflickr reemplazado');
  ok(resolved.includes('data-gemini-id="portada-nombre"'), 'estructura del módulo intacta (compatible con editor)');
}

// ============================================================================
console.log('\n=== 5. buildPlaceholderPrompt: lógica de prompts preservada ===');
{
  const { document } = parseHTML(`
    <section data-gemini-id="portada-nombre" memory_type="background" memory_source="generated" path="placeholder">
      <style></style>
      <script>const moduleMetadata = { module_type: 'portada', module_name: 'portada-nombre', style_name: 'X', descripcion: 'd', tags: ['portada', 'boda', 'naturaleza', 'floral'], tipo: 'portada' };</script>
    </section>`);
  const placeholder = document.querySelector('[path="placeholder"]');
  const prompt = buildPlaceholderPrompt(placeholder, 'jardín floral romántico');
  ok(prompt.includes('portada de invitación'), 'usa el template de portada según data-gemini-id');
  ok(prompt.includes('jardín floral romántico'), 'inyecta el theme del usuario ({theme})');
  ok(prompt.includes('sin personas'), 'mantiene restricciones de generación del template');

  const { document: docImg } = parseHTML(`
    <figure memory_type="image" memory_source="generated" path="placeholder">
      <script>const moduleMetadata = { tags: ['flores', 'novios', 'arco floral'], descripcion: 'd', tipo: 'detalles' };</script>
    </figure>`);
  const promptImg = buildPlaceholderPrompt(docImg.querySelector('[path="placeholder"]'), 'boho');
  ok(promptImg.includes('flores') && promptImg.includes('arco floral'), 'memory_type=image conserva tags visuales limpios');
  ok(!promptImg.includes('novios'), 'EXCLUDE_TAGS filtra términos que inducen personas');
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
