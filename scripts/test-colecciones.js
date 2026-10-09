/**
 * Validación de todas las colecciones en modulos-1/colecciones/
 * con el mismo gate del proceso agéntico: validateGeneratedModule.
 */
import { validateGeneratedModule } from '../server/moduleGeneratorService.js';
import { readdirSync, statSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', 'modulos-1', 'colecciones');

const EXPECTED_TYPES = [
  'portada', 'padres', 'ubicacion', 'itinerario', 'confirmacion', 'detalles',
  'countdown', 'padrinos', 'corte', 'galeria', 'regalos', 'vestimenta'
];

let pass = 0, fail = 0;
const failures = [];

if (!existsSync(ROOT)) {
  console.error(`✗ No existe ${ROOT}`);
  process.exit(1);
}

const colecciones = readdirSync(ROOT).filter((d) => statSync(join(ROOT, d)).isDirectory()).sort();
if (!colecciones.length) {
  console.error('✗ No hay colecciones todavía');
  process.exit(1);
}

for (const col of colecciones) {
  const files = readdirSync(join(ROOT, col)).filter((f) => f.endsWith('.html') && !f.endsWith('.shot.html')).sort();
  let okCol = 0;
  for (const type of EXPECTED_TYPES) {
    const file = files.find((f) => f.endsWith(`-${type}.html`));
    if (!file) {
      console.error(`✗ ${col}: falta NN-${type}.html`);
      fail++;
      failures.push({ col, type, errors: ['archivo inexistente'] });
      continue;
    }
    const html = readFileSync(join(ROOT, col, file), 'utf-8');
    const res = validateGeneratedModule(html, type);
    if (res.valid) {
      pass++;
      okCol++;
      console.log(`  ✅ ${col}/${file} (${(Buffer.byteLength(html) / 1024).toFixed(1)} KB)`);
    } else {
      console.error(`  ✗ ${col}/${file}`);
      for (const e of res.errors) console.error(`       · ${e}`);
      fail++;
      failures.push({ col, type, errors: res.errors });
    }
  }
  const extra = files.filter((f) => !EXPECTED_TYPES.some((t) => f.endsWith(`-${t}.html`)));
  if (extra.length) console.warn(`  ⚠ ${col}: archivos no esperados: ${extra.join(', ')}`);
  console.log(`${okCol === EXPECTED_TYPES.length ? '✅' : '⚠ '} ${col}: ${okCol}/${EXPECTED_TYPES.length} módulos válidos\n`);
}

console.log(`========================================`);
console.log(`RESULTADO: ${pass} pasan / ${fail} fallan de ${pass + fail}`);
if (fail > 0) {
  console.log('\nFALLOS:');
  for (const f of failures) console.log(` - ${f.col}/${f.type}: ${f.errors.join(' | ')}`);
  process.exit(1);
}
