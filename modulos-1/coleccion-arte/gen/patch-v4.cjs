/* Fixes ronda 4: badge de fecha con fondo garantizado (el accentBar pudo volverse
 * del mismo tono que el texto) y caja de regalos V=1 sin radio arco que recorte texto. */
const { readFileSync, writeFileSync } = require('fs');
const { join } = require('path');
const G = __dirname;

function patch(file, from, to, tag) {
  let src = readFileSync(join(G, file), 'utf-8');
  if (!src.includes(from)) { console.error(`✗ ${file}: NO encontrado (${tag})`); process.exitCode = 1; return; }
  src = src.split(from).join(to);
  writeFileSync(join(G, file), src, 'utf-8');
  console.log(`✓ ${file}: ${tag}`);
}

/* 1. Fecha de portada: borde/acento sin fondo que compita con el texto. */
patch('tpl-a.cjs',
  ".${S.cls}-p__fecha { display:inline-block; padding:.55rem 1.6rem; font-family:${S.mono}; font-size:clamp(.72rem,1.45vw,.86rem); letter-spacing:.3em; text-transform:uppercase; color:var(--text-color); ${S.accentBar}; }",
  ".${S.cls}-p__fecha { display:inline-block; padding:.55rem 1.6rem; font-family:${S.mono}; font-size:clamp(.72rem,1.45vw,.86rem); letter-spacing:.3em; text-transform:uppercase; color:var(--text-color); background:color-mix(in srgb, var(--bg-color) 88%, transparent); border:1px solid var(--accent-color); }",
  'fecha portada segura');

/* 2. Regalos V=1: radio de tarjeta acotado para que el arco no recorte el texto. */
patch('tpl-c.cjs',
  "? `.${S.cls}-rg__caja { width:min(100%,860px); margin:0 auto; display:grid; grid-template-columns:repeat(auto-fit, minmax(min(240px,100%),1fr)); ${S.card} overflow:hidden; }`",
  "? `.${S.cls}-rg__caja { width:min(100%,860px); margin:0 auto; display:grid; grid-template-columns:repeat(auto-fit, minmax(min(240px,100%),1fr)); ${S.card} border-radius:18px; overflow:hidden; }`",
  'regalos V1 radio');

console.log('Fixes ronda 4 aplicados.');
