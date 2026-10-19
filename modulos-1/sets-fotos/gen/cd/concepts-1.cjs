/* Conceptos de countdown 1–8. Cada función devuelve el HTML completo de un
 * módulo countdown con concepto/layout/animación ÚNICOS. */
const { wrap, head, fecha } = require('./core.cjs');

/* 1 · IMPERIAL — Reloj de sol romano: arco semicircular con gnomon de bronce
 * cuya SOMBRA (cuña) barre la escala; medallones colgantes con las unidades. */
function cd_imperial(S) {
  const C = 'cd1';
  const css = `
.${C} { text-align:center; }
.${C}__cab { margin-bottom:clamp(1.4rem,3vw,2rem); }
.${C}__rot { margin:0 0 .4rem; font-family:${S.mono}; font-size:clamp(.66rem,1.25vw,.78rem); letter-spacing:.5em; text-transform:uppercase; color:color-mix(in srgb, var(--secondary-color) 55%, var(--text-color)); }
.${C}__tit { margin:0; font-family:${S.disp}; font-weight:400; font-size:clamp(1.9rem,4.4vw,2.9rem); color:var(--primary-color); }
.${C}__dial { position:relative; width:min(100%,620px); height:clamp(170px,34vw,260px); margin:0 auto clamp(1.6rem,4vw,2.4rem); border-radius:min(46vw,260px) min(46vw,260px) 0 0; border:2px solid var(--primary-color); border-bottom:none; overflow:hidden; background:color-mix(in srgb, var(--surface-color) 55%, transparent); }
.${C}__dial::before { content:''; position:absolute; inset:10px; border-radius:inherit; border:1px dashed color-mix(in srgb, var(--accent-color) 55%, transparent); }
.${C}__sol { position:absolute; top:-6px; left:50%; transform:translateX(-50%); width:14px; height:14px; border-radius:50%; background:var(--accent-color); box-shadow:0 0 0 4px color-mix(in srgb, var(--accent-color) 25%, transparent), 0 0 18px color-mix(in srgb, var(--accent-color) 60%, transparent); }
.${C}__tick { position:absolute; bottom:0; left:50%; width:1.5px; height:13%; background:var(--accent-color); transform-origin:50% 100%; }
.${C}__tick--mayor { height:20%; width:2px; background:var(--primary-color); }
.${C}__numRoman { position:absolute; bottom:6%; font-family:${S.disp}; font-size:clamp(.6rem,1.4vw,.8rem); color:var(--primary-color); opacity:.8; }
.${C}__gnomon { position:absolute; left:50%; bottom:0; width:clamp(18px,3.4vw,26px); height:56%; transform:translateX(-50%); clip-path:polygon(50% 0, 100% 100%, 0 100%); background:linear-gradient(180deg, var(--primary-color), color-mix(in srgb, var(--primary-color) 45%, var(--bg-color))); filter:drop-shadow(0 3px 4px color-mix(in srgb, var(--text-color) 22%, transparent)); }
.${C}__gnomon::after { content:''; position:absolute; left:50%; bottom:0; transform:translateX(-50%); width:34px; height:5px; border-radius:3px; background:var(--primary-color); }
.${C}__sombra { position:absolute; left:50%; bottom:0; width:44%; height:clamp(16px,3.4vw,24px); transform-origin:left center; background:linear-gradient(90deg, color-mix(in srgb, var(--primary-color) 52%, transparent), transparent 94%); clip-path:polygon(0 38%, 100% 0, 100% 100%); animation:${C}-sombra 9s ease-in-out infinite alternate; filter:blur(.4px); }
@keyframes ${C}-sombra { from { transform:rotate(-54deg); } to { transform:rotate(54deg); } }
.${C}__fila { display:flex; flex-wrap:wrap; justify-content:center; gap:clamp(1rem,3.4vw,2.4rem); }
.${C}__med { width:clamp(96px,20vw,132px); padding:clamp(.9rem,2vw,1.2rem) .6rem clamp(1.6rem,3vw,2rem); background:var(--surface-color); border:1px solid var(--primary-color); border-radius:10px 10px 50% 50%; position:relative; box-shadow:0 14px 26px color-mix(in srgb, var(--text-color) 16%, transparent); }
.${C}__med::before { content:''; position:absolute; top:-26px; left:50%; width:1px; height:26px; background:var(--accent-color); }
.${C}__med::after { content:''; position:absolute; top:-32px; left:50%; transform:translateX(-50%); width:8px; height:8px; border-radius:50%; border:1px solid var(--primary-color); }
.${C}__num { display:block; font-family:${S.disp}; font-size:clamp(1.6rem,4.2vw,2.5rem); line-height:1; color:var(--primary-color); font-variant-numeric:tabular-nums; }
.${C}__etq { display:block; margin-top:.4rem; font-family:${S.mono}; font-size:clamp(.66rem,1.25vw,.78rem); letter-spacing:.34em; text-transform:uppercase; color:var(--text-color); }
.${C}__fecha { display:block; margin-top:clamp(1.4rem,3vw,2rem); font-family:${S.body}; font-style:italic; font-size:clamp(.85rem,1.6vw,.98rem); color:var(--text-color); }
@media (max-width:560px){ .${C}__fila { gap:.9rem; } .${C}__med { width:min(44%,150px); } .${C}__med:nth-child(n+3) { margin-top:1.6rem; } }
`;
  const ticks = [0, 30, 60, 90, 120, 150, 180].map((deg) =>
    `<i class="${C}__tick ${deg % 90 === 0 ? C + '__tick--mayor' : ''}" style="transform-origin:50% 100%; transform:translateX(-50%) rotate(${deg - 90}deg);"></i>`).join('');
  const romanos = [['XII', '5%'], ['IX', '18%'], ['VI', '50%'], ['III', '82%']]
    .map(([n, l]) => `<span class="${C}__numRoman" style="left:${l}; transform:translateX(-50%);">${n}</span>`).join('');
  const body = `${head(C, 'Hora solar', 'El gran día se acerca')}
<div class="${C}__dial" aria-hidden="true"><i class="${C}__sol"></i>${ticks}${romanos}<span class="${C}__sombra"></span><span class="${C}__gnomon"></span></div>
<ul class="${C}__fila" aria-label="Cuenta regresiva" style="list-style:none;margin:0;padding:0;">
  <li class="${C}__med"><b class="${C}__num" data-countdown-unit="days">--</b><span class="${C}__etq">Días</span></li>
  <li class="${C}__med"><b class="${C}__num" data-countdown-unit="hours">--</b><span class="${C}__etq">Horas</span></li>
  <li class="${C}__med"><b class="${C}__num" data-countdown-unit="minutes">--</b><span class="${C}__etq">Min</span></li>
  <li class="${C}__med"><b class="${C}__num" data-countdown-unit="seconds">--</b><span class="${C}__etq">Seg</span></li>
</ul>
${fecha(C, 'Solsticio · Fecha del evento · hora por confirmar')}`;
  return wrap(S, { id: 'countdown-solar-imperial', cls: C, css, body, desc: 'Reloj de sol imperial: la somra en cuña del gnomon de bronce barre un arco con numerales romanos; las unidades cuelgan como medallones.', tags: ['sundial', 'arco', 'medallones', 'romano'] });
}

/* 2 · MARIPOSAS — Vuelo ascendente: cuatro mariposas CSS revolotean llevando
 * cada una una unidad por una ruta punteada. */
function cd_mariposas(S) {
  const C = 'cd2';
  const css = `
.${C} { text-align:center; }
.${C}__cab { margin-bottom:clamp(1.2rem,3vw,2rem); }
.${C}__rot { margin:0 0 .4rem; font-family:${S.mono}; font-size:clamp(.66rem,1.25vw,.78rem); letter-spacing:.5em; text-transform:uppercase; color:color-mix(in srgb, var(--secondary-color) 55%, var(--text-color)); }
.${C}__tit { margin:0; font-family:${S.disp}; font-weight:400; font-size:clamp(1.9rem,4.4vw,2.9rem); color:var(--primary-color); }
.${C}__cielo { position:relative; width:min(100%,860px); margin:0 auto; padding:clamp(.6rem,2vw,1.4rem) 0 clamp(1rem,3vw,2rem); }
.${C}__ruta { position:absolute; left:6%; right:6%; top:38%; height:2px; background:repeating-linear-gradient(90deg, var(--secondary-color) 0 8px, transparent 8px 18px); opacity:.55; transform:rotate(-3deg); }
.${C}__fila { position:relative; display:flex; flex-wrap:wrap; justify-content:space-between; align-items:flex-end; gap:clamp(.8rem,2.6vw,1.6rem); }
.${C}__vuelo { flex:1 1 20%; min-width:0; display:grid; justify-items:center; }
.${C}__vuelo:nth-child(1){ padding-top:clamp(2.2rem,7vw,4.6rem); } .${C}__vuelo:nth-child(2){ padding-top:clamp(.4rem,2vw,1rem); }
.${C}__vuelo:nth-child(3){ padding-top:clamp(3rem,9vw,5.6rem); } .${C}__vuelo:nth-child(4){ padding-top:clamp(1rem,4vw,2.4rem); }
.${C}__bicho { position:relative; width:clamp(54px,9vw,74px); height:clamp(30px,5vw,42px); animation:${C}-revolotear 3.4s ease-in-out infinite; }
.${C}__ala { position:absolute; top:0; width:48%; height:100%; border:1.5px solid var(--primary-color); border-radius:70% 70% 60% 60% / 90% 90% 40% 40%; background:color-mix(in srgb, var(--primary-color) 16%, transparent); }
.${C}__ala--i { left:0; transform-origin:right center; animation:${C}-alaI 0.9s ease-in-out infinite; }
.${C}__ala--d { right:0; border-radius:70% 70% 60% 60% / 90% 90% 40% 40%; transform:scaleX(-1); transform-origin:left center; animation:${C}-alaI 0.9s ease-in-out infinite; }
@keyframes ${C}-alaI { 50% { transform:scaleX(.42); } }
@keyframes ${C}-revolotear { 50% { transform:translateY(-12px) rotate(2deg); } }
.${C}__cuerpo { position:absolute; left:50%; top:12%; width:3px; height:72%; background:var(--primary-color); transform:translateX(-50%); border-radius:2px; }
.${C}__posta { margin-top:.7rem; padding:.65rem .8rem .8rem; background:var(--surface-color); border:1px solid var(--surface-border-color); border-radius:16px 16px 4px 4px; box-shadow:0 10px 20px rgba(0,0,0,.12); }
.${C}__num { display:block; font-family:${S.disp}; font-size:clamp(1.5rem,4vw,2.3rem); line-height:1; color:var(--primary-color); font-variant-numeric:tabular-nums; }
.${C}__etq { display:block; margin-top:.3rem; font-family:${S.mono}; font-size:clamp(.56rem,1.05vw,.68rem); letter-spacing:.3em; text-transform:uppercase; color:var(--text-color); }
.${C}__fecha { display:block; margin-top:clamp(1.2rem,3vw,1.8rem); font-family:${S.body}; font-style:italic; font-size:clamp(.85rem,1.6vw,.98rem); color:var(--text-color); }
@media (max-width:560px){ .${C}__fila { justify-content:center; gap:1rem; } .${C}__vuelo { flex:1 1 40%; } .${C}__vuelo:nth-child(n){ padding-top:.4rem; } }
`;
  const mariposa = `${C}`; // se usa dentro del loop
  const unidades = [['days', 'Días'], ['hours', 'Horas'], ['minutes', 'Min'], ['seconds', 'Seg']]
    .map(([u, l]) => `<li class="${C}__vuelo" style="list-style:none;">
  <span class="${C}__bicho" aria-hidden="true"><i class="${C}__ala ${C}__ala--i"></i><i class="${C}__ala ${C}__ala--d"></i><i class="${C}__cuerpo"></i></span>
  <span class="${C}__posta"><b class="${C}__num" data-countdown-unit="${u}">--</b><span class="${C}__etq">${l}</span></span>
</li>`).join('\n');
  const body = `${head(C, 'Al vuelo', 'Mariposas hacia el gran día')}
<div class="${C}__cielo">
  <span class="${C}__ruta" aria-hidden="true"></span>
  <ul class="${C}__fila" aria-label="Cuenta regresiva" style="list-style:none;margin:0;padding:0;">
${unidades}
  </ul>
</div>
${fecha(C, 'Fecha del evento · hora por confirmar')}`;
  return wrap(S, { id: 'countdown-vuelo-mariposas', cls: C, css, body, desc: 'Cuatro mariposas revolotean a distintas alturas llevando las unidades del conteo sobre postales colgantes.', tags: ['mariposas', 'vuelo', 'revolotear'] });
}

/* 3 · GLITTER — Split-flap de aeropuerto: tablero mecánico con cartulinas que
 * giran sobre bisagra central y remaches laterales. */
function cd_glitter(S) {
  const C = 'cd3';
  const css = `
.${C} { text-align:center; }
.${C}__rot { margin:0 0 .4rem; font-family:${S.mono}; font-size:clamp(.66rem,1.25vw,.78rem); letter-spacing:.5em; text-transform:uppercase; color:color-mix(in srgb, var(--secondary-color) 55%, var(--text-color)); }
.${C}__tit { margin:0 0 clamp(1.4rem,3vw,2rem); font-family:${S.disp}; font-weight:400; font-size:clamp(1.8rem,4.2vw,2.7rem); color:var(--primary-color); }
.${C}__tablero { width:min(100%,760px); margin:0 auto; padding:clamp(1rem,3vw,1.8rem) clamp(.6rem,2vw,1.4rem); background:var(--surface-color); border:1px solid var(--primary-color); border-radius:14px; box-shadow:0 24px 48px rgba(0,0,0,.28); position:relative; }
.${C}__tablero::before { content:''; position:absolute; inset:6px; border:1px dashed color-mix(in srgb, var(--accent-color) 45%, transparent); border-radius:9px; pointer-events:none; }
.${C}__fila { display:flex; flex-wrap:wrap; justify-content:center; gap:clamp(.7rem,2.4vw,1.5rem); }
.${C}__celda { width:clamp(88px,18vw,128px); }
.${C}__casete { position:relative; height:clamp(86px,17vw,120px); perspective:420px; background:color-mix(in srgb, var(--bg-color) 72%, var(--surface-color)); border-radius:8px; overflow:hidden; box-shadow:inset 0 0 0 1.5px var(--primary-color), inset 0 -10px 18px rgba(0,0,0,.35); }
.${C}__casete::after { content:''; position:absolute; left:6px; right:6px; top:50%; height:1.5px; background:color-mix(in srgb, var(--bg-color) 90%, #000); z-index:3; }
.${C}__rem { position:absolute; top:8px; bottom:8px; width:5px; border-radius:3px; background:var(--primary-color); opacity:.8; z-index:4; }
.${C}__rem--i { left:4px; } .${C}__rem--d { right:4px; }
.${C}__hoja { position:absolute; inset:0; display:grid; place-items:center; }
.${C}__hoja--sup { top:0; height:50%; transform-origin:bottom center; background:color-mix(in srgb, var(--surface-color) 88%, #fff 6%); }
.${C}__casete.vuelta .${C}__hoja--sup { animation:${C}-golpe .5s cubic-bezier(.55,0,.3,1); }
@keyframes ${C}-golpe { 0% { transform:rotateX(0); } 100% { transform:rotateX(-92deg); } }
.${C}__num { font-family:${S.mono}; font-weight:700; font-size:clamp(2rem,5.4vw,3.2rem); line-height:1; color:var(--primary-color); font-variant-numeric:tabular-nums; text-shadow:0 2px 0 rgba(0,0,0,.4); }
.${C}__hoja--sup .${C}__num { transform:translateY(38%); }
.${C}__etq { display:block; margin:.55rem 0 0; text-align:center; font-family:${S.mono}; font-size:clamp(.6rem,1.1vw,.72rem); letter-spacing:.4em; text-transform:uppercase; color:var(--text-color); }
.${C}__pies { display:flex; justify-content:space-between; width:min(100%,760px); margin:.8rem auto 0; }
.${C}__pie { width:26%; height:8px; background:var(--surface-border-color); border-radius:0 0 6px 6px; }
.${C}__fecha { display:block; margin:clamp(1.3rem,3vw,1.9rem) 0 0; font-family:${S.body}; font-style:italic; font-size:clamp(.85rem,1.6vw,.98rem); color:var(--text-color); }
@media (max-width:560px){ .${C}__celda { width:clamp(74px,42vw,110px); } .${C}__fila { gap:.7rem; } }
`;
  const celdas = [['days', 'Días'], ['hours', 'Horas'], ['minutes', 'Min'], ['seconds', 'Seg']]
    .map(([u, l]) => `<li class="${C}__celda" style="list-style:none;">
  <div class="${C}__casete"><i class="${C}__rem ${C}__rem--i"></i><i class="${C}__rem ${C}__rem--d"></i>
    <span class="${C}__hoja ${C}__hoja--inf"><b class="${C}__num" data-countdown-unit="${u}">--</b></span>
    <span class="${C}__hoja ${C}__hoja--sup" aria-hidden="true"><b class="${C}__num ${C}__eco">00</b></span>
  </div>
  <span class="${C}__etq">${l}</span>
</li>`).join('\n');
  const body = `<header memory_type="text" memory_usage="custom" memory_key="countdown-intro">
  <p class="${C}__rot" memory_type="text" memory_usage="custom" memory_key="countdown-rotulo">Salida próxima</p>
  <h2 class="${C}__tit" memory_type="text" memory_usage="custom" memory_key="countdown-titulo">Tablero de abordaje</h2>
</header>
<div class="${C}__tablero">
  <ul class="${C}__fila" aria-label="Cuenta regresiva" style="list-style:none;margin:0;padding:0;">
${celdas}
  </ul>
</div>
<div class="${C}__pies" aria-hidden="true"><i class="${C}__pie"></i><i class="${C}__pie"></i></div>
<script>
(function () {
  var root = null;
  try { root = document.currentScript.closest('[data-gemini-id^="countdown"]'); } catch (e) {}
  if (!root) return;
  root.querySelectorAll('[data-countdown-unit]').forEach(function (num) {
    var casete = num.closest('.cd3__casete');
    var eco = casete && casete.querySelector('.cd3__eco');
    if (!casete || !eco) return;
    eco.textContent = num.textContent;
    var ultimo = num.textContent;
    new MutationObserver(function () {
      if (num.textContent === ultimo) return;
      var previo = ultimo;
      ultimo = num.textContent;
      eco.textContent = previo;
      casete.classList.remove('vuelta');
      void casete.offsetWidth;
      casete.classList.add('vuelta');
      setTimeout(function () { eco.textContent = ultimo; }, 470);
    }).observe(num, { childList: true, characterData: true, subtree: true });
  });
})();
</script>
${fecha(C, 'Fecha del evento · hora por confirmar')}`;
  return wrap(S, { id: 'countdown-splitflap-laser', cls: C, css, body, desc: 'Tablero split-flap estilo aeropuerto: casetes mecánicos con hoja superior que gira sobre su bisagra al ritmo del conteo.', tags: ['split-flap', 'aeropuerto', 'mecanico'] });
}

/* 4 · MONOLAVANDA — Reloj de arena de mármol: la arena cae mientras las
 * unidades graban el marco de madera. Geometría 100% porcentual (robusta
 * en desktop y móvil). */
function cd_monolavanda(S) {
  const C = 'cd4';
  const css = `
.${C} { text-align:center; }
.${C}__rot { margin:0 0 .4rem; font-family:${S.mono}; font-size:clamp(.66rem,1.25vw,.78rem); letter-spacing:.5em; text-transform:uppercase; color:color-mix(in srgb, var(--secondary-color) 55%, var(--text-color)); }
.${C}__tit { margin:0 0 clamp(1.4rem,3vw,2rem); font-family:${S.disp}; font-weight:400; font-size:clamp(1.8rem,4.2vw,2.7rem); color:var(--primary-color); }
.${C}__mesa { display:flex; align-items:center; justify-content:center; gap:clamp(1.4rem,5vw,4rem); flex-wrap:wrap; }
.${C}__reloj { position:relative; width:clamp(130px,26vw,175px); height:clamp(200px,38vw,265px); flex:none; }
.${C}__tapa { position:absolute; left:0; right:0; height:15px; background:var(--surface-color); border:1.5px solid var(--primary-color); border-radius:4px; z-index:3; }
.${C}__tapa--s { top:0; } .${C}__tapa--i { bottom:0; }
.${C}__poste { position:absolute; top:14px; bottom:14px; width:5px; border-radius:3px; background:color-mix(in srgb, var(--primary-color) 60%, var(--surface-color)); z-index:3; }
.${C}__poste--i { left:-2px; } .${C}__poste--d { right:-2px; }
.${C}__vidrio { position:absolute; top:15px; bottom:15px; left:50%; transform:translateX(-50%); width:60%; background:color-mix(in srgb, var(--accent-color) 16%, transparent); border:1.5px solid var(--primary-color); border-radius:14px; clip-path:polygon(0 0, 100% 0, 63% 46%, 63% 54%, 100% 100%, 0 100%, 37% 54%, 37% 46%); }
.${C}__arena { position:absolute; left:50%; transform:translateX(-50%); width:52%; background:color-mix(in srgb, var(--secondary-color) 75%, var(--accent-color)); }
.${C}__arena--sup { top:16%; height:24%; clip-path:polygon(0 100%, 100% 100%, 62% 14%, 38% 14%); animation:${C}-vaciado 7s ease-in-out infinite alternate; transform-origin:top center; }
@keyframes ${C}-vaciado { to { height:9%; } }
.${C}__chorro { position:absolute; top:46%; left:50%; transform:translateX(-50%); width:2.5px; height:14%; background:repeating-linear-gradient(var(--secondary-color) 0 5px, transparent 5px 9px); animation:${C}-chorro 0.7s linear infinite; }
@keyframes ${C}-chorro { to { background-position:0 9px; } }
.${C}__arena--inf { bottom:16%; height:10%; width:44%; border-radius:50% 50% 6% 6%/80% 80% 20% 20%; animation:${C}-llenado 7s ease-in-out infinite alternate; }
@keyframes ${C}-llenado { to { height:22%; width:54%; } }
.${C}__placas { display:grid; gap:.7rem; min-width:clamp(230px,44vw,320px); }
.${C}__placa { display:flex; align-items:baseline; justify-content:space-between; gap:1rem; padding:.55rem .9rem; background:var(--surface-color); border:1px solid var(--surface-border-color); border-left:4px solid var(--primary-color); }
.${C}__placa--par { border-left:none; border-right:4px solid var(--primary-color); flex-direction:row-reverse; text-align:right; }
.${C}__num { font-family:${S.disp}; font-size:clamp(1.3rem,3.4vw,1.9rem); line-height:1; color:var(--primary-color); font-variant-numeric:tabular-nums; }
.${C}__etq { font-family:${S.mono}; font-size:clamp(.64rem,1.2vw,.76rem); letter-spacing:.3em; text-transform:uppercase; color:var(--text-color); }
.${C}__fecha { display:block; margin:clamp(1.4rem,3vw,2rem) 0 0; font-family:${S.body}; font-style:italic; font-size:clamp(.85rem,1.6vw,.98rem); color:var(--text-color); }
@media (max-width:560px){ .${C}__mesa { flex-direction:column; } .${C}__placas { grid-template-columns:1fr 1fr; width:100%; min-width:0; } .${C}__reloj { width:clamp(120px,38vw,160px); height:clamp(185px,54vw,235px); } }
`;
  const placas = [['days', 'Días'], ['hours', 'Horas'], ['minutes', 'Min'], ['seconds', 'Seg']]
    .map(([u, l], i) => `<div class="${C}__placa ${i % 2 ? C + '__placa--par' : ''}"><b class="${C}__num" data-countdown-unit="${u}">--</b><span class="${C}__etq">${l}</span></div>`).join('\n');
  const body = `<header memory_type="text" memory_usage="custom" memory_key="countdown-intro">
  <p class="${C}__rot" memory_type="text" memory_usage="custom" memory_key="countdown-rotulo">El tiempo se cuela</p>
  <h2 class="${C}__tit" memory_type="text" memory_usage="custom" memory_key="countdown-titulo">Grano a grano</h2>
</header>
<div class="${C}__mesa">
  <div class="${C}__reloj" aria-hidden="true">
    <i class="${C}__poste ${C}__poste--i"></i><i class="${C}__poste ${C}__poste--d"></i>
    <i class="${C}__tapa ${C}__tapa--s"></i><i class="${C}__tapa ${C}__tapa--i"></i>
    <span class="${C}__vidrio"></span>
    <span class="${C}__arena ${C}__arena--sup"></span><span class="${C}__chorro"></span><span class="${C}__arena ${C}__arena--inf"></span>
  </div>
  <div class="${C}__placas">
${placas}
  </div>
</div>
${fecha(C, 'Fecha del evento · hora por confirmar')}`;
  return wrap(S, { id: 'countdown-arena-lavanda', cls: C, css, body, desc: 'Reloj de arena sobre mármol con postes de madera: la arena cae en loop mientras las unidades aparecen grabadas en placas del marco.', tags: ['hourglass', 'arena', 'marmol'] });
}

/* 5 · ARCOACUARELA — Arcoíris de acuarela con gotas que gotean las unidades. */
function cd_arcoacuarela(S) {
  const C = 'cd5';
  const css = `
.${C} { text-align:center; }
.${C}__rot { margin:0 0 .4rem; font-family:${S.mono}; font-size:clamp(.66rem,1.25vw,.78rem); letter-spacing:.5em; text-transform:uppercase; color:color-mix(in srgb, var(--secondary-color) 55%, var(--text-color)); }
.${C}__tit { margin:0 0 clamp(.6rem,2vw,1rem); font-family:${S.disp}; font-weight:400; font-size:clamp(1.8rem,4.2vw,2.7rem); color:var(--primary-color); }
.${C}__lienzo { position:relative; width:min(100%,760px); height:clamp(180px,34vw,280px); margin:0 auto; }
.${C}__arco { position:absolute; inset:0; border-radius:0 0 50% 50% / 0 0 100% 100%; overflow:hidden; filter:blur(7px); opacity:.8; }
.${C}__franja { position:absolute; left:0; right:0; height:25%; }
.${C}__franja:nth-child(1){ top:0; background:color-mix(in srgb, var(--primary-color) 62%, transparent); }
.${C}__franja:nth-child(2){ top:25%; background:color-mix(in srgb, var(--secondary-color) 58%, transparent); }
.${C}__franja:nth-child(3){ top:50%; background:color-mix(in srgb, var(--accent-color) 75%, transparent); }
.${C}__franja:nth-child(4){ top:75%; height:40%; background:color-mix(in srgb, var(--secondary-color) 30%, transparent); }
.${C}__arco2 { position:absolute; inset:14% 10% 0; border-radius:0 0 50% 50% / 0 0 100% 100%; background:color-mix(in srgb, var(--bg-color) 82%, transparent); filter:blur(2px); }
.${C}__nube { position:absolute; top:-8px; width:clamp(70px,12vw,110px); height:34px; border-radius:20px; background:color-mix(in srgb, var(--surface-color) 92%, transparent); box-shadow:0 6px 14px rgba(0,0,0,.08); animation:${C}-flota 5s ease-in-out infinite; }
.${C}__nube::before { content:''; position:absolute; top:-12px; left:22%; width:44%; height:24px; border-radius:50%; background:inherit; }
.${C}__nube--i { left:2%; } .${C}__nube--d { right:2%; animation-delay:2.2s; }
@keyframes ${C}-flota { 50% { transform:translateY(8px); } }
.${C}__goteadero { position:absolute; left:0; right:0; bottom:0; display:flex; justify-content:space-around; align-items:flex-end; gap:.6rem; padding:0 4%; }
.${C}__colgante { display:grid; justify-items:center; }
.${C}__hilo { width:1.5px; height:clamp(18px,5vw,44px); background:var(--secondary-color); }
.${C}__gota { position:relative; width:clamp(74px,15vw,104px); padding:.8rem .5rem .95rem; clip-path:polygon(50% 100%, 6% 72%, 12% 18%, 88% 18%, 94% 72%); background:var(--surface-color); border-top:3px solid var(--primary-color); display:grid; place-items:center; animation:${C}-gotea 2.6s ease-in-out infinite; }
.${C}__colgante:nth-child(2) .${C}__gota { animation-delay:.4s; } .${C}__colgante:nth-child(3) .${C}__gota { animation-delay:.9s; } .${C}__colgante:nth-child(4) .${C}__gota { animation-delay:1.3s; }
@keyframes ${C}-gotea { 50% { transform:translateY(7px) scale(1.03); } }
.${C}__num { font-family:${S.disp}; font-size:clamp(1.4rem,3.8vw,2.1rem); line-height:1.05; color:var(--primary-color); font-variant-numeric:tabular-nums; }
.${C}__etq { display:block; margin-top:.25rem; font-family:${S.mono}; font-size:clamp(.56rem,1.02vw,.66rem); letter-spacing:.28em; text-transform:uppercase; color:var(--text-color); }
.${C}__fecha { display:block; margin:clamp(1.3rem,3vw,1.9rem) 0 0; font-family:${S.body}; font-style:italic; font-size:clamp(.85rem,1.6vw,.98rem); color:var(--text-color); }
@media (max-width:560px){ .${C}__lienzo { height:clamp(200px,60vw,300px); } .${C}__goteadero { flex-wrap:wrap; } .${C}__colgante { flex:1 1 40%; } }
`;
  const gotas = [['days', 'Días'], ['hours', 'Horas'], ['minutes', 'Min'], ['seconds', 'Seg']]
    .map(([u, l]) => `<div class="${C}__colgante"><i class="${C}__hilo" aria-hidden="true"></i>
  <div class="${C}__gota"><span><b class="${C}__num" data-countdown-unit="${u}">--</b><span class="${C}__etq">${l}</span></span></div>
</div>`).join('\n');
  const body = `<header memory_type="text" memory_usage="custom" memory_key="countdown-intro">
  <p class="${C}__rot" memory_type="text" memory_usage="custom" memory_key="countdown-rotulo">Pintado a mano</p>
  <h2 class="${C}__tit" memory_type="text" memory_usage="custom" memory_key="countdown-titulo">Lluvia de color</h2>
</header>
<div class="${C}__lienzo">
  <div class="${C}__arco" aria-hidden="true"><i class="${C}__franja"></i><i class="${C}__franja"></i><i class="${C}__franja"></i><i class="${C}__franja"></i></div>
  <div class="${C}__arco2" aria-hidden="true"></div>
  <span class="${C}__nube ${C}__nube--i" aria-hidden="true"></span><span class="${C}__nube ${C}__nube--d" aria-hidden="true"></span>
  <div class="${C}__goteadero" aria-label="Cuenta regresiva">
${gotas}
  </div>
</div>
${fecha(C, 'Fecha del evento · hora por confirmar')}`;
  return wrap(S, { id: 'countdown-arco-acuarela', cls: C, css, body, desc: 'Arcoíris de acuarela difuminada del que gotean cuatro gotas con las unidades, meciéndose con la lluvia de color.', tags: ['acuarela', 'arcoiris', 'gotas'] });
}

/* 6 · AZULFLORAL — Reloj analógico de estación: esfera con agujas en marcha
 * y ventanillas de andén con las unidades. */
function cd_azulfloral(S) {
  const C = 'cd6';
  const css = `
.${C} { text-align:center; }
.${C}__rot { margin:0 0 .4rem; font-family:${S.mono}; font-size:clamp(.66rem,1.25vw,.78rem); letter-spacing:.5em; text-transform:uppercase; color:color-mix(in srgb, var(--secondary-color) 55%, var(--text-color)); }
.${C}__tit { margin:0 0 clamp(1.2rem,3vw,1.8rem); font-family:${S.disp}; font-weight:400; font-size:clamp(1.8rem,4.2vw,2.7rem); color:var(--primary-color); }
.${C}__estacion { display:flex; align-items:center; justify-content:center; gap:clamp(1.4rem,4vw,3rem); flex-wrap:wrap; }
.${C}__esfera { position:relative; width:clamp(180px,30vw,250px); aspect-ratio:1; border-radius:50%; background:var(--surface-color); border:2px solid var(--primary-color); box-shadow:0 18px 40px rgba(0,0,0,.16), inset 0 0 0 8px color-mix(in srgb, var(--accent-color) 24%, transparent); flex:none; }
.${C}__minuto { position:absolute; inset:0; border-radius:50%; }
.${C}__minuto i { position:absolute; left:50%; top:6px; width:2px; height:9%; margin-left:-1px; background:var(--secondary-color); transform-origin:50% calc(50 - 3%); }
.${C}__marca { position:absolute; inset:0; border-radius:50%; background:radial-gradient(circle, transparent 0 34%, color-mix(in srgb, var(--primary-color) 12%, transparent) 34.5% 35%, transparent 35.5%); }
.${C}__flor { position:absolute; left:50%; top:50%; width:clamp(54px,9vw,72px); aspect-ratio:1; transform:translate(-50%,-50%); }
.${C}__petalo { position:absolute; left:50%; top:50%; width:38%; height:76%; margin:-38% 0 0 -19%; border-radius:50% 50% 50% 50%/60% 60% 40% 40%; background:color-mix(in srgb, var(--secondary-color) 34%, transparent); border:1px solid var(--primary-color); transform-origin:50% 100%; opacity:.8; }
.${C}__centro { position:absolute; left:50%; top:50%; width:18px; height:18px; transform:translate(-50%,-50%); border-radius:50%; background:var(--primary-color); }
.${C}__aguja { position:absolute; left:50%; bottom:50%; transform-origin:50% 100%; border-radius:3px; }
.${C}__aguja--h { width:5px; height:26%; margin-left:-2.5px; background:var(--primary-color); animation:${C}-vuelta 120s linear infinite; }
.${C}__aguja--m { width:3.5px; height:37%; margin-left:-1.75px; background:var(--text-color); animation:${C}-vuelta 20s linear infinite; }
.${C}__aguja--s { width:1.8px; height:42%; margin-left:-.9px; background:var(--secondary-color); animation:${C}-vuelta 60s steps(60) infinite; }
@keyframes ${C}-vuelta { to { transform:rotate(360deg); } }
.${C}__andenes { display:grid; gap:clamp(.55rem,1.6vw,.85rem); align-content:center; }
.${C}__ventanilla { display:flex; align-items:center; gap:.8rem; min-width:clamp(150px,22vw,190px); padding:.6rem .9rem .7rem; background:color-mix(in srgb, var(--bg-color) 68%, var(--surface-color)); border:1px solid var(--primary-color); border-radius:6px; box-shadow:inset 0 3px 8px rgba(0,0,0,.3); }
.${C}__ventanilla:nth-child(2){ margin-left:clamp(.5rem,2vw,1.2rem); } .${C}__ventanilla:nth-child(3){ margin-left:0; margin-right:clamp(.5rem,2vw,1.2rem); } .${C}__ventanilla:nth-child(4){ margin-left:clamp(1rem,3vw,1.8rem); }
.${C}__num { font-family:${S.mono}; font-weight:700; font-size:clamp(1.5rem,4vw,2.2rem); line-height:1; color:var(--accent-color); text-shadow:0 0 12px color-mix(in srgb, var(--accent-color) 60%, transparent); font-variant-numeric:tabular-nums; min-width:2.6ch; text-align:center; }
.${C}__etq { font-family:${S.mono}; font-size:clamp(.56rem,1.05vw,.68rem); letter-spacing:.34em; text-transform:uppercase; color:var(--text-color); }
.${C}__fecha { display:block; margin-top:clamp(1.2rem,3vw,1.8rem); font-family:${S.body}; font-style:italic; font-size:clamp(.85rem,1.6vw,.98rem); color:var(--text-color); }
@media (max-width:560px){ .${C}__ventanilla { min-width:40%; } }
`;
  const petalos = [0, 60, 120, 180, 240, 300].map((d) => `<i class="${C}__petalo" style="transform:rotate(${d}deg);"></i>`).join('');
  const minutos = Array.from({ length: 12 }, (_, i) => `<i style="position:absolute;left:50%;top:4px;width:2px;height:${i % 3 === 0 ? '8%' : '5%'};margin-left:-1px;background:${i % 3 === 0 ? 'var(--primary-color)' : 'var(--secondary-color)'};transform-origin:50% calc(600% );transform:rotate(${i * 30}deg);"></i>`).join('');
  const ventanillas = [['days', 'Días'], ['hours', 'Horas'], ['minutes', 'Min'], ['seconds', 'Seg']]
    .map(([u, l]) => `<div class="${C}__ventanilla"><b class="${C}__num" data-countdown-unit="${u}">--</b><span class="${C}__etq">${l}</span></div>`).join('\n');  const body = `<header memory_type="text" memory_usage="custom" memory_key="countdown-intro">
  <p class="${C}__rot" memory_type="text" memory_usage="custom" memory_key="countdown-rotulo">Andén floral</p>
  <h2 class="${C}__tit" memory_type="text" memory_usage="custom" memory_key="countdown-titulo">La hora del encuentro</h2>
</header>
<div class="${C}__estacion">
  <div class="${C}__esfera" aria-hidden="true">${minutos}<span class="${C}__flor">${petalos}<i class="${C}__centro"></i></span>
    <i class="${C}__aguja ${C}__aguja--h"></i><i class="${C}__aguja ${C}__aguja--m"></i><i class="${C}__aguja ${C}__aguja--s"></i>
  </div>
  <div class="${C}__andenes" aria-label="Cuenta regresiva">
${ventanillas}
  </div>
</div>
${fecha(C, 'Fecha del evento · hora por confirmar')}`;
  return wrap(S, { id: 'countdown-estacion-floral', cls: C, css, body, desc: 'Reloj analógico de estación con agujas vivas y flor en el eje; las unidades brillan en ventanillas de andén.', tags: ['analogico', 'estacion', 'esfera'] });
}

/* 7 · ROSABEIGE — Calendario de pared con días tachados camino al día
 * marcado; unidades en pestañas de libreta. */
function cd_rosabeige(S) {
  const C = 'cd7';
  const css = `
.${C} { text-align:center; }
.${C}__rot { margin:0 0 .4rem; font-family:${S.mono}; font-size:clamp(.66rem,1.25vw,.78rem); letter-spacing:.5em; text-transform:uppercase; color:color-mix(in srgb, var(--secondary-color) 55%, var(--text-color)); }
.${C}__tit { margin:0 0 clamp(1.4rem,3vw,2rem); font-family:${S.disp}; font-weight:400; font-size:clamp(1.8rem,4.2vw,2.7rem); color:var(--primary-color); }
.${C}__mesa { display:flex; justify-content:center; align-items:stretch; gap:clamp(1rem,3vw,2rem); }
.${C}__hoja { position:relative; width:min(100%,420px); background:var(--surface-color); border:1px solid var(--surface-border-color); box-shadow:0 18px 36px rgba(0,0,0,.14); padding:1rem 1.1rem 1.3rem; text-align:left; transform:rotate(-1deg); animation:${C}-hoja 6s ease-in-out infinite alternate; }
@keyframes ${C}-hoja { to { transform:rotate(.6deg); } }
.${C}__anilla { display:flex; gap:.55rem; justify-content:center; margin-bottom:.8rem; }
.${C}__anilla i { width:9px; height:22px; border-radius:5px; background:color-mix(in srgb, var(--primary-color) 45%, var(--surface-color)); border:1px solid var(--primary-color); }
.${C}__mes { display:flex; justify-content:space-between; align-items:baseline; font-family:${S.disp}; color:var(--primary-color); border-bottom:2px solid var(--primary-color); padding-bottom:.5rem; margin-bottom:.8rem; }
.${C}__mes b { font-size:clamp(1.1rem,2.4vw,1.4rem); font-weight:400; }
.${C}__diasem { display:grid; grid-template-columns:repeat(7,1fr); gap:.3rem; font-family:${S.mono}; font-size:.5rem; letter-spacing:.08em; text-transform:uppercase; color:var(--secondary-color); text-align:center; }
.${C}__dias { display:grid; grid-template-columns:repeat(7,1fr); gap:.3rem; }
.${C}__dia { position:relative; aspect-ratio:1; display:grid; place-items:center; font-family:${S.body}; font-size:clamp(.6rem,1.4vw,.78rem); color:var(--text-color); border-radius:6px; }
.${C}__dia--pas { color:color-mix(in srgb, var(--text-color) 42%, transparent); }
.${C}__dia--pas::after { content:''; position:absolute; left:18%; right:18%; top:50%; height:1.5px; background:color-mix(in srgb, var(--primary-color) 65%, transparent); transform:rotate(-18deg); }
.${C}__dia--fin { outline:1.5px solid var(--primary-color); color:var(--primary-color); }
.${C}__dia--meta { background:var(--primary-color); color:var(--bg-color); font-weight:700; border-radius:50%; animation:${C}-pulso 2.2s ease-in-out infinite; }
@keyframes ${C}-pulso { 50% { box-shadow:0 0 0 8px color-mix(in srgb, var(--primary-color) 22%, transparent); } }
.${C}__lateral { display:grid; align-content:center; gap:.7rem; }
.${C}__pestana { display:flex; align-items:baseline; justify-content:space-between; gap:.9rem; padding:.6rem 1rem; background:var(--surface-color); border:1px solid var(--surface-border-color); clip-path:polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%); margin-left:-10px; }
.${C}__pestana:nth-child(2){ margin-left:0; margin-right:-10px; clip-path:polygon(12px 0, 100% 0, 100% 100%, 12px 100%, 0 50%); }
.${C}__num { font-family:${S.disp}; font-size:clamp(1.3rem,3.2vw,1.8rem); line-height:1; color:var(--primary-color); font-variant-numeric:tabular-nums; }
.${C}__etq { font-family:${S.mono}; font-size:clamp(.56rem,1.05vw,.68rem); letter-spacing:.3em; text-transform:uppercase; color:var(--text-color); }
.${C}__fecha { display:block; margin:clamp(1.3rem,3vw,1.9rem) 0 0; font-family:${S.body}; font-style:italic; font-size:clamp(.85rem,1.6vw,.98rem); color:var(--text-color); }
@media (max-width:640px){ .${C}__mesa { flex-direction:column; align-items:center; } .${C}__lateral { width:100%; grid-template-columns:1fr 1fr; } .${C}__pestana, .${C}__pestana:nth-child(2) { margin:0; clip-path:none; border-left:4px solid var(--primary-color); } }
`;
  const diasSem = ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d) => `<span>${d}</span>`).join('');
  const dias = Array.from({ length: 30 }, (_, i) => {
    const n = i + 1;
    const cls = n === 30 ? C + '__dia--meta' : n > 21 ? C + '__dia--fin' : n < 18 ? C + '__dia--pas' : '';
    return `<span class="${C}__dia ${cls}">${n}</span>`;
  }).join('');
  const pestanas = [['days', 'Días'], ['hours', 'Horas'], ['minutes', 'Min'], ['seconds', 'Seg']]
    .map(([u, l]) => `<div class="${C}__pestana"><b class="${C}__num" data-countdown-unit="${u}">--</b><span class="${C}__etq">${l}</span></div>`).join('\n');
  const body = `<header memory_type="text" memory_usage="custom" memory_key="countdown-intro">
  <p class="${C}__rot" memory_type="text" memory_usage="custom" memory_key="countdown-rotulo">Cuenta regresiva</p>
  <h2 class="${C}__tit" memory_type="text" memory_usage="custom" memory_key="countdown-titulo">Faltan pocos días</h2>
</header>
<div class="${C}__mesa">
  <div class="${C}__hoja" aria-hidden="true">
    <div class="${C}__anilla"><i></i><i></i><i></i></div>
    <div class="${C}__mes"><b memory_type="text" memory_usage="custom" memory_key="countdown-mes">Mes del evento</b><span style="font-family:${S.mono};font-size:.62rem;letter-spacing:.2em;color:var(--secondary-color);">Año del evento</span></div>
    <div class="${C}__diasem">${diasSem}</div>
    <div class="${C}__dias">${dias}</div>
  </div>
  <div class="${C}__lateral" aria-label="Cuenta regresiva">
${pestanas}
  </div>
</div>
${fecha(C, 'Fecha del evento · hora por confirmar')}`;
  return wrap(S, { id: 'countdown-almanaque-rosa', cls: C, css, body, desc: 'Calendario de pared con los días tachados camino al día marcado; las unidades viven en pestañas de libreta.', tags: ['calendario', 'tachado', 'libreta'] });
}

/* 8 · TELABLANCA — Vela que se consume: cera, llama parpadeante y unidades
 * grabadas en goterones de cera. */
function cd_telablanca(S) {
  const C = 'cd8';
  const css = `
.${C} { text-align:center; }
.${C}__rot { margin:0 0 .4rem; font-family:${S.mono}; font-size:clamp(.66rem,1.25vw,.78rem); letter-spacing:.5em; text-transform:uppercase; color:color-mix(in srgb, var(--secondary-color) 55%, var(--text-color)); }
.${C}__tit { margin:0 0 clamp(1.6rem,3vw,2.2rem); font-family:${S.disp}; font-weight:400; font-size:clamp(1.8rem,4.2vw,2.7rem); color:var(--primary-color); }
.${C}__altar { display:flex; justify-content:center; align-items:flex-end; gap:clamp(1.2rem,4vw,3rem); flex-wrap:wrap; }
.${C}__vela { position:relative; width:clamp(72px,13vw,96px); height:clamp(190px,32vw,260px); background:repeating-linear-gradient(173deg, color-mix(in srgb, var(--surface-color) 96%, #fff) 0 12px, color-mix(in srgb, var(--accent-color) 45%, var(--surface-color)) 12px 17px); border:2px solid color-mix(in srgb, var(--text-color) 55%, var(--primary-color)); border-radius:10px 10px 6px 6px; box-shadow:inset -8px 0 14px rgba(0,0,0,.1), 0 16px 30px rgba(0,0,0,.18); }
.${C}__cera { position:absolute; top:-7px; left:-5px; right:-5px; height:15px; border-radius:50%; background:color-mix(in srgb, var(--primary-color) 40%, var(--surface-color)); border:1.5px solid color-mix(in srgb, var(--text-color) 55%, var(--primary-color)); animation:${C}-derretir 5s ease-in-out infinite alternate; }
@keyframes ${C}-derretir { to { transform:translateY(5px) scaleX(1.05); } }
.${C}__gotaCera { position:absolute; width:7px; height:20px; border-radius:4px; background:color-mix(in srgb, var(--primary-color) 36%, var(--surface-color)); border:1.5px solid color-mix(in srgb, var(--text-color) 55%, var(--primary-color)); }
.${C}__gotaCera--a { left:-10px; top:22%; } .${C}__gotaCera--b { right:-10px; top:46%; height:30px; } .${C}__gotaCera--c { left:-9px; top:70%; height:14px; }
.${C}__pabilo { position:absolute; top:-14px; left:50%; width:2.5px; height:14px; background:var(--text-color); transform:translateX(-50%); }
.${C}__llama { position:absolute; top:clamp(-42px,-6.5vw,-34px); left:50%; width:18px; height:30px; transform:translateX(-50%); border-radius:50% 50% 50% 50%/62% 62% 38% 38%; background:radial-gradient(circle at 50% 72%, var(--accent-color) 0 20%, color-mix(in srgb, var(--primary-color) 90%, var(--accent-color)) 52%, color-mix(in srgb, var(--primary-color) 70%, var(--text-color)) 100%); border:1.5px solid color-mix(in srgb, var(--text-color) 70%, var(--primary-color)); filter:drop-shadow(0 0 10px color-mix(in srgb, var(--text-color) 45%, transparent)); animation:${C}-llama 1.6s ease-in-out infinite alternate; }
@keyframes ${C}-llama { 25% { transform:translateX(-50%) scale(.94,1.06) rotate(-2deg); } 75% { transform:translateX(-50%) scale(1.05,.95) rotate(2deg); } }
.${C}__halo { position:absolute; top:clamp(-76px,-11.5vw,-60px); left:50%; transform:translateX(-50%); width:136px; height:136px; border-radius:50%; border:1.5px dashed color-mix(in srgb, var(--primary-color) 45%, transparent); background:radial-gradient(circle, color-mix(in srgb, var(--primary-color) 20%, transparent), transparent 62%); animation:${C}-halo 2.8s ease-in-out infinite; }
@keyframes ${C}-halo { 50% { opacity:.55; transform:translateX(-50%) scale(1.12); } }
.${C}__platos { display:grid; gap:.8rem; align-content:end; }
.${C}__plato { display:flex; align-items:center; gap:.9rem; padding:.55rem 1.1rem .55rem .7rem; }
.${C}__goteron { position:relative; width:34px; height:34px; flex:none; background:color-mix(in srgb, var(--accent-color) 45%, var(--surface-color)); clip-path:polygon(50% 100%, 0 30%, 12% 0, 88% 0, 100% 30%); }
.${C}__num { font-family:${S.disp}; font-size:clamp(1.35rem,3.4vw,1.9rem); line-height:1; color:var(--primary-color); font-variant-numeric:tabular-nums; }
.${C}__etq { font-family:${S.mono}; font-size:clamp(.56rem,1.05vw,.68rem); letter-spacing:.3em; text-transform:uppercase; color:var(--text-color); }
.${C}__base { width:min(100%,420px); height:12px; margin:clamp(1rem,2.6vw,1.5rem) auto 0; background:color-mix(in srgb, var(--surface-color) 80%, transparent); border:1px solid var(--surface-border-color); border-radius:4px; box-shadow:0 8px 18px rgba(0,0,0,.1); }
.${C}__fecha { display:block; margin:clamp(1.2rem,3vw,1.8rem) 0 0; font-family:${S.body}; font-style:italic; font-size:clamp(.85rem,1.6vw,.98rem); color:var(--text-color); }
@media (max-width:560px){ .${C}__altar { flex-direction:column; align-items:center; } .${C}__platos { grid-template-columns:1fr 1fr; width:100%; } }
`;
  const platos = [['days', 'Días'], ['hours', 'Horas'], ['minutes', 'Min'], ['seconds', 'Seg']]
    .map(([u, l]) => `<div class="${C}__plato"><i class="${C}__goteron" aria-hidden="true"></i><b class="${C}__num" data-countdown-unit="${u}">--</b><span class="${C}__etq">${l}</span></div>`).join('\n');
  const body = `<header memory_type="text" memory_usage="custom" memory_key="countdown-intro">
  <p class="${C}__rot" memory_type="text" memory_usage="custom" memory_key="countdown-rotulo">Cuenta regresiva</p>
  <h2 class="${C}__tit" memory_type="text" memory_usage="custom" memory_key="countdown-titulo">Esperando el gran día</h2>
</header>
<div class="${C}__altar">
  <div class="${C}__vela" aria-hidden="true"><i class="${C}__halo"></i><i class="${C}__llama"></i><i class="${C}__pabilo"></i><i class="${C}__cera"></i><i class="${C}__gotaCera ${C}__gotaCera--a"></i><i class="${C}__gotaCera ${C}__gotaCera--b"></i><i class="${C}__gotaCera ${C}__gotaCera--c"></i></div>
  <div class="${C}__platos" aria-label="Cuenta regresiva">
${platos}
  </div>
</div>
<div class="${C}__base" aria-hidden="true"></div>
${fecha(C, 'Fecha del evento · hora por confirmar')}`;
  return wrap(S, { id: 'countdown-vela-tela', cls: C, css, body, desc: 'Vela que se consume con llama parpadeante y halo cálido; las unidades están grabadas en goterones de cera.', tags: ['vela', 'llama', 'cera'] });
}

module.exports = { cd_imperial, cd_mariposas, cd_glitter, cd_monolavanda, cd_arcoacuarela, cd_azulfloral, cd_rosabeige, cd_telablanca };
