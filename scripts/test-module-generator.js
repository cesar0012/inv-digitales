/**
 * Test del Generador de Módulos (llmRotator + moduleGeneratorService).
 *
 * Parte 1 — Rotador (sin red):
 *   clasificación quota/dead (quota gana si el texto contiene ambas),
 *   cooldowns + persistencia + reset, misión sin keys → error claro.
 * Parte 2 — Pipeline agéntico (LLM simulado):
 *   brief → generación inválida → critic loop con feedback → válida;
 *   reintento EXCLUYE al modelo anterior (diversidad); fallo persistente
 *   tras 3 intentos; validación sandbox sobre HTMLs reales.
 * Parte 3 — Importación al RAG (DB real): alta válida + rechazo de basura.
 *
 * Uso: node scripts/test-module-generator.js
 */
import { readFileSync, existsSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  llmRotator, isQuotaError, isModelUnavailableError
} from '../server/llmRotator.js';
const { getEntry } = llmRotator;
import {
  generateModule, validateGeneratedModule, importGeneratedModules, generateSet, saveGeneratedResult
} from '../server/moduleGeneratorService.js';
import db from '../server/database.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const failures = [];
let passed = 0;
const ok = (cond, msg) => {
  if (cond) { passed += 1; console.log('  ✅ ' + msg); }
  else { failures.push(msg); console.log('  ❌ ' + msg); }
};

// ============================================================================
console.log('\n=== 1. Clasificación de fallos (§7) ===');
{
  ok(isQuotaError('HTTP 429: rate limit exceeded'), '429/rate-limit → quota');
  ok(isQuotaError('Error: 503 service unavailable, try again later'), '503 → quota');
  ok(isModelUnavailableError('HTTP 404: model not found'), '404 not found → dead');
  ok(isModelUnavailableError('403: only available to users with purchased credits'), '403 solo-creditos → dead (no quota)');
  const both = '429 rate limit and 404 model not found';
  ok(isQuotaError(both) && !isModelUnavailableError(both), 'texto con AMBAS → quota gana');
  ok(!isQuotaError('syntax error near FROM') && !isModelUnavailableError('syntax error near FROM'), 'error no rotable → OTHER');
}

// ============================================================================
console.log('\n=== 2. Cooldowns + persistencia + reset ===');
{
  const fakeKey = 'test::fake-model';
  llmRotator.reportFailure(fakeKey, '429 rate limit');
  const quotaCooldown = getEntry(fakeKey).cooldown_until - Date.now();
  ok(quotaCooldown > 29 * 60 * 1000 && quotaCooldown <= 31 * 60 * 1000, `quota → cooldown ~30 min (${Math.round(quotaCooldown / 60000)} min)`);
  llmRotator.reportFailure(fakeKey, '404 model not found');
  const deadCooldown = getEntry(fakeKey).cooldown_until - Date.now();
  ok(deadCooldown > 23 * 60 * 60 * 1000, `dead → cooldown ~24 h (${Math.round(deadCooldown / 3600000)} h)`);
  const statePath = join(__dirname, '..', 'server', 'data', 'rotator_state.json');
  ok(existsSync(statePath) && readFileSync(statePath, 'utf-8').includes('test::fake-model'), 'estado persistido en rotator_state.json');
  llmRotator.resetCooldowns();
  ok(getEntry(fakeKey).cooldown_until === 0, 'resetCooldowns limpia todo');
  llmRotator.reportSuccess(fakeKey);
  ok(llmRotator.getStatus().current?.modelKey === fakeKey, 'reportSuccess actualiza current + limpia cooldown');
}

// ============================================================================
console.log('\n=== 3. Misión sin keys/catálogo ===');
{
  const m = llmRotator.createMission('coding');
  let errMsg = '';
  try { await m.call({ prompt: 'x', maxTokens: 10 }); }
  catch (e) { errMsg = e.message; }
  ok(/sin candidatos|API keys/i.test(errMsg), `sin catálogo/keys → error claro (${errMsg.slice(0, 50)})`);
}

// ============================================================================
console.log('\n=== 3b. resolve() con keys y exclusión (regresión del bug .includes) ===');
{
  // Regresión real de producción: con keys configuradas el filter evalúa el
  // predicado y un Set().includes habría lanzado TypeError. Se inyecta una
  // key temporal y se resuelve con exclude NO vacío.
  let previousKey = null;
  try {
    previousKey = db.prepare('SELECT openrouter_api_key AS k FROM admin_config WHERE id = 1').get()?.k || '';
    db.prepare("UPDATE admin_config SET openrouter_api_key = 'sk-or-test-regression' WHERE id = 1").run();
    await llmRotator.refreshCatalog({ force: true });
    const r1 = llmRotator.resolve({ lane: 'general', exclude: [] });
    ok(r1 !== null && r1.modelKey.startsWith('openrouter::'), `con key hay candidato (${r1?.modelKey?.slice(0, 40)})`);
    const r2 = llmRotator.resolve({ lane: 'general', exclude: [r1.modelKey] });
    ok(r2 !== null && r2.modelKey !== r1.modelKey, `exclude=[modelo] NO lanza y devuelve otro (${r2?.modelKey?.slice(0, 40)})`);
    const m = llmRotator.createMission('coding');
    m.excludeModel(r1.modelKey);
    const r3 = llmRotator.resolve({ lane: 'coding', exclude: m.deadModels() });
    ok(r3 === null || r3.modelKey !== r1.modelKey, 'misión con dead-set respeta la exclusión');
  } finally {
    db.prepare('UPDATE admin_config SET openrouter_api_key = ? WHERE id = 1').run(previousKey || '');
  }
}

// ============================================================================
console.log('\n=== 4. Validación determinista de módulos ===');
const countdownFixture = readFileSync(join(__dirname, '..', 'Countdown', 'countdown-01.html'), 'utf-8');
{
  const v = validateGeneratedModule(countdownFixture, 'countdown');
  ok(v.valid, `módulo real countdown-01 pasa validación completa (${v.errors.length} errores)`);
  if (!v.valid) console.log('     errores:', v.errors.slice(0, 5));

  const badSandbox = `<section data-gemini-id="portada-nombre" memory_usage="protected"><style>.x{color:var(--text-color)}</style>
    <script src="https://evil.com/x.js"></script><script>fetch('https://x.dev');</script>
    <script>var moduleMetadata={tipo:'portada'};</script></section>`;
  const v2 = validateGeneratedModule(badSandbox, 'portada');
  ok(!v2.valid && v2.errors.some((e) => /script src/.test(e)) && v2.errors.some((e) => /fetch/.test(e)), 'sandbox rechaza <script src> y fetch()');

  const badId = countdownFixture.replace('countdown-central-classic', 'otra-cosa');
  const v3 = validateGeneratedModule(badId, 'countdown');
  ok(!v3.valid && v3.errors.some((e) => /data-gemini-id/.test(e)), 'data-gemini-id inválido para el tipo → rechazado');
}

// ============================================================================
console.log('\n=== 5. Pipeline agéntico con LLM simulado (critic loop + refine) ===');
const BAD_MODULE = `<section class="x" data-gemini-id="countdown-fallo">
  <style>.x { color: #333; background-color: white; font-family: Georgia; }</style>
  <h2>Título</h2>
</section>`;
{
  const excluded = [];
  let genCalls = 0;
  const genPrompts = [];
  const mission = {
    call: async (task) => {
      if (task.maxTokens <= 700) {
        return { content: JSON.stringify({ style_name: 'Estela Minimal', concepto: 'Poética del vacío', paleta_neutral: 'grises cálidos', tipografia: 'serif aireada', animaciones: ['fade sutil'], ornamentos: ['línea fina'] }), modelKey: 'openrouter::qwen/test:free' };
      }
      if (task.maxTokens <= 900) {
        // Crítico de rúbrica: score alto → no se refina en este escenario
        return { content: JSON.stringify({ score: 95, mejoras: [] }), modelKey: 'openrouter::critic/test:free' };
      }
      genCalls += 1;
      genPrompts.push(task.prompt);
      const content = genCalls === 1 ? BAD_MODULE : countdownFixture;
      return { content, modelKey: genCalls === 1 ? 'openrouter::mal/test:free' : 'openrouter::buen/test:free' };
    },
    excludeModel: (k) => excluded.push(k),
    deadModels: () => excluded
  };

  const result = await generateModule('countdown', { mission });
  ok(genPrompts.some((p) => p.includes('EJEMPLO CANÓNICO') && p.includes('countdown-central')), 'prompt de generación incluye el EJEMPLO few-shot real (Countdown/countdown-01)');
  ok(result.validation.valid, 'crítico: el 2º intento (con feedback) produce un módulo válido');
  ok(result.attempts === 2, `attempts === 2 (${result.attempts})`);
  ok(genCalls === 2, 'se generó exactamente 2 veces');
  ok(excluded.includes('openrouter::mal/test:free'), 'el modelo del intento fallido queda EXCLUIDO (diversidad/segunda opinión)');
  ok(!!result.brief?.style_name, `brief creativo integrado (${result.brief?.style_name})`);
  ok(result.critique?.score === 95 && result.refined === false, 'crítico con score alto → sin refinamiento adicional');

  // Fallo persistente: 3 intentos, todos inválidos
  let calls = 0;
  const alwaysBad = {
    call: async (task) => {
      if (task.maxTokens <= 700) return { content: '{}', modelKey: 'x::y' };
      if (task.maxTokens <= 900) return { content: '{"score":95,"mejoras":[]}', modelKey: 'x::critic' };
      calls += 1;
      return { content: BAD_MODULE, modelKey: `x::model${calls}` };
    },
    excludeModel: () => {},
    deadModels: () => []
  };
  const failed = await generateModule('countdown', { mission: alwaysBad });
  ok(failed.failed === true && calls === 3, `fallos persistentes: 3 intentos y failed=true (${calls})`);
  ok(failed.validation.errors.length > 0, 'los errores del último intento viajan para diagnóstico');
}

// ============================================================================
console.log('\n=== 5b. Refinamiento por rúbrica (sube el nivel de LLMs débiles) ===');
{
  // Crítico severo (score 68 + mejoras) y refinador que devuelve el módulo mejorado
  const refinedFixture = countdownFixture.replace('</section>', '\n<!-- refined-v2: tipografía y ritmo mejorados -->\n</section>');
  let refineCalls = 0;
  const mission = {
    call: async (task) => {
      if (task.maxTokens <= 700) return { content: '{}', modelKey: 'x::b' };
      if (task.maxTokens <= 900) {
        return { content: JSON.stringify({ score: 68, mejoras: ['Aumentar contraste del texto sobre el fondo', 'Mejorar ritmo tipográfico en móvil'] }), modelKey: 'x::critic' };
      }
      if (/aplica las mejoras/i.test(task.prompt)) {
        refineCalls += 1;
        return { content: refinedFixture, modelKey: 'x::refiner' };
      }
      return { content: countdownFixture, modelKey: 'x::gen' };
    },
    excludeModel: () => {},
    deadModels: () => []
  };
  const result = await generateModule('countdown', { mission });
  ok(result.validation.valid, 'módulo refinado sigue siendo válido');
  ok(result.refined === true, 'el refinamiento se aplicó');
  ok(refineCalls === 1, 'exactamente 1 pasada de refinamiento');
  ok(result.html.includes('refined-v2'), 'el HTML final es el refinado');
  ok(result.critique?.score === 68, `la crítica viaja en el resultado (${result.critique?.score})`);

  // Refiner que rompe el contrato → se conserva el original válido
  const mission2 = {
    call: async (task) => {
      if (task.maxTokens <= 700) return { content: '{}', modelKey: 'x::b' };
      if (task.maxTokens <= 900) return { content: '{"score":60,"mejoras":["x","y"]}', modelKey: 'x::critic' };
      if (/aplica las mejoras/i.test(task.prompt)) return { content: BAD_MODULE, modelKey: 'x::refiner' };
      return { content: countdownFixture, modelKey: 'x::gen' };
    },
    excludeModel: () => {},
    deadModels: () => []
  };
  const kept = await generateModule('countdown', { mission: mission2 });
  ok(kept.validation.valid && !kept.refined && !kept.html.includes('countdown-fallo'),
    'refinado inválido → se conserva el original válido (no el BAD del refiner)');
}

// ============================================================================
console.log('\n=== 5c. Fotos por tipo, mapa de Google Maps y sandbox de iframes ===');
{
  // Mapa permitido vs iframe malicioso (sobre un módulo countdown válido de base)
  const withEvilIframe = countdownFixture.replace('<div class="countdown-central__content">', '<iframe src="https://evil.com/embed"></iframe>\n<div class="countdown-central__content">');
  const vEvil = validateGeneratedModule(withEvilIframe, 'countdown');
  ok(!vEvil.valid && vEvil.errors.some((e) => /iframe prohibido/i.test(e)), 'iframe que NO es Google Maps → rechazado');

  const withMaps = countdownFixture.replace(
    '<div class="countdown-central__content">',
    '<div memory_type="text" memory_usage="custom" memory_key="mapa"><iframe src="https://www.google.com/maps?q=Ubicaci%C3%B3n+del+evento&output=embed" title="Mapa"></iframe></div>\n<div class="countdown-central__content">'
  );
  const vMaps = validateGeneratedModule(withMaps, 'countdown');
  ok(!vMaps.errors.some((e) => /iframe prohibido/i.test(e)), 'embed de Google Maps permitido por la allowlist');

  // Requisito de mapa en ubicacion
  const vUbic = validateGeneratedModule(countdownFixture, 'ubicacion');
  ok(vUbic.errors.some((e) => /mapa de Google Maps embebido/i.test(e)), 'módulo ubicacion sin mapa → error específico');

  // Requisito de fotos: countdown exige fondo loremflickr+generated+placeholder (fixture lo cumple)
  const vCd = validateGeneratedModule(countdownFixture, 'countdown');
  ok(!vCd.errors.some((e) => /FONDO placeholder/i.test(e)), 'countdown con fondo loremflickr/generated cumple el requisito de fotos');

  // Galería exige ≥3 imgs library
  const vGal = validateGeneratedModule(countdownFixture, 'galeria');
  ok(vGal.errors.some((e) => /al menos 3 <img> loremflickr/i.test(e)), 'galería sin imágenes library → error específico');

  // Responsivo: sin clamp/grid → error
  const noResponsive = countdownFixture.replace(/clamp\([^)]*\)/g, '2rem');
  const vResp = validateGeneratedModule(noResponsive, 'countdown');
  ok(vResp.errors.some((e) => /responsivo insuficiente/i.test(e)), 'sin clamp()/layout fluido → error de responsividad');
}

// ============================================================================
console.log('\n=== 6. Importación al RAG (DB real) ===');
{
  const inserted = [];
  try {
    const results = importGeneratedModules(
      [
        { html: countdownFixture, styleName: 'Test Generador Central' },
        { html: '<p>basura sin estructura</p>' }
      ],
      db
    );
    ok(results[0].ok && /^countdown-test-generador-central-/.test(results[0].module_id), `módulo válido importado (${results[0].module_id})`);
    ok(!results[1].ok, 'HTML basura rechazado en la importación');
    for (const r of results) if (r.ok) inserted.push(r.module_id);
    const row = inserted.length === 1 ? db.prepare('SELECT module_type, style_name, is_active FROM knowledge_base_modules WHERE module_id = ?').get(inserted[0]) : null;
    ok(row && row.module_type === 'countdown' && row.is_active === 1, `fila en knowledge_base_modules correcta (${row?.module_type}, activo)`);
  } finally {
    for (const mid of inserted) db.prepare('DELETE FROM knowledge_base_modules WHERE module_id = ?').run(mid);
  }
  const remain = db.prepare('SELECT COUNT(*) as c FROM knowledge_base_modules WHERE module_id LIKE ?').get('countdown-test-generador%').c;
  ok(remain === 0, 'limpieza de prueba completa');
}

// ============================================================================
console.log('\n=== 7. Allowlist manual de modelos (solo los definidos) ===');
{
  let prevKey = '', prevAllowed = null;
  try {
    prevKey = db.prepare('SELECT openrouter_api_key AS k FROM admin_config WHERE id = 1').get()?.k || '';
    prevAllowed = db.prepare('SELECT rotator_allowed_models AS m FROM admin_config WHERE id = 1').get()?.m || null;
    db.prepare("UPDATE admin_config SET openrouter_api_key = 'sk-or-test' WHERE id = 1").run();
    await llmRotator.refreshCatalog({ force: true });

    // Allowlist con un modelo EXISTENTE del catálogo + uno manual sintético
    const anyCatalogModel = llmRotator.getStatus().catalog[0].modelKey;
    const manualModel = 'openrouter::manual/invisible-model-test';
    db.prepare('UPDATE admin_config SET rotator_allowed_models = ? WHERE id = 1').run(JSON.stringify([anyCatalogModel, manualModel]));

    const r = llmRotator.resolve({ lane: 'general', exclude: [] });
    ok(r !== null && (r.modelKey === anyCatalogModel || r.modelKey === manualModel), `resolve devuelve SOLO un permitido (${r?.modelKey})`);
    const r2 = llmRotator.resolve({ lane: 'general', exclude: [r.modelKey] });
    ok(r2 !== null && (r2.modelKey === anyCatalogModel || r2.modelKey === manualModel), `excluido el primero, sigue dentro de la allowlist (${r2?.modelKey})`);
    // El modelo manual sintético (no listado en catálogo) es utilizable
    const r3 = llmRotator.resolve({ lane: 'general', exclude: [anyCatalogModel] });
    ok(r3?.modelKey === manualModel, 'modelo escrito a mano no listado también participa (sintético)');

    // Allowlist VACÍA → rotación libre otra vez
    db.prepare('UPDATE admin_config SET rotator_allowed_models = NULL WHERE id = 1').run();
    const free = llmRotator.resolve({ lane: 'general', exclude: [] });
    ok(free !== null && free.modelKey !== manualModel, 'allowlist vacía → catálogo completo (rotación libre)');
    ok(Array.isArray(llmRotator.getStatus().allowedModels) && llmRotator.getStatus().allowedModels.length === 0, 'status.allowedModels refleja el estado');
  } finally {
    db.prepare('UPDATE admin_config SET openrouter_api_key = ?, rotator_allowed_models = ? WHERE id = 1').run(prevKey, prevAllowed);
  }
}

// ============================================================================
console.log('\n=== 8. Sets: coherencia interna y variedad entre sets ===');
const GALERIA_FIXTURE = `<section class="gal-ejemplo" data-gemini-id="galeria-ejemplo-test" memory_type="background" memory_usage="protected" memory_source="generated" path="placeholder">
  <style>
    .gal-ejemplo { background: var(--bg-color); color: var(--text-color); padding: clamp(2rem, 5vw, 4rem); }
    .gal-ejemplo h2 { color: var(--primary-color); font-size: clamp(1.5rem, 3vw, 2.4rem); }
    .gal-ejemplo .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: clamp(.8rem, 2vw, 1.5rem); }
    .gal-ejemplo img { width: 100%; aspect-ratio: 4/3; object-fit: cover; }
    @media (max-width: 600px) { .gal-ejemplo .grid { grid-template-columns: 1fr 1fr; } }
  </style>
  <h2 memory_type="text" memory_usage="custom" memory_key="gal-titulo">Galería de momentos</h2>
  <div class="grid">
    <figure memory_type="image" memory_usage="custom" memory_source="library"><img src="https://loremflickr.com/600/450/flores" path="placeholder" data-library-category="eventos" data-asset-type="galeria" alt="Foto 1"></figure>
    <figure memory_type="image" memory_usage="custom" memory_source="library"><img src="https://loremflickr.com/600/450/jardin" path="placeholder" data-library-category="eventos" data-asset-type="galeria" alt="Foto 2"></figure>
    <figure memory_type="image" memory_usage="custom" memory_source="library"><img src="https://loremflickr.com/600/450/detalle" path="placeholder" data-library-category="eventos" data-asset-type="galeria" alt="Foto 3"></figure>
  </div>
  <script>var moduleMetadata = { module_type: 'galeria', module_name: 'galeria-ejemplo-test', style_name: 'Galería Grid', descripcion: 'Rejilla de momentos editables con imágenes library.', tags: ['galeria', 'fotos', 'grid', 'editable'], tipo: 'galeria' };</script>
</section>`;
{
  const setMissions = [];
  const mission = {
    call: async (task) => {
      if (task.maxTokens <= 700) return { content: '{}', modelKey: 'x::b' };
      if (task.maxTokens <= 900) return { content: '{"score":95,"mejoras":[]}', modelKey: 'x::critic' };
      // Extraer del prompt los seeds forzados para verificar coherencia
      const est = task.prompt.match(/"estetica":\s*"([^"]+)"/)?.[1] || '';
      const firma = task.prompt.match(/"firma":\s*"([^"]+)"/)?.[1] || '';
      setMissions.push({ est, firma, prompt: task.prompt });
      const isGaleria = /Genera el módulo "galeria"/.test(task.prompt);
      const base = isGaleria ? GALERIA_FIXTURE.replace('galeria-ejemplo-test', `galeria-ejemplo-${setMissions.length}`) : countdownFixture.replace('countdown-central-classic', `countdown-${setMissions.length}`);
      return { content: base, modelKey: 'x::gen' };
    },
    excludeModel: () => {},
    deadModels: () => []
  };

  const batchSeeds = new Set();
  const s1 = await generateSet(['countdown', 'galeria'], { mission, batchSeeds });
  ok(s1.modules.length === 2 && s1.modules.every((m) => !m.failed), 'set 1: ambos módulos generados');
  ok(setMissions.length === 2 && setMissions[0].est === setMissions[1].est && setMissions[0].firma === setMissions[1].firma,
    'coherencia interna: los módulos del set COMPARTEN estética y firma');
  ok(s1.autoDirection.length > 10, `dirección creativa automática sin input (${s1.autoDirection.slice(0, 40)}…)`);

  const s1Seeds = `${s1.setSeeds.estetica}|${s1.setSeeds.firma}|${s1.autoDirection}`;
  const s2 = await generateSet(['countdown'], { mission, batchSeeds });
  const s2Seeds = `${s2.setSeeds.estetica}|${s2.setSeeds.firma}|${s2.autoDirection}`;
  ok(s1Seeds !== s2Seeds, 'variedad forzada: el set 2 NO repite estética/firma/dirección del set 1');
}

// ============================================================================
console.log('\n=== 9. Persistencia y revisión de resultados ===');
{
  const result = await generateModule('countdown', {
    mission: {
      call: async (task) => {
        if (task.maxTokens <= 700) return { content: JSON.stringify({ style_name: 'Persistencia Test', concepto: 'x' }), modelKey: 'x::b' };
        if (task.maxTokens <= 900) return { content: '{"score":95,"mejoras":[]}', modelKey: 'x::critic' };
        return { content: countdownFixture, modelKey: 'x::gen' };
      },
      excludeModel: () => {}, deadModels: () => []
    }
  });
  const ids = [];
  try {
    const id = saveGeneratedResult(db, { batchId: 'batch_test', setIndex: 1, result });
    ids.push(id);
    const row = db.prepare('SELECT module_type, style_name, status, valid, critique_score FROM module_generator_results WHERE id = ?').get(id);
    ok(row && row.module_type === 'countdown' && row.style_name === 'Persistencia Test' && row.status === 'generated' && row.valid === 1,
      'resultado persistido con metadata completa');
    ok(row.critique_score === 95, 'score del crítico guardado');
    db.prepare("UPDATE module_generator_results SET status = 'approved' WHERE id = ?").run(id);
    ok(db.prepare("SELECT status FROM module_generator_results WHERE id = ?").get(id).status === 'approved', 'flujo de revisión (aprobar) funciona');
  } finally {
    for (const id of ids) db.prepare('DELETE FROM module_generator_results WHERE id = ?').run(id);
  }
  const remain = db.prepare("SELECT COUNT(*) AS c FROM module_generator_results WHERE batch_id = 'batch_test'").get().c;
  ok(remain === 0, 'limpieza de prueba completa');
}
if (failures.length === 0) {
  console.log(`✅ TEST PASSED: ${passed} verificaciones superadas`);
} else {
  console.log(`❌ TEST FAILED: ${failures.length} verificación(es) fallida(s):`);
  for (const f of failures) console.log('   • ' + f);
  process.exit(1);
}
