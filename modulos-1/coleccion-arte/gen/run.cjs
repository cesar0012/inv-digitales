/* Orquestador: genera 20 sets completos (12 módulos c/u) en modulos-1/coleccion-arte/. */
const { mkdirSync, writeFileSync, readdirSync, renameSync, existsSync } = require('fs');
const { join, dirname } = require('path');
const styles = require('./styles.cjs');
const A = require('./tpl-a.cjs');
const B = require('./tpl-b.cjs');
const C = require('./tpl-c.cjs');

const base = join(__dirname, '..');
const refs = join(base, '_referencia');

// 1. Archiva los módulos individuales originales (conceptos) fuera del alcance de los sets.
if (!existsSync(refs)) mkdirSync(refs, { recursive: true });
for (const f of readdirSync(base).filter((x) => /^\d{2}-[a-z0-9-]+\.html$/i.test(x))) {
  renameSync(join(base, f), join(refs, f));
}

const builders = [
  ['portada', A.portada], ['padres', A.padres], ['ubicacion', A.ubicacion], ['itinerario', A.itinerario],
  ['confirmacion', B.confirmacion], ['detalles', B.detalles], ['countdown', B.countdown], ['padrinos', B.padrinos],
  ['corte', C.corte], ['galeria', C.galeria], ['regalos', C.regalos], ['vestimenta', C.vestimenta]
];

/* --- Legibilidad garantizada de tokens (WCAG aproximado) --- */
const lum = (hex) => {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const shade = (hex, f) => {
  const h = hex.replace('#', '');
  const ch = (i) => Math.max(0, Math.min(255, Math.round(parseInt(h.slice(i, i + 2), 16) * f)));
  return '#' + [0, 2, 4].map((i) => ch(i).toString(16).padStart(2, '0')).join('');
};
const mixToward = (hex, target, f) => {
  const a = hex.replace('#', ''), b = target.replace('#', '');
  const ch = (i) => Math.max(0, Math.min(255, Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - f) + parseInt(b.slice(i, i + 2), 16) * f)));
  return '#' + [0, 2, 4].map((i) => ch(i).toString(16).padStart(2, '0')).join('');
};
function readable(S) {
  const v = S.v;
  if (ratio(v['--primary-color'], v['--surface-color']) < 3) v['--primary-color'] = v['--text-color'];
  if (ratio(v['--secondary-color'], v['--bg-color']) < 2.2) v['--secondary-color'] = v['--text-color'];
  // El acento debe separarse de surface (rótulos) y de bg (texto de botones rellenos).
  for (let i = 0; i < 30 && (ratio(v['--accent-color'], v['--surface-color']) < 3 || ratio(v['--accent-color'], v['--bg-color']) < 2.5); i++) {
    v['--accent-color'] = shade(v['--accent-color'], lum(v['--accent-color']) <= lum(v['--surface-color']) ? 0.82 : 1.18);
  }
  // text y primary siempre legibles sobre surface y bg.
  for (let i = 0; i < 20 && (ratio(v['--text-color'], v['--surface-color']) < 2.8 || ratio(v['--primary-color'], v['--surface-color']) < 3); i++) {
    v['--surface-color'] = mixToward(v['--surface-color'], v['--bg-color'], 0.15);
  }
}
for (const S of Object.values(styles)) readable(S);

const list = Object.values(styles);
let written = 0;
for (const S of list) {
  const folder = `set-${String(S.num).padStart(2, '0')}-${S.cls}`;
  const dir = join(base, folder);
  mkdirSync(dir, { recursive: true });
  builders.forEach(([name, fn], i) => {
    const file = join(dir, `${String(i + 1).padStart(2, '0')}-${name}.html`);
    writeFileSync(file, fn(S), 'utf-8');
    written++;
  });
  console.log(`✓ ${folder} (12 módulos)`);
}
console.log(`Total: ${written} módulos en ${list.length} sets.`);

// 2. Preview global: iframes perezosos agrupados por set.
const nav = list.map((S) => `<a href="#set-${S.num}">${S.num}. ${S.name.split('—')[0].trim()}</a>`).join('\n');
const sections = list.map((S) => {
  const folder = `set-${String(S.num).padStart(2, '0')}-${S.cls}`;
  const frames = builders.map(([name], i) =>
    `      <iframe loading="lazy" title="${S.name} — ${name}" src="${folder}/${String(i + 1).padStart(2, '0')}-${name}.html"></iframe>`).join('\n');
  return `  <section id="set-${S.num}">
    <h2>${String(S.num).padStart(2, '0')} · ${S.name} <span class="tag">${S.theme}</span></h2>
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
<title>Colección Arte — 20 sets × 12 módulos</title>
<style>
  body { margin:0; font-family:'Segoe UI',system-ui,sans-serif; background:#141419; color:#e8e8ee; }
  header { position:sticky; top:0; z-index:10; background:rgba(20,20,25,.92); backdrop-filter:blur(8px); padding:1rem 1.4rem; border-bottom:1px solid #2a2a33; }
  h1 { margin:0 0 .6rem; font-size:1.15rem; letter-spacing:.04em; }
  nav { display:flex; flex-wrap:wrap; gap:.4rem .8rem; font-size:.78rem; }
  nav a { color:#9aa2ff; text-decoration:none; }
  nav a:hover { text-decoration:underline; }
  main { padding:1.4rem; max-width:1500px; margin:0 auto; }
  section { margin-bottom:3rem; }
  h2 { font-size:1.3rem; margin:0 0 1rem; border-left:4px solid #9aa2ff; padding-left:.7rem; }
  .tag { font-size:.72rem; font-weight:400; color:#8f93a3; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(420px,1fr)); gap:1.2rem; }
  iframe { width:100%; height:560px; border:1px solid #2a2a33; border-radius:10px; background:#fff; }
  @media (max-width:520px){ .grid { grid-template-columns:1fr; } iframe { height:480px; } }
</style>
</head>
<body>
<header>
  <h1>🎨 Colección Arte — ${list.length} sets × ${builders.length} módulos (${written} archivos)</h1>
  <nav>
${nav}
  </nav>
</header>
<main>
${sections}
</main>
</body>
</html>`, 'utf-8');
console.log('✓ index.html (preview global)');
