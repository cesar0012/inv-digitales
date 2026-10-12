/* Orquestador: 24 sets × 12 módulos en modulos-1/sets-fotos/set-NN-<key>/ */
const { mkdirSync, writeFileSync, readdirSync } = require('fs');
const { join } = require('path');
const styles = require('./styles.cjs');
const A = require('./tpl-a.cjs');
const B = require('./tpl-b.cjs');
const C = require('./tpl-c.cjs');

const base = __dirname + '/..';
const builders = [
  ['portada', A.portada], ['padres', A.padres], ['ubicacion', A.ubicacion], ['itinerario', A.itinerario],
  ['confirmacion', B.confirmacion], ['detalles', B.detalles], ['countdown', B.countdown], ['padrinos', B.padrinos],
  ['corte', C.corte], ['galeria', C.galeria], ['regalos', C.regalos], ['vestimenta', C.vestimenta]
];

const list = Object.values(styles);
let written = 0;
for (const S of list) {
  const folder = `set-${String(S.num).padStart(2, '0')}-${S.key}`;
  const dir = join(base, folder);
  mkdirSync(dir, { recursive: true });
  builders.forEach(([name, fn], i) => {
    writeFileSync(join(dir, `${String(i + 1).padStart(2, '0')}-${name}.html`), fn(S), 'utf-8');
    written++;
  });
  console.log(`✓ ${folder}`);
}
console.log(`Total: ${written} módulos en ${list.length} sets.`);

/* Preview global */
const nav = list.map((S) => `<a href="#set-${S.num}">${String(S.num).padStart(2, '0')} ${S.name}</a>`).join('\n');
const sections = list.map((S) => {
  const folder = `set-${String(S.num).padStart(2, '0')}-${S.key}`;
  const frames = builders.map(([name], i) =>
    `      <iframe loading="lazy" title="${S.name} — ${name}" src="${folder}/${String(i + 1).padStart(2, '0')}-${name}.html"></iframe>`).join('\n');
  return `  <section id="set-${S.num}">
    <h2>${String(S.num).padStart(2, '0')} · ${S.name} <span class="tag">${S.motif} · ${S.theme}</span></h2>
    <div class="grid">
${frames}
    </div>
  </section>`;
}).join('\n');

writeFileSync(join(base, 'index.html'), `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Sets por Foto — 24 sets × 12 módulos</title>
<style>
  body { margin:0; font-family:Georgia,serif; background:#18141c; color:#f2eef8; }
  header { position:sticky; top:0; z-index:10; background:rgba(24,20,28,.95); padding:1rem 1.4rem; border-bottom:1px solid rgba(232,193,90,.3); }
  h1 { margin:0 0 .6rem; font-size:1.15rem; color:#e8c15a; }
  nav { display:flex; flex-wrap:wrap; gap:.4rem .9rem; font-size:.76rem; }
  nav a { color:#cbb8e0; text-decoration:none; }
  nav a:hover { text-decoration:underline; }
  main { padding:1.4rem; max-width:1500px; margin:0 auto; }
  section { margin-bottom:3rem; }
  h2 { font-size:1.2rem; margin:0 0 1rem; border-left:4px solid #e8c15a; padding-left:.7rem; }
  .tag { font-size:.72rem; color:#b3965a; font-family:'Courier New',monospace; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(420px,1fr)); gap:1.2rem; }
  iframe { width:100%; height:560px; border:1px solid rgba(232,193,90,.25); border-radius:10px; background:#fff; }
  @media (max-width:520px){ .grid { grid-template-columns:1fr; } iframe { height:480px; } }
</style>
</head>
<body>
<header>
  <h1> Sets por Foto — ${list.length} sets × ${builders.length} módulos (${written} archivos)</h1>
  <nav>
${nav}
  </nav>
</header>
<main>
${sections}
</main>
</body>
</html>`, 'utf-8');
console.log('✓ index.html');
