/* Conceptos de countdown 9–16 — continúa la serie de conceptos únicos. */
const { wrap, head, fecha } = require('./core.cjs');

/* 9 · HORTENSIA — Brújula artesanal: rosa de los vientos cuya aguja tiembla
 * y unidades atadas con cordel en los puntos cardinales. */
function cd_hortensia(S) {
  const C = 'cd9';
  const css = `
.${C} { text-align:center; }
.${C}__rot { margin:0 0 .4rem; font-family:'Courier New',monospace; font-size:clamp(.66rem,1.25vw,.78rem); letter-spacing:.5em; text-transform:uppercase; color:color-mix(in srgb, var(--secondary-color) 55%, var(--text-color)); }
.${C}__tit { margin:0 0 clamp(1.2rem,3vw,1.8rem); font-family:${S.disp}; font-weight:400; font-size:clamp(1.8rem,4.2vw,2.7rem); color:var(--primary-color); }
.${C}__marco { position:relative; width:min(100%,520px); aspect-ratio:1; margin:0 auto; }
.${C}__anillo { position:absolute; inset:0; border-radius:50%; border:2px solid var(--primary-color); background:color-mix(in srgb, var(--surface-color) 72%, transparent); box-shadow:0 16px 34px rgba(0,0,0,.14); }
.${C}__anillo::before { content:''; position:absolute; inset:10px; border-radius:50%; border:1px dashed color-mix(in srgb, var(--accent-color) 55%, transparent); }
.${C}__grados i { position:absolute; left:50%; top:2px; width:1.5px; height:8px; margin-left:-.75px; background:var(--secondary-color); transform-origin:50% calc(50cqw - 2px); }
.${C}__rosa { position:absolute; inset:26%; }
.${C}__estrella { position:absolute; inset:0; background:color-mix(in srgb, var(--secondary-color) 26%, transparent); clip-path:polygon(50% 0, 56% 44%, 100% 50%, 56% 56%, 50% 100%, 44% 56%, 0 50%, 44% 44%); }
.${C}__estrella--girada { transform:rotate(45deg) scale(.72); opacity:.7; }
.${C}__aguja { position:absolute; left:50%; top:50%; width:6px; height:46%; margin:-46% 0 0 -3px; transform-origin:50% 100%; animation:${C}-tiembla 2.6s ease-in-out infinite; }
@keyframes ${C}-tiembla { 0%,100% { transform:rotate(-9deg); } 50% { transform:rotate(11deg); } }
.${C}__aguja::before { content:''; position:absolute; inset:0 0 50% 0; background:var(--primary-color); clip-path:polygon(50% 0, 100% 100%, 0 100%); }
.${C}__aguja::after { content:''; position:absolute; inset:50% 0 0 0; background:var(--secondary-color); clip-path:polygon(0 0, 100% 0, 50% 100%); }
.${C}__broche { position:absolute; left:50%; top:50%; width:16px; height:16px; transform:translate(-50%,-50%); border-radius:50%; background:var(--primary-color); box-shadow:0 0 0 4px color-mix(in srgb, var(--primary-color) 25%, transparent); }
.${C}__puntos { position:absolute; inset:0; }
.${C}__punto { position:absolute; display:grid; justify-items:center; gap:.3rem; }
.${C}__punto--n { top:-4%; left:50%; transform:translate(-50%,0); }
.${C}__punto--e { right:-6%; top:50%; transform:translate(0,-50%); }
.${C}__punto--s { bottom:-4%; left:50%; transform:translate(-50%,0); }
.${C}__punto--o { left:-6%; top:50%; transform:translate(0,-50%); }
.${C}__cordel { width:1.5px; height:16px; background:var(--accent-color); }
.${C}__etiqueta { padding:.55rem .8rem .65rem; background:color-mix(in srgb, var(--accent-color) 30%, var(--surface-color)); border:1px solid var(--surface-border-color); border-radius:3px; box-shadow:0 6px 14px rgba(0,0,0,.14); }
.${C}__num { display:block; font-family:${S.disp}; font-size:clamp(1.25rem,3.2vw,1.8rem); line-height:1; color:var(--primary-color); font-variant-numeric:tabular-nums; }
.${C}__etq { display:block; font-family:'Courier New',monospace; font-size:clamp(.42rem,.84vw,.54rem); letter-spacing:.26em; text-transform:uppercase; color:var(--text-color); }
.${C}__rumbo { position:absolute; font-family:'Courier New',monospace; font-size:clamp(.6rem,1.05vw,.7rem); letter-spacing:.3em; color:var(--secondary-color); }
.${C}__fecha { display:block; margin:clamp(2rem,4vw,2.6rem) 0 0; font-family:${S.body}; font-style:italic; font-size:clamp(.85rem,1.6vw,.98rem); color:var(--text-color); }
@media (max-width:560px){ .${C}__marco { width:min(100%,360px); } .${C}__punto--e, .${C}__punto--o { display:none; } .${C}__extra { display:grid; grid-template-columns:1fr 1fr; gap:.6rem; margin-top:1rem; justify-items:center; } }
.${C}__extra { display:none; }
`;
  const grados = Array.from({ length: 24 }, (_, i) => `<i style="transform:rotate(${i * 15}deg); height:${i % 6 === 0 ? '12px' : '7px'}; opacity:${i % 6 === 0 ? '.9' : '.5'};"></i>`).join('');
  const p = (u, l, pos) => `<div class="${C}__punto ${C}__punto--${pos}"><i class="${C}__cordel" aria-hidden="true"></i><span class="${C}__etiqueta"><b class="${C}__num" data-countdown-unit="${u}">--</b><span class="${C}__etq">${l}</span></span></div>`;
  const body = `${head(C, 'Cuenta regresiva', 'La brújula del gran día')}
<div class="${C}__marco">
  <div class="${C}__anillo" aria-hidden="true"><div class="${C}__grados" style="position:absolute;inset:0;">${grados}</div></div>
  <div class="${C}__rosa" aria-hidden="true"><i class="${C}__estrella"></i><i class="${C}__estrella ${C}__estrella--girada"></i></div>
  <i class="${C}__aguja" aria-hidden="true"></i><i class="${C}__broche" aria-hidden="true"></i>
  <span class="${C}__rumbo" style="top:8%; left:50%; transform:translateX(-50%);" aria-hidden="true">N</span>
  <div class="${C}__puntos" aria-label="Cuenta regresiva">
    ${p('days', 'Días', 'n')}
    ${p('hours', 'Horas', 'e')}
    ${p('minutes', 'Min', 's')}
    ${p('seconds', 'Seg', 'o')}
  </div>
</div>
<div class="${C}__extra" aria-label="Unidades laterales">
  <span class="${C}__etiqueta"><b class="${C}__num" data-countdown-unit="hours">--</b><span class="${C}__etq">Horas</span></span>
  <span class="${C}__etiqueta"><b class="${C}__num" data-countdown-unit="seconds">--</b><span class="${C}__etq">Seg</span></span>
</div>
${fecha(C, 'Coordenadas del evento · hora por confirmar')}`;
  return wrap(S, { id: 'countdown-brujula-kraft', cls: C, css, body, desc: 'Brújula artesanal con aguja temblorosa y rosa de los vientos; las unidades cuelgan con cordel en los cuatro rumbos.', tags: ['brujula', 'navegacion', 'kraft'] });
}

/* 10 · NAVYLASER — Indicador de ascensor art-déco: piso que desciende hacia
 * el día del evento, lámparas para h/m/s y marcos de abanico. */
function cd_navylaser(S) {
  const C = 'cd10';
  const css = `
.${C} { text-align:center; }
.${C}__rot { margin:0 0 .4rem; font-family:'Courier New',monospace; font-size:clamp(.66rem,1.25vw,.78rem); letter-spacing:.5em; text-transform:uppercase; color:color-mix(in srgb, var(--secondary-color) 55%, var(--text-color)); }
.${C}__tit { margin:0 0 clamp(1.2rem,3vw,1.8rem); font-family:${S.disp}; font-weight:400; font-size:clamp(1.8rem,4.2vw,2.7rem); color:var(--primary-color); }
.${C}__cabina { display:inline-grid; grid-template-columns:auto auto; gap:clamp(1.2rem,3.4vw,2.2rem); padding:clamp(1.2rem,3vw,1.8rem) clamp(1.4rem,4vw,2.4rem); background:var(--surface-color); border:2px solid var(--primary-color); border-radius:18px 18px 8px 8px; box-shadow:0 22px 44px rgba(0,0,0,.3); position:relative; }
.${C}__cabina::before { content:''; position:absolute; left:14px; right:14px; top:-12px; height:12px; background:repeating-linear-gradient(90deg, var(--primary-color) 0 10px, transparent 10px 20px); border-radius:6px 6px 0 0; }
.${C}__piso { display:grid; justify-items:center; gap:.5rem; padding:clamp(.8rem,2vw,1.2rem) clamp(1.2rem,3vw,1.8rem); border:1px solid var(--surface-border-color); border-radius:10px; background:color-mix(in srgb, var(--bg-color) 60%, var(--surface-color)); box-shadow:inset 0 4px 12px rgba(0,0,0,.4); }
.${C}__visor { display:flex; align-items:center; gap:.8rem; }
.${C}__flecha { width:0; height:0; border-left:9px solid transparent; border-right:9px solid transparent; border-top:13px solid var(--primary-color); animation:${C}-parp 1.1s steps(2) infinite; }
@keyframes ${C}-parp { 50% { opacity:.25; } }
.${C}__num { font-family:${S.mono}; font-weight:700; font-size:clamp(2.6rem,8vw,4.6rem); line-height:1; color:var(--accent-color); text-shadow:0 0 16px color-mix(in srgb, var(--accent-color) 55%, transparent); font-variant-numeric:tabular-nums; }
.${C}__etq { font-family:'Courier New',monospace; font-size:clamp(.6rem,1.05vw,.7rem); letter-spacing:.4em; text-transform:uppercase; color:var(--text-color); }
.${C}__lamparas { display:grid; gap:.75rem; align-content:center; min-width:clamp(170px,26vw,220px); }
.${C}__lamp { display:flex; align-items:center; gap:.8rem; padding:.45rem .7rem; border:1px solid color-mix(in srgb, var(--primary-color) 30%, transparent); border-radius:8px; background:color-mix(in srgb, var(--bg-color) 34%, var(--surface-color)); }
.${C}__foco { width:10px; height:10px; border-radius:50%; background:var(--accent-color); box-shadow:0 0 10px color-mix(in srgb, var(--accent-color) 70%, transparent); animation:${C}-foco 1.8s ease-in-out infinite; flex:none; }
.${C}__lamp:nth-child(2) .${C}__foco { animation-delay:.5s; } .${C}__lamp:nth-child(3) .${C}__foco { animation-delay:1s; }
@keyframes ${C}-foco { 50% { opacity:.35; box-shadow:none; } }
.${C}__val { font-family:${S.mono}; font-weight:700; font-size:clamp(1.25rem,3.2vw,1.75rem); color:var(--text-color); min-width:3.4ch; text-align:right; font-variant-numeric:tabular-nums; }
.${C}__tag { font-family:'Courier New',monospace; font-size:clamp(.48rem,.94vw,.6rem); letter-spacing:.3em; text-transform:uppercase; color:var(--secondary-color); }
.${C}__rejilla { margin:clamp(1.1rem,3vw,1.6rem) auto 0; width:min(100%,430px); height:16px; background:repeating-linear-gradient(90deg, transparent 0 6px, color-mix(in srgb, var(--primary-color) 38%, transparent) 6px 10px); border-radius:8px; }
.${C}__fecha { display:block; margin:clamp(1.1rem,2.6vw,1.6rem) 0 0; font-family:${S.body}; font-style:italic; font-size:clamp(.85rem,1.6vw,.98rem); color:var(--text-color); }
@media (max-width:560px){ .${C}__cabina { grid-template-columns:1fr; } .${C}__lamparas { grid-template-columns:1fr; min-width:0; width:100%; } }
`;
  const lamparas = [['hours', 'Horas'], ['minutes', 'Min'], ['seconds', 'Seg']]
    .map(([u, l]) => `<div class="${C}__lamp"><i class="${C}__foco" aria-hidden="true"></i><b class="${C}__val" data-countdown-unit="${u}">--</b><span class="${C}__tag">${l}</span></div>`).join('\n');
  const body = `<header memory_type="text" memory_usage="custom" memory_key="countdown-intro">
  <p class="${C}__rot" memory_type="text" memory_usage="custom" memory_key="countdown-rotulo">Descendiendo</p>
  <h2 class="${C}__tit" memory_type="text" memory_usage="custom" memory_key="countdown-titulo">Piso: día del evento</h2>
</header>
<div class="${C}__cabina">
  <div class="${C}__piso" aria-label="Días restantes">
    <span class="${C}__visor"><i class="${C}__flecha" aria-hidden="true"></i><b class="${C}__num" data-countdown-unit="days">--</b></span>
    <span class="${C}__etq">Días</span>
  </div>
  <div class="${C}__lamparas" aria-label="Horas, minutos y segundos">
${lamparas}
  </div>
</div>
<div class="${C}__rejilla" aria-hidden="true"></div>
${fecha(C, 'Fecha del evento · hora por confirmar')}`;
  return wrap(S, { id: 'countdown-ascensor-deco', cls: C, css, body, desc: 'Indicador de ascensor art-déco: el número de días desciende como un piso iluminado y las lámparas marcan horas, minutos y segundos.', tags: ['ascensor', 'deco', 'piso'] });
}

/* 11 · OROBOTANICO — Corona de brotes: anillo vegetal con renuevo que orbita
 * y las cuatro unidades floreciendo AL CENTRO del aro. */
function cd_orobotanico(S) {
  const C = 'cd11';
  const css = `
.${C} { text-align:center; }
.${C}__rot { margin:0 0 .4rem; font-family:'Courier New',monospace; font-size:clamp(.66rem,1.25vw,.78rem); letter-spacing:.5em; text-transform:uppercase; color:color-mix(in srgb, var(--secondary-color) 55%, var(--text-color)); }
.${C}__tit { margin:0 0 clamp(1.2rem,3vw,1.8rem); font-family:${S.disp}; font-weight:400; font-size:clamp(1.8rem,4.2vw,2.7rem); color:var(--primary-color); }
.${C}__corona { position:relative; width:min(100%,440px); aspect-ratio:1; margin:0 auto clamp(1.4rem,3vw,2rem); border-radius:50%; border:2px dashed color-mix(in srgb, var(--primary-color) 65%, transparent); display:grid; place-items:center; }
.${C}__hojaOrn { position:absolute; width:20px; height:34px; border-radius:0 100% 0 100%; border:1.5px solid var(--secondary-color); background:color-mix(in srgb, var(--secondary-color) 22%, transparent); top:50%; left:50%; margin:-17px 0 0 -10px; }
.${C}__orbita { display:none; }
.${C}__renuevo { display:none; }
.${C}__brotes { display:grid; grid-template-columns:1fr 1fr; gap:clamp(.7rem,2.6vw,1.3rem); width:74%; }
.${C}__brote { display:grid; justify-items:center; gap:.45rem; padding:clamp(.8rem,2.4vw,1.1rem) .7rem; background:color-mix(in srgb, var(--surface-color) 86%, transparent); border:1px solid var(--surface-border-color); border-radius:14px; position:relative; }
.${C}__brote::before { content:''; width:8px; height:8px; border-radius:0 100% 0 100%; background:var(--secondary-color); position:absolute; top:6px; right:6px; }
.${C}__num { font-family:${S.disp}; font-size:clamp(1.3rem,4.2vw,2rem); line-height:1; color:var(--primary-color); font-variant-numeric:tabular-nums; }
.${C}__etq { font-family:'Courier New',monospace; font-size:clamp(.54rem,1vw,.64rem); letter-spacing:.26em; text-transform:uppercase; color:var(--text-color); }
.${C}__fecha { display:block; margin:clamp(1.5rem,3.4vw,2.2rem) 0 0; font-family:${S.body}; font-size:clamp(1rem,2.2vw,1.3rem); font-weight:600; color:var(--text-color); }
@media (max-width:560px){ .${C}__corona { width:min(100%,370px); } .${C}__brotes { width:82%; } }
`;
  const hojasOrn = [0, 45, 90, 135, 180, 225, 270, 315].map((d) => `<i class="${C}__hojaOrn" style="transform:rotate(${d}deg) translateY(-46%); transform-origin:center;"></i>`).join('');
  const brotes = [['days', 'Días'], ['hours', 'Horas'], ['minutes', 'Min'], ['seconds', 'Seg']]
    .map(([u, l]) => `<div class="${C}__brote"><b class="${C}__num" data-countdown-unit="${u}">--</b><span class="${C}__etq">${l}</span></div>`).join('\n');
  const body = `<header memory_type="text" memory_usage="custom" memory_key="countdown-intro">
  <p class="${C}__rot" memory_type="text" memory_usage="custom" memory_key="countdown-rotulo">Ciclo del jardín</p>
  <h2 class="${C}__tit" memory_type="text" memory_usage="custom" memory_key="countdown-titulo">El brote gira y cuenta</h2>
</header>
<div class="${C}__corona">
  <span aria-hidden="true" style="position:absolute; inset:0;">${hojasOrn}<span class="${C}__orbita"><i class="${C}__renuevo"></i></span></span>
  <div class="${C}__brotes" aria-label="Cuenta regresiva" style="position:relative; z-index:2;">
${brotes}
  </div>
</div>
${fecha(C, 'Fecha del evento · hora por confirmar')}`;
  return wrap(S, { id: 'countdown-corona-botanica', cls: C, css, body, desc: 'Corona botánica con renuevo dorado orbitando el aro; los cuatro brotes florecen al centro del círculo.', tags: ['botanico', 'orbita', 'corona'] });
}

/* 12 · GLICINA — Péndulo de casona: caja de reloj con péndulo vivo y
 * etiquetas de madera colgando a distinta altura. */
function cd_glicina(S) {
  const C = 'cd12';
  const css = `
.${C} { text-align:center; }
.${C}__rot { margin:0 0 .4rem; font-family:'Courier New',monospace; font-size:clamp(.66rem,1.25vw,.78rem); letter-spacing:.5em; text-transform:uppercase; color:color-mix(in srgb, var(--secondary-color) 55%, var(--text-color)); }
.${C}__tit { margin:0 0 clamp(1.2rem,3vw,1.8rem); font-family:${S.disp}; font-weight:400; font-size:clamp(1.8rem,4.2vw,2.7rem); color:var(--primary-color); }
.${C}__casona { position:relative; width:min(100%,380px); margin:0 auto clamp(1.4rem,3vw,2rem); background:var(--surface-color); border:2px solid var(--primary-color); border-radius:120px 120px 10px 10px; padding:1rem 1rem 1.6rem; box-shadow:0 24px 44px rgba(0,0,0,.22); }
.${C}__esfera { width:clamp(120px,22vw,160px); aspect-ratio:1; margin:0 auto; border-radius:50%; border:3px solid var(--primary-color); background:color-mix(in srgb, var(--accent-color) 26%, var(--surface-color)); position:relative; }
.${C}__esfera i { position:absolute; left:50%; top:5px; width:2px; height:8%; margin-left:-1px; background:var(--primary-color); transform-origin:50% 1000%; }
.${C}__manecilla { position:absolute; left:50%; bottom:50%; transform-origin:50% 100%; background:var(--primary-color); border-radius:2px; }
.${C}__manecilla--g { width:4px; height:24%; margin-left:-2px; animation:${C}-giro 90s linear infinite; }
.${C}__manecilla--p { width:3px; height:34%; margin-left:-1.5px; animation:${C}-giro 12s linear infinite; }
@keyframes ${C}-giro { to { transform:rotate(360deg); } }
.${C}__ojo { position:absolute; left:50%; top:50%; width:10px; height:10px; transform:translate(-50%,-50%); border-radius:50%; background:var(--primary-color); }
.${C}__cajaPend { position:relative; height:clamp(140px,24vw,190px); margin-top:1rem; display:grid; justify-items:center; overflow:hidden; }
.${C}__varilla { position:absolute; top:0; width:2.5px; height:72%; background:var(--secondary-color); transform-origin:50% 0; animation:${C}-pendulo 2s cubic-bezier(.45,0,.55,1) infinite alternate; }
@keyframes ${C}-pendulo { from { transform:rotate(11deg); } to { transform:rotate(-11deg); } }
.${C}__bola { position:absolute; top:68%; left:50%; width:clamp(34px,6vw,46px); height:clamp(34px,6vw,46px); margin-left:calc(clamp(34px,6vw,46px) / -2); border-radius:50%; background:radial-gradient(circle at 34% 30%, color-mix(in srgb, var(--primary-color) 72%, #fff), var(--primary-color)); box-shadow:0 8px 18px rgba(0,0,0,.3); animation:${C}-pendulo 2s cubic-bezier(.45,0,.55,1) infinite alternate; }
.${C}__balancin { display:flex; justify-content:center; align-items:flex-start; gap:clamp(.8rem,2.6vw,1.8rem); flex-wrap:wrap; }
.${C}__etiq { display:grid; justify-items:center; }
.${C}__etiq:nth-child(2){ padding-top:clamp(1.2rem,4vw,2.4rem); } .${C}__etiq:nth-child(4){ padding-top:clamp(1.2rem,4vw,2.4rem); }
.${C}__cuerda { width:1.5px; height:clamp(16px,4vw,34px); background:var(--accent-color); }
.${C}__madera { padding:.7rem 1rem .85rem; background:color-mix(in srgb, var(--accent-color) 34%, var(--surface-color)); border:1.5px solid var(--primary-color); border-radius:8px 8px 3px 3px; box-shadow:0 10px 20px rgba(0,0,0,.16); transform-origin:top center; animation:${C}-vaiven 3.4s ease-in-out infinite alternate; }
.${C}__etiq:nth-child(3) .${C}__madera { animation-delay:.6s; } .${C}__etiq:nth-child(4) .${C}__madera { animation-delay:1.1s; }
@keyframes ${C}-vaiven { from { transform:rotate(-2.5deg); } to { transform:rotate(2.5deg); } }
.${C}__num { display:block; font-family:${S.disp}; font-size:clamp(1.35rem,3.6vw,2rem); line-height:1; color:var(--primary-color); font-variant-numeric:tabular-nums; }
.${C}__etq { display:block; font-family:'Courier New',monospace; font-size:clamp(.56rem,1.02vw,.66rem); letter-spacing:.3em; text-transform:uppercase; color:var(--text-color); }
.${C}__fecha { display:block; margin:clamp(1.4rem,3vw,2rem) 0 0; font-family:${S.body}; font-style:italic; font-size:clamp(.85rem,1.6vw,.98rem); color:var(--text-color); }
@media (max-width:560px){ .${C}__etiq:nth-child(n){ padding-top:0; } .${C}__balancin { gap:.8rem; } }
`;
  const marcas = Array.from({ length: 12 }, (_, i) => `<i style="transform:rotate(${i * 30}deg);"></i>`).join('');
  const etiquetas = [['days', 'Días'], ['hours', 'Horas'], ['minutes', 'Min'], ['seconds', 'Seg']]
    .map(([u, l]) => `<div class="${C}__etiq"><i class="${C}__cuerda" aria-hidden="true"></i><span class="${C}__madera"><b class="${C}__num" data-countdown-unit="${u}">--</b><span class="${C}__etq">${l}</span></span></div>`).join('\n');
  const body = `<header memory_type="text" memory_usage="custom" memory_key="countdown-intro">
  <p class="${C}__rot" memory_type="text" memory_usage="custom" memory_key="countdown-rotulo">Tic… tac…</p>
  <h2 class="${C}__tit" memory_type="text" memory_usage="custom" memory_key="countdown-titulo">La casona cuenta</h2>
</header>
<div class="${C}__casona" aria-hidden="true">
  <div class="${C}__esfera">${marcas}<i class="${C}__manecilla ${C}__manecilla--g"></i><i class="${C}__manecilla ${C}__manecilla--p"></i><i class="${C}__ojo"></i></div>
  <div class="${C}__cajaPend"><i class="${C}__varilla"></i><i class="${C}__bola"></i></div>
</div>
<div class="${C}__balancin" aria-label="Cuenta regresiva">
${etiquetas}
</div>
${fecha(C, 'Fecha del evento · hora por confirmar')}`;
  return wrap(S, { id: 'countdown-pendulo-glicina', cls: C, css, body, desc: 'Relj de péndulo de casona con esfera viva y balancín dorado; las unidades cuelgan de etiquetas de madera que se mecen.', tags: ['pendulo', 'casona', 'vintage'] });
}

/* 13 · APILADAS — Torre de bloques pastel que se tambalea; cada cara de
 * bloque muestra una unidad y una estrella corona la torre. */
function cd_apiladas(S) {
  const C = 'cd13';
  const css = `
.${C} { text-align:center; }
.${C}__rot { margin:0 0 .4rem; font-family:'Courier New',monospace; font-size:clamp(.66rem,1.25vw,.78rem); letter-spacing:.5em; text-transform:uppercase; color:color-mix(in srgb, var(--secondary-color) 55%, var(--text-color)); }
.${C}__tit { margin:0 0 clamp(1.4rem,3vw,2rem); font-family:${S.disp}; font-weight:400; font-size:clamp(1.8rem,4.2vw,2.7rem); color:var(--primary-color); }
.${C}__escena { display:flex; justify-content:center; align-items:flex-end; gap:clamp(1.2rem,4vw,3rem); flex-wrap:wrap; }
.${C}__torre { display:grid; justify-items:center; width:min(100%,400px); }
.${C}__estrella { width:26px; height:26px; clip-path:polygon(50% 0, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%); background:var(--primary-color); animation:${C}-brilla 2.4s ease-in-out infinite; margin-bottom:.4rem; }
@keyframes ${C}-brilla { 50% { opacity:.55; transform:scale(.9); } }
.${C}__bloque { display:flex; align-items:center; justify-content:center; gap:.8rem; height:clamp(56px,10vw,74px); border:1.5px solid var(--primary-color); border-radius:10px; box-shadow:0 10px 22px rgba(0,0,0,.14); background:color-mix(in srgb, var(--surface-color) 88%, var(--accent-color)); }
.${C}__bloque:nth-of-type(2){ width:96%; transform:rotate(-1.6deg) translateX(clamp(-3rem,-8vw,-1.6rem)); z-index:2; background:color-mix(in srgb, var(--secondary-color) 18%, var(--surface-color)); }
.${C}__bloque:nth-of-type(3){ width:82%; transform:rotate(1.2deg) translateX(clamp(2rem,6vw,3.4rem)); z-index:3; background:color-mix(in srgb, var(--primary-color) 14%, var(--surface-color)); animation:${C}-tambalea 3s ease-in-out infinite alternate; }
.${C}__bloque:nth-of-type(4){ width:66%; transform:translateX(clamp(-1.2rem,-4vw,-.6rem)); z-index:4; background:color-mix(in srgb, var(--accent-color) 34%, var(--surface-color)); }
@keyframes ${C}-tambalea { from { transform:rotate(.8deg) translateX(clamp(2rem,6vw,3.4rem)); } to { transform:rotate(2deg) translateX(clamp(2rem,6vw,3.4rem)); } }
@media (max-width:560px){ .${C}__bloque:nth-of-type(n){ transform:none; animation:none; } }
.${C}__num { font-family:${S.disp}; font-size:clamp(1.5rem,4vw,2.2rem); line-height:1; color:var(--primary-color); font-variant-numeric:tabular-nums; }
.${C}__etq { font-family:'Courier New',monospace; font-size:clamp(.56rem,1.05vw,.68rem); letter-spacing:.3em; text-transform:uppercase; color:var(--text-color); writing-mode:vertical-rl; }
.${C}__sombraPiso { width:72%; height:10px; border-radius:50%; background:color-mix(in srgb, var(--primary-color) 18%, transparent); filter:blur(3px); margin-top:.8rem; }
.${C}__nota { display:grid; align-content:center; gap:.9rem; max-width:220px; }
.${C}__ pastilla { }
.${C}__piloto { display:flex; align-items:baseline; gap:.7rem; padding:.5rem .9rem; border-left:4px solid var(--secondary-color); background:color-mix(in srgb, var(--surface-color) 80%, transparent); }
.${C}__num--ch { font-family:${S.disp}; font-size:clamp(1.2rem,3vw,1.6rem); color:var(--primary-color); font-variant-numeric:tabular-nums; }
.${C}__fecha { display:block; margin:clamp(1.4rem,3vw,2rem) 0 0; font-family:${S.body}; font-style:italic; font-size:clamp(.85rem,1.6vw,.98rem); color:var(--text-color); }
@media (max-width:560px){ .${C}__nota { max-width:none; grid-template-columns:1fr 1fr; } }
`;
  const pilotos = [['days', 'Días'], ['hours', 'Horas'], ['minutes', 'Min'], ['seconds', 'Seg']];
  const body = `<header memory_type="text" memory_usage="custom" memory_key="countdown-intro">
  <p class="${C}__rot" memory_type="text" memory_usage="custom" memory_key="countdown-rotulo">Piso a piso</p>
  <h2 class="${C}__tit" memory_type="text" memory_usage="custom" memory_key="countdown-titulo">La torre del conteo</h2>
</header>
<div class="${C}__escena">
  <div class="${C}__torre" aria-label="Cuenta regresiva">
    <i class="${C}__estrella" aria-hidden="true"></i>
    <div class="${C}__bloque"><b class="${C}__num" data-countdown-unit="days">--</b><span class="${C}__etq">Días</span></div>
    <div class="${C}__bloque"><b class="${C}__num" data-countdown-unit="hours">--</b><span class="${C}__etq">Horas</span></div>
    <div class="${C}__bloque"><b class="${C}__num" data-countdown-unit="minutes">--</b><span class="${C}__etq">Min</span></div>
    <div class="${C}__bloque"><b class="${C}__num" data-countdown-unit="seconds">--</b><span class="${C}__etq">Seg</span></div>
    <i class="${C}__sombraPiso" aria-hidden="true"></i>
  </div>
  <div class="${C}__nota">
    <div class="${C}__piloto"><b class="${C}__num--ch" data-countdown-unit="minutes">--</b><span class="${C}__etq">Min</span></div>
    <div class="${C}__piloto"><b class="${C}__num--ch" data-countdown-unit="seconds">--</b><span class="${C}__etq">Seg</span></div>
  </div>
</div>
${fecha(C, 'Fecha del evento · hora por confirmar')}`;
  return wrap(S, { id: 'countdown-torre-bloques', cls: C, css, body, desc: 'Torre de bloques pastel que se tambalea: cada bloque apilado muestra una unidad y una estrella corona la cima.', tags: ['bloques', 'torre', 'pastel'] });
}

/* 14 · PEONIAS — Peonía que florece: anillos de pétalos que respiran y
 * unidades en pétalos sueltos bajo la flor. */
function cd_peonias(S) {
  const C = 'cd14';
  const css = `
.${C} { text-align:center; }
.${C}__rot { margin:0 0 .4rem; font-family:'Courier New',monospace; font-size:clamp(.66rem,1.25vw,.78rem); letter-spacing:.5em; text-transform:uppercase; color:color-mix(in srgb, var(--secondary-color) 55%, var(--text-color)); }
.${C}__tit { margin:0 0 clamp(1rem,2.6vw,1.5rem); font-family:${S.disp}; font-weight:400; font-size:clamp(1.8rem,4.2vw,2.7rem); color:var(--primary-color); }
.${C}__jardin { position:relative; width:clamp(190px,32vw,260px); margin:0 auto clamp(.9rem,2.2vw,1.3rem); }
.${C}__flor { position:relative; width:100%; aspect-ratio:1; animation:${C}-respira 4.2s ease-in-out infinite; }
@keyframes ${C}-respira { 50% { transform:scale(1.05); } }
.${C}__corazon { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); width:38%; aspect-ratio:1; border-radius:50%; background:radial-gradient(circle at 40% 34%, color-mix(in srgb, var(--accent-color) 90%, #fff), var(--accent-color)); display:grid; place-items:center; text-align:center; box-shadow:0 0 0 6px color-mix(in srgb, var(--primary-color) 22%, transparent); z-index:3; }
.${C}__num--cor { font-family:${S.disp}; font-size:clamp(1.1rem,3vw,1.6rem); color:var(--primary-color); font-variant-numeric:tabular-nums; }
.${C}__etq--cor { display:block; font-family:'Courier New',monospace; font-size:clamp(.38rem,.76vw,.5rem); letter-spacing:.22em; text-transform:uppercase; color:var(--primary-color); }
.${C}__anillo { position:absolute; inset:0; border-radius:50%; }
.${C}__petalo { position:absolute; left:50%; top:50%; width:30%; height:48%; margin:-48% 0 0 -15%; border-radius:50% 50% 46% 46%/64% 64% 36% 36%; transform-origin:50% 100%; border:1px solid color-mix(in srgb, var(--primary-color) 55%, transparent); }
.${C}__anillo--ext .${C}__petalo { background:color-mix(in srgb, var(--primary-color) 20%, transparent); }
.${C}__anillo--med { inset:16%; } .${C}__anillo--med .${C}__petalo { background:color-mix(in srgb, var(--primary-color) 38%, transparent); }
.${C}__anillo--int { inset:32%; } .${C}__anillo--int .${C}__petalo { background:color-mix(in srgb, var(--primary-color) 58%, transparent); }
.${C}__tallo { width:2px; height:clamp(26px,5vw,44px); margin:0 auto; background:var(--secondary-color); }
.${C}__maceta { display:flex; justify-content:center; gap:clamp(.7rem,2.2vw,1.4rem); flex-wrap:wrap; margin-top:.6rem; }
.${C}__suelto { display:grid; justify-items:center; gap:.3rem; padding:.6rem .9rem .7rem; border-radius:50% 50% 46% 46%/64% 64% 36% 36%; background:color-mix(in srgb, var(--primary-color) 12%, var(--surface-color)); border:1px solid var(--surface-border-color); animation:${C}-flota 3s ease-in-out infinite; }
.${C}__suelto:nth-child(2){ animation-delay:.4s; } .${C}__suelto:nth-child(3){ animation-delay:.8s; }
@keyframes ${C}-flota { 50% { transform:translateY(-7px) rotate(2deg); } }
.${C}__num { font-family:${S.disp}; font-size:clamp(1.2rem,3.2vw,1.7rem); line-height:1; color:var(--primary-color); font-variant-numeric:tabular-nums; }
.${C}__etq { font-family:'Courier New',monospace; font-size:clamp(.42rem,.84vw,.54rem); letter-spacing:.26em; text-transform:uppercase; color:var(--text-color); }
.${C}__fecha { display:block; margin:clamp(1.3rem,3vw,1.9rem) 0 0; font-family:${S.body}; font-style:italic; font-size:clamp(.85rem,1.6vw,.98rem); color:var(--text-color); }
@media (max-width:560px){ .${C}__maceta { gap:.6rem; } }
`;
  const anillo = (cls, n, offset) => Array.from({ length: n }, (_, i) => `<i class="${C}__petalo" style="transform:rotate(${offset + i * (360 / n)}deg);"></i>`).join('');
  const sueltos = [['hours', 'Horas'], ['minutes', 'Min'], ['seconds', 'Seg']]
    .map(([u, l]) => `<span class="${C}__suelto"><b class="${C}__num" data-countdown-unit="${u}">--</b><span class="${C}__etq">${l}</span></span>`).join('\n');
  const body = `<header memory_type="text" memory_usage="custom" memory_key="countdown-intro">
  <p class="${C}__rot" memory_type="text" memory_usage="custom" memory_key="countdown-rotulo">Capa a capa</p>
  <h2 class="${C}__tit" memory_type="text" memory_usage="custom" memory_key="countdown-titulo">La peonía abre al gran día</h2>
</header>
<div class="${C}__jardin">
  <div class="${C}__flor" aria-hidden="true">
    <div class="${C}__anillo ${C}__anillo--ext">${anillo(C + '__', 8, 0)}</div>
    <div class="${C}__anillo ${C}__anillo--med">${anillo(C + '__', 6, 22)}</div>
    <div class="${C}__anillo ${C}__anillo--int">${anillo(C + '__', 5, 40)}</div>
  </div>
  <div class="${C}__corazon" aria-label="Días restantes">
    <span><b class="${C}__num--cor" data-countdown-unit="days">--</b><span class="${C}__etq--cor">Días</span></span>
  </div>
</div>
<i class="${C}__tallo" aria-hidden="true"></i>
<div class="${C}__maceta" aria-label="Horas, minutos y segundos">
${sueltos}
</div>
${fecha(C, 'Fecha del evento · hora por confirmar')}`;
  return wrap(S, { id: 'countdown-peonia-florece', cls: C, css, body, desc: 'Peonía de tres anillos de pétalos que respira; los días laten en el corazón de la flor y el resto flota en pétalos sueltos.', tags: ['peonía', 'pétalos', 'florece'] });
}

/* 15 · OTONO — Rama con hojas-colgante que se mecen y hojas que caen de
 * fondo; unidades talladas en madera. */
function cd_otono(S) {
  const C = 'cd15';
  const css = `
.${C} { text-align:center; }
.${C}__rot { margin:0 0 .4rem; font-family:'Courier New',monospace; font-size:clamp(.66rem,1.25vw,.78rem); letter-spacing:.5em; text-transform:uppercase; color:color-mix(in srgb, var(--secondary-color) 55%, var(--text-color)); }
.${C}__tit { margin:0 0 clamp(1.6rem,3vw,2.2rem); font-family:${S.disp}; font-weight:400; font-size:clamp(1.8rem,4.2vw,2.7rem); color:var(--primary-color); }
.${C}__arbol { position:relative; width:min(100%,720px); margin:0 auto clamp(1rem,2.6vw,1.6rem); padding-top:1.6rem; }
.${C}__rama { position:absolute; top:0; left:0; right:0; height:22px; }
.${C}__rama svg { display:block; width:100%; height:22px; color:var(--primary-color); }
.${C}__fila { display:flex; justify-content:space-around; align-items:flex-start; flex-wrap:wrap; gap:.8rem; }
.${C}__hoja { display:grid; justify-items:center; }
.${C}__hilo { width:1.5px; height:clamp(20px,5vw,42px); background:var(--accent-color); }
.${C}__etiqueta { display:grid; justify-items:center; gap:.3rem; padding:.8rem 1rem .95rem; width:clamp(86px,16vw,116px); clip-path:polygon(50% 100%, 0 26%, 10% 0, 90% 0, 100% 26%); background:color-mix(in srgb, var(--accent-color) 42%, var(--surface-color)); border-top:3px solid var(--primary-color); transform-origin:50% -40px; animation:${C}-mece 3.2s ease-in-out infinite alternate; }
.${C}__hoja:nth-child(2) .${C}__etiqueta { animation-delay:.5s; } .${C}__hoja:nth-child(3) .${C}__etiqueta { animation-delay:1s; } .${C}__hoja:nth-child(4) .${C}__etiqueta { animation-delay:1.5s; }
@keyframes ${C}-mece { from { transform:rotate(-4deg); } to { transform:rotate(4deg); } }
.${C}__venas { width:60%; height:1.5px; background:color-mix(in srgb, var(--primary-color) 55%, transparent); }
.${C}__num { font-family:${S.disp}; font-size:clamp(1.35rem,3.6vw,2rem); line-height:1; color:var(--primary-color); font-variant-numeric:tabular-nums; }
.${C}__etq { font-family:'Courier New',monospace; font-size:clamp(.56rem,1.02vw,.66rem); letter-spacing:.28em; text-transform:uppercase; color:var(--text-color); }
.${C}__cayendo { position:absolute; inset:0; pointer-events:none; overflow:hidden; }
.${C}__cae { position:absolute; width:16px; height:22px; clip-path:polygon(50% 100%, 0 30%, 18% 0, 82% 0, 100% 30%); background:color-mix(in srgb, var(--primary-color) 55%, transparent); opacity:.6; animation:${C}-cae linear infinite; }
@keyframes ${C}-cae { 0% { transform:translateY(-10%) rotate(0); } 100% { transform:translateY(760%) rotate(300deg); } }
.${C}__suelo { width:min(100%,560px); height:2px; margin:clamp(1.6rem,4vw,2.4rem) auto 0; background:linear-gradient(90deg, transparent, var(--primary-color), transparent); }
.${C}__fecha { display:block; margin:clamp(1.1rem,2.6vw,1.6rem) 0 0; font-family:${S.body}; font-style:italic; font-size:clamp(.85rem,1.6vw,.98rem); color:var(--text-color); }
@media (max-width:560px){ .${C}__fila { justify-content:center; } .${C}__hoja { flex:1 1 40%; } }
`;
  const hojas = [['days', 'Días'], ['hours', 'Horas'], ['minutes', 'Min'], ['seconds', 'Seg']]
    .map(([u, l]) => `<div class="${C}__hoja"><i class="${C}__hilo" aria-hidden="true"></i>
  <div class="${C}__etiqueta"><i class="${C}__venas" aria-hidden="true"></i><b class="${C}__num" data-countdown-unit="${u}">--</b><span class="${C}__etq">${l}</span></div>
</div>`).join('\n');
  const caen = [[8, 0, 7], [26, 2.5, 9], [47, 1.2, 8], [66, 3.4, 10], [85, 0.6, 8.5]]
    .map(([x, d, dur]) => `<i class="${C}__cae" style="left:${x}%; animation-delay:${d}s; animation-duration:${dur}s;"></i>`).join('');
  const body = `<header memory_type="text" memory_usage="custom" memory_key="countdown-intro">
  <p class="${C}__rot" memory_type="text" memory_usage="custom" memory_key="countdown-rotulo">Viento de otoño</p>
  <h2 class="${C}__tit" memory_type="text" memory_usage="custom" memory_key="countdown-titulo">Hoja a hoja, más cerca</h2>
</header>
<div class="${C}__arbol">
  <div class="${C}__rama" aria-hidden="true"><svg viewBox="0 0 720 22" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M4 16 C 140 4, 300 20, 430 8 S 640 4, 716 12"/><path d="M180 10 l -20 -8 M520 9 l 22 -7 M340 13 l 12 -9"/></svg></div>
  <div class="${C}__cayendo" aria-hidden="true">${caen}</div>
  <div class="${C}__fila" aria-label="Cuenta regresiva">
${hojas}
  </div>
</div>
<div class="${C}__suelo" aria-hidden="true"></div>
${fecha(C, 'Fecha del evento · hora por confirmar')}`;
  return wrap(S, { id: 'countdown-rama-otono', cls: C, css, body, desc: 'Rama de otoño de la que cuelgan etiquetas-hoja meciéndose, con hojas cayendo de fondo sobre el suelo dorado.', tags: ['otoño', 'hojas', 'rama'] });
}

/* 16 · NAVYFLORAL — Boya náutica flotando en olas: las unidades van en la
 * boya central y en flotadores menores. */
function cd_navyfloral(S) {
  const C = 'cd16';
  const css = `
.${C} { text-align:center; }
.${C}__rot { margin:0 0 .4rem; font-family:'Courier New',monospace; font-size:clamp(.66rem,1.25vw,.78rem); letter-spacing:.5em; text-transform:uppercase; color:color-mix(in srgb, var(--secondary-color) 55%, var(--text-color)); }
.${C}__tit { margin:0 0 clamp(1.2rem,3vw,1.8rem); font-family:${S.disp}; font-weight:400; font-size:clamp(1.8rem,4.2vw,2.7rem); color:var(--primary-color); }
.${C}__mar { position:relative; width:min(100%,720px); margin:0 auto; height:clamp(230px,38vw,300px); }
.${C}__boya { position:absolute; left:50%; top:14%; transform:translateX(-50%); width:clamp(140px,24vw,180px); aspect-ratio:1; border-radius:50%; border:6px solid var(--surface-color); outline:2.5px solid var(--primary-color); background:conic-gradient(var(--primary-color) 0 25%, var(--surface-color) 25% 50%, var(--primary-color) 50% 75%, var(--surface-color) 75%); display:grid; place-items:center; animation:${C}-boga 3.2s ease-in-out infinite; box-shadow:0 16px 30px rgba(0,0,0,.22); }
@keyframes ${C}-boga { 50% { transform:translateX(-50%) translateY(-9px) rotate(3deg); } }
.${C}__ojo { width:58%; aspect-ratio:1; border-radius:50%; background:var(--surface-color); border:2px solid var(--primary-color); display:grid; place-items:center; gap:.1rem; box-shadow:inset 0 0 0 4px color-mix(in srgb, var(--accent-color) 40%, transparent); }
.${C}__num--b { font-family:${S.disp}; font-size:clamp(1.7rem,4.6vw,2.5rem); line-height:1; color:var(--primary-color); font-variant-numeric:tabular-nums; }
.${C}__etq--b { font-family:'Courier New',monospace; font-size:clamp(.56rem,1.05vw,.68rem); letter-spacing:.3em; text-transform:uppercase; color:var(--text-color); }
.${C}__flotador { position:absolute; display:grid; justify-items:center; gap:.2rem; width:clamp(70px,13vw,94px); aspect-ratio:1/1.15; border-radius:50% 50% 46% 46%/58% 58% 42% 42%; background:color-mix(in srgb, var(--primary-color) 22%, var(--surface-color)); border:2px solid var(--primary-color); padding-top:.5rem; animation:${C}-boga2 3.8s ease-in-out infinite; }
.${C}__flotador--i { left:6%; top:34%; } .${C}__flotador--c { right:8%; top:28%; animation-delay:.7s; } .${C}__flotador--d { right:26%; top:46%; animation-delay:1.3s; }
@keyframes ${C}-boga2 { 50% { transform:translateY(-7px) rotate(-3deg); } }
.${C}__num { font-family:${S.disp}; font-size:clamp(1.1rem,3vw,1.55rem); line-height:1.1; color:var(--primary-color); font-variant-numeric:tabular-nums; }
.${C}__etq { font-family:'Courier New',monospace; font-size:clamp(.4rem,.8vw,.5rem); letter-spacing:.24em; text-transform:uppercase; color:var(--text-color); }
.${C}__olas { position:absolute; left:-4%; right:-4%; bottom:0; height:26%; }
.${C}__ola { position:absolute; inset:0; border-radius:42% 58% 0 0/26% 34% 0 0; background:color-mix(in srgb, var(--secondary-color) 34%, transparent); }
.${C}__ola--2 { background:color-mix(in srgb, var(--primary-color) 26%, transparent); animation:${C}-marea 5s ease-in-out infinite alternate; }
.${C}__ola--1 { animation:${C}-marea2 4s ease-in-out infinite alternate; }
@keyframes ${C}-marea { from { transform:translateX(-14px); } to { transform:translateX(14px); } }
@keyframes ${C}-marea2 { from { transform:translateX(12px); } to { transform:translateX(-12px); } }
.${C}__fecha { display:block; margin:clamp(1.3rem,3vw,1.9rem) 0 0; font-family:${S.body}; font-style:italic; font-size:clamp(.85rem,1.6vw,.98rem); color:var(--text-color); }
@media (max-width:560px){ .${C}__mar { height:clamp(300px,74vw,380px); } .${C}__boya { top:4%; } .${C}__flotador--i { top:46%; } .${C}__flotador--c { top:44%; } .${C}__flotador--d { top:62%; } }
`;
  const flotador = (u, l, cls) => `<div class="${C}__flotador ${C}__flotador--${cls}"><b class="${C}__num" data-countdown-unit="${u}">--</b><span class="${C}__etq">${l}</span></div>`;
  const body = `<header memory_type="text" memory_usage="custom" memory_key="countdown-intro">
  <p class="${C}__rot" memory_type="text" memory_usage="custom" memory_key="countdown-rotulo">Zona de fiesta</p>
  <h2 class="${C}__tit" memory_type="text" memory_usage="custom" memory_key="countdown-titulo">Flotando hacia el gran día</h2>
</header>
<div class="${C}__mar">
  <div class="${C}__boya" aria-label="Días restantes">
    <span class="${C}__ojo"><b class="${C}__num--b" data-countdown-unit="days">--</b><span class="${C}__etq--b">Días</span></span>
  </div>
  ${flotador('hours', 'Horas', 'i')}
  ${flotador('minutes', 'Min', 'c')}
  ${flotador('seconds', 'Seg', 'd')}
  <div class="${C}__olas" aria-hidden="true"><i class="${C}__ola ${C}__ola--1"></i><i class="${C}__ola ${C}__ola--2"></i></div>
</div>
${fecha(C, 'Fecha del evento · hora por confirmar')}`;
  return wrap(S, { id: 'countdown-boya-naval', cls: C, css, body, desc: 'Boya náutica salvavidas flotando sobre olas animadas; los días brillan en el ojo de la boya y el resto va en flotadores.', tags: ['boya', 'náutico', 'olas'] });
}

module.exports = { cd_hortensia, cd_navylaser, cd_orobotanico, cd_glicina, cd_apiladas, cd_peonias, cd_otono, cd_navyfloral };
