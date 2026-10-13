/* Conceptos de countdown 17–24 — cierre de la serie de conceptos únicos. */
const { wrap, head, fecha } = require('./core.cjs');

/* 17 · GRIEGA — Meandro helénico animado enmarcando cuatro ánforas con las
 * unidades sobre un plinto. */
function cd_griega(S) {
  const C = 'cd17';
  const css = `
.${C} { text-align:center; }
.${C}__rot { margin:0 0 .4rem; font-family:'Courier New',monospace; font-size:clamp(.58rem,1.1vw,.7rem); letter-spacing:.6em; text-transform:uppercase; color:var(--secondary-color); }
.${C}__tit { margin:0 0 clamp(1.2rem,3vw,1.8rem); font-family:${S.disp}; font-weight:400; font-size:clamp(1.8rem,4.2vw,2.7rem); color:var(--primary-color); }
.${C}__templo { position:relative; width:min(100%,760px); margin:0 auto; padding:clamp(1.4rem,3vw,2rem) clamp(.4rem,2vw,1.2rem) clamp(1rem,2.4vw,1.6rem); border-top:3px double var(--primary-color); border-bottom:3px double var(--primary-color); }
.${C}__meandro { height:16px; margin:0 auto clamp(1.4rem,3vw,2rem); width:100%; }
.${C}__meandro svg { display:block; width:100%; height:16px; color:var(--primary-color); }
.${C}__meandro--baja { margin:clamp(1.4rem,3vw,2rem) auto 0; }
.${C}__fila { display:flex; justify-content:center; gap:clamp(.9rem,3vw,2.2rem); flex-wrap:wrap; }
.${C}__columna { display:grid; justify-items:center; gap:.5rem; width:clamp(96px,17vw,128px); }
.${C}__capitel { width:88%; height:8px; background:var(--primary-color); border-radius:2px; }
.${C}__fuste { width:56%; flex:1; min-height:22px; background:repeating-linear-gradient(180deg, color-mix(in srgb, var(--primary-color) 34%, transparent) 0 3px, transparent 3px 7px); animation:${C}-fuste 6s ease-in-out infinite alternate; }
@keyframes ${C}-fuste { to { opacity:.6; } }
.${C}__anfora { position:relative; width:100%; padding:clamp(1rem,2.4vw,1.4rem) .6rem clamp(1.4rem,3vw,1.9rem); clip-path:polygon(50% 0, 78% 6%, 88% 22%, 92% 44%, 84% 70%, 62% 88%, 62% 100%, 38% 100%, 38% 88%, 16% 70%, 8% 44%, 12% 22%, 22% 6%); background:color-mix(in srgb, var(--surface-color) 90%, var(--accent-color)); border:1.5px solid var(--primary-color); display:grid; justify-items:center; }
.${C}__asa { position:absolute; top:16%; width:14px; height:26px; border:2px solid var(--primary-color); border-radius:50%; }
.${C}__asa--i { left:-8px; } .${C}__asa--d { right:-8px; }
.${C}__num { font-family:${S.disp}; font-size:clamp(1.4rem,3.8vw,2.1rem); line-height:1; color:var(--primary-color); font-variant-numeric:tabular-nums; }
.${C}__etq { font-family:'Courier New',monospace; font-size:clamp(.44rem,.86vw,.56rem); letter-spacing:.28em; text-transform:uppercase; color:var(--text-color); }
.${C}__plinto { width:100%; height:10px; background:var(--primary-color); border-radius:2px; }
.${C}__fecha { display:block; margin:clamp(1.4rem,3vw,2rem) 0 0; font-family:${S.body}; font-style:italic; font-size:clamp(.85rem,1.6vw,.98rem); color:var(--text-color); }
@media (max-width:560px){ .${C}__fila { gap:.8rem; } .${C}__columna { width:42%; } }
`;
  const meandro = (id) => `<svg viewBox="0 0 720 16" fill="none" stroke="currentColor" stroke-width="2"><defs><pattern id="${C}-${id}" width="36" height="16" patternUnits="userSpaceOnUse"><path d="M2 14 V4 H18 V10 H10 V8 H34" fill="none"/></pattern></defs><rect width="720" height="16" fill="url(#${C}-${id})"/></svg>`;
  const columnas = [['days', 'Días'], ['hours', 'Horas'], ['minutes', 'Min'], ['seconds', 'Seg']]
    .map(([u, l]) => `<div class="${C}__columna"><i class="${C}__capitel" aria-hidden="true"></i><i class="${C}__fuste" aria-hidden="true"></i>
  <div class="${C}__anfora"><i class="${C}__asa ${C}__asa--i" aria-hidden="true"></i><i class="${C}__asa ${C}__asa--d" aria-hidden="true"></i><b class="${C}__num" data-countdown-unit="${u}">--</b><span class="${C}__etq">${l}</span></div>
  <i class="${C}__plinto" aria-hidden="true"></i>
</div>`).join('\n');
  const body = `<header memory_type="text" memory_usage="custom" memory_key="countdown-intro">
  <p class="${C}__rot" memory_type="text" memory_usage="custom" memory_key="countdown-rotulo">Kalós agón</p>
  <h2 class="${C}__tit" memory_type="text" memory_usage="custom" memory_key="countdown-titulo">El oráculo cuenta</h2>
</header>
<div class="${C}__templo">
  <div class="${C}__meandro" aria-hidden="true">${meandro('t')}</div>
  <div class="${C}__fila" aria-label="Cuenta regresiva">
${columnas}
  </div>
  <div class="${C}__meandro ${C}__meandro--baja" aria-hidden="true">${meandro('b')}</div>
</div>
${fecha(C, 'Fecha del evento · hora por confirmar')}`;
  return wrap(S, { id: 'countdown-meandro-helenico', cls: C, css, body, desc: 'Templo helénico con meandros griegos animados: las unidades descansan en ánforas sobre columnas estriadas y plintos.', tags: ['griega', 'meandro', 'anfora'] });
}

/* 18 · ENCAJE — Aro de bordado con aguja recorriendo la puntada y unidades
 * en aros pequeños colgando con hilo. */
function cd_encaje(S) {
  const C = 'cd18';
  const css = `
.${C} { text-align:center; }
.${C}__rot { margin:0 0 .4rem; font-family:'Courier New',monospace; font-size:clamp(.58rem,1.1vw,.7rem); letter-spacing:.6em; text-transform:uppercase; color:var(--secondary-color); }
.${C}__tit { margin:0 0 clamp(1.4rem,3vw,2rem); font-family:${S.disp}; font-weight:400; font-size:clamp(1.8rem,4.2vw,2.7rem); color:var(--primary-color); }
.${C}__costurero { display:grid; justify-items:center; }
.${C}__aroGrande { position:relative; width:clamp(200px,34vw,270px); aspect-ratio:1; border-radius:50%; border:9px solid color-mix(in srgb, var(--surface-color) 92%, var(--accent-color)); outline:2.5px solid var(--primary-color); background:radial-gradient(circle, color-mix(in srgb, var(--accent-color) 30%, transparent) 0 62%, transparent 62%); display:grid; place-items:center; }
.${C}__tornillo { position:absolute; top:-16px; left:50%; transform:translateX(-50%); width:16px; height:20px; background:var(--primary-color); clip-path:polygon(20% 0, 80% 0, 100% 100%, 0 100%); border-radius:3px 3px 0 0; }
.${C}__bordado { width:76%; aspect-ratio:1; border-radius:50%; }
.${C}__bordado path { fill:none; stroke:var(--primary-color); stroke-width:2.4; stroke-linecap:round; stroke-dasharray:7 6; animation:${C}-puntada 9s linear infinite; }
@keyframes ${C}-puntada { to { stroke-dashoffset:-104; } }
.${C}__aguja { offset-path:path('M18 90 C 30 30, 80 14, 96 52 S 150 96, 182 40'); offset-rotate:auto; width:22px; height:4px; background:var(--secondary-color); border-radius:2px; position:absolute; inset:0; animation:${C}-aguja 9s linear infinite; }
@keyframes ${C}-aguja { to { offset-distance:100%; } }
.${C}__hilos { display:flex; justify-content:center; align-items:flex-start; gap:clamp(1rem,3.4vw,2.4rem); margin-top:-6px; flex-wrap:wrap; }
.${C}__colgado { display:grid; justify-items:center; }
.${C}__hilo { width:1.5px; background:var(--secondary-color); }
.${C}__aroChico { display:grid; place-items:center; gap:.15rem; width:clamp(86px,15vw,112px); aspect-ratio:1; border-radius:50%; border:5px solid color-mix(in srgb, var(--surface-color) 92%, var(--accent-color)); outline:1.5px solid var(--primary-color); background:color-mix(in srgb, var(--accent-color) 22%, transparent); animation:${C}-mecerce 3.6s ease-in-out infinite alternate; transform-origin:top center; }
.${C}__colgado:nth-child(2) .${C}__aroChico { animation-delay:.6s; } .${C}__colgado:nth-child(3) .${C}__aroChico { animation-delay:1.2s; } .${C}__colgado:nth-child(4) .${C}__aroChico { animation-delay:1.8s; }
@keyframes ${C}-mecerce { from { transform:rotate(-3.4deg); } to { transform:rotate(3.4deg); } }
.${C}__num { font-family:${S.disp}; font-size:clamp(1.3rem,3.5vw,1.9rem); line-height:1; color:var(--primary-color); font-variant-numeric:tabular-nums; }
.${C}__etq { font-family:'Courier New',monospace; font-size:clamp(.42rem,.84vw,.54rem); letter-spacing:.26em; text-transform:uppercase; color:var(--text-color); }
.${C}__fecha { display:block; margin:clamp(1.6rem,3vw,2.2rem) 0 0; font-family:${S.body}; font-style:italic; font-size:clamp(.85rem,1.6vw,.98rem); color:var(--text-color); }
@media (max-width:560px){ .${C}__hilos { gap:.8rem; } .${C}__colgado { flex:1 1 40%; } .${C}__colgado:nth-child(3){ order:5; } .${C}__colgado:nth-child(4){ order:6; } }
`;
  const colgados = [['days', 'Días', '46px'], ['hours', 'Horas', '22px'], ['minutes', 'Min', '34px'], ['seconds', 'Seg', '16px']]
    .map(([u, l, h]) => `<div class="${C}__colgado"><i class="${C}__hilo" style="height:${h};" aria-hidden="true"></i>
  <div class="${C}__aroChico"><b class="${C}__num" data-countdown-unit="${u}">--</b><span class="${C}__etq">${l}</span></div>
</div>`).join('\n');
  const body = `<header memory_type="text" memory_usage="custom" memory_key="countdown-intro">
  <p class="${C}__rot" memory_type="text" memory_usage="custom" memory_key="countdown-rotulo">Punto por punto</p>
  <h2 class="${C}__tit" memory_type="text" memory_usage="custom" memory_key="countdown-titulo">Bordando la espera</h2>
</header>
<div class="${C}__costurero">
  <div class="${C}__aroGrande" aria-hidden="true">
    <i class="${C}__tornillo"></i>
    <svg class="${C}__bordado" viewBox="0 0 200 100"><path d="M18 90 C 30 30, 80 14, 96 52 S 150 96, 182 40"/></svg>
    <i class="${C}__aguja"></i>
  </div>
  <div class="${C}__hilos" aria-label="Cuenta regresiva" style="position:relative; z-index:2;">
${colgados}
  </div>
</div>
${fecha(C, 'Fecha del evento · hora por confirmar')}`;
  return wrap(S, { id: 'countdown-bordado-encaje', cls: C, css, body, desc: 'Aro de bordado cuya aguja recorre la puntada en bucle; las unidades cuelgan en aros pequeños meciéndose con el hilo.', tags: ['encaje', 'bordado', 'aguja'] });
}

/* 19 · CALIZ — Campana de misión que dobla: ondas de tañido y unidades en
 * gallardetes colgados de una cuerda. */
function cd_caliz(S) {
  const C = 'cd19';
  const css = `
.${C} { text-align:center; }
.${C}__rot { margin:0 0 .4rem; font-family:'Courier New',monospace; font-size:clamp(.58rem,1.1vw,.7rem); letter-spacing:.6em; text-transform:uppercase; color:var(--secondary-color); }
.${C}__tit { margin:0 0 clamp(1.4rem,3vw,2rem); font-family:${S.disp}; font-weight:400; font-size:clamp(1.8rem,4.2vw,2.7rem); color:var(--primary-color); }
.${C}__cuerda { position:relative; width:min(100%,680px); height:26px; margin:0 auto clamp(1.6rem,3.6vw,2.4rem); }
.${C}__soga { position:absolute; inset:12px 0 auto; height:2.5px; background:repeating-linear-gradient(90deg, var(--primary-color) 0 9px, color-mix(in srgb, var(--primary-color) 40%, transparent) 9px 13px); }
.${C}__gallardetes { position:absolute; inset:0; display:flex; justify-content:space-evenly; }
.${C}__banderin { position:relative; display:grid; justify-items:center; }
.${C}__banderin i.pata { width:1.5px; height:12px; background:var(--accent-color); }
.${C}__trapo { padding:.55rem .8rem .7rem; clip-path:polygon(0 0, 100% 0, 100% 100%, 50% 82%, 0 100%); background:color-mix(in srgb, var(--primary-color) 20%, var(--surface-color)); border-top:2.5px solid var(--primary-color); display:grid; justify-items:center; gap:.2rem; animation:${C}-ondea 2.8s ease-in-out infinite alternate; transform-origin:top center; }
.${C}__banderin:nth-child(2) .${C}__trapo { animation-delay:.4s; } .${C}__banderin:nth-child(3) .${C}__trapo { animation-delay:.8s; } .${C}__banderin:nth-child(4) .${C}__trapo { animation-delay:1.2s; }
@keyframes ${C}-ondea { from { transform:skewX(-4deg); } to { transform:skewX(4deg); } }
.${C}__num { font-family:${S.disp}; font-size:clamp(1.3rem,3.5vw,1.9rem); line-height:1; color:var(--primary-color); font-variant-numeric:tabular-nums; }
.${C}__etq { font-family:'Courier New',monospace; font-size:clamp(.42rem,.84vw,.54rem); letter-spacing:.26em; text-transform:uppercase; color:var(--text-color); }
.${C}__campanario { position:relative; width:clamp(130px,22vw,170px); margin:0 auto; height:clamp(150px,26vw,200px); display:grid; justify-items:center; }
.${C}__viga { width:150%; height:8px; background:var(--primary-color); border-radius:4px; }
.${C}__campana { position:relative; margin-top:2px; width:64%; height:70%; clip-path:polygon(26% 0, 74% 0, 88% 88%, 74% 96%, 26% 96%, 12% 88%); background:linear-gradient(180deg, color-mix(in srgb, var(--accent-color) 72%, #fff) 0%, color-mix(in srgb, var(--primary-color) 80%, var(--accent-color)) 100%); border:2px solid var(--primary-color); transform-origin:50% 0; animation:${C}-dobla 2.4s cubic-bezier(.36,0,.64,1) infinite alternate; }
@keyframes ${C}-dobla { from { transform:rotate(7deg); } to { transform:rotate(-7deg); } }
.${C}__badajo { position:absolute; left:50%; bottom:4%; width:13px; height:13px; margin-left:-6.5px; border-radius:50%; background:var(--primary-color); animation:${C}-badajo 1.2s ease-in-out infinite alternate; }
@keyframes ${C}-badajo { from { transform:translateX(-4px); } to { transform:translateX(4px); } }
.${C}__onda { position:absolute; left:50%; top:76%; width:56px; height:20px; transform:translateX(-50%); border:1.5px solid var(--primary-color); border-radius:50%; opacity:0; animation:${C}-tañido 2.4s ease-out infinite; }
.${C}__onda--2 { animation-delay:.5s; } .${C}__onda--3 { animation-delay:1s; }
@keyframes ${C}-tañido { 0% { opacity:.8; transform:translateX(-50%) scale(.4); } 100% { opacity:0; transform:translateX(-50%) scale(2.4); } }
.${C}__fecha { display:block; margin:clamp(1.6rem,3vw,2.2rem) 0 0; font-family:${S.body}; font-style:italic; font-size:clamp(.85rem,1.6vw,.98rem); color:var(--text-color); }
@media (max-width:560px){ .${C}__gallardetes { gap:.4rem; } .${C}__trapo { padding:.45rem .5rem .6rem; } }
`;
  const banderines = [['days', 'Días'], ['hours', 'Horas'], ['minutes', 'Min'], ['seconds', 'Seg']]
    .map(([u, l]) => `<div class="${C}__banderin"><i class="pata" aria-hidden="true"></i><span class="${C}__trapo"><b class="${C}__num" data-countdown-unit="${u}">--</b><span class="${C}__etq">${l}</span></span></div>`).join('\n');
  const body = `<header memory_type="text" memory_usage="custom" memory_key="countdown-intro">
  <p class="${C}__rot" memory_type="text" memory_usage="custom" memory_key="countdown-rotulo">Doble de fiesta</p>
  <h2 class="${C}__tit" memory_type="text" memory_usage="custom" memory_key="countdown-titulo">La campana anuncia</h2>
</header>
<div class="${C}__cuerda" aria-label="Cuenta regresiva">
  <i class="${C}__soga" aria-hidden="true"></i>
  <div class="${C}__gallardetes">
${banderines}
  </div>
</div>
<div class="${C}__campanario" aria-hidden="true">
  <i class="${C}__viga"></i>
  <div class="${C}__campana"><i class="${C}__badajo"></i></div>
  <i class="${C}__onda"></i><i class="${C}__onda ${C}__onda--2"></i><i class="${C}__onda ${C}__onda--3"></i>
</div>
${fecha(C, 'Fecha del evento · hora por confirmar')}`;
  return wrap(S, { id: 'countdown-campanas-caliz', cls: C, css, body, desc: 'Campana de misión que dobla con ondas de tañido expansivas; las unidades ondean en gallardetes atados a la cuerda.', tags: ['campanas', 'gallardetes', 'tañido'] });
}

/* 20 · ESPEJADAS — Reflejo doble: números sobre línea de agua con su
 * imagen especular ondulante y destello que barre. */
function cd_espejadas(S) {
  const C = 'cd20';
  const css = `
.${C} { text-align:center; }
.${C}__rot { margin:0 0 .4rem; font-family:'Courier New',monospace; font-size:clamp(.58rem,1.1vw,.7rem); letter-spacing:.6em; text-transform:uppercase; color:var(--secondary-color); }
.${C}__tit { margin:0 0 clamp(1.6rem,3vw,2.2rem); font-family:${S.disp}; font-weight:400; font-size:clamp(1.8rem,4.2vw,2.7rem); color:var(--primary-color); }
.${C}__tocador { position:relative; width:min(100%,780px); margin:0 auto; overflow:hidden; padding-bottom:clamp(2.4rem,6vw,3.4rem); }
.${C}__destello { position:absolute; top:-20%; bottom:-20%; left:-30%; width:26%; background:linear-gradient(105deg, transparent, color-mix(in srgb, var(--accent-color) 42%, transparent), transparent); transform:skewX(-14deg); animation:${C}-barre 6s ease-in-out infinite; }
@keyframes ${C}-barre { 0% { left:-30%; } 60%, 100% { left:130%; } }
.${C}__fila { display:flex; justify-content:center; gap:clamp(1rem,3.4vw,2.6rem); flex-wrap:wrap; }
.${C}__marco { position:relative; display:grid; justify-items:center; }
.${C}__cornisa { display:flex; gap:.35rem; margin-bottom:.55rem; }
.${C}__cornisa i { width:7px; height:7px; border-radius:50%; border:1.5px solid var(--primary-color); }
.${C}__cristal { width:clamp(104px,18vw,140px); padding:1rem .6rem 1.1rem; background:color-mix(in srgb, var(--surface-color) 82%, transparent); border:1.5px solid var(--primary-color); box-shadow:inset 0 0 18px color-mix(in srgb, var(--accent-color) 30%, transparent), 0 14px 28px rgba(0,0,0,.14); border-radius:4px; }
.${C}__num { font-family:${S.disp}; font-size:clamp(1.7rem,4.6vw,2.6rem); line-height:1; color:var(--primary-color); font-variant-numeric:tabular-nums; }
.${C}__etq { display:block; margin-top:.35rem; font-family:'Courier New',monospace; font-size:clamp(.44rem,.86vw,.56rem); letter-spacing:.3em; text-transform:uppercase; color:var(--text-color); }
.${C}__agua { position:relative; margin-top:clamp(1.2rem,3vw,1.8rem); height:3px; background:linear-gradient(90deg, transparent, var(--primary-color), var(--secondary-color), var(--primary-color), transparent); }
.${C}__agua::before, .${C}__agua::after { content:''; position:absolute; left:0; right:0; top:2px; height:26px; background:repeating-linear-gradient(90deg, color-mix(in srgb, var(--primary-color) 22%, transparent) 0 14px, transparent 14px 28px); animation:${C}-rizo 3.4s linear infinite; }
.${C}__agua::after { top:4px; height:44px; opacity:.5; animation-duration:5.2s; animation-direction:reverse; }
@keyframes ${C}-rizo { to { background-position:56px 0; } }
.${C}__reflejo { display:flex; justify-content:center; gap:clamp(1rem,3.4vw,2.6rem); flex-wrap:wrap; }
.${C}__reflejo .${C}__cristal { transform:scaleY(-1); opacity:.4; filter:blur(1.2px); background:transparent; border-style:dashed; box-shadow:none; }
.${C}__fecha { display:block; margin:clamp(1.6rem,3vw,2.2rem) 0 0; font-family:${S.body}; font-style:italic; font-size:clamp(.85rem,1.6vw,.98rem); color:var(--text-color); }
@media (max-width:560px){ .${C}__fila, .${C}__reflejo { gap:.7rem; } .${C}__cristal { width:40%; } }
`;
  const marcos = [['days', 'Días'], ['hours', 'Horas'], ['minutes', 'Min'], ['seconds', 'Seg']];
  const fila = marcos.map(([u, l]) => `<div class="${C}__marco">
  <span class="${C}__cornisa" aria-hidden="true"><i></i><i></i><i></i></span>
  <div class="${C}__cristal"><b class="${C}__num" data-countdown-unit="${u}">--</b><span class="${C}__etq">${l}</span></div>
</div>`).join('\n');
  const reflejo = marcos.map(([u, l]) => `<div class="${C}__cristal" aria-hidden="true"><b class="${C}__num">${u === 'days' ? '' : ''}</b></div>`).join('');
  const body = `<header memory_type="text" memory_usage="custom" memory_key="countdown-intro">
  <p class="${C}__rot" memory_type="text" memory_usage="custom" memory_key="countdown-rotulo">Oro y plata</p>
  <h2 class="${C}__tit" memory_type="text" memory_usage="custom" memory_key="countdown-titulo">El reflejo del gran día</h2>
</header>
<div class="${C}__tocador">
  <i class="${C}__destello" aria-hidden="true"></i>
  <div class="${C}__fila" aria-label="Cuenta regresiva">
${fila}
  </div>
  <div class="${C}__agua" aria-hidden="true"></div>
  <div class="${C}__reflejo" aria-hidden="true">${reflejo}</div>
</div>
${fecha(C, 'Fecha del evento · hora por confirmar')}`;
  return wrap(S, { id: 'countdown-espejo-doble', cls: C, css, body, desc: 'Marcos de tocador con destello que barre; los números se duplican en un reflejo ondulante sobre la línea de agua dorada.', tags: ['espejo', 'reflejo', 'destello'] });
}

/* 21 · FABULOSO — Lider de cinta de cine: barrido circular tipo cuenta
 * regresiva de proyección y fotogramas con perforaciones. */
function cd_fabuloso(S) {
  const C = 'cd21';
  const css = `
.${C} { text-align:center; }
.${C}__rot { margin:0 0 .4rem; font-family:'Courier New',monospace; font-size:clamp(.58rem,1.1vw,.7rem); letter-spacing:.6em; text-transform:uppercase; color:var(--secondary-color); }
.${C}__tit { margin:0 0 clamp(1.4rem,3vw,2rem); font-family:${S.disp}; font-weight:400; font-size:clamp(1.8rem,4.2vw,2.7rem); color:var(--primary-color); }
.${C}__proyector { display:grid; justify-items:center; gap:clamp(1.2rem,3vw,1.8rem); }
.${C}__lienzo { position:relative; width:clamp(180px,30vw,240px); aspect-ratio:1; border-radius:50%; background:color-mix(in srgb, var(--surface-color) 88%, transparent); border:2px solid var(--primary-color); box-shadow:0 0 0 6px color-mix(in srgb, var(--bg-color) 70%, transparent), 0 0 0 7.5px var(--primary-color), 0 18px 40px rgba(0,0,0,.3); overflow:hidden; }
.${C}__cruzV, .${C}__cruzH { position:absolute; background:color-mix(in srgb, var(--primary-color) 40%, transparent); }
.${C}__cruzV { left:50%; top:6%; bottom:6%; width:1.5px; margin-left:-.75px; }
.${C}__cruzH { top:50%; left:6%; right:6%; height:1.5px; margin-top:-.75px; }
.${C}__barrido { position:absolute; inset:0; border-radius:50%; background:conic-gradient(color-mix(in srgb, var(--primary-color) 30%, transparent) 0 26deg, transparent 26deg); animation:${C}-gira 3.2s linear infinite; }
@keyframes ${C}-gira { to { transform:rotate(360deg); } }
.${C}__dias { position:absolute; inset:0; display:grid; place-items:center; }
.${C}__num { font-family:${S.mono}; font-weight:700; font-size:clamp(3rem,10vw,5.4rem); line-height:1; color:var(--primary-color); font-variant-numeric:tabular-nums; text-shadow:0 3px 0 rgba(0,0,0,.35); }
.${C}__etqDias { position:absolute; bottom:16%; left:0; right:0; font-family:'Courier New',monospace; font-size:clamp(.5rem,1vw,.62rem); letter-spacing:.5em; text-transform:uppercase; color:var(--text-color); }
.${C}__cinta { position:relative; display:flex; justify-content:center; gap:clamp(.8rem,2.6vw,1.6rem); flex-wrap:wrap; padding:14px 0; }
.${C}__cinta::before, .${C}__cinta::after { content:''; position:absolute; left:-4%; right:-4%; height:8px; background:repeating-linear-gradient(90deg, color-mix(in srgb, var(--bg-color) 80%, #000) 0 10px, transparent 10px 16px, color-mix(in srgb, var(--bg-color) 80%, #000) 16px 26px, transparent 26px 32px); }
.${C}__cinta::before { top:0; } .${C}__cinta::after { bottom:0; }
.${C}__frame { width:clamp(96px,17vw,124px); padding:.9rem .6rem 1rem; background:color-mix(in srgb, var(--surface-color) 90%, transparent); border:1.5px solid var(--primary-color); display:grid; justify-items:center; gap:.3rem; animation:${C}-parpadeo 4.2s steps(1) infinite; }
.${C}__frame:nth-child(2){ animation-delay:1.2s; } .${C}__frame:nth-child(3){ animation-delay:2.6s; }
@keyframes ${C}-parpadeo { 0%, 88% { filter:none; } 92%, 96% { filter:brightness(1.5); } }
.${C}__numF { font-family:${S.mono}; font-weight:700; font-size:clamp(1.5rem,4vw,2.2rem); line-height:1; color:var(--primary-color); font-variant-numeric:tabular-nums; }
.${C}__etq { font-family:'Courier New',monospace; font-size:clamp(.44rem,.86vw,.56rem); letter-spacing:.3em; text-transform:uppercase; color:var(--text-color); }
.${C}__fecha { display:block; margin:clamp(1.4rem,3vw,2rem) 0 0; font-family:${S.body}; font-style:italic; font-size:clamp(.85rem,1.6vw,.98rem); color:var(--text-color); }
@media (max-width:560px){ .${C}__frame { width:28%; } }
`;
  const frames = [['hours', 'Horas'], ['minutes', 'Min'], ['seconds', 'Seg']]
    .map(([u, l]) => `<div class="${C}__frame"><b class="${C}__numF" data-countdown-unit="${u}">--</b><span class="${C}__etq">${l}</span></div>`).join('\n');
  const body = `<header memory_type="text" memory_usage="custom" memory_key="countdown-intro">
  <p class="${C}__rot" memory_type="text" memory_usage="custom" memory_key="countdown-rotulo">Última función</p>
  <h2 class="${C}__tit" memory_type="text" memory_usage="custom" memory_key="countdown-titulo">Luces, cámara…</h2>
</header>
<div class="${C}__proyector">
  <div class="${C}__lienzo" aria-label="Días restantes">
    <i class="${C}__barrido" aria-hidden="true"></i><i class="${C}__cruzV" aria-hidden="true"></i><i class="${C}__cruzH" aria-hidden="true"></i>
    <span class="${C}__dias"><b class="${C}__num" data-countdown-unit="days">--</b></span>
    <span class="${C}__etqDias">Días</span>
  </div>
  <div class="${C}__cinta" aria-label="Horas, minutos y segundos">
${frames}
  </div>
</div>
${fecha(C, 'Fecha del evento · hora por confirmar')}`;
  return wrap(S, { id: 'countdown-cine-fabuloso', cls: C, css, body, desc: 'Líder de proyección cinematográfico: barrido circular girando tras los días y fotogramas con perforaciones que parpadean.', tags: ['cine', 'proyeccion', 'fotogramas'] });
}

/* 22 · ROSA18 — Listón que se deshace en rizo: la cinta ondula y las
 * etiquetas de regalo llevan las unidades. */
function cd_rosa18(S) {
  const C = 'cd22';
  const css = `
.${C} { text-align:center; }
.${C}__rot { margin:0 0 .4rem; font-family:'Courier New',monospace; font-size:clamp(.58rem,1.1vw,.7rem); letter-spacing:.6em; text-transform:uppercase; color:var(--secondary-color); }
.${C}__tit { margin:0 0 clamp(1.4rem,3vw,2rem); font-family:${S.disp}; font-weight:400; font-size:clamp(1.8rem,4.2vw,2.7rem); color:var(--primary-color); }
.${C}__mesa { position:relative; width:min(100%,740px); margin:0 auto clamp(1rem,2.6vw,1.6rem); padding:clamp(1.4rem,4vw,2.6rem) 0 clamp(2rem,5vw,3rem); }
.${C}__cinta { position:absolute; left:0; right:0; top:38%; height:34px; }
.${C}__cinta svg { display:block; width:100%; height:34px; }
.${C}__cinta path { fill:none; stroke:var(--primary-color); stroke-width:11; stroke-linecap:round; stroke-dasharray:1200; stroke-dashoffset:1200; animation:${C}-desenrolla 3.2s ease-out forwards; }
@keyframes ${C}-desenrolla { to { stroke-dashoffset:0; } }
.${C}__lazo { position:absolute; right:4%; top:-6%; width:clamp(64px,10vw,84px); height:clamp(40px,6vw,52px); }
.${C}__lazo i { position:absolute; top:0; width:48%; height:100%; background:color-mix(in srgb, var(--primary-color) 80%, var(--accent-color)); border:1.5px solid var(--primary-color); border-radius:60% 40% 55% 45%/70% 70% 30% 30%; animation:${C}-latido 2.6s ease-in-out infinite; }
.${C}__lazo i:first-child { left:0; transform:rotate(-14deg); } .${C}__lazo i:last-child { right:0; transform:rotate(14deg) scaleX(-1); animation-delay:.3s; }
@keyframes ${C}-latido { 50% { transform:scale(.92); } }
.${C}__lazo i:first-child { animation-name:${C}-latidoI; } @keyframes ${C}-latidoI { 0%,100% { transform:rotate(-14deg) scale(1); } 50% { transform:rotate(-14deg) scale(.92); } }
.${C}__nudo { position:absolute; right:calc(4% + clamp(28px,4.5vw,38px)); top:0; width:16px; height:16px; background:var(--primary-color); border-radius:4px; }
.${C}__etiquetas { position:relative; display:flex; justify-content:space-evenly; align-items:center; flex-wrap:wrap; gap:clamp(.9rem,2.6vw,1.6rem); }
.${C}__tag { position:relative; display:grid; justify-items:center; gap:.25rem; padding:.75rem 1.1rem .85rem; background:var(--surface-color); border:1.5px solid var(--primary-color); border-radius:10px; box-shadow:0 10px 22px rgba(0,0,0,.14); transform:rotate(-2deg); transition:transform .3s ease; }
.${C}__tag:nth-child(2){ transform:rotate(1.6deg) translateY(clamp(.8rem,2.4vw,1.6rem)); }
.${C}__tag:nth-child(3){ transform:rotate(-1deg) translateY(-.4rem); }
.${C}__tag:nth-child(4){ transform:rotate(2.2deg) translateY(clamp(1.2rem,3.4vw,2.2rem)); }
.${C}__tag:hover { transform:rotate(0) translateY(-4px); }
.${C}__agujero { position:absolute; top:8px; left:10px; width:8px; height:8px; border-radius:50%; border:1.5px solid var(--secondary-color); }
.${C}__num { font-family:${S.disp}; font-size:clamp(1.4rem,3.8vw,2rem); line-height:1; color:var(--primary-color); font-variant-numeric:tabular-nums; }
.${C}__etq { font-family:'Courier New',monospace; font-size:clamp(.44rem,.86vw,.56rem); letter-spacing:.3em; text-transform:uppercase; color:var(--text-color); }
.${C}__fecha { display:block; margin:clamp(1.3rem,3vw,1.9rem) 0 0; font-family:${S.body}; font-style:italic; font-size:clamp(.85rem,1.6vw,.98rem); color:var(--text-color); }
@media (max-width:560px){ .${C}__etiquetas { justify-content:center; } .${C}__tag { transform:none !important; } }
`;
  const etiquetas = [['days', 'Días'], ['hours', 'Horas'], ['minutes', 'Min'], ['seconds', 'Seg']]
    .map(([u, l]) => `<div class="${C}__tag"><i class="${C}__agujero" aria-hidden="true"></i><b class="${C}__num" data-countdown-unit="${u}">--</b><span class="${C}__etq">${l}</span></div>`).join('\n');
  const body = `<header memory_type="text" memory_usage="custom" memory_key="countdown-intro">
  <p class="${C}__rot" memory_type="text" memory_usage="custom" memory_key="countdown-rotulo">Con moño y todo</p>
  <h2 class="${C}__tit" memory_type="text" memory_usage="custom" memory_key="countdown-titulo">Desatando la espera</h2>
</header>
<div class="${C}__mesa">
  <div class="${C}__cinta" aria-hidden="true"><svg viewBox="0 0 740 34" preserveAspectRatio="none"><path d="M-10 20 C 120 2, 240 32, 370 16 S 600 2, 750 22"/></svg></div>
  <div class="${C}__lazo" aria-hidden="true"><i></i><i></i></div><i class="${C}__nudo" aria-hidden="true"></i>
  <div class="${C}__etiquetas" aria-label="Cuenta regresiva">
${etiquetas}
  </div>
</div>
${fecha(C, 'Fecha del evento · hora por confirmar')}`;
  return wrap(S, { id: 'countdown-liston-rosa', cls: C, css, body, desc: 'Listón que se desenrolla dibujándose hasta un lazo que late; las unidades cuelgan como etiquetas de regalo rotadas.', tags: ['listón', 'regalo', 'moño'] });
}

/* 23 · NEGORORO60 — Torre de copas de champaña con burbujas subiendo y
 * destellos; el conteo grabado en el cristal. */
function cd_negooro60(S) {
  const C = 'cd23';
  const css = `
.${C} { text-align:center; }
.${C}__rot { margin:0 0 .4rem; font-family:'Courier New',monospace; font-size:clamp(.58rem,1.1vw,.7rem); letter-spacing:.6em; text-transform:uppercase; color:var(--secondary-color); }
.${C}__tit { margin:0 0 clamp(1.6rem,3vw,2.2rem); font-family:${S.disp}; font-weight:400; font-size:clamp(1.8rem,4.2vw,2.7rem); color:var(--primary-color); }
.${C}__banquete { position:relative; width:min(100%,640px); margin:0 auto; padding-top:clamp(3.4rem,8vw,5rem); }
.${C}__chispa { position:absolute; width:12px; height:12px; clip-path:polygon(50% 0, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%); background:var(--accent-color); animation:${C}-chispa 2.8s ease-in-out infinite; }
@keyframes ${C}-chispa { 0%, 100% { opacity:0; transform:scale(.4); } 50% { opacity:1; transform:scale(1); } }
.${C}__copa { position:relative; display:grid; justify-items:center; }
.${C}__copa--sup { width:clamp(120px,20vw,150px); margin:0 auto; z-index:3; }
.${C}__tazon { position:relative; width:100%; height:clamp(52px,9vw,66px); border:2px solid var(--primary-color); border-radius:0 0 100% 100%/0 0 90% 90%; background:linear-gradient(180deg, color-mix(in srgb, var(--accent-color) 26%, transparent), color-mix(in srgb, var(--primary-color) 16%, transparent)); display:grid; place-items:center; overflow:hidden; }
.${C}__burbuja { position:absolute; bottom:-6px; width:5px; height:5px; border-radius:50%; border:1px solid var(--accent-color); animation:${C}-sube 2.6s linear infinite; }
.${C}__burbuja:nth-child(2){ left:30%; animation-delay:.8s; } .${C}__burbuja:nth-child(3){ left:58%; animation-delay:1.5s; } .${C}__burbuja:nth-child(4){ left:76%; animation-delay:.4s; }
@keyframes ${C}-sube { to { transform:translateY(-64px); opacity:0; } }
.${C}__pie { width:3px; height:clamp(20px,4vw,30px); background:var(--primary-color); }
.${C}__base { width:44%; height:5px; border-radius:3px; background:var(--primary-color); }
.${C}__numS { font-family:${S.disp}; font-size:clamp(1.6rem,4.4vw,2.3rem); line-height:1; color:var(--primary-color); font-variant-numeric:tabular-nums; text-shadow:0 0 10px color-mix(in srgb, var(--accent-color) 55%, transparent); }
.${C}__etqS { font-family:'Courier New',monospace; font-size:clamp(.42rem,.84vw,.54rem); letter-spacing:.3em; text-transform:uppercase; color:var(--accent-color); }
.${C}__fila2 { display:flex; justify-content:center; gap:clamp(1.4rem,4vw,3rem); margin-top:-4px; z-index:2; }
.${C}__copa--base { width:clamp(96px,16vw,120px); }
.${C}__numB { font-family:${S.disp}; font-size:clamp(1.25rem,3.4vw,1.75rem); line-height:1; color:var(--primary-color); font-variant-numeric:tabular-nums; }
.${C}__etq { font-family:'Courier New',monospace; font-size:clamp(.4rem,.8vw,.5rem); letter-spacing:.26em; text-transform:uppercase; color:var(--accent-color); }
.${C}__mantel { width:86%; height:10px; margin:clamp(1.2rem,3vw,1.8rem) auto 0; background:repeating-linear-gradient(90deg, color-mix(in srgb, var(--primary-color) 30%, transparent) 0 18px, transparent 18px 36px); border-radius:5px; }
.${C}__fecha { display:block; margin:clamp(1.2rem,3vw,1.8rem) 0 0; font-family:${S.body}; font-style:italic; font-size:clamp(.85rem,1.6vw,.98rem); color:var(--text-color); }
@media (max-width:560px){ .${C}__fila2 { gap:.9rem; } .${C}__copa--base { width:29%; } }
`;
  const chispas = [[12, 4, 0], [30, 10, 1.1], [52, 2, 2], [70, 8, .6], [88, 12, 1.6]].map(([x, y, d]) => `<i class="${C}__chispa" style="left:${x}%; top:${y}%; animation-delay:${d}s;"></i>`).join('');
  const baseCopas = [['hours', 'Horas'], ['minutes', 'Min'], ['seconds', 'Seg']]
    .map(([u, l]) => `<div class="${C}__copa ${C}__copa--base">
  <div class="${C}__tazon" style="height:clamp(38px,6.5vw,48px);"><b class="${C}__numB" data-countdown-unit="${u}">--</b></div>
  <i class="${C}__pie" style="height:clamp(12px,2.6vw,20px);"></i><i class="${C}__base"></i>
  <span class="${C}__etq" style="margin-top:.3rem;">${l}</span>
</div>`).join('\n');
  const body = `<header memory_type="text" memory_usage="custom" memory_key="countdown-intro">
  <p class="${C}__rot" memory_type="text" memory_usage="custom" memory_key="countdown-rotulo">Brindis negro y oro</p>
  <h2 class="${C}__tit" memory_type="text" memory_usage="custom" memory_key="countdown-titulo">La torre del brindis</h2>
</header>
<div class="${C}__banquete">
  ${chispas}
  <div class="${C}__copa ${C}__copa--sup" aria-label="Días restantes">
    <div class="${C}__tazon"><i class="${C}__burbuja"></i><i class="${C}__burbuja"></i><i class="${C}__burbuja"></i><i class="${C}__burbuja"></i>
      <span><b class="${C}__numS" data-countdown-unit="days">--</b><span class="${C}__etqS">Días</span></span>
    </div>
    <i class="${C}__pie"></i><i class="${C}__base"></i>
  </div>
  <div class="${C}__fila2" aria-label="Horas, minutos y segundos">
${baseCopas}
  </div>
  <div class="${C}__mantel" aria-hidden="true"></div>
</div>
${fecha(C, 'Fecha del evento · hora por confirmar')}`;
  return wrap(S, { id: 'countdown-brindis-oro', cls: C, css, body, desc: 'Torre de copas de champaña con burbujas subiendo y destellos dorados; los días grabados en la copa mayor del brindis.', tags: ['champaña', 'brindis', 'burbujas'] });
}

/* 24 · CONFETI25 — Globos de fiesta flotando entre confeti que cae; el conteo
 * inscrito en cada globo y un número gigante de fondo. */
function cd_confeti25(S) {
  const C = 'cd24';
  const css = `
.${C} { text-align:center; }
.${C}__rot { margin:0 0 .4rem; font-family:'Courier New',monospace; font-size:clamp(.58rem,1.1vw,.7rem); letter-spacing:.6em; text-transform:uppercase; color:var(--secondary-color); }
.${C}__tit { margin:0 0 clamp(1.2rem,3vw,1.8rem); font-family:${S.disp}; font-weight:400; font-size:clamp(1.8rem,4.2vw,2.7rem); color:var(--primary-color); }
.${C}__fiesta { position:relative; width:min(100%,760px); margin:0 auto; padding:clamp(.6rem,2vw,1.2rem) 0 clamp(1.4rem,3vw,2rem); }
.${C}__confeti { position:absolute; inset:0; overflow:hidden; pointer-events:none; }
.${C}__pelus { position:absolute; top:-4%; width:8px; height:13px; opacity:.85; animation:${C}-cae linear infinite; }
@keyframes ${C}-cae { 0% { transform:translateY(0) rotate(0); } 100% { transform:translateY(520px) rotate(420deg); } }
.${C}__globos { position:relative; display:flex; justify-content:space-evenly; align-items:flex-end; flex-wrap:wrap; gap:clamp(.7rem,2.4vw,1.4rem); min-height:clamp(240px,40vw,320px); }
.${C}__globo { display:grid; justify-items:center; animation:${C}-flota 3.4s ease-in-out infinite; }
.${C}__globo:nth-child(1){ padding-bottom:clamp(2.4rem,7vw,4.4rem); }
.${C}__globo:nth-child(2){ padding-bottom:clamp(.4rem,2vw,1.2rem); animation-delay:.5s; }
.${C}__globo:nth-child(3){ padding-bottom:clamp(3rem,9vw,5.4rem); animation-delay:1s; }
.${C}__globo:nth-child(4){ padding-bottom:clamp(1rem,4vw,2.4rem); animation-delay:1.6s; }
@keyframes ${C}-flota { 50% { transform:translateY(-12px) rotate(2deg); } }
.${C}__cuerpo { width:clamp(84px,14vw,108px); height:clamp(102px,17vw,132px); border-radius:50% 50% 48% 48%/58% 58% 42% 42%; background:radial-gradient(circle at 34% 26%, color-mix(in srgb, #fff 34%, var(--primary-color)), var(--primary-color) 68%, color-mix(in srgb, var(--primary-color) 82%, #000)); border:1.5px solid color-mix(in srgb, var(--primary-color) 60%, #000); display:grid; place-items:center; box-shadow:0 12px 26px rgba(0,0,0,.22); }
.${C}__nudoG { width:12px; height:9px; background:var(--primary-color); clip-path:polygon(50% 0, 100% 100%, 0 100%); }
.${C}__cuerdaG { width:1.5px; height:clamp(28px,6vw,48px); background:repeating-linear-gradient(var(--accent-color) 0 4px, transparent 4px 8px); }
.${C}__num { font-family:${S.disp}; font-size:clamp(1.5rem,4vw,2.2rem); line-height:1; color:var(--bg-color); font-variant-numeric:tabular-nums; }
.${C}__etq { font-family:'Courier New',monospace; font-size:clamp(.42rem,.84vw,.54rem); letter-spacing:.24em; text-transform:uppercase; color:var(--bg-color); background:color-mix(in srgb, var(--primary-color) 70%, transparent); padding:.15rem .4rem; border-radius:99px; margin-top:.3rem; }
.${C}__piso { width:82%; height:2px; margin:0 auto; background:linear-gradient(90deg, transparent, var(--primary-color), transparent); }
.${C}__fecha { display:block; margin:clamp(1.4rem,3vw,2rem) 0 0; font-family:${S.body}; font-style:italic; font-size:clamp(.85rem,1.6vw,.98rem); color:var(--text-color); }
@media (max-width:560px){ .${C}__globos { justify-content:center; min-height:0; display:grid; grid-template-columns:1fr 1fr; } .${C}__globo:nth-child(n){ padding-bottom:0; } }
`;
  const confetis = [[6, 0, 7], [18, 2.2, 9], [31, 1.1, 8], [44, 3.2, 10], [57, .5, 8.6], [69, 2.6, 9.4], [82, 1.7, 7.8], [93, 3.8, 10.4]]
    .map(([x, d, dur], i) => `<i class="${C}__pelus" style="left:${x}%; background:${i % 3 === 0 ? 'var(--primary-color)' : i % 3 === 1 ? 'var(--secondary-color)' : 'var(--accent-color)'}; animation-delay:${d}s; animation-duration:${dur}s; border-radius:${i % 2 ? '50%' : '2px'};"></i>`).join('');
  const globos = [['days', 'Días'], ['hours', 'Horas'], ['minutes', 'Min'], ['seconds', 'Seg']]
    .map(([u, l]) => `<div class="${C}__globo">
  <div class="${C}__cuerpo"><span style="display:grid; place-items:center;"><b class="${C}__num" data-countdown-unit="${u}">--</b><span class="${C}__etq">${l}</span></span></div>
  <i class="${C}__nudoG" aria-hidden="true"></i><i class="${C}__cuerdaG" aria-hidden="true"></i>
</div>`).join('\n');
  const body = `<header memory_type="text" memory_usage="custom" memory_key="countdown-intro">
  <p class="${C}__rot" memory_type="text" memory_usage="custom" memory_key="countdown-rotulo">Fiesta en el aire</p>
  <h2 class="${C}__tit" memory_type="text" memory_usage="custom" memory_key="countdown-titulo">Globos y confeti</h2>
</header>
<div class="${C}__fiesta">
  <div class="${C}__confeti" aria-hidden="true">${confetis}</div>
  <div class="${C}__globos" aria-label="Cuenta regresiva">
${globos}
  </div>
  <div class="${C}__piso" aria-hidden="true"></div>
</div>
${fecha(C, 'Fecha del evento · hora por confirmar')}`;
  return wrap(S, { id: 'countdown-globos-confeti', cls: C, css, body, desc: 'Cuatro globos flotando a distintas alturas entre confeti que cae sin parar; cada globo lleva su unidad del conteo.', tags: ['globos', 'confeti', 'fiesta'] });
}

module.exports = { cd_griega, cd_encaje, cd_caliz, cd_espejadas, cd_fabuloso, cd_rosa18, cd_negooro60, cd_confeti25 };
