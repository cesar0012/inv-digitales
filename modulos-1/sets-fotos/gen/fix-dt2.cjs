/* Foto para detalles variante 2 (fila editorial a). */
const fs = require('fs');
const P = __dirname;
let c = fs.readFileSync(P + '/tpl-b.cjs', 'utf-8');
const anchor = '<div class="sf6__paleta" style="justify-content:flex-start;"><span class="sf6__muestra" style="background:var(--primary-color);"></span>';
if (!c.includes(anchor)) { console.log('ya aplicado (detalles v2) o ancla distinta'); process.exit(0); }
const inject = [
  '      <figure memory_type="image" memory_usage="custom" memory_source="library" style="margin:0 0 1rem; width:min(100%,300px); border-radius:120px 120px 14px 14px; overflow:hidden; border:1px solid var(--surface-border-color);">',
  "        <img src=\"https://loremflickr.com/600/700/' + S.kw + ',dress\" alt=\"Inspiración de vestimenta\" path=\"placeholder\" data-library-category=\"bodas\" data-asset-type=\"vestimenta\" loading=\"lazy\" />",
  '        <figcaption hidden>Inspiración</figcaption>',
  '      </figure>'
].join('\n') + '\n';
c = c.replace(anchor, inject + anchor);
fs.writeFileSync(P + '/tpl-b.cjs', c);
console.log('foto detalles v2 añadida');
