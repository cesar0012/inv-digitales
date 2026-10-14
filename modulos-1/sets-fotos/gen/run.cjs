/* Orquestador: 24 sets × 12 módulos en modulos-1/sets-fotos/set-NN-<key>/ */
const { mkdirSync, writeFileSync, readdirSync } = require('fs');
const { join } = require('path');
const styles = require('./styles.cjs');
const A = require('./tpl-a.cjs');
const B = require('./tpl-b.cjs');
const C = require('./tpl-c.cjs');
/* Countdowns: UN concepto único por set (reloj de sol, mariposas, split-flap,
 * arena, arcoíris, estación, calendario, vela, brújula, ascensor, corona,
 * péndulo, bloques, peonía, rama, boya, meandro, bordado, campanas, espejo,
 * cine, listón, copas, globos). Nada se repite. */
const { countdown: cdUnico } = require('./countdowns.cjs');
/* Shaper: 3 ejes estructurales (cabecera × espejo × reveal) que combinados
 * con las 4 variantes dan 24 composiciones distintas por tipo. */
const { shape } = require('./shaper.cjs');

const base = __dirname + '/..';
const builders = [
  ['portada', A.portada], ['padres', A.padres], ['ubicacion', A.ubicacion], ['itinerario', A.itinerario],
  ['confirmacion', B.confirmacion], ['detalles', B.detalles], ['countdown', cdUnico], ['padrinos', B.padrinos],
  ['corte', C.corte], ['galeria', C.galeria], ['regalos', C.regalos], ['vestimenta', C.vestimenta]
];
/* El countdown ya es único por concepto; el resto pasa por el shaper. */
const build = (name, fn, S) => (name === 'countdown' ? fn(S) : shape(S, fn(S)));

/* ---------------------------------------------------------------------------
 * SANITIZADOR DE COLORES — ningún módulo sale con un literal de color.
 * Los restos (sombras rgba, #fff de gradientes, rgb sueltos) se convierten a
 * color-mix/var sobre las variables temáticas usando la paleta del set SOLO
 * como referencia para elegir la variable adecuada (text/bg para neutros,
 * la variable más cercana para tonos). El color final lo decide el cliente.
 * ------------------------------------------------------------------------- */
const hexToRgb = (h) => {
  const f = h.length === 4 ? h.slice(1).split('').map((c) => c + c).join('') : h.slice(1);
  return [parseInt(f.slice(0, 2), 16), parseInt(f.slice(2, 4), 16), parseInt(f.slice(4, 6), 16)];
};
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

function sanitizeCss(css, S) {
  const varsRef = Object.entries(S.v)
    .filter(([k]) => /--(primary|secondary|accent|text|bg)-color/.test(k))
    .map(([k, hex]) => [k, hexToRgb(hex)]);
  const varPara = (rgb) => {
    const neutral = Math.abs(rgb[0] - rgb[1]) < 12 && Math.abs(rgb[1] - rgb[2]) < 12;
    if (neutral) return rgb[0] < 128 ? '--text-color' : '--bg-color';
    let mejor = varsRef[0];
    for (const v of varsRef) if (dist(v[1], rgb) < dist(mejor[1], rgb)) mejor = v;
    return mejor[0];
  };
  return css
    .replace(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/g, (m, r, g, b, a) => {
      const pct = a === undefined ? 100 : Math.round(parseFloat(a) * 100);
      const v = varPara([+r, +g, +b]);
      return pct >= 100 ? `var(${v})` : `color-mix(in srgb, var(${v}) ${pct}%, transparent)`;
    })
    .replace(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g, (m) => `var(${varPara(hexToRgb(m))})`);
}

function sanitizeColors(html, S) {
  // Solo <style>...</style> y style="...": el resto del HTML no lleva colores.
  return html
    .replace(/<style>([\s\S]*?)<\/style>/g, (full, css) => `<style>${sanitizeCss(css, S)}</style>`)
    .replace(/style="([^"]*)"/g, (full, css) => `style="${sanitizeCss(css, S)}"`);
}

const list = Object.values(styles);
let written = 0;
for (const S of list) {
  const folder = `set-${String(S.num).padStart(2, '0')}-${S.key}`;
  const dir = join(base, folder);
  mkdirSync(dir, { recursive: true });
  builders.forEach(([name, fn], i) => {
    writeFileSync(join(dir, `${String(i + 1).padStart(2, '0')}-${name}.html`), sanitizeColors(build(name, fn, S), S), 'utf-8');
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
  .nota { margin:.6rem 0 0; font-size:.72rem; color:#b9a8d6; }
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
  <p class="nota">⚠️ Los módulos viajan SIN paleta (cero colores hardcodeados): se ven "alambre" aquí a propósito. La paleta real la asigna el sistema desde el request del cliente al generar (theming/apply-theme + regla de contraste automático).</p>
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
