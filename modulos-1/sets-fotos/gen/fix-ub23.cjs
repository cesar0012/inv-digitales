/* Foto de lugar para variantes 2/3 de ubicacion (segundo punto de inyección). */
const fs = require('fs');
const P = __dirname;
let a = fs.readFileSync(P + '/tpl-a.cjs', 'utf-8');
const target = '      <a class="sf3__boton" href="https://www.google.com/maps?q=Lugar+del+evento" target="_blank" rel="noopener" memory_type="text" memory_usage="custom" memory_key="ubicacion-boton">Trazar ruta</a>`;';
const inject = [
  '      <figure class="sf3__foto" memory_type="image" memory_usage="custom" memory_source="library" style="margin:.9rem 0 .4rem; border-radius:12px; overflow:hidden; border:1px solid var(--surface-border-color);">',
  "        <img src=\"https://loremflickr.com/700/420/' + S.kw + ',venue\" alt=\"Vista del lugar\" path=\"placeholder\" data-library-category=\"bodas\" data-asset-type=\"lugar\" loading=\"lazy\" />",
  '        <figcaption hidden>Vista del lugar</figcaption>',
  '      </figure>'
].join('\n') + '\n';
if (!a.includes(target)) { console.log('ya aplicado (v2/3)'); process.exit(0); }
a = a.replace(target, inject + target);
fs.writeFileSync(P + '/tpl-a.cjs', a);
console.log('foto v2/3 añadida:', (a.match(/sf3__foto/g) || []).length);
