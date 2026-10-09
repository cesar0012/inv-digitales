/* Plantillas C: corte, galeria, regalos, vestimenta. */
const { meta } = require('./tpl-a.cjs');
const cssVars = (S) => Object.entries(S.v).map(([k, v]) => k + ':' + v).join('; ');

function corte(S) {
  const V = S.num % 3;
  const momentos = [
    ['01', 'Brindis', 'El primer aplauso de la noche.'],
    ['02', 'Vals', 'El giro que todos esperan.'],
    ['03', 'Pastel', 'Dulce final antes de la pista.']
  ];
  const cards = momentos.map(([n, t, d], i) => {
    if (V === 0) return `  <article class="${S.cls}-co__momento">
    <span class="${S.cls}-co__num" aria-hidden="true">${n}</span>
    <div memory_type="text" memory_usage="custom" memory_key="corte-momento-${i + 1}">
      <h3 class="${S.cls}-co__titulo" memory_type="text" memory_usage="custom" memory_key="corte-titulo-${i + 1}">${t}</h3>
      <p class="${S.cls}-co__texto" memory_type="text" memory_usage="custom" memory_key="corte-det-${i + 1}">${d}</p>
    </div>
  </article>`;
    if (V === 1) return `  <article class="${S.cls}-co__momento">
    <time class="${S.cls}-co__hora" datetime="${['17:00', '19:00', '21:00'][i]}">${['17:00', '19:00', '21:00'][i]} h</time>
    <div memory_type="text" memory_usage="custom" memory_key="corte-momento-${i + 1}">
      <h3 class="${S.cls}-co__titulo" memory_type="text" memory_usage="custom" memory_key="corte-titulo-${i + 1}">${t}</h3>
      <p class="${S.cls}-co__texto" memory_type="text" memory_usage="custom" memory_key="corte-det-${i + 1}">${d}</p>
    </div>
  </article>`;
    return `  <article class="${S.cls}-co__momento" style="--r:${i % 2 ? '1.8deg' : '-2deg'}">
    <span class="${S.cls}-co__num" aria-hidden="true">${n}</span>
    <div memory_type="text" memory_usage="custom" memory_key="corte-momento-${i + 1}">
      <h3 class="${S.cls}-co__titulo" memory_type="text" memory_usage="custom" memory_key="corte-titulo-${i + 1}">${t}</h3>
      <p class="${S.cls}-co__texto" memory_type="text" memory_usage="custom" memory_key="corte-det-${i + 1}">${d}</p>
    </div>
  </article>`;
  }).join('\n');
  const layout = V === 0
    ? 'display:flex; flex-wrap:wrap; justify-content:center; gap:clamp(1.2rem,3.4vw,2.2rem);'
    : V === 1
      ? 'display:grid; grid-template-columns:repeat(auto-fit, minmax(min(240px,100%),1fr)); gap:clamp(1.4rem,3.6vw,2.4rem);'
      : 'display:grid; grid-template-columns:repeat(auto-fit, minmax(min(230px,100%),1fr)); gap:clamp(1.6rem,4vw,2.8rem); width:min(100%,880px); margin:0 auto;';
  return `<section class="${S.cls}-co" data-gemini-id="corte-momentos" memory_type="background" memory_usage="protected" memory_source="generated" path="placeholder">
<style>
.${S.cls}-co { ${cssVars(S)};
  position:relative; isolation:isolate; overflow:hidden; box-sizing:border-box; padding:clamp(3rem,8vw,6rem) clamp(1rem,5vw,4rem);
  background:${S.bg}; background-size:cover; background-position:center; color:var(--text-color); }
.${S.cls}-co *, .${S.cls}-co *::before, .${S.cls}-co *::after { box-sizing:border-box; }
.${S.cls}-co::before { content:''; position:absolute; inset:0; z-index:-1; background:color-mix(in srgb, var(--bg-color) 80%, transparent); }
.${S.cls}-co__titulo { margin:0 0 .5rem; text-align:center; font-family:${S.disp}; font-weight:${(S.num % 2) ? '400' : '700'}; font-size:clamp(1.9rem,4.4vw,2.9rem); color:var(--primary-color); transform:rotate(${(S.num % 2) ? '1deg' : '0deg'}); }
.${S.cls}-co__sub { margin:0 auto clamp(2rem,5vw,3rem); max-width:46ch; text-align:center; font-family:${S.body}; font-size:clamp(.84rem,1.55vw,.96rem); line-height:1.75; color:var(--secondary-color); }
.${S.cls}-co__tira { ${layout} }
.${S.cls}-co__momento { position:relative; padding:clamp(1.4rem,3.2vw,2rem); ${S.card} ${V === 2 ? 'transform:rotate(var(--r,0deg)); transition:transform .45s cubic-bezier(.22,.8,.3,1);' : ''} }
.${S.cls}-co__num { display:block; margin-bottom:.4rem; font-family:${S.disp}; font-size:clamp(2rem,5vw,3.2rem); line-height:1; color:var(--accent-color); font-style:italic; }
.${S.cls}-co__hora { display:inline-block; margin-bottom:.4rem; font-family:${S.mono}; font-size:clamp(.64rem,1.25vw,.76rem); letter-spacing:.26em; color:var(--accent-color); }
.${S.cls}-co__momento h3 { margin:0 0 .3rem; font-family:${S.disp}; font-size:clamp(1.06rem,2.2vw,1.36rem); color:var(--primary-color); }
.${S.cls}-co__texto { margin:0; font-family:${S.body}; font-size:clamp(.78rem,1.42vw,.9rem); line-height:1.65; color:var(--secondary-color); }
@media (max-width:620px){ .${S.cls}-co__momento { transform:none !important; } }
</style>
<header memory_type="text" memory_usage="custom" memory_key="corte-intro">
  <h2 class="${S.cls}-co__titulo" memory_type="text" memory_usage="custom" memory_key="corte-encabezado">Momentos que no te pierdas</h2>
  <p class="${S.cls}-co__sub" memory_type="text" memory_usage="custom" memory_key="corte-texto">Tres paradas obligadas de la celebración: ten tu copa lista y tu mejor paso de baile guardado.</p>
</header>
<div class="${S.cls}-co__tira">
${cards}
</div>
${meta('corte', 'corte-momentos', S.name + ' — Corte', 'Momentos clave ' + S.theme + ' en tarjetas numeradas con marco propio del estilo.', ['corte', 'momentos', S.cls, S.theme])}
</section>`;
}

function galeria(S) {
  const V = S.num % 3;
  const kwPool = [S.kw + ',couple', S.kw + ',party', S.kw + ',flowers', S.kw + ',dress', S.kw + ',cake', S.kw + ',dance'];
  const fig = (i, span) => `    <figure class="${S.cls}-ga__foto"${span}>
      <img src="https://loremflickr.com/640/${i % 2 ? '800' : '520'}/${kwPool[i % kwPool.length]}" alt="Momento de la celebración ${i + 1}" path="placeholder" data-library-category="bodas" data-asset-type="galeria" loading="lazy" />
      <figcaption hidden>Momento ${i + 1}</figcaption>
    </figure>`;
  const n = V === 0 ? 9 : (V === 2 ? 8 : 6);
  const imgs = Array.from({ length: n }, (_, i) => {
    if (V === 0) return fig(i, i === 0 ? ' style="grid-column:span 2; grid-row:span 2;"' : '');
    return fig(i, '');
  }).join('\n');
  const grid = V === 0
    ? 'display:grid; grid-template-columns:repeat(4,1fr); grid-auto-rows:clamp(90px,16vw,150px); gap:clamp(.5rem,1.4vw,1rem);'
    : V === 1
      ? 'columns:3; column-gap:clamp(.6rem,1.6vw,1.1rem);'
      : 'display:grid; grid-template-columns:repeat(auto-fit, minmax(min(150px,45%),1fr)); gap:clamp(.7rem,2vw,1.2rem);';
  return `<section class="${S.cls}-ga" data-gemini-id="galeria-mosaico" memory_type="background" memory_usage="protected" memory_source="generated" path="placeholder">
<style>
.${S.cls}-ga { ${cssVars(S)};
  position:relative; isolation:isolate; overflow:hidden; box-sizing:border-box; padding:clamp(3rem,8vw,6rem) clamp(1rem,5vw,4rem);
  background:${S.bg}; background-size:cover; background-position:center; color:var(--text-color); }
.${S.cls}-ga *, .${S.cls}-ga *::before, .${S.cls}-ga *::after { box-sizing:border-box; }
.${S.cls}-ga::before { content:''; position:absolute; inset:0; z-index:-1; background:color-mix(in srgb, var(--bg-color) 82%, transparent); }
.${S.cls}-ga__titulo { margin:0 0 .5rem; text-align:center; font-family:${S.disp}; font-weight:${(S.num % 2) ? '400' : '700'}; font-size:clamp(1.9rem,4.4vw,2.9rem); color:var(--primary-color); }
.${S.cls}-ga__sub { margin:0 auto clamp(2rem,5vw,3rem); max-width:44ch; text-align:center; font-family:${S.body}; font-size:clamp(.84rem,1.55vw,.96rem); line-height:1.75; color:var(--secondary-color); }
.${S.cls}-ga__mosaico { width:min(100%,980px); margin:0 auto; ${grid} }
.${S.cls}-ga__foto { margin:0; overflow:hidden; border:2px solid var(--surface-border-color); cursor:zoom-in; ${S.num % 3 === 2 ? 'transform:rotate(var(--r,0deg)); transition:transform .45s cubic-bezier(.22,.8,.3,1);' : ''} }
.${S.cls}-ga__foto:nth-child(odd){ --r:-1.6deg; } .${S.cls}-ga__foto:nth-child(even){ --r:1.8deg; }
.${S.cls}-ga__foto:hover { transform:rotate(0) scale(1.02); z-index:3; }
.${S.cls}-ga__foto img { display:block; width:100%; height:100%; object-fit:cover; transition:transform .5s ease; }
.${S.cls}-ga__foto:hover img { transform:scale(1.06); }
.${S.cls}-ga__lb { position:fixed; inset:0; z-index:9999; display:none; place-items:center; background:color-mix(in srgb, var(--bg-color) 92%, transparent); cursor:zoom-out; }
.${S.cls}-ga__lb.abierto { display:grid; }
.${S.cls}-ga__lb img { max-width:min(92vw,1000px); max-height:88vh; border:2px solid var(--accent-color); }
@media (max-width:640px){ .${S.cls}-ga__mosaico { grid-template-columns:repeat(2,1fr) !important; columns:2 !important; } .${S.cls}-ga__foto[style] { grid-column:auto !important; grid-row:auto !important; } }
@media (prefers-reduced-motion:reduce){ .${S.cls}-ga * { transition:none !important; } }
</style>
<header memory_type="text" memory_usage="custom" memory_key="galeria-intro">
  <h2 class="${S.cls}-ga__titulo" memory_type="text" memory_usage="custom" memory_key="galeria-titulo">Galería</h2>
  <p class="${S.cls}-ga__sub" memory_type="text" memory_usage="custom" memory_key="galeria-texto">Un vistazo a los momentos que viviremos juntos. Toca cualquier foto para verla en grande.</p>
</header>
<div class="${S.cls}-ga__mosaico">
${imgs}
</div>
<div class="${S.cls}-ga__lb" role="dialog" aria-label="Foto ampliada" hidden>
  <img src="" alt="Foto ampliada" />
</div>
<script>
  (function () {
    var scope = null;
    try { scope = document.currentScript.closest('[data-gemini-id^="galeria"]'); } catch (e) {}
    if (!scope) scope = document.querySelector('[data-gemini-id^="galeria"]');
    if (!scope) return;
    var lb = scope.querySelector('.${S.cls}-ga__lb');
    if (!lb) return;
    var lbImg = lb.querySelector('img');
    scope.addEventListener('click', function (ev) {
      var fig = ev.target.closest && ev.target.closest('figure');
      var img = fig && fig.querySelector('img');
      if (!img) { if (ev.target === lb) { lb.classList.remove('abierto'); lb.hidden = true; } return; }
      lbImg.src = img.currentSrc || img.src;
      lb.hidden = false;
      lb.classList.add('abierto');
    });
  })();
</script>
${meta('galeria', 'galeria-mosaico', S.name + ' — Galeria', 'Galeria ' + S.theme + ' con mosaico de al menos seis fotos y lightbox al tocar.', ['galeria', 'mosaico', 'lightbox', S.cls, S.theme])}
</section>`;
}

function regalos(S) {
  const V = S.num % 3;
  const caja = V === 0
    ? `.${S.cls}-rg__caja { width:min(100%,600px); margin:0 auto; padding:clamp(1.8rem,4.4vw,2.8rem) clamp(1.4rem,4vw,2.4rem); ${S.card} text-align:center; }`
    : V === 1
      ? `.${S.cls}-rg__caja { width:min(100%,860px); margin:0 auto; display:grid; grid-template-columns:repeat(auto-fit, minmax(min(240px,100%),1fr)); ${S.card} border-radius:18px; overflow:hidden; }
.${S.cls}-rg__lado { padding:clamp(1.6rem,4vw,2.4rem) clamp(1.2rem,3.4vw,2rem); }
.${S.cls}-rg__lado + .${S.cls}-rg__lado { border-left:1px dashed var(--surface-border-color); }`
      : `.${S.cls}-rg__caja { position:relative; width:min(100%,640px); margin:0 auto; padding:clamp(2rem,5vw,3rem) clamp(1.4rem,4vw,2.6rem); ${S.card} transform:rotate(-1.4deg); }
.${S.cls}-rg__moño { position:absolute; top:-20px; left:50%; transform:translateX(-50%) rotate(6deg); padding:.4rem 1.2rem; background:var(--accent-color); color:var(--bg-color); font-family:${S.mono}; font-size:.62rem; letter-spacing:.3em; text-transform:uppercase; box-shadow:0 10px 22px rgba(0,0,0,.25); }`;
  return `<section class="${S.cls}-rg" data-gemini-id="regalos-mesa" memory_type="background" memory_usage="protected" memory_source="generated" path="placeholder">
<style>
.${S.cls}-rg { ${cssVars(S)};
  position:relative; isolation:isolate; overflow:hidden; box-sizing:border-box; padding:clamp(3.2rem,8.5vw,6.5rem) clamp(1rem,5vw,4rem);
  background:${S.bg}; background-size:cover; background-position:center; color:var(--text-color); }
.${S.cls}-rg *, .${S.cls}-rg *::before, .${S.cls}-rg *::after { box-sizing:border-box; }
.${S.cls}-rg::before { content:''; position:absolute; inset:0; z-index:-1; background:color-mix(in srgb, var(--bg-color) 80%, transparent); }
${caja}
.${S.cls}-rg__titulo { margin:0 0 .5rem; font-family:${S.disp}; font-weight:${(S.num % 2) ? '400' : '700'}; font-size:clamp(1.8rem,4.2vw,2.7rem); color:var(--primary-color); }
.${S.cls}-rg__texto { margin:0 auto 1.4rem; max-width:42ch; font-family:${S.body}; font-size:clamp(.84rem,1.55vw,.96rem); line-height:1.8; color:var(--secondary-color); }
.${S.cls}-rg__rotulo { margin:0 0 .4rem; font-family:${S.mono}; font-size:clamp(.56rem,1.05vw,.64rem); letter-spacing:.32em; text-transform:uppercase; color:var(--accent-color); }
.${S.cls}-rg__dato { display:block; font-family:${S.mono}; font-size:clamp(.72rem,1.35vw,.86rem); letter-spacing:.14em; color:var(--text-color); text-decoration:none; border-bottom:1px dashed var(--accent-color); padding-bottom:.2rem; }
.${S.cls}-rg__dato + .${S.cls}-rg__dato { margin-top:.8rem; }
.${S.cls}-rg__btn { display:inline-block; margin-top:1.4rem; padding:.8rem 1.9rem; font-family:${S.mono}; font-size:clamp(.66rem,1.25vw,.78rem); letter-spacing:.26em; text-transform:uppercase; text-decoration:none; background:var(--accent-color); color:var(--bg-color); transition:transform .35s ease, box-shadow .35s ease; }
.${S.cls}-rg__btn:hover { transform:translateY(-3px); box-shadow:0 14px 28px color-mix(in srgb, var(--accent-color) 42%, transparent); }
.${V === 1 ? S.cls + '-rg__lado + .' : ''}${S.cls}-rg__lado { min-width:0; }
@media (max-width:640px){ .${S.cls}-rg__caja { grid-template-columns:1fr !important; transform:none; } .${S.cls}-rg__lado + .${S.cls}-rg__lado { border-left:0; border-top:1px dashed var(--surface-border-color); } }
</style>
<div class="${S.cls}-rg__caja">
  ${V === 2 ? '<span class="' + S.cls + '-rg__moño" aria-hidden="true">Un detalle</span>' : ''}
  <div${V === 1 ? ' class="' + S.cls + '-rg__lado"' : ''} memory_type="text" memory_usage="custom" memory_key="regalos-intro">
    <h2 class="${S.cls}-rg__titulo" memory_type="text" memory_usage="custom" memory_key="regalos-titulo">Mesa de regalos</h2>
    <p class="${S.cls}-rg__texto" memory_type="text" memory_usage="custom" memory_key="regalos-texto">Tu presencia es nuestro regalo favorito; si quieres consentirnos, aquí tienes algunas ideas.</p>
  </div>
  <div${V === 1 ? ' class="' + S.cls + '-rg__lado"' : ''} memory_type="text" memory_usage="custom" memory_key="regalos-datos">
    <p class="${S.cls}-rg__rotulo">Datos</p>
    <a class="${S.cls}-rg__dato" href="https://mesaderegalos.com/ejemplo" target="_blank" rel="noopener" memory_type="text" memory_usage="custom" memory_key="regalos-link">Mesa de regalos en línea</a>
    <span class="${S.cls}-rg__dato" memory_type="text" memory_usage="custom" memory_key="regalos-clabe">CLABE: 0000 0000 0000 0000</span>
    <a class="${S.cls}-rg__btn" href="https://wa.me/5210000000000" target="_blank" rel="noopener" memory_type="text" memory_usage="custom" memory_key="regalos-boton">Escríbenos</a>
  </div>
</div>
${meta('regalos', 'regalos-mesa', S.name + ' — Regalos', 'Mesa de regalos ' + S.theme + ' con datos bancarios y botón directo.', ['regalos', 'mesa', S.cls, S.theme])}
</section>`;
}

function vestimenta(S) {
  const V = S.num % 3;
  const codigos = [['Etiqueta', 'Traje oscuro, vestido largo.'], ['Formal', 'Traje y vestido de gala corto.'], ['Casual elegante', 'Sin corbata, tela fluida.']][S.num % 3];
  return `<section class="${S.cls}-vs" data-gemini-id="vestimenta-codigo" memory_type="background" memory_usage="protected" memory_source="generated" path="placeholder">
<style>
.${S.cls}-vs { ${cssVars(S)};
  position:relative; isolation:isolate; overflow:hidden; box-sizing:border-box; padding:clamp(3rem,8vw,6rem) clamp(1rem,5vw,4rem);
  background:${S.bg}; background-size:cover; background-position:center; color:var(--text-color); text-align:center; }
.${S.cls}-vs *, .${S.cls}-vs *::before, .${S.cls}-vs *::after { box-sizing:border-box; }
.${S.cls}-vs::before { content:''; position:absolute; inset:0; z-index:-1; background:color-mix(in srgb, var(--bg-color) 80%, transparent); }
.${S.cls}-vs__caja { width:min(100%,${V === 1 ? '880px' : '620px'}); margin:0 auto; padding:clamp(1.8rem,4.4vw,2.8rem) clamp(1.4rem,4vw,2.6rem); ${S.card} ${V === 2 ? 'transform:rotate(-1.2deg);' : ''} }
.${S.cls}-vs__titulo { margin:0 0 .4rem; font-family:${S.disp}; font-weight:${(S.num % 2) ? '400' : '700'}; font-size:clamp(1.8rem,4.2vw,2.7rem); color:var(--primary-color); }
.${S.cls}-vs__codigo { margin:0 0 .8rem; font-family:${S.mono}; font-size:clamp(.66rem,1.3vw,.8rem); letter-spacing:.32em; text-transform:uppercase; color:var(--accent-color); }
.${S.cls}-vs__texto { margin:0 auto 1.4rem; max-width:44ch; font-family:${S.body}; font-size:clamp(.84rem,1.55vw,.96rem); line-height:1.8; color:var(--secondary-color); }
.${S.cls}-vs__paleta { display:flex; flex-wrap:wrap; justify-content:center; gap:.7rem; margin-bottom:1.4rem; }
.${S.cls}-vs__muestra { width:52px; height:52px; border-radius:${V === 1 ? '10px' : '50%'}; border:2px solid var(--surface-border-color); box-shadow:0 8px 18px rgba(0,0,0,.18); }
.${S.cls}-vs__nota { margin:1.1rem 0 0; font-family:${S.mono}; font-size:clamp(.6rem,1.1vw,.7rem); letter-spacing:.2em; color:var(--secondary-color); }
@media (max-width:560px){ .${S.cls}-vs__caja { transform:none; padding:1.6rem 1.1rem; } .${S.cls}-vs__muestra { width:42px; height:42px; } }
</style>
<div class="${S.cls}-vs__caja">
  <p class="${S.cls}-vs__codigo" memory_type="text" memory_usage="custom" memory_key="vestimenta-rotulo">Código de vestimenta</p>
  <h2 class="${S.cls}-vs__titulo" memory_type="text" memory_usage="custom" memory_key="vestimenta-codigo">${codigos[0]}</h2>
  <p class="${S.cls}-vs__texto" memory_type="text" memory_usage="custom" memory_key="vestimenta-texto">${codigos[1]} Inspírate con la paleta de la celebración.</p>
  <div class="${S.cls}-vs__paleta" aria-label="Paleta de colores sugerida">
    <span class="${S.cls}-vs__muestra" style="background:#b49a67;"></span>
    <span class="${S.cls}-vs__muestra" style="background:#7d8b99;"></span>
    <span class="${S.cls}-vs__muestra" style="background:#d9cfc0;"></span>
    <span class="${S.cls}-vs__muestra" style="background:#3f4a54;"></span>
    <span class="${S.cls}-vs__muestra" style="background:#20262c;"></span>
  </div>
  <figure class="${S.cls}-vs__foto" style="margin:0;" memory_type="image" memory_usage="custom" memory_source="library" memory_key="vestimenta-foto">
    <img src="https://loremflickr.com/800/450/${S.kw},elegant" alt="Inspiración de atuendo" path="placeholder" data-library-category="bodas" data-asset-type="vestimenta" loading="lazy" style="display:block; width:100%; height:auto; aspect-ratio:16/9; object-fit:cover;" />
    <figcaption hidden>Inspiración de atuendo</figcaption>
  </figure>
  <p class="${S.cls}-vs__nota" memory_type="text" memory_usage="custom" memory_key="vestimenta-nota">Evita el blanco: ese color es de los anfitriones.</p>
</div>
${meta('vestimenta', 'vestimenta-codigo', S.name + ' — Vestimenta', 'Codigo de vestimenta ' + S.theme + ' con paleta sugerida e imagen de inspiracion.', ['vestimenta', 'dresscode', S.cls, S.theme])}
</section>`;
}

module.exports = { corte, galeria, regalos, vestimenta };
