/* Valida los 20 módulos de la Colección Arte con validateGeneratedModule. */
import { validateGeneratedModule } from '../server/moduleGeneratorService.js';
import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'modulos-1', 'coleccion-arte');
let pass = 0, fail = 0;

for (const f of readdirSync(dir).filter((x) => /^\d{2}-.*\.html$/.test(x)).sort()) {
  // tipo derivado del sufijo del nombre: NN-estilo-TIPO.html
  const m = f.match(/-(portada|galeria|padres|itinerario|countdown|ubicacion|confirmacion|detalles|regalos|padrinos|vestimenta|gracias|music)\.html$/i);
  const type = m ? m[1].toLowerCase() : 'general';
  const html = readFileSync(join(dir, f), 'utf-8');
  const res = validateGeneratedModule(html, type);
  if (res.valid) {
    pass++;
    console.log(`  ✅ ${f} (${(Buffer.byteLength(html) / 1024).toFixed(1)} KB)`);
  } else {
    fail++;
    console.error(`  ✗ ${f}`);
    res.errors.forEach((e) => console.error(`       · ${e}`));
  }
}
console.log(`\nCOLECCIÓN ARTE: ${pass} pasan / ${fail} fallan`);
process.exit(fail > 0 ? 1 : 0);
