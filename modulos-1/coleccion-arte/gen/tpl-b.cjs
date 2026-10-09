/* Plantillas B: confirmacion, detalles, countdown, padrinos. */
const { meta } = require('./tpl-a.cjs');
const cssVars = (S) => Object.entries(S.v).map(([k, v]) => k + ':' + v).join('; ');

function confirmacion(S) {
  const V = S.num % 3;
  const layout = V === 0
    ? `.${S.cls}-cf__panel { width:min(100%,560px); margin:0 auto; padding:clamp(2rem,5vw,3.2rem) clamp(1.4rem,4vw,2.6rem); ${S.card} }
.${S.cls}-cf__panel::before { content:''; display:block; width:64px; height:4px; margin:0 auto 1.2rem; background:var(--accent-color); }`
    : V === 1
      ? `.${S.cls}-cf__panel { width:min(100%,720px); margin:0 auto; display:grid; grid-template-columns:1fr auto 1fr; align-items:stretch; ${S.card} }
.${S.cls}-cf__col { padding:clamp(1.6rem,4vw,2.6rem) clamp(1.2rem,3vw,2rem); }
.${S.cls}-cf__col:last-child { text-align:right; }
.${S.cls}-cf__div { width:0; border-left:2px dashed var(--surface-border-color); position:relative; }
.${S.cls}-cf__div::after { content:'RSVP'; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%) rotate(-90deg); font-family:${S.mono}; font-size:.6rem; letter-spacing:.4em; color:var(--accent-color); background:var(--bg-color); padding:.4rem 0; }`
      : `.${S.cls}-cf__cinta { width:min(100%,680px); margin:0 auto; padding:clamp(1.6rem,4vw,2.4rem) clamp(1.2rem,3vw,2rem) clamp(2rem,4.6vw,3rem); ${S.card} transform:rotate(-1.6deg); }
.${S.cls}-cf__sello { position:absolute; top:-26px; right:clamp(1rem,4vw,2.6rem); width:76px; height:76px; border-radius:50%; display:grid; place-items:center; background:var(--accent-color); color:var(--bg-color); font-family:${S.disp}; font-size:.72rem; letter-spacing:.12em; transform:rotate(12deg); box-shadow:0 14px 28px rgba(0,0,0,.3); }`;
  return `<section class="${S.cls}-cf" data-gemini-id="confirmacion-texto" memory_type="background" memory_usage="protected" memory_source="generated" path="placeholder">
<style>
.${S.cls}-cf { ${cssVars(S)};
  position:relative; isolation:isolate; overflow:hidden; box-sizing:border-box; padding:clamp(3.4rem,9vw,6.5rem) clamp(1rem,5vw,4rem);
  background:${S.bg}; background-size:cover; background-position:center; color:var(--text-color); text-align:center; }
.${S.cls}-cf *, .${S.cls}-cf *::before, .${S.cls}-cf *::after { box-sizing:border-box; }
.${S.cls}-cf::before { content:''; position:absolute; inset:0; z-index:-1; background:color-mix(in srgb, var(--bg-color) 80%, transparent); }
${layout}
.${S.cls}-cf__titulo { margin:0 0 .5rem; font-family:${S.disp}; font-weight:${(S.num % 2) ? '400' : '700'}; font-size:clamp(1.9rem,4.6vw,3rem); color:var(--primary-color); }
.${S.cls}-cf__texto { margin:0 auto 1.6rem; max-width:44ch; font-family:${S.body}; font-size:clamp(.86rem,1.6vw,.98rem); line-height:1.8; color:var(--secondary-color); }
.${S.cls}-cf__acciones { display:flex; flex-wrap:wrap; gap:.9rem; justify-content:${V === 1 ? 'flex-start' : 'center'}; margin-top:1.4rem; }
.${S.cls}-cf__btn { display:inline-block; padding:.85rem 2rem; font-family:${S.mono}; font-size:clamp(.68rem,1.3vw,.8rem); letter-spacing:.26em; text-transform:uppercase; text-decoration:none; transition:transform .35s ease, box-shadow .35s ease; }
.${S.cls}-cf__btn--si { background:var(--accent-color); color:var(--bg-color); border:1px solid var(--accent-color); }
.${S.cls}-cf__btn--no { background:transparent; color:var(--text-color); border:1px solid var(--surface-border-color); }
.${S.cls}-cf__btn:hover { transform:translateY(-3px); box-shadow:0 14px 30px color-mix(in srgb, var(--accent-color) 40%, transparent); }
.${S.cls}-cf__nota { margin:1.2rem 0 0; font-family:${S.mono}; font-size:clamp(.6rem,1.1vw,.7rem); letter-spacing:.22em; color:var(--secondary-color); }
@media (max-width:900px){ .${S.cls}-cf__sello { display:none; } }
@media (max-width:640px){ .${S.cls}-cf__panel { grid-template-columns:1fr !important; } .${S.cls}-cf__div { display:none; } .${S.cls}-cf__col:last-child { text-align:left; } .${S.cls}-cf__cinta { transform:none; } }
</style>
<div class="${S.cls}-cf__panel"${V === 2 ? ' style="position:relative;"' : ''}>
  ${V === 2 ? '<span class="' + S.cls + '-cf__sello" aria-hidden="true">CONFIRMA</span>' : ''}
  ${V === 1 ? '<div class="' + S.cls + '-cf__col">' : ''}
  <h2 class="${S.cls}-cf__titulo" memory_type="text" memory_usage="custom" memory_key="confirmacion-titulo">¿Cuentas con nosotros?</h2>
  <p class="${S.cls}-cf__texto" memory_type="text" memory_usage="custom" memory_key="confirmacion-texto">Tu presencia es el mejor regalo. Confirma antes de la fecha límite para apartar tu lugar en la celebración.</p>
  ${V === 1 ? '</div><span class="' + S.cls + '-cf__div" aria-hidden="true"></span><div class="' + S.cls + '-cf__col">' : ''}
  <div class="${S.cls}-cf__acciones" memory_type="text" memory_usage="custom" memory_key="confirmacion-acciones">
    <a class="${S.cls}-cf__btn ${S.cls}-cf__btn--si" href="https://wa.me/5210000000000?text=%C2%A1Confirmo%20mi%20asistencia!" target="_blank" rel="noopener">Confirmar asistencia</a>
    <a class="${S.cls}-cf__btn ${S.cls}-cf__btn--no" href="https://wa.me/5210000000000?text=No%20podr%C3%A9%20asistir" target="_blank" rel="noopener">No podré asistir</a>
  </div>
  <p class="${S.cls}-cf__nota" memory_type="text" memory_usage="custom" memory_key="confirmacion-fecha-limite">Confirma antes del 1 de mayo</p>
  ${V === 1 ? '</div>' : ''}
</div>
${meta('confirmacion', 'confirmacion-texto', S.name + ' — Confirmacion', 'Confirmacion ' + S.theme + ' con botones de WhatsApp y panel propio del movimiento.', ['confirmacion', 'rsvp', S.cls, S.theme, 'whatsapp'])}
</section>`;
}

function detalles(S) {
  const V = S.num % 3;
  const codigo = [['Etiqueta', 'Traje oscuro, vestido largo.'], ['Formal', 'Traje y vestido de gala corto.'], ['Casual elegante', 'Sin corbata, tela fluida.']][S.num % 3];
  return `<section class="${S.cls}-dt" data-gemini-id="detalles-vestimenta" memory_type="background" memory_usage="protected" memory_source="generated" path="placeholder">
<style>
.${S.cls}-dt { ${cssVars(S)};
  position:relative; isolation:isolate; overflow:hidden; box-sizing:border-box; padding:clamp(3rem,8vw,6rem) clamp(1rem,5vw,4rem);
  background:${S.bg}; background-size:cover; background-position:center; color:var(--text-color); }
.${S.cls}-dt *, .${S.cls}-dt *::before, .${S.cls}-dt *::after { box-sizing:border-box; }
.${S.cls}-dt::before { content:''; position:absolute; inset:0; z-index:-1; background:color-mix(in srgb, var(--bg-color) 82%, transparent); }
.${S.cls}-dt__grid { display:grid; grid-template-columns:${V === 0 ? 'repeat(auto-fit, minmax(min(300px,100%),1fr))' : '1fr'}; gap:clamp(1.6rem,4vw,3rem); width:min(100%,${V === 1 ? '760px' : '960px'}); margin:0 auto; align-items:stretch; }
.${S.cls}-dt__titulo { margin:0 0 .4rem; font-family:${S.disp}; font-weight:${(S.num % 2) ? '400' : '700'}; font-size:clamp(1.9rem,4.4vw,2.9rem); color:var(--primary-color); }
.${S.cls}-dt__sub { margin:0 0 clamp(1.8rem,4vw,2.6rem); font-family:${S.body}; font-size:clamp(.84rem,1.55vw,.96rem); color:var(--secondary-color); text-align:center; }
.${S.cls}-dt__tarjeta { padding:clamp(1.5rem,3.4vw,2.2rem); ${S.card} }
.${S.cls}-dt__rotulo { margin:0 0 .3rem; font-family:${S.mono}; font-size:clamp(.56rem,1.05vw,.64rem); letter-spacing:.32em; text-transform:uppercase; color:var(--accent-color); }
.${S.cls}-dt__nombre { margin:0 0 .5rem; font-family:${S.disp}; font-size:clamp(1.2rem,2.5vw,1.6rem); color:var(--primary-color); }
.${S.cls}-dt__texto { margin:0 0 1rem; font-family:${S.body}; font-size:clamp(.82rem,1.5vw,.94rem); line-height:1.75; color:var(--secondary-color); }
.${S.cls}-dt__foto { margin:0 0 1.2rem; }
.${S.cls}-dt__foto img { display:block; width:100%; height:auto; aspect-ratio:16/9; object-fit:cover; }
.${S.cls}-dt__paleta { display:flex; flex-wrap:wrap; gap:.6rem; margin-top:.6rem; }
.${S.cls}-dt__muestra { width:44px; height:44px; border-radius:50%; border:2px solid var(--surface-border-color); }
.${S.cls}-dt__dato { display:block; font-family:${S.mono}; font-size:clamp(.72rem,1.35vw,.84rem); letter-spacing:.12em; color:var(--text-color); text-decoration:none; border-bottom:1px dashed var(--accent-color); padding-bottom:.15rem; }
.${S.cls}-dt__dato + .${S.cls}-dt__dato { margin-top:.7rem; }
@media (max-width:680px){ .${S.cls}-dt__grid { grid-template-columns:1fr; } }
</style>
<div class="${S.cls}-dt__grid">
  <article class="${S.cls}-dt__tarjeta">
    <figure class="${S.cls}-dt__foto" memory_type="image" memory_usage="custom" memory_source="library" memory_key="detalles-foto">
      <img src="https://loremflickr.com/800/450/${S.kw},fashion" alt="Inspiración de vestimenta" path="placeholder" data-library-category="bodas" data-asset-type="vestimenta" loading="lazy" />
      <figcaption hidden>Inspiración de vestimenta</figcaption>
    </figure>
    <p class="${S.cls}-dt__rotulo" memory_type="text" memory_usage="custom" memory_key="detalles-rotulo">Código de vestimenta</p>
    <h3 class="${S.cls}-dt__nombre" memory_type="text" memory_usage="custom" memory_key="detalles-vestimenta">${codigo[0]}</h3>
    <p class="${S.cls}-dt__texto" memory_type="text" memory_usage="custom" memory_key="detalles-texto">${codigo[1]}</p>
    <div class="${S.cls}-dt__paleta" aria-label="Paleta sugerida">
      <span class="${S.cls}-dt__muestra" style="background:#b49a67;"></span>
      <span class="${S.cls}-dt__muestra" style="background:#8a8f7c;"></span>
      <span class="${S.cls}-dt__muestra" style="background:#d9cfc0;"></span>
      <span class="${S.cls}-dt__muestra" style="background:#41505c;"></span>
    </div>
  </article>
  <article class="${S.cls}-dt__tarjeta">
    <p class="${S.cls}-dt__rotulo" memory_type="text" memory_usage="custom" memory_key="detalles-regalo-rotulo">Mesa de regalos</p>
    <h3 class="${S.cls}-dt__nombre" memory_type="text" memory_usage="custom" memory_key="detalles-regalo-titulo">Un detalle para los anfitriones</h3>
    <p class="${S.cls}-dt__texto" memory_type="text" memory_usage="custom" memory_key="detalles-regalo-texto">Si deseamos estar presente con un detalle, aquí encontrarás algunas ideas.</p>
    <a class="${S.cls}-dt__dato" href="https://mesaderegalos.com/ejemplo" target="_blank" rel="noopener" memory_type="text" memory_usage="custom" memory_key="detalles-regalo-link">Mesa de regalos</a>
    <a class="${S.cls}-dt__dato" href="#" memory_type="text" memory_usage="custom" memory_key="detalles-regalo-dato">CLABE: 0000 0000 0000 0000</a>
  </article>
</div>
${meta('detalles', 'detalles-vestimenta', S.name + ' — Detalles', 'Detalles ' + S.theme + ': codigo de vestimenta con paleta y datos de regalo en tarjetas del estilo.', ['detalles', 'dresscode', 'regalos', S.cls, S.theme])}
</section>`;
}

function countdown(S) {
  const V = S.num % 3;
  const timer = V === 0
    ? 'display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:clamp(.5rem,2vw,1.4rem);'
    : V === 1
      ? 'display:flex; flex-wrap:wrap; justify-content:center; gap:clamp(.8rem,2.4vw,1.6rem);'
      : 'display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:clamp(.9rem,2.6vw,1.8rem); max-width:520px; margin:0 auto;';
  const tilt = (i) => V === 1 ? (i % 2 ? 'transform:rotate(2deg);' : 'transform:rotate(-2deg);') : '';
  return `<section class="${S.cls}-cd" data-gemini-id="countdown-${S.cls}-central" memory_type="background" memory_usage="protected" memory_source="generated" path="placeholder" data-countdown-target="YYYY-MM-DDTHH:MM:SS">
<style>
.${S.cls}-cd { ${cssVars(S)};
  position:relative; isolation:isolate; overflow:hidden; box-sizing:border-box; min-height:clamp(26rem,60vw,42rem); display:grid; place-items:center;
  padding:clamp(3rem,8vw,6rem) clamp(1rem,5vw,4rem);
  background:${S.bg}; background-size:cover; background-position:center; color:var(--text-color); text-align:center; }
.${S.cls}-cd *, .${S.cls}-cd *::before, .${S.cls}-cd *::after { box-sizing:border-box; }
.${S.cls}-cd::before { content:''; position:absolute; inset:0; z-index:-1; background:color-mix(in srgb, var(--bg-color) 78%, transparent); }
.${S.cls}-cd__caja { width:min(100%,640px); padding:clamp(1.6rem,4vw,2.8rem) clamp(1.2rem,3.6vw,2.4rem); ${S.card} }
.${S.cls}-cd__titulo { margin:0 0 .4rem; font-family:${S.disp}; font-weight:${(S.num % 2) ? '400' : '700'}; font-size:clamp(1.9rem,4.6vw,3rem); color:var(--primary-color); transform:rotate(${(S.num % 2) ? '-1.2deg' : '0deg'}); }
.${S.cls}-cd__fecha { display:block; margin-bottom:clamp(1.4rem,3.6vw,2.2rem); font-family:${S.mono}; font-size:clamp(.68rem,1.3vw,.82rem); letter-spacing:.3em; text-transform:uppercase; color:var(--secondary-color); }
.${S.cls}-cd__timer { ${timer} }
.${S.cls}-cd__unidad { padding:clamp(.7rem,1.8vw,1.1rem) clamp(.5rem,1.4vw,.9rem); background:color-mix(in srgb, var(--bg-color) 85%, transparent); border:1px solid var(--surface-border-color); ${tilt(1)} }
.${S.cls}-cd__num { display:block; font-family:${S.disp}; font-size:clamp(1.9rem,6.4vw,4.2rem); line-height:.95; font-variant-numeric:tabular-nums; color:var(--text-color); }
.${S.cls}-cd__etq { display:block; margin-top:.5rem; font-family:${S.mono}; font-size:clamp(.56rem,1.2vw,.7rem); letter-spacing:.28em; text-transform:uppercase; color:var(--text-color); }
@media (max-width:520px){ .${S.cls}-cd__timer { grid-template-columns:repeat(2,minmax(0,1fr)); } }
@media (prefers-reduced-motion:reduce){ .${S.cls}-cd * { animation:none !important; } }
</style>
<div class="${S.cls}-cd__caja">
  <h2 class="${S.cls}-cd__titulo" memory_type="text" memory_usage="custom" memory_key="countdown-titulo">Falta poco</h2>
  <time class="${S.cls}-cd__fecha" datetime="YYYY-MM-DDTHH:MM:SS" memory_type="text" memory_usage="custom" memory_key="countdown-fecha">Fecha del evento</time>
  <div class="${S.cls}-cd__timer" aria-label="Cuenta regresiva">
    <div class="${S.cls}-cd__unidad"><span class="${S.cls}-cd__num" data-countdown-unit="days">--</span><span class="${S.cls}-cd__etq">Días</span></div>
    <div class="${S.cls}-cd__unidad"><span class="${S.cls}-cd__num" data-countdown-unit="hours">--</span><span class="${S.cls}-cd__etq">Horas</span></div>
    <div class="${S.cls}-cd__unidad"><span class="${S.cls}-cd__num" data-countdown-unit="minutes">--</span><span class="${S.cls}-cd__etq">Min</span></div>
    <div class="${S.cls}-cd__unidad"><span class="${S.cls}-cd__num" data-countdown-unit="seconds">--</span><span class="${S.cls}-cd__etq">Seg</span></div>
  </div>
</div>
<script>
  (function () {
    var el = null;
    try { el = document.currentScript.closest('[data-gemini-id^="countdown"]'); } catch(e) {}
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
</script>
${meta('countdown', 'countdown-' + S.cls + '-central', S.name + ' — Countdown', 'Cuenta regresiva ' + S.theme + ' con cuatro unidades enmarcadas y contrato de countdown completo.', ['countdown', 'timer', S.cls, S.theme])}
</section>`;
}

function padrinos(S) {
  const V = S.num % 3;
  const list = [['Madrina', 'Nombre Madrina'], ['Padrino', 'Nombre Padrino']];
  const cards = list.map(([rol, nom], i) => `  <article class="${S.cls}-po__tarjeta"${V === 2 ? ' style="--r:' + (i ? '2.4deg' : '-2.6deg') + ';"' : ''}>
    <figure class="${S.cls}-po__foto" memory_type="image" memory_usage="custom" memory_source="library" memory_key="padrinos-retrato-${['uno', 'dos'][i]}">
      <img src="https://loremflickr.com/520/620/${S.kw},portrait" alt="Retrato de ${rol.toLowerCase()}" path="placeholder" data-library-category="bodas" data-asset-type="retrato-padrino" loading="lazy" />
      <figcaption hidden>Retrato ${rol}</figcaption>
    </figure>
    <div memory_type="text" memory_usage="custom" memory_key="padrinos-bloque-${i + 1}">
      <p class="${S.cls}-po__rol">${rol}</p>
      <h3 class="${S.cls}-po__nombre" memory_type="text" memory_usage="custom" memory_key="padrinos-nombre-${i + 1}">${nom}</h3>
    </div>
  </article>`).join('\n');
  return `<section class="${S.cls}-po" data-gemini-id="padrinos-lista" memory_type="background" memory_usage="protected" memory_source="generated" path="placeholder">
<style>
.${S.cls}-po { ${cssVars(S)};
  position:relative; isolation:isolate; overflow:hidden; box-sizing:border-box; padding:clamp(3rem,8vw,6rem) clamp(1rem,5vw,4rem);
  background:${S.bg}; background-size:cover; background-position:center; color:var(--text-color); text-align:center; }
.${S.cls}-po *, .${S.cls}-po *::before, .${S.cls}-po *::after { box-sizing:border-box; }
.${S.cls}-po::before { content:''; position:absolute; inset:0; z-index:-1; background:color-mix(in srgb, var(--bg-color) 80%, transparent); }
.${S.cls}-po__titulo { margin:0 0 .5rem; font-family:${S.disp}; font-weight:${(S.num % 2) ? '400' : '700'}; font-size:clamp(1.9rem,4.4vw,2.9rem); color:var(--primary-color); }
.${S.cls}-po__sub { margin:0 auto clamp(2rem,5vw,3rem); max-width:44ch; font-family:${S.body}; font-size:clamp(.84rem,1.55vw,.96rem); line-height:1.75; color:var(--secondary-color); }
.${S.cls}-po__fila { display:grid; grid-template-columns:${V === 1 ? 'repeat(auto-fit, minmax(min(240px,100%),1fr))' : 'repeat(auto-fit, minmax(min(260px,100%),1fr))'}; gap:clamp(1.6rem,4vw,3rem); width:min(100%,820px); margin:0 auto; }
.${S.cls}-po__tarjeta { position:relative; padding:clamp(1.4rem,3.2vw,2rem) clamp(1.2rem,3vw,1.8rem); ${S.card} ${V === 2 ? 'transform:rotate(var(--r,0deg)); transition:transform .45s cubic-bezier(.22,.8,.3,1);' : ''} }
${V === 2 ? `.${S.cls}-po__tarjeta:hover { transform:rotate(0) scale(1.03); z-index:4; }` : ''}
.${S.cls}-po__foto { margin:0 auto 1rem; width:clamp(128px,17vw,164px); aspect-ratio:5/6; overflow:hidden; border:2px solid var(--accent-color); }
.${S.cls}-po__foto img { display:block; width:100%; height:100%; object-fit:cover; }
.${S.cls}-po__rol { margin:0 0 .3rem; font-family:${S.mono}; font-size:clamp(.56rem,1.05vw,.64rem); letter-spacing:.34em; text-transform:uppercase; color:var(--accent-color); }
.${S.cls}-po__nombre { margin:0; font-family:${S.disp}; font-size:clamp(1.02rem,2.1vw,1.3rem); color:var(--primary-color); }
@media (max-width:640px){ .${S.cls}-po__fila { grid-template-columns:1fr; max-width:320px; } .${S.cls}-po__tarjeta { transform:none !important; } }
</style>
<header memory_type="text" memory_usage="custom" memory_key="padrinos-intro">
  <h2 class="${S.cls}-po__titulo" memory_type="text" memory_usage="custom" memory_key="padrinos-titulo">Nuestros padrinos</h2>
  <p class="${S.cls}-po__sub" memory_type="text" memory_usage="custom" memory_key="padrinos-texto">Personas que caminan con nosotros y bendicen este día.</p>
</header>
<div class="${S.cls}-po__fila">
${cards}
</div>
${meta('padrinos', 'padrinos-lista', S.name + ' — Padrinos', 'Padrinos ' + S.theme + ' con retratos grandes en tarjetas del estilo.', ['padrinos', 'madrina', S.cls, S.theme])}
</section>`;
}

module.exports = { confirmacion, detalles, countdown, padrinos };
