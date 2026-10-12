/* Fixes ronda 2 sets-fotos:
 * 1) Marquesina de portada v0: texto duplicado para bucle continuo (sin corte).
 * 2) Detalles v2 editorial: min-width:0 + wrap (sin desborde en móvil).
 * 3) Ubicación v0: min-width en hijos del grid. */
const fs = require('fs');
const P = __dirname;

let a = fs.readFileSync(P + '/tpl-a.cjs', 'utf-8');

const cintaFrom = `<div class="rcA__cinta" memory_type="text" memory_usage="custom" memory_key="portada-fecha"><p><time datetime="YYYY-MM-DD">Fecha del evento · Hora · Lugar</time></p></div>`;
const cintaTo = `<div class="rcA__cinta" memory_type="text" memory_usage="custom" memory_key="portada-fecha"><p><span>Fecha del evento · Hora · Lugar&nbsp;&nbsp;·&nbsp;&nbsp;</span><span>Fecha del evento · Hora · Lugar&nbsp;&nbsp;·&nbsp;&nbsp;</span></p></div>`;
if (a.includes(cintaFrom)) { a = a.replace(cintaFrom, cintaTo); console.log('✓ cinta duplicada'); }
else { console.log('· cinta ya duplicada'); }

if (!a.includes('.sf3__par > *')) {
  a = a.replace('.sf3__par { display:grid;', '.sf3__par > * { min-width:0; max-width:100%; }\n.sf3__par { display:grid;');
  console.log('✓ sf3__par min-width');
}
fs.writeFileSync(P + '/tpl-a.cjs', a);

let b = fs.readFileSync(P + '/tpl-b.cjs', 'utf-8');
const filaFrom = `.sf6__fila { display:grid; grid-template-columns:auto 1fr; gap:clamp(1rem,3vw,1.8rem); align-items:start; padding:clamp(1rem,2.6vw,1.5rem) 0; border-bottom:1px solid var(--surface-border-color); }`;
const filaTo = `.sf6__fila { display:grid; grid-template-columns:auto minmax(0,1fr); gap:clamp(1rem,3vw,1.8rem); align-items:start; padding:clamp(1rem,2.6vw,1.5rem) 0; border-bottom:1px solid var(--surface-border-color); }
.sf6__fila > div { min-width:0; overflow-wrap:anywhere; }`;
if (b.includes(filaFrom)) { b = b.replace(filaFrom, filaTo); console.log('✓ sf6__fila minmax'); }
else console.log('· sf6__fila ya con minmax');
fs.writeFileSync(P + '/tpl-b.cjs', b);
console.log('Listo.');
