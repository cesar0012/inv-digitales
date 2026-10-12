/* Plantillas B: confirmacion, detalles, countdown, padrinos — variantes por estilo. */
const { meta, orn, ORN_CSS, V } = require('./tpl-a.cjs');

function confirmacion(S) {
  const Vv = S.num % 4;
  const layout = Vv === 0
    ? `.sf5__panel { width:min(100%,580px); margin:0 auto; padding:clamp(2.6rem,6vw,3.8rem) clamp(1.4rem,4vw,2.8rem); background:var(--surface-color); border:1px solid var(--surface-border-color); border-radius:22px; box-shadow:0 26px 54px rgba(0,0,0,.14); text-align:center; }
.sf5__sello { position:absolute; top:-28px; left:50%; transform:translateX(-50%) rotate(-7deg); padding:.55rem 1.4rem; background:var(--primary-color); color:var(--bg-color); font-family:'Courier New',monospace; font-size:.66rem; letter-spacing:.34em; text-transform:uppercase; }`
    : Vv === 1
      ? `.sf5__panel { width:min(100%,760px); margin:0 auto; display:grid; grid-template-columns:1fr; background:var(--surface-color); border:1px solid var(--surface-border-color); overflow:hidden; }
@media (min-width:720px){ .sf5__panel { grid-template-columns:1fr 1fr; } }
.sf5__mitad { padding:clamp(2rem,4.6vw,3rem) clamp(1.3rem,3.4vw,2.2rem); text-align:center; }
.sf5__mitad:last-child { background:color-mix(in srgb, var(--accent-color) 22%, var(--surface-color)); }`
      : Vv === 2
        ? `.sf5__panel { position:relative; width:min(100%,520px); margin:0 auto; padding:clamp(3rem,7vw,4rem) clamp(1.4rem,4vw,2.8rem) clamp(2rem,4.6vw,2.6rem); background:var(--surface-color); border:1px solid var(--surface-border-color); border-radius:50% 50% 24px 24px; text-align:center; }`
        : `.sf5__cintas { width:min(100%,640px); margin:0 auto; }
.sf5__cinta { padding:clamp(1rem,2.6vw,1.4rem) clamp(1.2rem,3.4vw,2rem); transform:skewX(-9deg); margin-bottom:.9rem; }
.sf5__cinta > * { transform:skewX(9deg); }
.sf5__cinta--a { background:var(--primary-color); color:var(--bg-color); text-align:left; }
.sf5__cinta--b { background:var(--surface-color); border:1px solid var(--surface-border-color); text-align:center; }
.sf5__cinta--c { background:var(--surface-color); border:1px solid var(--surface-border-color); text-align:right; }
.sf5__cintas .sf5__acciones { transform:none; }`;
  const texto = `<h2 class="sf5__titulo" memory_type="text" memory_usage="custom" memory_key="confirmacion-titulo">¿Cuentas con nosotros?</h2>
    <p class="sf5__texto" memory_type="text" memory_usage="custom" memory_key="confirmacion-texto">Tu presencia es lo más importante. Confirma tu asistencia antes de la fecha límite.</p>`;
  return `<section class="sf5" data-gemini-id="confirmacion-texto" memory_type="background" memory_usage="protected" memory_source="generated" path="placeholder">
<style>
.sf5 { ${V(S)};
  position:relative; isolation:isolate; overflow:hidden; box-sizing:border-box; padding:clamp(4rem,10vw,7rem) clamp(1rem,5vw,4rem); background:${S.bg}; background-color:var(--bg-color); color:var(--text-color); }
.sf5 *, .sf5 *::before, .sf5 *::after { box-sizing:border-box; }
.sf5::after { content:''; position:absolute; inset:0; z-index:0; background:color-mix(in srgb, var(--bg-color) 76%, transparent); }
.sf5 > * { position:relative; z-index:1; }
${ORN_CSS}
.sf5__titulo { margin:0 0 .5rem; font-family:${S.disp}; font-weight:400; font-size:clamp(1.7rem,4vw,2.4rem); color:var(--primary-color); }
.sf5__texto { margin:0 auto 1.6rem; max-width:42ch; font-family:${S.body}; font-size:clamp(.86rem,1.6vw,.98rem); line-height:1.8; color:var(--text-color); }
.sf5__acciones { display:flex; flex-wrap:wrap; gap:.9rem; justify-content:center; margin-top:1.4rem; }
.sf5__btn { display:inline-block; padding:.95rem 2.1rem; font-family:'Courier New',monospace; font-size:clamp(.64rem,1.25vw,.78rem); letter-spacing:.3em; text-transform:uppercase; text-decoration:none; transition:transform .35s ease; }
.sf5__btn--si { color:var(--bg-color); background:var(--primary-color); border:1px solid var(--primary-color); }
.sf5__btn--si:hover { transform:translateY(-3px); }
.sf5__btn--no { color:var(--text-color); border:1px solid var(--surface-border-color); }
.sf5__btn--no:hover { transform:translateY(-3px); }
.sf5__limite { margin:1.4rem 0 0; font-family:'Courier New',monospace; font-size:clamp(.58rem,1.1vw,.68rem); letter-spacing:.3em; text-transform:uppercase; color:var(--secondary-color); }
${layout}
@media (max-width:640px){ .sf5__cinta { transform:none !important; text-align:center !important; } }
</style>
${Vv === 0 ? `<div class="sf5__panel"><span class="sf5__sello" memory_type="text" memory_usage="custom" memory_key="confirmacion-sello">Confirma</span>${texto}
  <div class="sf5__acciones" memory_type="text" memory_usage="custom" memory_key="confirmacion-acciones">
    <a class="sf5__btn sf5__btn--si" href="https://wa.me/5210000000000?text=%C2%A1Confirmo!" target="_blank" rel="noopener">Ahí estaré</a>
    <a class="sf5__btn sf5__btn--no" href="https://wa.me/5210000000000?text=No%20podr%C3%A9" target="_blank" rel="noopener">No podré ir</a>
  </div>
  <p class="sf5__limite" memory_type="text" memory_usage="custom" memory_key="confirmacion-fecha-limite">Confirma antes del 1 de junio</p>
</div>` : Vv === 1 ? `<div class="sf5__panel">
  <div class="sf5__mitad">${texto}</div>
  <div class="sf5__mitad">
    <div class="sf5__acciones" memory_type="text" memory_usage="custom" memory_key="confirmacion-acciones" style="margin-top:0;">
      <a class="sf5__btn sf5__btn--si" href="https://wa.me/5210000000000?text=%C2%A1Confirmo!" target="_blank" rel="noopener">Ahí estaré</a>
      <a class="sf5__btn sf5__btn--no" href="https://wa.me/5210000000000?text=No%20podr%C3%A9" target="_blank" rel="noopener">No podré ir</a>
    </div>
    <p class="sf5__limite" memory_type="text" memory_usage="custom" memory_key="confirmacion-fecha-limite">Antes del 1 de junio</p>
  </div>
</div>` : Vv === 2 ? `<div class="sf5__panel">${texto}
  <div class="sf5__acciones" memory_type="text" memory_usage="custom" memory_key="confirmacion-acciones">
    <a class="sf5__btn sf5__btn--si" href="https://wa.me/5210000000000?text=%C2%A1Confirmo!" target="_blank" rel="noopener">Ahí estaré</a>
    <a class="sf5__btn sf5__btn--no" href="https://wa.me/5210000000000?text=No%20podr%C3%A9" target="_blank" rel="noopener">No podré ir</a>
  </div>
  <p class="sf5__limite" memory_type="text" memory_usage="custom" memory_key="confirmacion-fecha-limite">Antes del 1 de junio</p>
</div>` : `<div class="sf5__cintas">
  <div class="sf5__cinta sf5__cinta--a" memory_type="text" memory_usage="custom" memory_key="confirmacion-titulo"><h2 class="sf5__titulo" style="margin:0; color:inherit;">¿Cuentas con nosotros?</h2></div>
  <div class="sf5__cinta sf5__cinta--b" memory_type="text" memory_usage="custom" memory_key="confirmacion-texto"><p class="sf5__texto" style="margin:0;">Confirma tu asistencia antes de la fecha límite.</p></div>
  <div class="sf5__cinta sf5__cinta--c">
    <div class="sf5__acciones" memory_type="text" memory_usage="custom" memory_key="confirmacion-acciones" style="margin-top:0; justify-content:flex-end;">
      <a class="sf5__btn sf5__btn--si" href="https://wa.me/5210000000000?text=%C2%A1Confirmo!" target="_blank" rel="noopener">Ahí estaré</a>
      <a class="sf5__btn sf5__btn--no" href="https://wa.me/5210000000000?text=No%20podr%C3%A9" target="_blank" rel="noopener">No podré</a>
    </div>
  </div>
</div>`}
${meta('confirmacion', 'confirmacion-sf' + S.num, S, 'Confirmación ' + S.theme + ' variante ' + (Vv + 1) + ' con botones WhatsApp y ornamento ' + S.motif + '.', ['variante' + (Vv + 1)])}
</section>`;
}

function detalles(S) {
  const Vv = S.num % 4;
  const layout = Vv === 0
    ? `.sf6__par { display:grid; grid-template-columns:1fr; gap:clamp(1.6rem,4vw,2.6rem); width:min(100%,940px); margin:0 auto; }
@media (min-width:820px){ .sf6__par { grid-template-columns:1fr 1fr; } }
.sf6__panel { padding:clamp(2rem,4.4vw,2.8rem) clamp(1.4rem,3.6vw,2.4rem); background:var(--surface-color); border:1px solid var(--surface-border-color); border-radius:20px; text-align:center; }
.sf6__panel:first-child { transform:rotate(-1.4deg); } .sf6__panel:last-child { transform:rotate(1.2deg); }`
    : Vv === 1
      ? `.sf6__panel { width:min(100%,860px); margin:0 auto; padding:clamp(2rem,4.6vw,3rem) clamp(1.4rem,4vw,2.8rem); background:var(--surface-color); border:1px solid var(--surface-border-color); }
.sf6__rejilla { display:grid; grid-template-columns:1fr; gap:clamp(1.4rem,3.6vw,2.2rem); margin-top:1.4rem; }
@media (min-width:720px){ .sf6__rejilla { grid-template-columns:1fr 1fr; } }`
      : Vv === 2
        ? `.sf6__editorial { width:min(100%,720px); margin:0 auto; }
.sf6__fila { display:grid; grid-template-columns:auto minmax(0,1fr); gap:clamp(1rem,3vw,1.8rem); align-items:start; padding:clamp(1rem,2.6vw,1.5rem) 0; border-bottom:1px solid var(--surface-border-color); }
.sf6__fila > div { min-width:0; overflow-wrap:anywhere; }
.sf6__fila:first-child { border-top:1px solid var(--surface-border-color); }
.sf6__num { font-family:Georgia,serif; font-style:italic; font-size:clamp(1.8rem,4vw,2.6rem); color:var(--accent-color); line-height:1; }`
        : `.sf6__par { display:grid; grid-template-columns:1fr; gap:clamp(1.6rem,4vw,2.6rem); width:min(100%,900px); margin:0 auto; align-items:center; }
@media (min-width:820px){ .sf6__par { grid-template-columns:5fr 6fr; } }
.sf6__circular { margin:0 auto; width:min(100%,280px); aspect-ratio:1/1; border-radius:50%; overflow:hidden; border:2px solid var(--accent-color); }
.sf6__circular img { display:block; width:100%; height:100%; object-fit:cover; }`;
  const foto = `<figure ${Vv === 3 ? 'class="sf6__circular"' : 'class="sf6__foto" style="margin:0 auto 1.2rem; width:min(100%,300px); border-radius:14px; overflow:hidden; border:1px solid var(--surface-border-color);"'} memory_type="image" memory_usage="custom" memory_source="library">
        <img src="https://loremflickr.com/800/${Vv === 3 ? '800' : '500'}/${S.kw},dress" alt="Inspiración de vestimenta" path="placeholder" data-library-category="bodas" data-asset-type="vestimenta" loading="lazy" />
        <figcaption hidden>Inspiración</figcaption>
      </figure>`;
  return `<section class="sf6" data-gemini-id="detalles-vestimenta" memory_type="background" memory_usage="protected" memory_source="generated" path="placeholder">
<style>
.sf6 { ${V(S)};
  position:relative; isolation:isolate; overflow:hidden; box-sizing:border-box; padding:clamp(3.6rem,9vw,6.8rem) clamp(1rem,5vw,4rem); background:${S.bg}; background-color:var(--bg-color); color:var(--text-color); }
.sf6 *, .sf6 *::before, .sf6 *::after { box-sizing:border-box; }
.sf6::after { content:''; position:absolute; inset:0; z-index:0; background:color-mix(in srgb, var(--bg-color) 74%, transparent); }
.sf6 > * { position:relative; z-index:1; }
${ORN_CSS}
.sf6__cabecera { text-align:center; margin-bottom:clamp(2.2rem,5.5vw,3.2rem); }
.sf6__rotulo { margin:0 0 .4rem; font-family:'Courier New',monospace; font-size:clamp(.6rem,1.2vw,.72rem); letter-spacing:.6em; text-transform:uppercase; color:var(--secondary-color); }
.sf6__titulo { margin:0; font-family:${S.disp}; font-weight:400; font-size:clamp(2rem,5vw,3.2rem); color:var(--primary-color); }
.sf6__rotulito { margin:0 0 .4rem; font-family:'Courier New',monospace; font-size:clamp(.54rem,1.02vw,.64rem); letter-spacing:.46em; text-transform:uppercase; color:var(--secondary-color); }
.sf6__subtitulo { margin:0 0 .8rem; font-family:${S.disp}; font-weight:400; font-size:clamp(1.22rem,2.6vw,1.56rem); color:var(--primary-color); }
.sf6__texto { margin:0 auto 1rem; max-width:38ch; font-family:${S.body}; font-size:clamp(.82rem,1.5vw,.92rem); line-height:1.75; color:var(--text-color); }
.sf6__paleta { display:flex; justify-content:center; gap:.7rem; margin:.3rem 0 1rem; }
.sf6__muestra { width:38px; height:38px; border-radius:${Vv === 3 ? '50%' : Vv === 1 ? '10px' : '62% 38% 55% 45% / 55% 48% 52% 45%'}; border:1px solid var(--accent-color); }
.sf6__dato { display:inline-block; margin:.3rem auto 0; font-family:'Courier New',monospace; font-size:clamp(.68rem,1.3vw,.8rem); letter-spacing:.12em; color:var(--text-color); text-decoration:none; border-bottom:1px dashed var(--accent-color); padding-bottom:.2rem; }
.sf6__dato:hover { color:var(--primary-color); }
${layout}
@media (max-width:820px){ .sf6__panel { transform:none !important; } }
</style>
<header class="sf6__cabecera" memory_type="text" memory_usage="custom" memory_key="detalles-intro">
  <p class="sf6__rotulo" memory_type="text" memory_usage="custom" memory_key="detalles-rotulo">Vestimenta y regalos</p>
  <h2 class="sf6__titulo" memory_type="text" memory_usage="custom" memory_key="detalles-titulo">Detalles</h2>
  ${orn(S)}
</header>
${Vv === 0 ? `<div class="sf6__par">
  <article class="sf6__panel">${foto}
    <p class="sf6__rotulito" memory_type="text" memory_usage="custom" memory_key="detalles-rotulo">Código de vestimenta</p>
    <h3 class="sf6__subtitulo" memory_type="text" memory_usage="custom" memory_key="detalles-vestimenta">Formal</h3>
    <p class="sf6__texto" memory_type="text" memory_usage="custom" memory_key="detalles-texto">Paleta ${S.theme}; el blanco queda reservado de los anfitriones.</p>
    <div class="sf6__paleta"><span class="sf6__muestra" style="background:var(--primary-color);"></span><span class="sf6__muestra" style="background:var(--secondary-color);"></span><span class="sf6__muestra" style="background:var(--accent-color);"></span><span class="sf6__muestra" style="background:var(--text-color);"></span></div>
  </article>
  <article class="sf6__panel">
    <p class="sf6__rotulito" memory_type="text" memory_usage="custom" memory_key="detalles-regalo-rotulo">Mesa de regalos</p>
    <h3 class="sf6__subtitulo" memory_type="text" memory_usage="custom" memory_key="detalles-regalo-titulo">Tu presencia, nuestro regalo</h3>
    <p class="sf6__texto" memory_type="text" memory_usage="custom" memory_key="detalles-regalo-texto">Si deseas tener un detalle, aquí van algunas ideas.</p>
    <a class="sf6__dato" href="https://mesaderegalos.com/ejemplo" target="_blank" rel="noopener" memory_type="text" memory_usage="custom" memory_key="detalles-regalo-link">mesaderegalos.com</a><br />
    <span class="sf6__dato" memory_type="text" memory_usage="custom" memory_key="detalles-regalo-dato">CLABE: 0000 0000 0000</span>
  </article>
</div>` : Vv === 1 ? `<div class="sf6__panel">
  ${foto}
  <div class="sf6__rejilla">
    <div memory_type="text" memory_usage="custom" memory_key="detalles-bloque-1">
      <p class="sf6__rotulito" memory_type="text" memory_usage="custom" memory_key="detalles-rotulo">Código de vestimenta</p>
      <h3 class="sf6__subtitulo" memory_type="text" memory_usage="custom" memory_key="detalles-vestimenta">Formal</h3>
      <div class="sf6__paleta"><span class="sf6__muestra" style="background:var(--primary-color);"></span><span class="sf6__muestra" style="background:var(--secondary-color);"></span><span class="sf6__muestra" style="background:var(--accent-color);"></span></div>
    </div>
    <div memory_type="text" memory_usage="custom" memory_key="detalles-bloque-2">
      <p class="sf6__rotulito" memory_type="text" memory_usage="custom" memory_key="detalles-regalo-rotulo">Mesa de regalos</p>
      <h3 class="sf6__subtitulo" memory_type="text" memory_usage="custom" memory_key="detalles-regalo-titulo">Ideas</h3>
      <a class="sf6__dato" href="https://mesaderegalos.com/ejemplo" target="_blank" rel="noopener" memory_type="text" memory_usage="custom" memory_key="detalles-regalo-link">mesaderegalos.com</a><br />
      <span class="sf6__dato" memory_type="text" memory_usage="custom" memory_key="detalles-regalo-dato">CLABE: 0000 0000 0000</span>
    </div>
  </div>
</div>` : Vv === 2 ? `<div class="sf6__editorial">
  <div class="sf6__fila">
    <span class="sf6__num" aria-hidden="true">a.</span>
    <div memory_type="text" memory_usage="custom" memory_key="detalles-bloque-1">
      <h3 class="sf6__subtitulo" memory_type="text" memory_usage="custom" memory_key="detalles-vestimenta">Formal</h3>
      <p class="sf6__texto" memory_type="text" memory_usage="custom" memory_key="detalles-texto">Tonos ${S.theme}; blanco reservado.</p>
            <figure memory_type="image" memory_usage="custom" memory_source="library" style="margin:0 0 1rem; width:min(100%,300px); border-radius:120px 120px 14px 14px; overflow:hidden; border:1px solid var(--surface-border-color);">
        <img src="https://loremflickr.com/600/700/' + S.kw + ',dress" alt="Inspiración de vestimenta" path="placeholder" data-library-category="bodas" data-asset-type="vestimenta" loading="lazy" />
        <figcaption hidden>Inspiración</figcaption>
      </figure>
<div class="sf6__paleta" style="justify-content:flex-start;"><span class="sf6__muestra" style="background:var(--primary-color);"></span><span class="sf6__muestra" style="background:var(--secondary-color);"></span><span class="sf6__muestra" style="background:var(--accent-color);"></span></div>
    </div>
  </div>
  <div class="sf6__fila">
    <span class="sf6__num" aria-hidden="true">b.</span>
    <div memory_type="text" memory_usage="custom" memory_key="detalles-bloque-2">
      <h3 class="sf6__subtitulo" memory_type="text" memory_usage="custom" memory_key="detalles-regalo-titulo">Mesa de regalos</h3>
      <p class="sf6__texto" memory_type="text" memory_usage="custom" memory_key="detalles-regalo-texto">Si deseas tener un detalle con nosotros.</p>
      <a class="sf6__dato" href="https://mesaderegalos.com/ejemplo" target="_blank" rel="noopener" memory_type="text" memory_usage="custom" memory_key="detalles-regalo-link">mesaderegalos.com</a>
    </div>
  </div>
</div>` : `<div class="sf6__par">
  <figure class="sf6__circular" memory_type="image" memory_usage="custom" memory_source="library">
    <img src="https://loremflickr.com/560/560/${S.kw},dress" alt="Inspiración" path="placeholder" data-library-category="bodas" data-asset-type="vestimenta" loading="lazy" />
    <figcaption hidden>Inspiración</figcaption>
  </figure>
  <div>
    <p class="sf6__rotulito" memory_type="text" memory_usage="custom" memory_key="detalles-rotulo">Código</p>
    <h3 class="sf6__subtitulo" memory_type="text" memory_usage="custom" memory_key="detalles-vestimenta">Formal</h3>
    <p class="sf6__texto" memory_type="text" memory_usage="custom" memory_key="detalles-texto">Paleta ${S.theme}. Blanco reservado de los anfitriones.</p>
    <div class="sf6__paleta" style="justify-content:flex-start;"><span class="sf6__muestra" style="background:var(--primary-color);"></span><span class="sf6__muestra" style="background:var(--secondary-color);"></span><span class="sf6__muestra" style="background:var(--accent-color);"></span></div>
    <a class="sf6__dato" href="https://mesaderegalos.com/ejemplo" target="_blank" rel="noopener" memory_type="text" memory_usage="custom" memory_key="detalles-regalo-link">mesaderegalos.com</a>
  </div>
</div>`}
${meta('detalles', 'detalles-sf' + S.num, S, 'Detalles ' + S.theme + ' variante ' + (Vv + 1) + ': vestimenta con paleta y mesa de regalos.', ['variante' + (Vv + 1)])}
</section>`;
}

const CD_SCRIPT = `
<script>
  (function () {
    var el = null;
    try { el = document.currentScript.closest('[data-gemini-id^="countdown"]'); } catch (e) {}
    if (!el) el = document.querySelector('[data-gemini-id^="countdown"]');
    if (!el) return;
    var targetAttr = el.getAttribute('data-countdown-target');
    var target = NaN;
    if (targetAttr && targetAttr.indexOf('YYYY') === -1) {
      var parsed = new Date(targetAttr);
      if (!isNaN(parsed.getTime())) target = parsed.getTime();
    }
    if (isNaN(target)) {
      if (window.__countdownTarget) { var _p = new Date(window.__countdownTarget); if (!isNaN(_p.getTime())) target = _p.getTime(); }
      else if (window.countdown_target) { var _p2 = new Date(window.countdown_target); if (!isNaN(_p2.getTime())) target = _p2.getTime(); }
    }
    var intervalId = null;
    (window.__countdownIntervals = window.__countdownIntervals || []).forEach(clearInterval);
    window.__countdownIntervals = [];
    function pad2(n) { return n < 10 ? '0' + n : '' + n; }
    function setUnit(unit, value) { var node = el.querySelector('[data-countdown-unit="' + unit + '"]'); if (node) node.textContent = value; }
    function tick() {
      var diff = target - Date.now();
      if (diff < 0) diff = 0;
      setUnit('days', Math.floor(diff / 86400000));
      setUnit('hours', pad2(Math.floor((diff % 86400000) / 3600000)));
      setUnit('minutes', pad2(Math.floor((diff % 3600000) / 60000)));
      setUnit('seconds', pad2(Math.floor((diff % 60000) / 1000)));
      if (diff === 0 && intervalId !== null) { clearInterval(intervalId); intervalId = null; window.__countdownIntervals = []; }
    }
    function start(newTarget) {
      if (newTarget) target = new Date(newTarget).getTime();
      (window.__countdownIntervals || []).forEach(clearInterval);
      window.__countdownIntervals = [];
      intervalId = null;
      if (!Number.isFinite(target)) return;
      tick();
      if (target > Date.now()) { intervalId = setInterval(tick, 1000); window.__countdownIntervals.push(intervalId); }
    }
    start();
    window.updateCountdown = start;
  })();
</script>`;

function countdown(S) {
  const Vv = S.num % 4;
  const layout = Vv === 0
    ? `.sf7__unidades { list-style:none; margin:0 auto; padding:clamp(1rem,3vw,1.6rem); width:min(100%,760px); display:flex; flex-wrap:wrap; justify-content:center; gap:clamp(1.4rem,4.4vw,3rem); }
.sf7__unidad { width:clamp(120px,17vw,160px); aspect-ratio:1/1; transform:rotate(45deg); background:var(--surface-color); border:1.5px solid var(--primary-color); display:grid; place-items:center; box-shadow:0 0 30px color-mix(in srgb, var(--primary-color) 25%, transparent); }
.sf7__unidad::before { content:''; position:absolute; inset:6px; border:1px dashed color-mix(in srgb, var(--accent-color) 60%, transparent); }
.sf7__interior { transform:rotate(-45deg); text-align:center; }
.sf7__num { display:block; font-family:${S.disp}; font-size:clamp(1.7rem,4.6vw,2.8rem); line-height:1; color:var(--primary-color); font-variant-numeric:tabular-nums; }
.sf7__etq { display:block; margin-top:.45rem; font-family:'Courier New',monospace; font-size:clamp(.5rem,1vw,.62rem); letter-spacing:.34em; text-transform:uppercase; color:var(--text-color); }`
    : Vv === 1
      ? `.sf7__unidades { list-style:none; margin:0 auto; padding:0; width:min(100%,820px); display:flex; flex-wrap:wrap; justify-content:center; gap:clamp(1.2rem,3.4vw,2.2rem); }
.sf7__unidad { width:clamp(140px,19vw,180px); aspect-ratio:1/1; border-radius:50%; background:var(--surface-color); border:1px solid var(--primary-color); display:grid; place-items:center; position:relative; }
.sf7__unidad::after { content:''; position:absolute; inset:-9px; border-radius:50%; border:1px dashed var(--accent-color); animation:sf-girar 26s linear infinite; }
@keyframes sf-girar { to { transform:rotate(360deg); } }
.sf7__num { display:block; font-family:${S.disp}; font-size:clamp(1.8rem,5vw,3rem); line-height:1; color:var(--primary-color); font-variant-numeric:tabular-nums; }
.sf7__etq { display:block; margin-top:.45rem; font-family:'Courier New',monospace; font-size:clamp(.5rem,1vw,.62rem); letter-spacing:.34em; text-transform:uppercase; color:var(--text-color); }`
      : Vv === 2
        ? `.sf7__marca { width:min(100%,860px); margin:0 auto; border-top:2px solid var(--primary-color); border-bottom:2px solid var(--primary-color); padding:clamp(1rem,3vw,1.7rem) 0; overflow:hidden; }
.sf7__unidades { list-style:none; margin:0; padding:0; display:flex; justify-content:center; gap:clamp(1.6rem,5vw,4rem); }
.sf7__unidad { text-align:center; position:relative; padding:0 clamp(.6rem,2vw,1.4rem); }
.sf7__unidad + .sf7__unidad::before { content:''; position:absolute; left:calc(-1 * clamp(.8rem,2.5vw,2rem)); top:10%; bottom:10%; width:1px; background:var(--surface-border-color); }
.sf7__num { display:block; font-family:${S.disp}; font-size:clamp(2.2rem,7vw,4.4rem); line-height:1; color:var(--primary-color); font-variant-numeric:tabular-nums; animation:sf-late 1.9s ease-in-out infinite; }
@keyframes sf-late { 50% { opacity:.55; } }
.sf7__etq { display:block; margin-top:.5rem; font-family:'Courier New',monospace; font-size:clamp(.52rem,1.05vw,.64rem); letter-spacing:.4em; text-transform:uppercase; color:var(--text-color); }`
        : `.sf7__unidades { list-style:none; margin:0 auto; padding:0; width:min(100%,640px); }
.sf7__unidad { display:grid; grid-template-columns:1fr auto; align-items:center; gap:1rem; padding:clamp(.8rem,2.2vw,1.2rem) clamp(1rem,2.6vw,1.6rem); background:var(--surface-color); border:1px solid var(--surface-border-color); margin-bottom:.9rem; transform:skewX(-8deg); }
.sf7__unidad > * { transform:skewX(8deg); }
.sf7__unidad:last-child { margin-bottom:0; }
.sf7__num { font-family:${S.disp}; font-size:clamp(1.9rem,5.4vw,3.2rem); line-height:1; color:var(--primary-color); font-variant-numeric:tabular-nums; }
.sf7__etq { font-family:'Courier New',monospace; font-size:clamp(.56rem,1.1vw,.68rem); letter-spacing:.4em; text-transform:uppercase; color:var(--text-color); }`;
  return `<section class="sf7" data-gemini-id="countdown-sf${S.num}" memory_type="background" memory_usage="protected" memory_source="generated" path="placeholder" data-countdown-target="YYYY-MM-DDTHH:MM:SS">
<style>
.sf7 { ${V(S)};
  position:relative; isolation:isolate; overflow:hidden; box-sizing:border-box; padding:clamp(3.6rem,9vw,6.8rem) clamp(1rem,5vw,4rem); background:${S.bg}; background-color:var(--bg-color); color:var(--text-color); text-align:center; }
.sf7 *, .sf7 *::before, .sf7 *::after { box-sizing:border-box; }
.sf7::after { content:''; position:absolute; inset:0; z-index:0; background:color-mix(in srgb, var(--bg-color) 74%, transparent); }
.sf7 > * { position:relative; z-index:1; }
${ORN_CSS}
.sf7__rotulo { margin:0 0 .4rem; font-family:'Courier New',monospace; font-size:clamp(.6rem,1.2vw,.72rem); letter-spacing:.6em; text-transform:uppercase; color:var(--secondary-color); }
.sf7__titulo { margin:0 auto 1rem; font-family:${S.disp}; font-weight:400; font-size:clamp(1.9rem,4.6vw,3rem); color:var(--primary-color); }
${layout}
.sf7__fecha { margin:clamp(1.6rem,4vw,2.2rem) 0 0; font-family:${S.body}; font-style:italic; font-size:clamp(.86rem,1.7vw,1rem); color:var(--text-color); }
@media (max-width:560px){ .sf7__unidades { gap:1.2rem; } .sf7__unidad { width:clamp(104px,38vw,150px); } }
@media (prefers-reduced-motion:reduce){ .sf7 * { animation:none !important; } }
</style>
<p class="sf7__rotulo" memory_type="text" memory_usage="custom" memory_key="countdown-rotulo">Cuenta regresiva</p>
<h2 class="sf7__titulo" memory_type="text" memory_usage="custom" memory_key="countdown-titulo">Falta poco</h2>
${orn(S)}
<ul class="sf7__unidades" aria-label="Cuenta regresiva">
  <li class="sf7__unidad"><span class="sf7__interior"><span class="sf7__num" data-countdown-unit="days">--</span><span class="sf7__etq">Días</span></span></li>
  <li class="sf7__unidad"><span class="sf7__interior"><span class="sf7__num" data-countdown-unit="hours">--</span><span class="sf7__etq">Horas</span></span></li>
  <li class="sf7__unidad"><span class="sf7__interior"><span class="sf7__num" data-countdown-unit="minutes">--</span><span class="sf7__etq">Min</span></span></li>
  <li class="sf7__unidad"><span class="sf7__interior"><span class="sf7__num" data-countdown-unit="seconds">--</span><span class="sf7__etq">Seg</span></span></li>
</ul>
<time class="sf7__fecha" datetime="YYYY-MM-DDTHH:MM:SS" memory_type="text" memory_usage="custom" memory_key="countdown-fecha">Fecha del evento · hora por confirmar</time>
${CD_SCRIPT}
${meta('countdown', 'countdown-sf' + S.num, S, 'Cuenta regresiva ' + S.theme + ' variante ' + (Vv + 1) + ' con contrato completo de countdown.', ['variante' + (Vv + 1)])}
</section>`;
}

function padrinos(S) {
  const Vv = S.num % 4;
  const layout = Vv === 0
    ? `.sf8__fila { display:flex; flex-wrap:wrap; justify-content:center; gap:clamp(2.4rem,7vw,6rem); }
.sf8__casa { width:clamp(210px,28vw,262px); }
.sf8__marco { position:relative; margin:0 auto; width:clamp(180px,23vw,222px); aspect-ratio:1/1.1; background:var(--surface-color); border:1px solid var(--primary-color); display:grid; align-items:end; }
.sf8__marco::before { content:''; position:absolute; inset:8px; border:1px solid color-mix(in srgb, var(--accent-color) 55%, transparent); }
.sf8__marco img { display:block; width:100%; height:82%; object-fit:cover; }
.sf8__marco figcaption { padding:.8rem 0 .6rem; }`
    : Vv === 1
      ? `.sf8__fila { display:flex; flex-wrap:wrap; justify-content:center; gap:clamp(1.6rem,4vw,3rem); }
.sf8__casa { width:clamp(170px,22vw,218px); padding:clamp(1.4rem,3.4vw,2rem) clamp(1rem,2.6vw,1.5rem); background:var(--surface-color); border:1px solid var(--surface-border-color); transform:skewX(-4deg); transition:transform .5s cubic-bezier(.16,1,.3,1); }
.sf8__casa:nth-child(2) { transform:skewX(4deg); }
.sf8__casa:hover { transform:skewX(0) translateY(-6px); }
.sf8__casa > * { transform:skewX(4deg); }
.sf8__casa:nth-child(2) > * { transform:skewX(-4deg); }
.sf8__marco { margin:0 0 1rem; }
.sf8__marco img { display:block; width:100%; height:auto; aspect-ratio:3/4; object-fit:cover; }`
      : Vv === 2
        ? `.sf8__fila { display:flex; flex-wrap:wrap; justify-content:center; align-items:center; gap:0 clamp(-2rem,-4vw,-1rem); }
.sf8__casa { width:clamp(200px,26vw,252px); }
.sf8__casa:nth-child(2) { margin-left:clamp(-3rem,-6vw,-1.5rem); }
.sf8__marco { margin:0; border:5px solid var(--surface-color); outline:1px solid var(--primary-color); box-shadow:0 20px 44px rgba(0,0,0,.22); }
.sf8__marco img { display:block; width:100%; height:auto; aspect-ratio:4/5; object-fit:cover; }
.sf8__casa:nth-child(2) { margin-top:clamp(2rem,6vw,4rem); }`
        : `.sf8__fila { display:flex; flex-wrap:wrap; justify-content:center; gap:clamp(2.2rem,6vw,4.6rem); }
.sf8__casa { width:clamp(210px,27vw,260px); }
.sf8__marco { margin:0 auto; width:clamp(180px,23vw,222px); aspect-ratio:3/4; clip-path:polygon(0 12%, 50% 0, 100% 12%, 100% 100%, 0 100%); background:var(--surface-color); border:1px solid var(--primary-color); display:grid; align-items:end; }
.sf8__marco img { display:block; width:100%; height:80%; object-fit:cover; }`;
  return `<section class="sf8" data-gemini-id="padrinos-sf${S.num}" memory_type="background" memory_usage="protected" memory_source="generated" path="placeholder">
<style>
.sf8 { ${V(S)};
  position:relative; isolation:isolate; overflow:hidden; box-sizing:border-box; padding:clamp(3.6rem,9vw,7rem) clamp(1rem,5vw,4rem); background:${S.bg}; background-color:var(--bg-color); color:var(--text-color); text-align:center; }
.sf8 *, .sf8 *::before, .sf8 *::after { box-sizing:border-box; }
.sf8::after { content:''; position:absolute; inset:0; z-index:0; background:color-mix(in srgb, var(--bg-color) 74%, transparent); }
.sf8 > * { position:relative; z-index:1; }
${ORN_CSS}
.rc2__rotulo { margin:0 0 .5rem; font-family:'Courier New',monospace; font-size:clamp(.6rem,1.2vw,.72rem); letter-spacing:.6em; text-transform:uppercase; color:var(--secondary-color); }
.rc2__titulo { margin:0 auto 1rem; font-family:${S.disp}; font-weight:400; font-size:clamp(1.9rem,4.6vw,3rem); color:var(--primary-color); }
${layout}
.sf8__rol { display:block; margin:1.1rem 0 .2rem; font-family:'Courier New',monospace; font-size:clamp(.54rem,1.02vw,.64rem); letter-spacing:.44em; text-transform:uppercase; color:var(--secondary-color); }
.sf8__nombre { margin:0; font-family:${S.disp}; font-weight:400; font-size:clamp(1.02rem,2.1vw,1.26rem); color:var(--primary-color); }
.sf8__nota { margin:clamp(2.2rem,5vw,3rem) auto 0; max-width:44ch; font-family:${S.body}; font-style:italic; font-size:clamp(.86rem,1.6vw,1rem); line-height:1.8; color:var(--text-color); }
@media (max-width:640px){ .sf8__casa:nth-child(2) { margin-left:0; margin-top:0; } .sf8__casa { transform:none !important; } }
</style>
<header memory_type="text" memory_usage="custom" memory_key="padrinos-intro">
  <p class="rc2__rotulo" memory_type="text" memory_usage="custom" memory_key="padrinos-rotulo">Testigos</p>
  <h2 class="rc2__titulo" memory_type="text" memory_usage="custom" memory_key="padrinos-titulo">Madrina &amp; Padrino</h2>
  ${orn(S)}
</header>
<div class="sf8__fila">
  <figure class="sf8__casa">
    <span class="sf8__marco" memory_type="image" memory_usage="custom" memory_source="library">
      <img src="https://loremflickr.com/460/560/${S.kw},woman" alt="Retrato de la madrina" path="placeholder" data-library-category="bodas" data-asset-type="retrato-padrino" loading="lazy" />
    </span>
    <figcaption memory_type="text" memory_usage="custom" memory_key="padrinos-bloque-1">
      <span class="sf8__rol">Madrina</span>
      <h3 class="sf8__nombre" memory_type="text" memory_usage="custom" memory_key="padrinos-nombre-1">Nombre Madrina</h3>
    </figcaption>
  </figure>
  <figure class="sf8__casa">
    <span class="sf8__marco" memory_type="image" memory_usage="custom" memory_source="library">
      <img src="https://loremflickr.com/460/560/${S.kw},man" alt="Retrato del padrino" path="placeholder" data-library-category="bodas" data-asset-type="retrato-padrino" loading="lazy" />
    </span>
    <figcaption memory_type="text" memory_usage="custom" memory_key="padrinos-bloque-2">
      <span class="sf8__rol">Padrino</span>
      <h3 class="sf8__nombre" memory_type="text" memory_usage="custom" memory_key="padrinos-nombre-2">Nombre Padrino</h3>
    </figcaption>
  </figure>
</div>
<p class="sf8__nota" memory_type="text" memory_usage="custom" memory_key="padrinos-texto">Gracias por acompañarnos en este día tan importante.</p>
${meta('padrinos', 'padrinos-sf' + S.num, S, 'Padrinos ' + S.theme + ' variante ' + (Vv + 1) + ' con marcos ' + S.motif + '.', ['variante' + (Vv + 1)])}
</section>`;
}

module.exports = { confirmacion, detalles, countdown, padrinos };
