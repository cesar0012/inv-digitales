/**
 * Test en vivo del proceso de imágenes gratuitas (freeImageService).
 * 1. Config: guardar/leer/columnas nuevas.
 * 2. Test de cada proveedor keyless (flux, turbo, picsum, local-stock) → PNG.
 * 3. processHtmlWithFreeImages sobre un HTML de ejemplo con slots loremflickr.
 * 4. Reset de la config a 'none' (estado original).
 */
import {
  getFreeImageConfig,
  saveFreeImageConfig,
  testFreeImageProvider,
  processHtmlWithFreeImages,
  extractImageSlots
} from '../server/freeImageService.js';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, 'test-free-images-output');
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const assert = (cond, msg) => {
  if (!cond) { console.error(`✗ ${msg}`); process.exit(1); }
  console.log(`✅ ${msg}`);
};

// ---------- 1. Config ----------
console.log('\n===== 1. CONFIG =====');
let cfg = getFreeImageConfig();
assert(cfg.provider === 'none', `provider inicial = 'none' (obtenido: '${cfg.provider}')`);
assert(cfg.agentic === true, 'agentic inicial = true');
saveFreeImageConfig({ provider: 'pollinations-flux', agentic: true });
cfg = getFreeImageConfig();
assert(cfg.provider === 'pollinations-flux', `guardar/leer provider → '${cfg.provider}'`);
saveFreeImageConfig({ provider: 'none', agentic: true });
cfg = getFreeImageConfig();
assert(cfg.provider === 'none', `reset a none (obtenido: '${cfg.provider}')`);

// ---------- 2. Extracción de slots ----------
console.log('\n===== 2. EXTRACCIÓN DE SLOTS =====');
const sampleHtml = `<!DOCTYPE html>
<html><head><style>
.hero { background-image: url('https://loremflickr.com/1600/900/elegant,wedding,flowers'); }
.countdown { background-image: url("https://loremflickr.com/1600/900/celebration,elegant"); }
</style></head>
<body>
<img src="https://loremflickr.com/800/600/baby,shower,decor">
<img src="https://loremflickr.com/800/600/baby,shower,decor">
<img src="GEMINI_GENERATE:rosas moradas con marco plateado">
</body></html>`;
const slots = extractImageSlots(sampleHtml);
assert(slots.length === 4, `slots extraídos = ${slots.length} (esperado 4: 3 loremflickr únicos + 1 GEMINI_GENERATE)`);
assert(slots[0].w === 1600 && slots[0].h === 900, `dimensiones slot 0 = ${slots[0].w}x${slots[0].h}`);
assert(slots[2].keywords.join(',') === 'baby,shower,decor', `keywords slot 2 = ${slots[2].keywords.join(',')}`);
assert(Boolean(slots[3].explicitPrompt), 'slot GEMINI_GENERATE con explicitPrompt');

// ---------- 3. Test en vivo por proveedor ----------
console.log('\n===== 3. PROVEEDORES EN VIVO =====');
const providers = ['pollinations-flux', 'pollinations-turbo', 'picsum', 'local-stock'];
for (const prov of providers) {
  const t0 = Date.now();
  try {
    const r = await testFreeImageProvider(prov, {
      keywords: 'elegant wedding flowers, romantic table decoration',
      eventType: 'boda',
      agentic: false // determinístico: la key de dev de Gemini es inválida
    });
    assert(r.ok === true, `${prov}: imagen generada en ${((Date.now() - t0) / 1000).toFixed(1)}s (${(r.bytes / 1024).toFixed(0)} KB, prompt=${r.promptMode})`);
    const ext = r.dataUri.slice(5, r.dataUri.indexOf(';')).split('/')[1];
    writeFileSync(join(OUT, `test-${prov}.${ext === 'jpeg' ? 'jpg' : ext}`), Buffer.from(r.dataUri.split(',')[1], 'base64'));
    // Segunda llamada → debe golpear caché (salvo local-stock que lee disco)
    if (prov !== 'local-stock') {
      const r2 = await testFreeImageProvider(prov, { keywords: 'elegant wedding flowers, romantic table decoration', eventType: 'boda', agentic: false });
      assert(r2.cached === true, `${prov}: segunda llamada servida desde caché (${((r2.latencyMs) / 1000).toFixed(2)}s)`);
    }
  } catch (e) {
    console.error(`✗ ${prov} FALLO: ${e.message}`);
    process.exitCode = 1;
  }
}

// ---------- 4. processHtmlWithFreeImages ----------
console.log('\n===== 4. PROCESS HTML (flux, heurístico) =====');
try {
  const r = await processHtmlWithFreeImages(sampleHtml, {
    provider: 'pollinations-flux',
    eventType: 'boda',
    agentic: false
  });
  console.log(`   total=${r.total} replaced=${r.replaced} failed=${r.failed} cached=${r.cached} fallbacks=${r.fallbacks} modo=${r.promptMode} ${(r.ms / 1000).toFixed(1)}s`);
  assert(r.total === 4, `total slots = ${r.total}`);
  assert(r.replaced === 4, `replaced = ${r.replaced} (4 esperado: flux o fallback picsum, sin quedarse sin imagen)`);
  assert(!r.html.includes('loremflickr.com'), 'sin loremflickr restantes en el HTML final');
  assert(r.html.includes('data:image/'), 'HTML resultado contiene data URIs');
  writeFileSync(join(OUT, 'resultado-flux.html'), r.html);
  console.log(`✅ HTML con imágenes resueltas (fallbacks=${r.fallbacks}) escrito a scripts/test-free-images-output/resultado-flux.html`);
} catch (e) {
  console.error(`✗ processHtmlWithFreeImages FALLO: ${e.message}`);
  process.exitCode = 1;
}

// ---------- 5. local-stock end-to-end ----------
console.log('\n===== 5. PROCESS HTML (local-stock) =====');
try {
  const r = await processHtmlWithFreeImages(sampleHtml, { provider: 'local-stock', eventType: 'xv-años', agentic: false });
  console.log(`   total=${r.total} replaced=${r.replaced} failed=${r.failed} ${(r.ms / 1000).toFixed(2)}s`);
  assert(r.replaced === 4 && r.ms < 3000, `local-stock resolvió ${r.replaced}/4 en ${(r.ms / 1000).toFixed(2)}s (instantáneo)`);
} catch (e) {
  console.error(`✗ local-stock FALLO: ${e.message}`);
  process.exitCode = 1;
}

// ---------- 6. Estado final ----------
console.log('\n===== 6. ESTADO FINAL =====');
cfg = getFreeImageConfig();
assert(cfg.provider === 'none', `config final = 'none' (estado original intacto)`);

const resultado = readFileSync(join(OUT, 'resultado-flux.html'), 'utf-8');
console.log(`\nTamaño HTML final: ${(Buffer.byteLength(resultado) / 1024).toFixed(0)} KB`);
console.log('\n=================================================');
console.log(process.exitCode ? 'HUBO FALLOS — revisar arriba' : 'TODO OK');
