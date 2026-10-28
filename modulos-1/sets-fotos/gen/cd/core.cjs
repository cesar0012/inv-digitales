/* Núcleo de los 24 countdowns ÚNICOS — un concepto distinto por set.
 * Cada concepto define su propio layout, animación y metáfora visual;
 * este módulo aporta el esqueleto común que garantiza el contrato:
 * section[data-gemini-id^="countdown"] + data-countdown-target +
 * 4 data-countdown-unit + window.updateCountdown + moduleMetadata. */
const { meta, orn, ORN_CSS, V } = require('../tpl-a.cjs');

/* Script del contrato de countdown (idéntico al de tpl-b: calcula la
 * diferencia, pinta cada unidad con textContent, expone updateCountdown
 * y limpia __countdownIntervals). */
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

/* Esqueleto común. o = { id, cls, css, body, desc, tags } */
function wrap(S, o) {
  return `<section class="${o.cls}" data-gemini-id="${o.id}" memory_type="background" memory_usage="protected" memory_source="generated" path="placeholder" data-countdown-target="YYYY-MM-DDTHH:MM:SS">
<style>
.${o.cls} { ${V(S)};
  position:relative; isolation:isolate; overflow:hidden; box-sizing:border-box; padding:clamp(3.4rem,8vw,6.4rem) clamp(1rem,5vw,4rem); background:${S.bg}; background-color:var(--bg-color); color:var(--text-color); }
.${o.cls} *, .${o.cls} *::before, .${o.cls} *::after { box-sizing:border-box; }
.${o.cls}::after { content:''; position:absolute; inset:0; z-index:0; background:color-mix(in srgb, var(--bg-color) 78%, transparent); }
.${o.cls} > * { position:relative; z-index:1; }
${ORN_CSS}
${o.css}
@media (prefers-reduced-motion:reduce){ .${o.cls} * { animation:none !important; transition:none !important; } }
</style>
${o.body}
${CD_SCRIPT}
${meta('countdown', o.id, S, o.desc, o.tags)}
</section>`;
}

/* Encabezado editable reutilizable con textos memory_key. */
const head = (cls, rotulo, titulo) =>
  `<header class="${cls}__cab" memory_type="text" memory_usage="custom" memory_key="countdown-intro">
  <p class="${cls}__rot" memory_type="text" memory_usage="custom" memory_key="countdown-rotulo">${rotulo}</p>
  <h2 class="${cls}__tit" memory_type="text" memory_usage="custom" memory_key="countdown-titulo">${titulo}</h2>
</header>`;

/* Fecha editable reutilizable. */
const fecha = (cls, texto) =>
  `<time class="${cls}__fecha" datetime="YYYY-MM-DDTHH:MM:SS" memory_type="text" memory_usage="custom" memory_key="countdown-fecha">${texto}</time>`;

module.exports = { wrap, head, fecha, CD_SCRIPT };
