/* Añade foto de lugar a las 4 variantes de ubicacion + foto a detalles v2. */
const fs = require('fs');
const P = __dirname;

let a = fs.readFileSync(P + '/tpl-a.cjs', 'utf-8');
const fotoTpl = `      <figure class="sf3__foto" memory_type="image" memory_usage="custom" memory_source="library" style="margin:.9rem 0 .4rem; border-radius:12px; overflow:hidden; border:1px solid var(--surface-border-color);">
        <img src="https://loremflickr.com/700/420/' + S.kw + ',venue" alt="Vista del lugar" path="placeholder" data-library-category="bodas" data-asset-type="lugar" loading="lazy" />
        <figcaption hidden>Vista del lugar</figcaption>
      </figure>
      <a class="sf3__boton" href="https://www.google.com/maps?q=Lugar+del+evento" target="_blank" rel="noopener" memory_type="text" memory_usage="custom" memory_key="ubicacion-boton">Trazar ruta</a>`;

// Variantes 0/1: datosInner termina con el botón.
const btn = '      <a class="sf3__boton" href="https://www.google.com/maps?q=Lugar+del+evento" target="_blank" rel="noopener" memory_type="text" memory_usage="custom" memory_key="ubicacion-boton">Trazar ruta</a>`;';
if (!a.includes(btn)) { console.error('✗ botón datosInner no encontrado'); process.exitCode = 1; }
a = a.replace(btn, fotoTpl.replace(/^ {6}/, '      ').replace('Trazar ruta</a>', 'Trazar ruta</a>`;'));

// Variantes 2/3: botón dentro de </div>.
const btn2 = '      <a class="sf3__boton" href="https://www.google.com/maps?q=Lugar+del+evento" target="_blank" rel="noopener" memory_type="text" memory_usage="custom" memory_key="ubicacion-boton">Trazar ruta</a>\n    </div>';
if (a.includes(btn2)) {
  a = a.replace(btn2, fotoTpl.replace(/^ {6}/, '      ') + '\n    </div>');
  console.log('✓ ubicacion v2/v3 foto');
}
fs.writeFileSync(P + '/tpl-a.cjs', a);

let c = fs.readFileSync(P + '/tpl-c.cjs', 'utf-8');
// detalles v2: añadir foto circular antes de la paleta en la fila a.
const anchor = `      <div class="sf6__paleta" style="justify-content:flex-start;"><span class="sf6__muestra" style="background:var(--primary-color);"></span><span class="sf6__muestra" style="background:var(--secondary-color);"></span><span class="sf6__muestra" style="background:var(--accent-color);"></span></div>`;
if (!c.includes(anchor)) { console.error('✗ ancla paleta v2 no encontrada'); process.exitCode = 1; }
c = c.replace(anchor,
`      <figure memory_type="image" memory_usage="custom" memory_source="library" style="margin:0 0 1rem; width:min(100%,300px); border-radius:120px 120px 14px 14px; overflow:hidden; border:1px solid var(--surface-border-color);">
        <img src="https://loremflickr.com/600/700/' + S.kw + ',dress" alt="Inspiración de vestimenta" path="placeholder" data-library-category="bodas" data-asset-type="vestimenta" loading="lazy" />
        <figcaption hidden>Inspiración</figcaption>
      </figure>
${anchor}`);
fs.writeFileSync(P + '/tpl-c.cjs', c);
console.log('Fixes listos.');
