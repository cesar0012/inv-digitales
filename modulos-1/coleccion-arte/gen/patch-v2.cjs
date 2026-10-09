/* Parches puntuales a las plantillas ( fixes de la ronda de review v2 ). */
const { readFileSync, writeFileSync } = require('fs');
const { join } = require('path');
const G = __dirname;

function patch(file, pairs) {
  let src = readFileSync(join(G, file), 'utf-8');
  for (const [from, to, tag] of pairs) {
    if (!src.includes(from)) { console.error(`✗ ${file}: NO encontrado (${tag})`); process.exitCode = 1; continue; }
    src = src.split(from).join(to);
    console.log(`✓ ${file}: ${tag}`);
  }
  writeFileSync(join(G, file), src, 'utf-8');
}

/* tpl-a: itinerario sin desbordes + mapa que llena su tarjeta */
patch('tpl-a.cjs', [
  ["V === 2 ? (i % 2 ? 'rotate(1.8deg) translateX(26%)' : 'rotate(-2.2deg) translateX(-4%)')",
   "V === 2 ? (i % 2 ? 'rotate(1.6deg) translateX(5%)' : 'rotate(-1.8deg) translateX(-3%)')", 'itinerario tilt'],
  [".${S.cls}-ub__mapa-zona { margin:0; border:1px solid var(--surface-border-color); overflow:hidden; ${S.card} }",
   ".${S.cls}-ub__mapa-zona { margin:0; display:flex; flex-direction:column; border:1px solid var(--surface-border-color); overflow:hidden; ${S.card} }", 'mapa zona flex'],
  [".${S.cls}-ub__mapa iframe { display:block; width:100%; aspect-ratio:16/10; border:0; }",
   ".${S.cls}-ub__mapa { flex:1; display:flex; }\n.${S.cls}-ub__mapa iframe { display:block; width:100%; height:100%; min-height:340px; border:0; }", 'mapa iframe fill']
]);

/* tpl-b: countdown legible, sello fuera en móvil, código alineado con vestimenta */
patch('tpl-b.cjs', [
  [".${S.cls}-cd__unidad { padding:clamp(.7rem,1.8vw,1.1rem) clamp(.5rem,1.4vw,.9rem); ${S.accentBar} ${tilt(1)} }",
   ".${S.cls}-cd__unidad { padding:clamp(.7rem,1.8vw,1.1rem) clamp(.5rem,1.4vw,.9rem); background:color-mix(in srgb, var(--bg-color) 85%, transparent); border:1px solid var(--surface-border-color); ${tilt(1)} }", 'countdown tile bg'],
  [".${S.cls}-cd__num { display:block; font-family:${S.disp}; font-size:clamp(1.9rem,6.4vw,4.2rem); line-height:.95; font-variant-numeric:tabular-nums; color:var(--primary-color); }",
   ".${S.cls}-cd__num { display:block; font-family:${S.disp}; font-size:clamp(1.9rem,6.4vw,4.2rem); line-height:.95; font-variant-numeric:tabular-nums; color:var(--text-color); }", 'countdown digit color'],
  ["@media (max-width:640px){ .${S.cls}-cf__panel { grid-template-columns:1fr !important; } .${S.cls}-cf__div { display:none; } .${S.cls}-cf__col:last-child { text-align:left; } .${S.cls}-cf__cinta { transform:none; } }",
   "@media (max-width:900px){ .${S.cls}-cf__sello { display:none; } }\n@media (max-width:640px){ .${S.cls}-cf__panel { grid-template-columns:1fr !important; } .${S.cls}-cf__div { display:none; } .${S.cls}-cf__col:last-child { text-align:left; } .${S.cls}-cf__cinta { transform:none; } }", 'sello oculto en móvil'],
  ["  const codigo = [['Formal', 'Etiqueta rigurosa, tonos oscuros.'], ['Informal', 'Cómodo, sin corbata, pies cómodos.'], ['Temático', 'Únete a la paleta de la fiesta.']][S.num % 3];",
   "  const codigo = [['Etiqueta', 'Traje oscuro, vestido largo.'], ['Formal', 'Traje y vestido de gala corto.'], ['Casual elegante', 'Sin corbata, tela fluida.']][S.num % 3];", 'detalles codigo alineado'],
  ['<h3 class="${S.cls}-dt__nombre" memory_type="text" memory_usage="custom" memory_key="detalles-regalo-titulo">Tu compañía lo es todo</h3>',
   '<h3 class="${S.cls}-dt__nombre" memory_type="text" memory_usage="custom" memory_key="detalles-regalo-titulo">Un detalle para los anfitriones</h3>', 'detalles regalo titulo']
]);

/* tpl-c: galería sin filas huérfanas, vestimenta consistente y nota separada */
patch('tpl-c.cjs', [
  ["  const n = V === 2 ? 5 : 6;", "  const n = V === 0 ? 9 : (V === 2 ? 8 : 6);", 'galeria n imagenes'],
  ["  const codigos = [['Etiqueta', 'Traje oscuro, vestido largo.'], ['Formal', 'Traje y vestido de gala corto.'], ['Casual elegante', 'Sin corbata, tela fluida.']][S.num % 3];",
   "  const codigos = [['Etiqueta', 'Traje oscuro, vestido largo.'], ['Formal', 'Traje y vestido de gala corto.'], ['Casual elegante', 'Sin corbata, tela fluida.']][S.num % 3];", 'vestimenta codigo (idempotente)'],
  [".${S.cls}-vs__nota { margin:0; font-family:${S.mono};",
   ".${S.cls}-vs__nota { margin:1.1rem 0 0; font-family:${S.mono};", 'vestimenta nota margen']
]);
console.log('Parches aplicados.');
