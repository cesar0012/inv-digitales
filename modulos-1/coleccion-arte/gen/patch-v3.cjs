/* Fix crítico: falta ';' entre los CSS vars del root y 'position:relative'.
 * Sin él, --text-color (último var) se traga la declaración siguiente y
 * color:var(--text-color) cae a negro (invisible en temas oscuros). */
const { readFileSync, writeFileSync } = require('fs');
const { join } = require('path');
const G = __dirname;

function patch(file, from, to) {
  let src = readFileSync(join(G, file), 'utf-8');
  const n = src.split(from).length - 1;
  if (!n) { console.error(`✗ ${file}: patrón no encontrado`); process.exitCode = 1; return; }
  src = src.split(from).join(to);
  writeFileSync(join(G, file), src, 'utf-8');
  console.log(`✓ ${file}: ${n} reglas corregidas`);
}

patch('tpl-a.cjs', "join('; ')}\n  position:relative", "join('; ')};\n  position:relative");
patch('tpl-b.cjs', '${cssVars(S)}\n  position:relative', '${cssVars(S)};\n  position:relative');
patch('tpl-c.cjs', '${cssVars(S)}\n  position:relative', '${cssVars(S)};\n  position:relative');
console.log('Fix aplicado.');
