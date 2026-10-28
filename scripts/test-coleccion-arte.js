/**
 * Validación determinista de los 20 sets de la Colección Arte
 * (modulos-1/coleccion-arte/set-NN-*), con el mismo gate del proceso agéntico:
 * validateGeneratedModule (ragModuleValidator + sandbox + fotos por tipo).
 */
import { validateGeneratedModule } from '../server/moduleGeneratorService.js';
import { readdirSync, statSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', 'modulos-1', 'coleccion-arte');

const EXPECTED_TYPES = [
  'portada', 'padres', 'ubicacion', 'itinerario', 'confirmacion', 'detalles',
  'countdown', 'padrinos', 'corte', 'galeria', 'regalos', 'vestimenta'
];
const SETS_ESPERADOS = 20;

let pass = 0, fail = 0;
const failures = [];

if (!existsSync(ROOT)) {
  console.error(`✗ No existe ${ROOT}`);
  process.exit(1);
}

const sets = readdirSync(ROOT).filter((d) => /^set-/.test(d) && statSync(join(ROOT, d)).isDirectory())
  .sort((a, b) => Number(a.split('-')[1]) - Number(b.split('-')[1]));
if (sets.length !== SETS_ESPERADOS) {
  console.error(`✗ Se esperaban ${SETS_ESPERADOS} sets, encontrados: ${sets.length} → ${sets.join(', ')}`);
  process.exit(1);
}

for (const set of sets) {
  const files = readdirSync(join(ROOT, set)).filter((f) => f.endsWith('.html')).sort();
  let okSet = 0;
  for (const type of EXPECTED_TYPES) {
    const file = files.find((f) => f.endsWith(`-${type}.html`));
    if (!file) {
      console.error(`✗ ${set}: falta NN-${type}.html`);
      fail++;
      failures.push({ set, type, errors: ['archivo inexistente'] });
      continue;
    }
    const html = readFileSync(join(ROOT, set, file), 'utf-8');
    const res = validateGeneratedModule(html, type);
    if (res.valid) {
      pass++;
      okSet++;
    } else {
      console.error(`✗ ${set}/${file}`);
      for (const e of res.errors) console.error(`     · ${e}`);
      fail++;
      failures.push({ set, type, errors: res.errors });
    }
  }
  const extra = files.filter((f) => !EXPECTED_TYPES.some((t) => f.endsWith(`-${t}.html`)));
  if (extra.length) console.warn(`⚠ ${set}: archivos no esperados: ${extra.join(', ')}`);
  console.log(`${okSet === EXPECTED_TYPES.length ? '✅' : '⚠ '} ${set}: ${okSet}/${EXPECTED_TYPES.length} módulos válidos`);
}

console.log(`\n========================================`);
console.log(`RESULTADO: ${pass} pasan / ${fail} fallan de ${pass + fail} (esperados: ${SETS_ESPERADOS * EXPECTED_TYPES.length})`);
if (fail > 0) {
  console.log('\nFALLOS:');
  for (const f of failures) console.log(` - ${f.set}/${f.type}: ${f.errors.join(' | ')}`);
  process.exit(1);
}
