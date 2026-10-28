/**
 * Validación determinista de los sets hand-crafted en modulos-1/.
 * Usa EXACTAMENTE el mismo gate del proceso agéntico:
 * validateGeneratedModule (ragModuleValidator + sandbox + fotos por tipo).
 */
import { validateGeneratedModule } from '../server/moduleGeneratorService.js';
import { readdirSync, statSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', 'modulos-1');

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

const sets = readdirSync(ROOT).filter((d) => /^set-/.test(d) && statSync(join(ROOT, d)).isDirectory()).sort((a, b) => Number(a.split('-')[1]) - Number(b.split('-')[1]));
if (sets.length !== 12) {
  console.error(`✗ Se esperaban 12 sets, encontrados: ${sets.join(', ')}`);
  process.exit(1);
}

for (const set of sets) {
  console.log(`\n===== ${set} =====`);
  const files = readdirSync(join(ROOT, set)).filter((f) => f.endsWith('.html')).sort();
  for (const type of EXPECTED_TYPES) {
    const file = files.find((f) => f.endsWith(`-${type}.html`));
    if (!file) {
      console.error(`  ✗ ${type}: FALTA el archivo NN-${type}.html`);
      fail++;
      failures.push({ set, type, errors: ['archivo inexistente'] });
      continue;
    }
    const html = readFileSync(join(ROOT, set, file), 'utf-8');
    const res = validateGeneratedModule(html, type);
    if (res.valid) {
      console.log(`  ✅ ${type.padEnd(13)} ${file} (${(Buffer.byteLength(html) / 1024).toFixed(1)} KB)`);
      pass++;
    } else {
      console.error(`  ✗ ${type.padEnd(13)} ${file}`);
      for (const e of res.errors) console.error(`       · ${e}`);
      fail++;
      failures.push({ set, type, errors: res.errors });
    }
  }
  const extra = files.filter((f) => !EXPECTED_TYPES.some((t) => f.endsWith(`-${t}.html`)));
  if (extra.length) console.warn(`  ⚠ archivos no esperados: ${extra.join(', ')}`);
}

console.log(`\n========================================`);
console.log(`RESULTADO: ${pass} pasan / ${fail} fallan de ${pass + fail}`);
if (fail > 0) {
  console.log('\nFALLOS:');
  for (const f of failures) console.log(` - ${f.set}/${f.type}: ${f.errors.join(' | ')}`);
  process.exit(1);
}
