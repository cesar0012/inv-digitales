/**
 * Validación determinista de los 24 sets de modulos-1/sets-fotos/.
 * Mismo gate del proceso agéntico: validateGeneratedModule.
 */
import { validateGeneratedModule } from '../server/moduleGeneratorService.js';
import { readdirSync, statSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', 'modulos-1', 'sets-fotos');

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

const sets = readdirSync(ROOT).filter((d) => /^set-\d+-/.test(d) && statSync(join(ROOT, d)).isDirectory()).sort();
if (sets.length !== 24) {
  console.error(`✗ Se esperaban 24 sets, encontrados: ${sets.length}`);
  process.exit(1);
}

for (const set of sets) {
  const files = readdirSync(join(ROOT, set)).filter((f) => f.endsWith('.html')).sort();
  let setPass = 0;
  for (const type of EXPECTED_TYPES) {
    const file = files.find((f) => f.endsWith(`-${type}.html`));
    if (!file) {
      console.error(`  ✗ ${set}/${type}: FALTA el archivo`);
      fail++; failures.push({ set, type, errors: ['archivo inexistente'] });
      continue;
    }
    const html = readFileSync(join(ROOT, set, file), 'utf-8');
    const res = validateGeneratedModule(html, type);
    if (res.valid) { pass++; setPass++; }
    else {
      console.error(`  ✗ ${set}/${type}: ${res.errors.join(' | ')}`);
      fail++; failures.push({ set, type, errors: res.errors });
    }
  }
  console.log(`${setPass === 12 ? '✅' : '⚠'}  ${set} — ${setPass}/12`);
}

console.log(`\n========================================`);
console.log(`RESULTADO: ${pass} pasan / ${fail} fallan de ${pass + fail}`);
if (fail > 0) {
  console.log('\nFALLOS:');
  for (const f of failures) console.log(` - ${f.set}/${f.type}: ${f.errors.join(' | ')}`);
  process.exit(1);
}
