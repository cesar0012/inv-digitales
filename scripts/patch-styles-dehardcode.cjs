/* Reescribe styles.cjs: convierte los rgba() literales de los fondos `bg`
 * a color-mix sobre las variables temáticas (var(--primary-color) etc.).
 * La paleta `v` se conserva SOLO como paleta de PREVIEW (capturas/index):
 * los módulos ya no la emiten. */
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'modulos-1', 'sets-fotos', 'gen', 'styles.cjs');
const src = fs.readFileSync(file, 'utf-8');

const hexToRgb = (h) => {
  const m = h.replace('#', '');
  const f = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  return [parseInt(f.slice(0, 2), 16), parseInt(f.slice(2, 4), 16), parseInt(f.slice(4, 6), 16)];
};
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

let totalReemplazos = 0;
const salida = src.replace(
  /(\w+): \{ (num:\d+, key:'[^']+', name:'[^']+', v:\{[^}]+\}, )bg:"([^"]+)"/g,
  (full, key, prefijo, bg) => {
    const vBody = prefijo.match(/v:\{([^}]+)\}/)[1];
    const vars = [];
    for (const m of vBody.matchAll(/'(--[a-z-]+)':'(#[0-9a-fA-F]{3,6})'/g)) {
      vars.push([m[1], hexToRgb(m[2])]);
    }
    const nuevoBg = bg.replace(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/g, (ra, r, g, b, a) => {
      const rgb = [+r, +g, +b];
      const alpha = a === undefined ? 1 : parseFloat(a);
      const pct = Math.round(alpha * 100);
      const neutral = Math.abs(rgb[0] - rgb[1]) < 12 && Math.abs(rgb[1] - rgb[2]) < 12;
      let varName;
      if (neutral) varName = rgb[0] < 128 ? '--text-color' : '--bg-color';
      else {
        let mejor = vars[0];
        for (const v of vars) if (dist(v[1], rgb) < dist(mejor[1], rgb)) mejor = v;
        varName = mejor[0];
      }
      totalReemplazos++;
      return pct >= 100 ? `var(${varName})` : `color-mix(in srgb, var(${varName}) ${pct}%, transparent)`;
    });
    return `${key}: { ${prefijo}bg:"${nuevoBg}"`;
  }
);

const final = salida.replace(
  /^\/\* 24 estilos[^]*?\*\//m,
  `/* 24 estilos — uno por imagen de referencia de rag-visual-fuentes.
 * IMPORTANTE (contrato de tematización): la paleta v YA NO se emite como
 * colores literales en los módulos — queda SOLO como paleta de PREVIEW
 * (capturas scripts/shoot-*). Los módulos usan exclusivamente las variables
 * temáticas (var(--primary-color)...) que el sistema asigna desde el request
 * del cliente; los fondos bg son color-mix sobre esas variables. */`
);

fs.writeFileSync(file, final, 'utf-8');
console.log('Reemplazos rgba→color-mix:', totalReemplazos);
console.log('bg con rgba restantes:', [...final.matchAll(/bg:"[^"]*rgba?\(/g)].length);
