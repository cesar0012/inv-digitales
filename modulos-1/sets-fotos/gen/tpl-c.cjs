/* Plantillas C: corte, galeria, regalos, vestimenta — variantes por estilo. */
const { meta, orn, ORN_CSS, V } = require('./tpl-a.cjs');

function corte(S) {
  const Vv = S.num % 6;
  const momentos = [['6:00 pm', '18:00', 'El vals', 'El giro esperado'], ['8:00 pm', '20:00', 'El pastel', 'Dulce celebración'], ['10:00 pm', '22:00', 'El brindis', 'Copas en alto']];
  const layout = Vv === 0
    ? `.sf9__tira { display:flex; flex-wrap:wrap; justify-content:center; gap:clamp(1.6rem,4vw,2.6rem); width:min(100%,1000px); margin:0 auto; }
.sf9__tarjeta { width:clamp(250px,30vw,310px); background:var(--surface-color); border:1px solid var(--surface-border-color); padding:clamp(1.6rem,3.6vw,2.2rem); clip-path:polygon(0 6%, 100% 0, 100% 94%, 0 100%); transform:rotate(var(--g)); transition:transform .5s cubic-bezier(.16,1,.3,1); }
.sf9__tarjeta:nth-child(1){ --g:-2.4deg; } .sf9__tarjeta:nth-child(2){ --g:1.8deg; margin-top:1.6rem; } .sf9__tarjeta:nth-child(3){ --g:-1.4deg; }
.sf9__tarjeta:hover { transform:rotate(0) translateY(-6px); }`
    : Vv === 1
      ? `.sf9__tira { display:flex; flex-wrap:wrap; justify-content:center; gap:clamp(2rem,5vw,3.4rem); width:min(100%,960px); margin:0 auto; }
.sf9__tarjeta { width:clamp(220px,26vw,268px); text-align:center; }
.sf9__medallon { width:clamp(150px,19vw,190px); aspect-ratio:1/1; margin:0 auto 1rem; border-radius:50%; border:2px solid var(--primary-color); display:grid; place-items:center; position:relative; }
.sf9__medallon::after { content:''; position:absolute; inset:-10px; border-radius:50%; border:1px dashed var(--accent-color); animation:sf-girar 26s linear infinite; }
@keyframes sf-girar { to { transform:rotate(360deg); } }
.sf9__medallon time { font-family:${S.disp}; font-size:clamp(1.3rem,3vw,1.7rem); color:var(--primary-color); }`
      : Vv === 2
        ? `.sf9__escala { width:min(100%,760px); margin:0 auto; }
.sf9__tarjeta { display:grid; grid-template-columns:auto 1fr; gap:clamp(1.2rem,3.4vw,2rem); align-items:center; padding:clamp(1rem,2.8vw,1.5rem) 0; }
.sf9__tarjeta:nth-child(2) { padding-left:clamp(2rem,6vw,4rem); }
.sf9__tarjeta:nth-child(3) { padding-left:clamp(4rem,10vw,7rem); }
.sf9__num { font-family:Georgia,serif; font-style:italic; font-size:clamp(2.4rem,6vw,3.6rem); color:var(--accent-color); line-height:1; }`
        : Vv === 3
        ? `.sf9__tira { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:clamp(1.2rem,3vw,2.2rem); width:min(100%,1020px); margin:0 auto; }
@media (max-width:760px){ .sf9__tira { grid-template-columns:1fr; width:min(100%,380px); } }
.sf9__tarjeta { position:relative; width:auto; max-width:312px; margin:0 auto; width:100%; padding:clamp(1.7rem,3.8vw,2.3rem) clamp(1.4rem,3.2vw,2rem); background:var(--primary-color); color:var(--bg-color); clip-path:polygon(0 0, 92% 0, 100% 18%, 100% 100%, 8% 100%, 0 82%); text-align:center; }
.sf9__tarjeta time { display:inline-block; margin-bottom:.5rem; font-family:${S.mono}; font-size:clamp(.68rem,1.35vw,.82rem); letter-spacing:.3em; opacity:.9; }
.sf9__nombre { color:#fff; }
.sf9__detalle { color:color-mix(in srgb, var(--bg-color) 70%, #fff); }`
        : Vv === 4
        ? `.sf9__escala { display:flex; flex-wrap:wrap; justify-content:center; align-items:flex-start; gap:0; width:min(100%,940px); margin:0 auto; position:relative; }
.sf9__escala::before { content:''; position:absolute; left:6%; right:6%; top:34px; border-top:2px dashed color-mix(in srgb, var(--primary-color) 55%, transparent); }
.sf9__tarjeta { position:relative; width:clamp(190px,24vw,240px); text-align:center; padding:0 .6rem; }
.sf9__tarjeta:not(:first-child) { margin-left:clamp(-1rem,-2vw,-.4rem); }
.sf9__tarjeta time { display:grid; place-items:center; width:68px; height:68px; margin:0 auto .9rem; border-radius:50%; border:2px solid var(--primary-color); background:var(--surface-color); font-family:${S.disp}; font-size:clamp(.78rem,1.6vw,.95rem); color:var(--primary-color); box-shadow:0 10px 22px rgba(0,0,0,.16); }
.sf9__tarjeta:nth-child(even) { transform:translateY(clamp(1.6rem,4vw,2.6rem)); }`
        : `.sf9__escala { width:min(100%,820px); margin:0 auto; display:grid; gap:1rem; }
.sf9__tarjeta { position:relative; display:grid; grid-template-columns:auto 1fr; align-items:center; gap:clamp(1.4rem,3.6vw,2.2rem); padding:clamp(1.2rem,3vw,1.7rem) clamp(1.2rem,3vw,1.8rem) clamp(1.2rem,3vw,1.7rem) clamp(2.6rem,6vw,3.6rem); background:var(--surface-color); border:1px solid var(--surface-border-color); box-shadow:0 16px 32px rgba(0,0,0,.16); }
.sf9__tarjeta::before { content:''; position:absolute; left:clamp(1rem,2.4vw,1.4rem); top:16%; bottom:16%; border-left:2px dotted var(--primary-color); }
.sf9__tarjeta::after { content:''; position:absolute; left:calc(clamp(1rem,2.4vw,1.4rem) - 7px); top:50%; transform:translateY(-50%); width:14px; height:14px; border-radius:50%; background:var(--bg-color); border:2px solid var(--primary-color); }
.sf9__tarjeta time { display:block; font-family:${S.mono}; font-size:clamp(.72rem,1.5vw,.88rem); letter-spacing:.3em; color:var(--primary-color); margin-bottom:.3rem; }`;
  const items = momentos.map(([hr, dt, t, d], i) => {
    if (Vv === 0) return `  <article class="sf9__tarjeta">
    <time class="sf4__hora" datetime="${dt}" memory_type="text" memory_usage="custom" memory_key="corte-hora-${i + 1}">${hr}</time>
    <div memory_type="text" memory_usage="custom" memory_key="corte-momento-${i + 1}">
      <h3 class="sf4__nombre" memory_type="text" memory_usage="custom" memory_key="corte-titulo-${i + 1}">${t}</h3>
      <p class="sf4__detalle" memory_type="text" memory_usage="custom" memory_key="corte-det-${i + 1}">${d}</p>
    </div>
  </article>`;
    if (Vv === 1) return `  <article class="sf9__tarjeta">
    <span class="sf9__medallon"><time datetime="${dt}" memory_type="text" memory_usage="custom" memory_key="corte-hora-${i + 1}">${hr}</time></span>
    <div memory_type="text" memory_usage="custom" memory_key="corte-momento-${i + 1}">
      <h3 class="sf4__nombre" memory_type="text" memory_usage="custom" memory_key="corte-titulo-${i + 1}">${t}</h3>
      <p class="sf4__detalle" memory_type="text" memory_usage="custom" memory_key="corte-det-${i + 1}">${d}</p>
    </div>
  </article>`;
    if (Vv === 2) return `  <article class="sf9__tarjeta">
    <span class="sf9__num" aria-hidden="true">0${i + 1}</span>
    <div memory_type="text" memory_usage="custom" memory_key="corte-momento-${i + 1}">
      <h3 class="sf4__nombre" memory_type="text" memory_usage="custom" memory_key="corte-titulo-${i + 1}">${t}</h3>
      <p class="sf4__detalle" memory_type="text" memory_usage="custom" memory_key="corte-det-${i + 1}">${d}</p>
      <time class="sf4__hora" datetime="${dt}" memory_type="text" memory_usage="custom" memory_key="corte-hora-${i + 1}">${hr}</time>
    </div>
  </article>`;
    return `  <article class="sf9__tarjeta">
    <time datetime="${dt}" memory_type="text" memory_usage="custom" memory_key="corte-hora-${i + 1}">${hr}</time>
    <div memory_type="text" memory_usage="custom" memory_key="corte-momento-${i + 1}">
      <h3 class="sf4__nombre sf9__nombre" memory_type="text" memory_usage="custom" memory_key="corte-titulo-${i + 1}">${t}</h3>
      <p class="sf4__detalle sf9__detalle" memory_type="text" memory_usage="custom" memory_key="corte-det-${i + 1}">${d}</p>
    </div>
  </article>`;
  }).join('\n');
  return `<section class="sf9" data-gemini-id="corte-sf${S.num}" memory_type="background" memory_usage="protected" memory_source="generated" path="placeholder">
<style>
.sf9 { ${V(S)};
  position:relative; isolation:isolate; overflow:hidden; box-sizing:border-box; padding:clamp(3.6rem,9vw,7rem) clamp(1rem,5vw,4rem); background:${S.bg}; background-color:var(--bg-color); color:var(--text-color); }
.sf9 *, .sf9 *::before, .sf9 *::after { box-sizing:border-box; }
.sf9::after { content:''; position:absolute; inset:0; z-index:0; background:color-mix(in srgb, var(--bg-color) 87%, transparent); }
.sf9 > * { position:relative; z-index:1; }
${ORN_CSS}
.sf4__cabecera { text-align:center; margin-bottom:clamp(2.4rem,6vw,3.4rem); }
.sf4__rotulo { margin:0 0 .4rem; font-family:${S.mono}; font-size:clamp(.68rem,1.35vw,.8rem); letter-spacing:.52em; text-transform:uppercase; color:color-mix(in srgb, var(--secondary-color) 42%, var(--text-color)); }
.sf4__titulo { margin:0; font-family:${S.disp}; font-weight:400; font-size:clamp(2rem,5vw,3.2rem); color:var(--primary-color); }
.sf9__lead { margin:.5rem auto 0; max-width:52ch; font-family:${S.body}; font-style:italic; font-size:clamp(.82rem,1.5vw,.94rem); color:color-mix(in srgb, var(--secondary-color) 45%, var(--text-color)); }
.sf4__hora { font-family:${S.mono}; font-size:clamp(.7rem,1.35vw,.84rem); letter-spacing:.28em; text-transform:uppercase; color:color-mix(in srgb, var(--secondary-color) 42%, var(--text-color)); }
.sf4__nombre { margin:.35rem 0 .25rem; font-family:${S.disp}; font-weight:400; font-size:clamp(1.1rem,2.3vw,1.4rem); color:var(--primary-color); }
.sf4__detalle { margin:0; font-family:${S.body}; font-size:clamp(.76rem,1.4vw,.86rem); line-height:1.6; color:var(--text-color); }
${layout}
@media (max-width:640px){ .sf9__tarjeta { transform:none !important; margin-top:0 !important; padding-left:0 !important; } .sf9__escala::before { display:none; } }
@media (prefers-reduced-motion:reduce){ .sf9 * { animation:none !important; transition:none !important; } }
</style>
<header class="sf4__cabecera" memory_type="text" memory_usage="custom" memory_key="corte-intro">
  <p class="sf4__rotulo" memory_type="text" memory_usage="custom" memory_key="corte-rotulo">Momentos clave</p>
  <h2 class="sf4__titulo" memory_type="text" memory_usage="custom" memory_key="corte-encabezado">Corte de la noche</h2>
  <p class="sf9__lead" memory_type="text" memory_usage="custom" memory_key="corte-lead">Los tres momentos que darán vida a la noche</p>
  ${orn(S)}
</header>
${Vv === 0 || Vv === 1 || Vv === 3 ? `<div class="sf9__tira">
${items}
</div>` : `<div class="sf9__escala">
${items}
</div>`}
${meta('corte', 'corte-sf' + S.num, S, 'Corte ' + S.theme + ' variante ' + (Vv + 1) + ' con momentos y ornamento ' + S.motif + '.', ['variante' + (Vv + 1)])}
</section>`;
}

function galeria(S) {
  const Vv = S.num % 6;
  const KW = [S.kw + ',moment', S.kw + ',party', S.kw + ',detail', S.kw + ',smile', S.kw + ',decor', S.kw + ',dance'];
  const grid = Vv === 0
    ? `.sf10__mosaico { display:grid; grid-template-columns:repeat(3,1fr); gap:clamp(.8rem,2.2vw,1.5rem); width:min(100%,920px); margin:0 auto; }
@media (max-width:640px){ .sf10__mosaico { grid-template-columns:repeat(2,1fr); } }
.sf10__obra:nth-child(odd) { transform:rotate(-1.6deg); } .sf10__obra:nth-child(even) { transform:rotate(1.4deg); }
.sf10__obra { padding:7px; background:var(--surface-color); border:1px solid var(--surface-border-color); transition:transform .4s; }
.sf10__obra:hover { transform:rotate(0) scale(1.04); z-index:2; }`
    : Vv === 1
      ? `.sf10__mosaico { display:flex; gap:clamp(1rem,2.6vw,1.7rem); overflow-x:auto; scroll-snap-type:x mandatory; padding:1rem clamp(1rem,4vw,3rem); scrollbar-width:thin; }
.sf10__obra { flex:0 0 auto; width:clamp(200px,26vw,270px); scroll-snap-align:center; border:1px solid var(--surface-border-color); background:var(--surface-color); padding:7px; }
.sf10__obra:nth-child(even) { transform:translateY(16px); }`
      : Vv === 2
        ? `.sf10__mosaico { display:grid; grid-template-columns:repeat(3,1fr); gap:clamp(.7rem,2vw,1.2rem); width:min(100%,900px); margin:0 auto; }
@media (max-width:640px){ .sf10__mosaico { grid-template-columns:repeat(2,1fr); } }
.rcg__obra, .sf10__obra { transform:rotate(var(--ry)); transition:transform .5s cubic-bezier(.16,1,.3,1); }
.sf10__obra:nth-child(3n+1) { --ry:-1.4deg; } .sf10__obra:nth-child(3n+2) { --ry:1.2deg; } .sf10__obra:nth-child(3n) { --ry:-1deg; }
.sf10__obra:hover { transform:rotate(0) translateY(-5px) scale(1.03); z-index:2; }`
        : Vv === 3
        ? `.sf10__mosaico { display:grid; grid-template-columns:repeat(3,1fr); gap:clamp(.5rem,1.6vw,.9rem); width:min(100%,860px); margin:0 auto; }
@media (max-width:640px){ .sf10__mosaico { grid-template-columns:repeat(2,1fr); } }
.sf10__obra { clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%); transition:transform .45s; }
.sf10__obra:hover { transform:scale(1.05); z-index:2; }
.sf10__obra img { aspect-ratio:3/3.4; }`
        : Vv === 4
        ? `.sf10__mosaico { display:grid; grid-template-columns:repeat(3,1fr); gap:clamp(.7rem,2vw,1.2rem); width:min(100%,880px); margin:0 auto; align-items:start; }
@media (max-width:640px){ .sf10__mosaico { grid-template-columns:repeat(2,1fr); } }
.sf10__obra { padding:7px; background:var(--surface-color); border:1px solid var(--surface-border-color); transition:transform .4s; }
.sf10__obra:nth-child(2) { transform:translateY(clamp(1.4rem,4vw,2.6rem)); }
.sf10__obra:nth-child(3) { transform:translateY(clamp(2.8rem,8vw,5.2rem)); }
.sf10__obra:nth-child(5) { transform:translateY(clamp(1.4rem,4vw,2.6rem)); }
.sf10__obra:hover { transform:translateY(-6px) scale(1.03); z-index:2; }
.sf10__obra img { aspect-ratio:4/4.6; }`
        : `.sf10__mosaico { display:grid; grid-template-columns:repeat(3,1fr); gap:clamp(1rem,3vw,1.8rem); width:min(100%,860px); margin:0 auto; }
@media (max-width:640px){ .sf10__mosaico { grid-template-columns:repeat(2,1fr); } }
.sf10__obra { border-radius:50% 50% 10px 10px / 34% 34% 4px 4px; overflow:hidden; outline:1px solid var(--surface-border-color); outline-offset:4px; transition:transform .45s; }
.sf10__obra:hover { transform:translateY(-6px); z-index:2; }
.sf10__obra img { aspect-ratio:3/3.8; }`;
  const imgs = KW.map((k, i) => `  <figure class="sf10__obra"><img src="https://loremflickr.com/600/760/${k}" alt="Recuerdo ${i + 1}" path="placeholder" data-library-category="bodas" data-asset-type="galeria" loading="lazy" /><figcaption hidden>Recuerdo ${i + 1}</figcaption></figure>`).join('\n');
  return `<section class="sf10" data-gemini-id="galeria-sf${S.num}" memory_type="background" memory_usage="protected" memory_source="generated" path="placeholder">
<style>
.sf10 { ${V(S)};
  position:relative; isolation:isolate; overflow:hidden; box-sizing:border-box; padding:clamp(3.6rem,9vw,7rem) clamp(1rem,4vw,3rem); background:${S.bg}; background-color:var(--bg-color); color:var(--text-color); text-align:center; }
.sf10 *, .sf10 *::before, .sf10 *::after { box-sizing:border-box; }
.sf10::after { content:''; position:absolute; inset:0; z-index:0; background:color-mix(in srgb, var(--bg-color) 87%, transparent); }
.sf10 > * { position:relative; z-index:1; }
${ORN_CSS}
.sf10__rotulo { margin:0 0 .4rem; font-family:${S.mono}; font-size:clamp(.68rem,1.35vw,.8rem); letter-spacing:.52em; text-transform:uppercase; color:color-mix(in srgb, var(--secondary-color) 42%, var(--text-color)); }
.sf10__titulo { margin:0 auto clamp(2.2rem,5.5vw,3.2rem); font-family:${S.disp}; font-weight:400; font-size:clamp(2rem,5vw,3.2rem); color:var(--primary-color); }
${grid}
.sf10__obra { margin:0; cursor:zoom-in; }
.sf10__obra img { display:block; width:100%; height:auto; aspect-ratio:3/4; object-fit:cover; }
.sf10__hint { margin:.9rem 0 0; font-family:${S.mono}; font-size:clamp(.66rem,1.25vw,.78rem); letter-spacing:.3em; text-transform:uppercase; color:color-mix(in srgb, var(--secondary-color) 42%, var(--text-color)); animation:sf10-latido 2.4s ease-in-out infinite; }
@keyframes sf10-latido { 50% { opacity:.5; } }
.sf10__lb { position:fixed; inset:0; z-index:9999; display:none; place-items:center; background:color-mix(in srgb, var(--bg-color) 92%, transparent); cursor:zoom-out; }
.sf10__lb.abierto { display:grid; }
.sf10__lb img { max-width:min(92vw,920px); max-height:86vh; border:1px solid var(--primary-color); padding:8px; background:var(--surface-color); }
@media (prefers-reduced-motion:reduce){ .sf10 * { transition:none !important; } .sf10__obra { transform:none !important; } }
</style>
<p class="sf10__rotulo" memory_type="text" memory_usage="custom" memory_key="galeria-rotulo">Galería</p>
<h2 class="sf10__titulo" memory_type="text" memory_usage="custom" memory_key="galeria-titulo">Nuestros recuerdos</h2>
<div class="sf10__mosaico">
${imgs}
</div>
${Vv === 1 ? '<p class="sf10__hint" aria-hidden="true">Desliza para ver más →</p>' : ''}
<div class="sf10__lb" role="dialog" aria-label="Foto ampliada" hidden><img src="" alt="Foto ampliada" /></div>
<script>
  (function () {
    var scope = null;
    try { scope = document.currentScript.closest('[data-gemini-id^="galeria"]'); } catch (e) {}
    if (!scope) scope = document.querySelector('[data-gemini-id^="galeria"]');
    if (!scope) return;
    var lb = scope.querySelector('.sf10__lb');
    if (!lb) return;
    var lbImg = lb.querySelector('img');
    scope.addEventListener('click', function (ev) {
      var obra = ev.target.closest && ev.target.closest('.sf10__obra');
      var img = obra && obra.querySelector('img');
      if (!img) { if (ev.target === lb) { lb.classList.remove('abierto'); lb.hidden = true; } return; }
      lbImg.src = img.currentSrc || img.src;
      lb.hidden = false;
      lb.classList.add('abierto');
    });
  })();
</script>
${meta('galeria', 'galeria-sf' + S.num, S, 'Galería ' + S.theme + ' variante ' + (Vv + 1) + ' con lightbox y marcos ' + S.motif + '.', ['variante' + (Vv + 1)])}
</section>`;
}

function regalos(S) {
  const Vv = S.num % 6;
  const layout = Vv === 0
    ? `.sf11__tarjeta { width:min(100%,600px); margin:0 auto; padding:clamp(2.6rem,6vw,3.6rem) clamp(1.4rem,4vw,2.8rem); background:var(--surface-color); border:1px solid var(--surface-border-color); border-radius:18px; text-align:center; box-shadow:0 26px 52px rgba(0,0,0,.14); }`
    : Vv === 1
      ? `.sf11__tarjeta { width:min(100%,660px); margin:0 auto; display:grid; grid-template-columns:1fr; background:var(--surface-color); border:1px solid var(--surface-border-color); }
@media (min-width:680px){ .sf11__tarjeta { grid-template-columns:1fr 1fr; } }
.sf11__mitad { padding:clamp(1.8rem,4.2vw,2.6rem) clamp(1.3rem,3.2vw,2rem); text-align:left; }
.sf11__mitad:last-child { border-left:2px dashed var(--accent-color); }`
      : Vv === 2
        ? `.sf11__tarjeta { position:relative; width:min(100%,620px); margin:0 auto; padding:clamp(2.8rem,6.5vw,3.8rem) clamp(1.4rem,4vw,3rem) clamp(2rem,4.4vw,2.8rem); background:var(--surface-color); border:1px solid var(--surface-border-color); clip-path:polygon(0 4%, 50% 0, 100% 4%, 100% 96%, 50% 100%, 0 96%); text-align:center; }`
        : Vv === 3
        ? `.sf11__tarjeta { width:min(100%,600px); margin:0 auto; padding:clamp(2.2rem,5.4vw,3rem) clamp(1.4rem,4vw,2.8rem); background:var(--surface-color); border:1px solid var(--surface-border-color); transform:skewX(-6deg); }
.sf11__tarjeta > * { transform:skewX(6deg); }`
        : Vv === 4
        ? `.sf11__tarjeta { position:relative; width:min(100%,560px); margin:0 auto; padding:clamp(2.4rem,5.6vw,3.2rem) clamp(1.6rem,4.4vw,3rem); background:var(--surface-color); text-align:center;
  mask:radial-gradient(circle 12px at 12px 50%, transparent 97%, #000) left / 51% 100% no-repeat, radial-gradient(circle 12px at calc(100% - 12px) 50%, transparent 97%, #000) right / 51% 100% no-repeat;
  filter:drop-shadow(0 18px 36px rgba(0,0,0,.16)); }
.sf11__tarjeta::before { content:'VALE DE REGALO'; display:block; margin:0 0 .6rem; font-family:${S.mono}; font-size:.62rem; letter-spacing:.5em; color:var(--secondary-color); }
.sf11__tarjeta::after { content:''; position:absolute; left:10%; right:10%; bottom:14px; height:1px; background:repeating-linear-gradient(90deg, var(--accent-color) 0 9px, transparent 9px 16px); }`
        : `.sf11__tarjeta { position:relative; width:min(100%,560px); margin:clamp(2.6rem,6vw,3.6rem) auto 0; padding:clamp(2.2rem,5.2vw,3rem) clamp(1.4rem,4vw,2.6rem) clamp(1.8rem,4vw,2.4rem); background:var(--surface-color); border:1px solid var(--surface-border-color); border-radius:14px; text-align:center; transform:rotate(-1.8deg); box-shadow:0 20px 40px rgba(0,0,0,.16); }
.sf11__tarjeta::before { content:''; position:absolute; top:-14px; left:50%; transform:translateX(-50%); width:12px; height:12px; border-radius:50%; border:2px solid var(--primary-color); background:var(--bg-color); }
.sf11__tarjeta::after { content:''; position:absolute; top:-14px; left:50%; width:1.5px; height:34px; background:repeating-linear-gradient(var(--accent-color) 0 5px, transparent 5px 9px); transform:translateX(-50%) rotate(14deg); transform-origin:top center; }
.sf11__tarjeta:hover { transform:rotate(0); }`;
  return `<section class="sf11" data-gemini-id="regalos-sf${S.num}" memory_type="background" memory_usage="protected" memory_source="generated" path="placeholder">
<style>
.sf11 { ${V(S)};
  position:relative; isolation:isolate; overflow:hidden; box-sizing:border-box; padding:clamp(3.8rem,9.5vw,7rem) clamp(1rem,5vw,4rem); background:${S.bg}; background-color:var(--bg-color); color:var(--text-color); }
.sf11 *, .sf11 *::before, .sf11 *::after { box-sizing:border-box; }
.sf11::after { content:''; position:absolute; inset:0; z-index:0; background:color-mix(in srgb, var(--bg-color) 88%, transparent); }
.sf11 > * { position:relative; z-index:1; }
${ORN_CSS}
.sf11__rotulo { margin:0 0 .5rem; font-family:${S.mono}; font-size:clamp(.68rem,1.35vw,.8rem); letter-spacing:.52em; text-transform:uppercase; color:color-mix(in srgb, var(--secondary-color) 42%, var(--text-color)); }
.sf11__titulo { margin:0 0 .6rem; font-family:${S.disp}; font-weight:400; font-size:clamp(1.9rem,4.6vw,2.8rem); color:var(--primary-color); }
.sf11__texto { margin:0 auto 1.5rem; max-width:44ch; font-family:${S.body}; font-size:clamp(.86rem,1.6vw,.98rem); line-height:1.8; color:var(--text-color); }
.sf11__datos { display:grid; grid-template-columns:1fr; gap:.9rem; max-width:420px; margin:0 auto; }
@media (min-width:560px){ .sf11__datos { grid-template-columns:1fr 1fr; } }
.sf11__dato { padding:1rem .8rem; border:1px solid var(--surface-border-color); border-radius:12px; }
.sf11__dato b { display:block; margin-bottom:.3rem; font-family:${S.mono}; font-weight:400; font-size:clamp(.64rem,1.15vw,.74rem); letter-spacing:.26em; text-transform:uppercase; color:color-mix(in srgb, var(--secondary-color) 42%, var(--text-color)); }
.sf11__dato a, .sf11__dato span { font-family:${S.mono}; font-size:clamp(.68rem,1.3vw,.8rem); letter-spacing:.1em; color:var(--text-color); text-decoration:none; }
.sf11__dato a { border-bottom:1px dashed var(--primary-color); padding-bottom:.15rem; }
.sf11__dato a:hover { color:var(--primary-color); }
.sf11__btn { display:inline-flex; align-items:center; justify-content:center; min-height:48px; margin-top:1.5rem; padding:.95rem 2.2rem; font-family:${S.mono}; font-size:clamp(.64rem,1.25vw,.78rem); letter-spacing:.32em; text-transform:uppercase; text-decoration:none; color:var(--bg-color); background:var(--primary-color); transition:transform .35s ease; }
.sf11__btn:hover { transform:translateY(-2px); }
${layout}
@media (max-width:560px){ .sf11__tarjeta { transform:none !important; } .sf11__tarjeta > * { transform:none !important; } }
</style>
${Vv === 1 ? `<div class="sf11__tarjeta">
  <div class="sf11__mitad" memory_type="text" memory_usage="custom" memory_key="regalos-intro">
    <p class="sf11__rotulo" memory_type="text" memory_usage="custom" memory_key="regalos-rotulo">Lluvia de sobres</p>
    <h2 class="sf11__titulo" memory_type="text" memory_usage="custom" memory_key="regalos-titulo">Mesa de regalos</h2>
    <p class="sf11__texto" memory_type="text" memory_usage="custom" memory_key="regalos-texto">Tu presencia es lo más valioso; si quieres tener un detalle, aquí van ideas.</p>
  </div>
  <div class="sf11__mitad" memory_type="text" memory_usage="custom" memory_key="regalos-datos">
    <a class="sf11__dato" href="https://mesaderegalos.com/ejemplo" target="_blank" rel="noopener" memory_type="text" memory_usage="custom" memory_key="regalos-link" style="display:block; margin-bottom:.8rem;">mesaderegalos.com</a>
    <span class="sf11__dato" memory_type="text" memory_usage="custom" memory_key="regalos-clabe" style="display:block;">CLABE 0000 0000 0000</span>
    <a class="sf11__btn" href="https://wa.me/5210000000000" target="_blank" rel="noopener" memory_type="text" memory_usage="custom" memory_key="regalos-boton">WhatsApp</a>
  </div>
</div>` : `<div class="sf11__tarjeta">
  <p class="sf11__rotulo" memory_type="text" memory_usage="custom" memory_key="regalos-rotulo">Lluvia de sobres</p>
  <h2 class="sf11__titulo" memory_type="text" memory_usage="custom" memory_key="regalos-titulo">Mesa de regalos</h2>
  <p class="sf11__texto" memory_type="text" memory_usage="custom" memory_key="regalos-texto">Tu presencia es lo más valioso; si quieres tener un detalle, aquí van ideas.</p>
  <div class="sf11__datos" memory_type="text" memory_usage="custom" memory_key="regalos-datos">
    <div class="sf11__dato"><b>Mesa en línea</b><a href="https://mesaderegalos.com/ejemplo" target="_blank" rel="noopener" memory_type="text" memory_usage="custom" memory_key="regalos-link">mesaderegalos.com</a></div>
    <div class="sf11__dato"><b>Sobre digital</b><span memory_type="text" memory_usage="custom" memory_key="regalos-clabe">CLABE 0000 0000 0000</span></div>
  </div>
  <a class="sf11__btn" href="https://wa.me/5210000000000" target="_blank" rel="noopener" memory_type="text" memory_usage="custom" memory_key="regalos-boton">Escríbenos</a>
</div>`}
${meta('regalos', 'regalos-sf' + S.num, S, 'Mesa de regalos ' + S.theme + ' variante ' + (Vv + 1) + '.', ['variante' + (Vv + 1)])}
</section>`;
}

function vestimenta(S) {
  const Vv = S.num % 6;
  const layout = Vv === 0
    ? `.sf12__tarjeta { width:min(100%,600px); margin:0 auto; padding:clamp(2.4rem,6vw,3.4rem) clamp(1.4rem,4vw,2.8rem); background:var(--surface-color); border:1px solid var(--surface-border-color); border-radius:22px; text-align:center; }
.sf12__paleta { display:flex; justify-content:center; gap:.8rem; margin:1.4rem 0; }
.sf12__muestra { width:56px; height:56px; border-radius:50%; border:1px solid var(--accent-color); box-shadow:0 4px 12px color-mix(in srgb, var(--text-color) 18%, transparent); }`
    : Vv === 1
      ? `.sf12__tarjeta { width:min(100%,640px); margin:0 auto; padding:clamp(2.4rem,6vw,3.4rem) clamp(1.4rem,4vw,2.8rem); background:var(--surface-color); border:1px solid var(--surface-border-color); }
.sf12__paleta { display:flex; flex-direction:column; gap:.55rem; max-width:380px; margin:1.4rem auto 1.6rem; }
.sf12__muestra { height:38px; transform:skewX(-14deg); border:1px solid var(--accent-color); }
.sf12__muestra:nth-child(even) { transform:skewX(14deg); }`
      : Vv === 2
        ? `.sf12__cuerda { position:relative; height:clamp(190px,28vw,240px); width:min(100%,820px); margin:0 auto 1.6rem; }
.rcv__etiqueta { position:absolute; top:22px; width:clamp(104px,13vw,132px); background:var(--surface-color); border:1px solid var(--surface-border-color); border-radius:10px; padding:22px 8px 10px; text-align:center; transform-origin:top center; animation:sf-columpio 5s ease-in-out infinite; box-shadow:0 14px 28px rgba(0,0,0,.18); }
.rcv__etiqueta::before { content:''; position:absolute; top:7px; left:50%; transform:translateX(-50%); width:10px; height:10px; border-radius:50%; border:2px solid var(--primary-color); }
.rcv__etiqueta:nth-child(1){ left:3%; --sw:-3deg; } .rcv__etiqueta:nth-child(2){ left:23%; --sw:2.6deg; animation-delay:.4s; }
.rcv__etiqueta:nth-child(3){ left:43%; --sw:-2.2deg; animation-delay:.8s; } .rcv__etiqueta:nth-child(4){ left:63%; --sw:3.2deg; animation-delay:.2s; }
.rcv__etiqueta:nth-child(5){ left:83%; --sw:-3deg; animation-delay:.6s; }
.rcv__etiqueta i { display:block; width:100%; height:clamp(56px,8vw,74px); border-radius:8px; }
.rcv__etiqueta.rcv__prohibida i { position:relative; }
.rcv__etiqueta.rcv__prohibida i::after { content:'✕'; position:absolute; inset:0; display:grid; place-items:center; font-size:1.15rem; color:color-mix(in srgb, var(--surface-color) 85%, var(--text-color)); text-shadow:0 1px 6px color-mix(in srgb, var(--text-color) 45%, transparent); }
@keyframes sf-columpio { 0%,100% { transform:rotate(var(--sw)); } 50% { transform:rotate(calc(var(--sw) * -.5)); } }`
        : Vv === 3
        ? `.sf12__tarjeta { width:min(100%,880px); margin:0 auto; display:grid; grid-template-columns:1fr; background:var(--surface-color); border:1px solid var(--surface-border-color); }
@media (min-width:760px){ .sf12__tarjeta { grid-template-columns:5fr 6fr; } }
.sf12__foto { margin:0; }
.sf12__foto img { display:block; width:100%; height:100%; min-height:280px; object-fit:cover; }
.sf12__info { padding:clamp(1.8rem,4.4vw,2.8rem) clamp(1.3rem,3.4vw,2.2rem); display:grid; align-content:center; }`
        : Vv === 4
        ? `.sf12__tarjeta { width:min(100%,620px); margin:0 auto; padding:clamp(2.4rem,6vw,3.4rem) clamp(1.4rem,4vw,2.8rem); background:var(--surface-color); border:1px solid var(--surface-border-color); border-radius:18px; text-align:center; }
.sf12__paleta { display:flex; justify-content:center; gap:0; margin:clamp(2.2rem,5vw,3rem) 0 1.8rem; }
.sf12__muestra { width:60px; height:92px; border-radius:8px 8px 50% 50%/8px 8px 22% 22%; border:1px solid var(--accent-color); transform-origin:50% 120%; transform:rotate(calc((var(--i) - 2.5) * 11deg)); margin:0 -7px; box-shadow:0 8px 18px rgba(0,0,0,.14); transition:transform .4s cubic-bezier(.16,1,.3,1); }
.sf12__muestra:hover { transform:rotate(calc((var(--i) - 2.5) * 11deg)) translateY(-10px); z-index:2; }`
        : `.sf12__tarjeta { width:min(100%,720px); margin:0 auto; display:grid; grid-template-columns:1fr; background:var(--surface-color); border:1px solid var(--surface-border-color); overflow:hidden; }
.sf12__foto { margin:0; border-bottom:6px double var(--primary-color); }
.sf12__foto img { display:block; width:100%; height:100%; min-height:240px; max-height:300px; object-fit:cover; }
.sf12__info { padding:clamp(1.8rem,4.4vw,2.6rem) clamp(1.4rem,3.6vw,2.4rem); display:grid; align-content:center; justify-items:center; text-align:center; }
@media (min-width:760px){ .sf12__tarjeta { grid-template-columns:6fr 5fr; } .sf12__foto { border-bottom:none; border-right:6px double var(--primary-color); } }`;
  const paleta = `<div class="sf12__paleta" aria-label="Paleta sugerida">
    <span class="sf12__muestra" style="background:var(--primary-color); --i:1;"></span>
    <span class="sf12__muestra" style="background:var(--secondary-color); --i:2;"></span>
    <span class="sf12__muestra" data-prohibida="true" style="background:var(--accent-color); --i:3;"></span>
    <span class="sf12__muestra" style="background:var(--text-color); --i:4;"></span>
  </div>`;
  return `<section class="sf12" data-gemini-id="vestimenta-sf${S.num}" memory_type="background" memory_usage="protected" memory_source="generated" path="placeholder">
<style>
.sf12 { ${V(S)};
  position:relative; isolation:isolate; overflow:hidden; box-sizing:border-box; padding:clamp(3.8rem,9.5vw,7rem) clamp(1rem,5vw,4rem); background:${S.bg}; background-color:var(--bg-color); color:var(--text-color); }
.sf12 *, .sf12 *::before, .sf12 *::after { box-sizing:border-box; }
.sf12::after { content:''; position:absolute; inset:0; z-index:0; background:color-mix(in srgb, var(--bg-color) 88%, transparent); }
.sf12 > * { position:relative; z-index:1; }
${ORN_CSS}
.sf12__cabecera { text-align:center; margin-bottom:clamp(2rem,5vw,2.8rem); }
.sf12__rotulo { margin:0 0 .4rem; font-family:${S.mono}; font-size:clamp(.68rem,1.35vw,.8rem); letter-spacing:.52em; text-transform:uppercase; color:color-mix(in srgb, var(--secondary-color) 42%, var(--text-color)); }
.sf12__titulo { margin:0; font-family:${S.disp}; font-weight:400; font-size:clamp(2rem,5vw,3.2rem); color:var(--primary-color); }
.sf12__texto { margin:.7rem auto 0; max-width:46ch; text-align:center; font-family:${S.body}; font-size:clamp(.86rem,1.6vw,.98rem); line-height:1.8; color:var(--text-color); }
.sf12__nota { margin:1.4rem 0 0; font-family:${S.mono}; font-size:clamp(.6rem,1.15vw,.72rem); letter-spacing:.3em; text-transform:uppercase; color:var(--secondary-color); }
.sf12__lista { list-style:none; margin:1.2rem auto 0; padding:0; display:flex; flex-wrap:wrap; justify-content:center; gap:.6rem 1.8rem; }
.sf12__lista li { font-family:${S.body}; font-style:italic; font-size:clamp(.82rem,1.5vw,.94rem); color:var(--text-color); }
.sf12__lista li::before { content:'—'; color:var(--accent-color); margin-right:.45rem; font-style:normal; }
.sf12__muestra[data-prohibida]::after { content:'✕'; position:absolute; inset:0; display:grid; place-items:center; color:color-mix(in srgb, var(--surface-color) 88%, var(--text-color)); font-size:1.25rem; text-shadow:0 1px 8px color-mix(in srgb, var(--text-color) 55%, transparent); }
.sf12__muestra { position:relative; }
${layout}
@media (max-width:640px){ .sf12__cuerda { height:auto; padding-top:20px; display:grid; grid-template-columns:repeat(2,1fr); gap:2rem 1rem; justify-items:center; } .rcv__etiqueta { position:static; animation:none !important; transform:rotate(var(--sw)); } }
@media (prefers-reduced-motion:reduce){ .sf12 * { animation:none !important; } .rcv__etiqueta { transform:rotate(var(--sw)); } }
</style>
<header class="sf12__cabecera" memory_type="text" memory_usage="custom" memory_key="vestimenta-intro">
  <p class="sf12__rotulo" memory_type="text" memory_usage="custom" memory_key="vestimenta-rotulo">Código de vestimenta</p>
  <h2 class="sf12__titulo" memory_type="text" memory_usage="custom" memory_key="vestimenta-codigo">Formal</h2>
  <p class="sf12__texto" memory_type="text" memory_usage="custom" memory_key="vestimenta-texto">Paleta ${S.theme}; el color acento queda reservado de los anfitriones.</p>
</header>
${Vv === 0 ? `<div class="sf12__tarjeta">${paleta}
  <p class="sf12__nota" memory_type="text" memory_usage="custom" memory_key="vestimenta-nota">El color tachado es de los anfitriones</p>
  <ul class="sf12__lista" memory_type="text" memory_usage="custom" memory_key="vestimenta-tips">
    <li>Vestido formal</li><li>Traje oscuro</li><li>Accesorios discretos</li>
  </ul>
</div>` : Vv === 1 ? `<div class="sf12__tarjeta">${paleta}
  <p class="sf12__nota" memory_type="text" memory_usage="custom" memory_key="vestimenta-nota">El color tachado es de los anfitriones</p>
  <ul class="sf12__lista" memory_type="text" memory_usage="custom" memory_key="vestimenta-tips">
    <li>Vestido largo</li><li>Traje y camisa</li><li>Zapato formal</li>
  </ul>
</div>` : Vv === 2 ? `<div class="sf12__cuerda" aria-label="Paleta colgante">
  <span class="rcv__etiqueta"><i style="background:var(--primary-color);"></i></span>
  <span class="rcv__etiqueta"><i style="background:var(--secondary-color);"></i></span>
  <span class="rcv__etiqueta rcv__prohibida"><i style="background:var(--accent-color);"></i></span>
  <span class="rcv__etiqueta"><i style="background:var(--text-color);"></i></span>
  <span class="rcv__etiqueta"><i style="background:color-mix(in srgb, var(--secondary-color) 50%, #fff);"></i></span>
</div>
<p class="sf12__nota" style="text-align:center;" memory_type="text" memory_usage="custom" memory_key="vestimenta-nota">El color tachado es de los anfitriones</p>
<ul class="sf12__lista" memory_type="text" memory_usage="custom" memory_key="vestimenta-tips">
  <li>Vestido fluido</li><li>Traje claro</li><li>Calzado cómodo</li>
</ul>` : Vv === 4 ? `<div class="sf12__tarjeta">${paleta}
  <p class="sf12__nota" memory_type="text" memory_usage="custom" memory_key="vestimenta-nota">El color tachado es de los anfitriones</p>
  <ul class="sf12__lista" memory_type="text" memory_usage="custom" memory_key="vestimenta-tips">
    <li>Vestido de gala</li><li>Esmoquin</li><li>Toque de color</li>
  </ul>
</div>` : `<div class="sf12__tarjeta">
  <figure class="sf12__foto" memory_type="image" memory_usage="custom" memory_source="library">
    <img src="https://loremflickr.com/700/860/${S.kw},fabric" alt="Inspiración de vestimenta" path="placeholder" data-library-category="bodas" data-asset-type="vestimenta" loading="lazy" />
    <figcaption hidden>Inspiración</figcaption>
  </figure>
  <div class="sf12__info">${paleta}
    <p class="sf12__nota" style="text-align:left;" memory_type="text" memory_usage="custom" memory_key="vestimenta-nota">El color tachado es de los anfitriones</p>
    <ul class="sf12__lista" memory_type="text" memory_usage="custom" memory_key="vestimenta-tips" style="justify-content:flex-start;">
      <li>Tejidos naturales</li><li>Paleta tierra</li><li>Discreto y elegante</li>
    </ul>
  </div>
</div>`}
${meta('vestimenta', 'vestimenta-sf' + S.num, S, 'Vestimenta ' + S.theme + ' variante ' + (Vv + 1) + ' con paleta y color reservado tachado.', ['variante' + (Vv + 1)])}
</section>`;
}

module.exports = { corte, galeria, regalos, vestimenta };
