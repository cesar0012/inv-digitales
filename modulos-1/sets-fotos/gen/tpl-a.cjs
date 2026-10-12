/* Plantillas A: portada, padres, ubicacion, itinerario — 4 variantes c/u por estilo. */
const V = (S) => Object.entries(S.v).map(([k, v]) => k + ':' + v).join('; ');
const meta = (tipo, geminiId, S, desc, extraTags) =>
  `<script>var moduleMetadata = { module_type: ${JSON.stringify(tipo)}, module_name: ${JSON.stringify(geminiId)}, style_name: ${JSON.stringify(S.name)}, descripcion: ${JSON.stringify(desc.slice(0, 240))}, tags: ${JSON.stringify([tipo, S.motif, S.theme, ...extraTags])}, tipo: ${JSON.stringify(tipo)} };</script>`;

/* Ornamento de cabecera según motif del estilo */
function orn(S) {
  const M = {
    rayos: '<svg class="sf-orn" viewBox="0 0 300 24" fill="none" stroke="currentColor"><path d="M0 12 H120 M180 12 H300"/><path d="M132 12 L146 4 L160 12 L146 20 Z M154 13 L168 5 L182 13 L168 21 Z" fill="none"/></svg>',
    mariposas: '<svg class="sf-orn" viewBox="0 0 300 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M0 12 H104 M196 12 H300"/><path d="M150 12 C 144 5, 134 6, 130 12 C 134 18, 144 19, 150 12 C 156 19, 166 18, 170 12 C 166 6, 156 5, 150 12 Z"/><circle cx="150" cy="12" r="1.6" fill="currentColor"/></svg>',
    laser: '<svg class="sf-orn" viewBox="0 0 300 14" width="220"><defs><pattern id="sf-laser-' + S.num + '" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="7" cy="7" r="2" fill="currentColor"/></pattern></defs><rect width="300" height="14" fill="url(#sf-laser-' + S.num + ')"/></svg>',
    lazo: '<svg class="sf-orn" viewBox="0 0 300 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M0 12 H116 M184 12 H300"/><path d="M150 4 C 140 4, 138 14, 150 12 C 162 14, 160 4, 150 4 Z"/><path d="M150 12 V20"/></svg>',
    arco: '<svg class="sf-orn" viewBox="0 0 300 26" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M20 22 C 80 4, 220 4, 280 22"/><path d="M50 18 q -6 -8 2 -12 q 8 4 -2 12 Z M150 8 q -4 -9 3 -11 q 7 5 -3 11 Z M250 18 q 6 -8 -2 -12 q -8 4 2 12 Z" fill="color-mix(in srgb, currentColor 25%, transparent)"/></svg>',
    floral: '<svg class="sf-orn" viewBox="0 0 300 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M0 12 H118 M182 12 H300"/><circle cx="150" cy="12" r="6"/><circle cx="132" cy="12" r="3.4"/><circle cx="168" cy="12" r="3.4"/></svg>',
    hojas: '<svg class="sf-orn" viewBox="0 0 300 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M0 12 H108 M192 12 H300"/><path d="M128 12 q 5 -8 12 -4 M150 8 q 0 -8 8 -6 M172 12 q -5 -8 -12 -4"/></svg>',
    aire: '<svg class="sf-orn" viewBox="0 0 300 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M0 6 H300 M0 12 H300 M0 18 H300" opacity=".5"/></svg>',
    kraft: '<svg class="sf-orn" viewBox="0 0 300 14" width="220"><defs><pattern id="sf-kr-' + S.num + '" width="16" height="14" patternUnits="userSpaceOnUse"><path d="M2 7 H14" stroke="currentColor" stroke-width="1.6" stroke-dasharray="3 2"/></pattern></defs><rect width="300" height="14" fill="url(#sf-kr-' + S.num + ')"/></svg>',
    racimo: '<svg class="sf-orn" viewBox="0 0 300 26" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M0 13 H112 M188 13 H300"/><circle cx="132" cy="9" r="4"/><circle cx="146" cy="14" r="4"/><circle cx="160" cy="8" r="4"/><circle cx="172" cy="13" r="4"/></svg>',
    pila: '<svg class="sf-orn" viewBox="0 0 300 26" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="128" y="4" width="44" height="8" rx="2"/><rect x="134" y="14" width="32" height="8" rx="2"/></svg>',
    acordeon: '<svg class="sf-orn" viewBox="0 0 300 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M120 18 L136 6 L152 18 L168 6 L184 18"/><path d="M0 12 H112 M188 12 H300"/></svg>',
    olas: '<svg class="sf-orn" viewBox="0 0 300 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M0 12 q 25 -10 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0"/></svg>',
    corona: '<svg class="sf-orn" viewBox="0 0 300 26" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M30 20 C 80 4, 220 4, 270 20"/><path d="M90 12 q -5 -9 3 -11 q 7 5 -3 11 Z M150 6 q -3 -9 4 -10 q 6 5 -4 10 Z M210 12 q 5 -9 -3 -11 q -7 5 3 11 Z" fill="color-mix(in srgb, currentColor 22%, transparent)"/></svg>',
    caliz: '<svg class="sf-orn" viewBox="0 0 300 26" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M0 13 H120 M180 13 H300"/><path d="M138 5 H162 C 162 15, 154 20, 150 20 C 146 20, 138 15, 138 5 Z M150 20 V25"/></svg>',
    espejo: '<svg class="sf-orn" viewBox="0 0 300 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M0 12 H118 M182 12 H300"/><path d="M138 12 L150 4 L162 12 L150 20 Z M143 12 L150 8 L157 12 L150 16 Z"/></svg>',
    confeti: '<svg class="sf-orn" viewBox="0 0 300 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M0 12 H112 M188 12 H300"/><rect x="128" y="6" width="7" height="11" transform="rotate(18 131 11)"/><circle cx="152" cy="12" r="4"/><rect x="166" y="6" width="7" height="11" transform="rotate(-16 169 11)"/></svg>'
  };
  return '<span class="sf-orn-wrap" aria-hidden="true">' + (M[S.motif] || M.floral) + '</span>';
}
const ORN_CSS = `.sf-orn-wrap { display:flex; justify-content:center; margin:0 auto clamp(1.6rem,4vw,2.4rem); color:var(--primary-color); }
.sf-orn-wrap svg { width:min(240px,60%); height:auto; }`;

function particlesJS(S, n) {
  return `
  (function () {
    var root = null;
    try { root = document.currentScript.closest('[data-gemini-id^="${S.motif === 'rayos' || S.motif === 'confeti' ? S.motif : S.key}"]'); } catch (e) {}
    if (!root) return;
    var holder = root.querySelector('.sf-particulas');
    if (!holder) return;
    for (var i = 0; i < ${n}; i++) {
      var s = document.createElement('i');
      s.style.left = (Math.random() * 100) + '%';
      s.style.animationDelay = (Math.random() * 6).toFixed(2) + 's';
      s.style.animationDuration = (6 + Math.random() * 6).toFixed(2) + 's';
      s.style.transform = 'scale(' + (0.5 + Math.random()).toFixed(2) + ')';
      holder.appendChild(s);
    }
  })();`;
}

function portada(S) {
  const Vv = S.num % 4;
  const extra = Vv === 0
    ? `.rcA__cinta { position:relative; z-index:3; margin:clamp(1.4rem,3.4vw,2rem) auto 0; width:min(100%,560px); overflow:hidden; border-top:1px solid var(--surface-border-color); border-bottom:1px solid var(--surface-border-color); padding:.55rem 0; }
.rcA__cinta p { margin:0; white-space:nowrap; font-family:'Courier New',monospace; font-size:clamp(.6rem,1.2vw,.72rem); letter-spacing:.5em; text-transform:uppercase; color:var(--secondary-color); animation:rcA-marca 14s linear infinite; }
@keyframes rcA-marca { to { transform:translateX(-50%); } }
.rcA__foto { position:relative; z-index:3; width:clamp(170px,26vw,240px); aspect-ratio:1/1; margin:0 auto clamp(1.2rem,3vw,1.8rem); border-radius:50%; padding:6px; border:1px solid var(--primary-color); }
.rcA__foto img { display:block; width:100%; height:100%; object-fit:cover; border-radius:50%; }`
    : Vv === 1
      ? `.rcA__split { position:relative; z-index:2; display:grid; grid-template-columns:1fr; width:min(100%,880px); margin:0 auto; }
@media (min-width:800px){ .rcA__split { grid-template-columns:1fr 1fr; } }
.rcA__mitad { padding:clamp(1.6rem,4vw,2.6rem); }
.rcA__mitad--foto { clip-path:polygon(0 0, 100% 0, 78% 100%, 0 100%); }
.rcA__mitad--foto img { display:block; width:100%; height:auto; aspect-ratio:4/5; object-fit:cover; }
.rcA__mitad--txt { display:grid; align-content:center; justify-items:center; text-align:center; }`
      : Vv === 2
        ? `.rcA__marco { position:relative; z-index:2; width:min(100%,560px); margin:0 auto; border:1px solid var(--primary-color); outline:1px solid var(--surface-border-color); outline-offset:8px; padding:clamp(2rem,5vw,3rem) clamp(1.2rem,3.6vw,2.4rem); }
.rcA__foto { width:clamp(150px,24vw,210px); aspect-ratio:1/1; margin:0 auto clamp(1.2rem,3vw,1.8rem); clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%); overflow:hidden; }
.rcA__foto img { display:block; width:100%; height:100%; object-fit:cover; }`
        : `.rcA__foto { position:absolute; inset:0; z-index:0; margin:0; }
.rcA__foto img { display:block; width:100%; height:100%; object-fit:cover; opacity:.42; }
.rcA__velo { position:absolute; inset:0; z-index:1; background:linear-gradient(160deg, color-mix(in srgb, var(--bg-color) 88%, transparent) 20%, color-mix(in srgb, var(--bg-color) 55%, transparent)); }
.rcA__panel { position:relative; z-index:2; width:min(100%,700px); text-align:left; margin:0 auto; padding:clamp(3rem,8vw,5rem) clamp(1rem,4vw,2rem); }
.rcA__panel > * { text-align:left; }`;
  const bodyInner = Vv === 0
    ? `<figure class="rcA__foto" memory_type="image" memory_usage="custom" memory_source="library"><img src="https://loremflickr.com/600/600/${S.kw},couple" alt="Retrato" path="placeholder" data-library-category="bodas" data-asset-type="retrato-principal" loading="eager" /><figcaption hidden>Retrato</figcaption></figure>
  <p class="rcA__rotulo" memory_type="text" memory_usage="custom" memory_key="portada-lema">${S.theme}</p>
  <div memory_type="text" memory_usage="custom" memory_key="portada-nombre"><h1 class="rcA__nombre" memory_type="text" memory_usage="custom" memory_key="portada-titulo">Nombre &amp; Nombre</h1></div>
  <div class="rcA__cinta" memory_type="text" memory_usage="custom" memory_key="portada-fecha"><p><span>Fecha del evento · Hora · Lugar&nbsp;&nbsp;·&nbsp;&nbsp;</span><span>Fecha del evento · Hora · Lugar&nbsp;&nbsp;·&nbsp;&nbsp;</span></p></div>`
    : Vv === 1
      ? `<div class="rcA__split">
    <figure class="rcA__mitad rcA__mitad--foto" memory_type="image" memory_usage="custom" memory_source="library"><img src="https://loremflickr.com/700/860/${S.kw}" alt="Retrato" path="placeholder" data-library-category="bodas" data-asset-type="retrato-principal" loading="eager" /><figcaption hidden>Retrato</figcaption></figure>
    <div class="rcA__mitad rcA__mitad--txt">
      <p class="rcA__rotulo" memory_type="text" memory_usage="custom" memory_key="portada-lema">${S.theme}</p>
      <div memory_type="text" memory_usage="custom" memory_key="portada-nombre"><h1 class="rcA__nombre" memory_type="text" memory_usage="custom" memory_key="portada-titulo">Nombre &amp; Nombre</h1></div>
      <p class="rcA__fecha" memory_type="text" memory_usage="custom" memory_key="portada-fecha"><time datetime="YYYY-MM-DD">Fecha del evento</time></p>
    </div>
  </div>`
      : Vv === 2
        ? `<div class="rcA__marco">
    <figure class="rcA__foto" memory_type="image" memory_usage="custom" memory_source="library"><img src="https://loremflickr.com/560/560/${S.kw}" alt="Retrato" path="placeholder" data-library-category="bodas" data-asset-type="retrato-principal" loading="eager" /><figcaption hidden>Retrato</figcaption></figure>
    <p class="rcA__rotulo" memory_type="text" memory_usage="custom" memory_key="portada-lema">${S.theme}</p>
    <div memory_type="text" memory_usage="custom" memory_key="portada-nombre"><h1 class="rcA__nombre" memory_type="text" memory_usage="custom" memory_key="portada-titulo">Nombre &amp; Nombre</h1></div>
    <p class="rcA__fecha" memory_type="text" memory_usage="custom" memory_key="portada-fecha"><time datetime="YYYY-MM-DD">Fecha del evento · Lugar</time></p>
  </div>`
        : `<figure class="rcA__foto" memory_type="image" memory_usage="custom" memory_source="generated"><img src="https://loremflickr.com/1200/800/${S.kw}" alt="Escena" path="placeholder" data-asset-type="escena-principal" loading="eager" /><figcaption hidden>Escena</figcaption></figure>
  <div class="rcA__velo" aria-hidden="true"></div>
  <div class="rcA__panel">
    <p class="rcA__rotulo" memory_type="text" memory_usage="custom" memory_key="portada-lema">${S.theme}</p>
    <div memory_type="text" memory_usage="custom" memory_key="portada-nombre"><h1 class="rcA__nombre" memory_type="text" memory_usage="custom" memory_key="portada-titulo">Nombre &amp; Nombre</h1></div>
    <p class="rcA__fecha" memory_type="text" memory_usage="custom" memory_key="portada-fecha"><time datetime="YYYY-MM-DD">Fecha del evento · Lugar</time></p>
  </div>`;

  return `<section class="sf-p" data-gemini-id="portada-nombre" memory_type="background" memory_usage="protected" memory_source="generated" path="placeholder">
<style>
.sf-p { ${V(S)};
  position:relative; isolation:isolate; overflow:hidden; box-sizing:border-box; min-height:100svh; display:grid; place-items:center; padding:clamp(2.6rem,7vw,5rem) clamp(1rem,5vw,3.4rem); background:${S.bg}; background-color:var(--bg-color); color:var(--text-color); text-align:center; }
.sf-p *, .sf-p *::before, .sf-p *::after { box-sizing:border-box; }
.sf-p::after { content:''; position:absolute; inset:0; z-index:0; background:color-mix(in srgb, var(--bg-color) 62%, transparent); pointer-events:none; }
.sf-p__rayos { position:absolute; inset:-50%; z-index:0; background:conic-gradient(from 0deg, transparent 0 10deg, color-mix(in srgb, var(--primary-color) 7%, transparent) 10deg 11deg, transparent 11deg 20deg); animation:sf-giro 46s linear infinite; }
@keyframes sf-giro { to { transform:rotate(360deg); } }
.sf-particulas { position:absolute; inset:0; z-index:1; pointer-events:none; }
.sf-particulas i { position:absolute; top:-3%; width:8px; height:12px; background:var(--primary-color); opacity:.8; animation:sf-cae linear infinite; border-radius:2px; }
@keyframes sf-cae { to { transform:translateY(108vh) rotate(480deg); } }
.sf-orn-wrap { position:relative; z-index:2; }
.rcA__rotulo { margin:0 0 .7rem; font-family:'Courier New',monospace; font-size:clamp(.6rem,1.25vw,.74rem); letter-spacing:.6em; text-transform:uppercase; color:var(--secondary-color); }
.rcA__nombre { margin:0; font-family:${S.disp}; font-weight:400; font-size:clamp(2.8rem,9vw,6.4rem); line-height:1.02; color:var(--primary-color); }
.sf-p__v3 .rcA__nombre { text-align:left; }
.rcA__fecha { margin:0; font-family:'Courier New',monospace; font-size:clamp(.64rem,1.35vw,.8rem); letter-spacing:.4em; text-transform:uppercase; color:var(--text-color); }
${extra}
${ORN_CSS}
@media (prefers-reduced-motion:reduce){ .sf-p * { animation:none !important; } }
</style>
<div class="sf-p__rayos" aria-hidden="true"></div>
<div class="sf-particulas" aria-hidden="true"></div>
${bodyInner}
${orn(S)}
<script>${particlesJS(S, 10)}</script>
${meta('portada', 'portada-sf' + S.num, S, 'Portada ' + S.theme + ' con variante ' + (Vv + 1) + ' de composición, partículas flotantes y ornamento ' + S.motif + '.', ['variante' + (Vv + 1)])}
</section>`;
}

function padres(S) {
  const Vv = S.num % 4;
  const frame = Vv === 0
    ? `.sf2__marco { width:clamp(200px,26vw,258px); padding:14px; background:var(--surface-color); border:1px solid var(--surface-border-color); transform:skewX(-5deg); transition:transform .5s cubic-bezier(.16,1,.3,1); }
.sf2__marco:nth-child(2) { transform:skewX(5deg); }
.sf2__marco:hover { transform:skewX(0) translateY(-6px); }
.sf2__marco img { display:block; width:100%; height:auto; aspect-ratio:4/5; object-fit:cover; transform:skewX(5deg); }
.sf2__marco:nth-child(2) img { transform:skewX(-5deg); }`
    : Vv === 1
      ? `.sf2__marco { width:clamp(190px,24vw,236px); aspect-ratio:1/1; border-radius:50%; padding:6px; border:1px solid var(--primary-color); position:relative; }
.sf2__marco::after { content:''; position:absolute; inset:-10px; border-radius:50%; border:1px dashed var(--accent-color); animation:sf-girar 22s linear infinite; }
@keyframes sf-girar { to { transform:rotate(360deg); } }
.sf2__marco img { display:block; width:100%; height:100%; object-fit:cover; border-radius:50%; }`
      : Vv === 2
        ? `.sf2__marco { width:clamp(200px,26vw,256px); padding:10px 10px 2.6rem; background:var(--surface-color); border:1px solid var(--surface-border-color); box-shadow:0 20px 40px rgba(0,0,0,.18); }
.sf2__casa:nth-child(1) .sf2__marco { transform:rotate(-3deg) translateX(14px); }
.sf2__casa:nth-child(2) .sf2__marco { transform:rotate(3deg) translateX(-14px); }
.sf2__marco img { display:block; width:100%; height:auto; aspect-ratio:4/5; object-fit:cover; }`
        : `.sf2__marco { width:clamp(190px,24vw,234px); aspect-ratio:1/1.06; clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%); background:var(--surface-color); padding:9px; transition:transform .5s cubic-bezier(.16,1,.3,1); }
.sf2__casa:hover .sf2__marco { transform:translateY(-6px) rotate(2deg); }
.sf2__marco img { display:block; width:100%; height:100%; object-fit:cover; clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%); }`;
  return `<section class="sf2" data-gemini-id="padres-padre" memory_type="background" memory_usage="protected" memory_source="generated" path="placeholder">
<style>
.sf2 { ${V(S)};
  position:relative; isolation:isolate; overflow:hidden; box-sizing:border-box; padding:clamp(3.6rem,9vw,6.8rem) clamp(1rem,5vw,4rem); background:${S.bg}; background-color:var(--bg-color); color:var(--text-color); text-align:center; }
.sf2 *, .sf2 *::before, .sf2 *::after { box-sizing:border-box; }
.sf2::after { content:''; position:absolute; inset:0; z-index:0; background:color-mix(in srgb, var(--bg-color) 74%, transparent); }
.sf2 > * { position:relative; z-index:1; }
${ORN_CSS}
.rc2__rotulo { margin:0 0 .5rem; font-family:'Courier New',monospace; font-size:clamp(.6rem,1.2vw,.72rem); letter-spacing:.6em; text-transform:uppercase; color:var(--secondary-color); }
.rc2__titulo { margin:0 auto 1rem; font-family:${S.disp}; font-weight:400; font-size:clamp(1.9rem,4.6vw,3rem); color:var(--primary-color); }
.rc2__dupla { display:flex; flex-wrap:wrap; justify-content:center; gap:clamp(2.2rem,6vw,4.8rem); }
.rc2__casa { width:min(100%,280px); }
${frame}
.sf2__rol { display:block; margin:1.2rem 0 .2rem; font-family:'Courier New',monospace; font-size:clamp(.54rem,1.02vw,.64rem); letter-spacing:.44em; text-transform:uppercase; color:var(--secondary-color); }
.sf2__nombres { margin:0; font-family:${S.body}; font-size:clamp(1rem,2.1vw,1.24rem); color:var(--primary-color); }
.sf2__nota { margin:clamp(2.2rem,5vw,3rem) auto 0; max-width:46ch; font-family:${S.body}; font-style:italic; font-size:clamp(.86rem,1.6vw,1rem); line-height:1.8; color:var(--text-color); }
@media (prefers-reduced-motion:reduce){ .sf2 * { animation:none !important; transition:none !important; } }
</style>
<header memory_type="text" memory_usage="custom" memory_key="padres-intro">
  <p class="rc2__rotulo" memory_type="text" memory_usage="custom" memory_key="padres-rotulo">Familias</p>
  <h2 class="rc2__titulo" memory_type="text" memory_usage="custom" memory_key="padres-titulo">Nuestros padres</h2>
  ${orn(S)}
</header>
<div class="rc2__dupla">
  <article class="sf2__casa">
    <figure class="sf2__marco" memory_type="image" memory_usage="custom" memory_source="library">
      <img src="https://loremflickr.com/520/640/${S.kw},family" alt="Retrato de los padres de ella" path="placeholder" data-library-category="bodas" data-asset-type="retrato-familia" loading="lazy" />
      <figcaption hidden>Familia uno</figcaption>
    </figure>
    <div memory_type="text" memory_usage="custom" memory_key="padres-bloque-1">
      <span class="sf2__rol">Papás de la novia</span>
      <h3 class="sf2__nombres" memory_type="text" memory_usage="custom" memory_key="padres-nombre-1">Nombre Papa &amp; Nombre Mama</h3>
    </div>
  </article>
  <article class="sf2__casa">
    <figure class="sf2__marco" memory_type="image" memory_usage="custom" memory_source="library">
      <img src="https://loremflickr.com/520/640/${S.kw},smile" alt="Retrato de los padres de él" path="placeholder" data-library-category="bodas" data-asset-type="retrato-familia" loading="lazy" />
      <figcaption hidden>Familia dos</figcaption>
    </figure>
    <div memory_type="text" memory_usage="custom" memory_key="padres-bloque-2">
      <span class="sf2__rol">Papás del novio</span>
      <h3 class="sf2__nombres" memory_type="text" memory_usage="custom" memory_key="padres-nombre-2">Nombre Papa &amp; Nombre Mama</h3>
    </div>
  </article>
</div>
<p class="sf2__nota" memory_type="text" memory_usage="custom" memory_key="padres-texto">Dos familias, una misma celebración: gracias por traernos hasta aquí.</p>
${meta('padres', 'padres-sf' + S.num, S, 'Padres en marcos ' + S.motif + ' con variante ' + (Vv + 1) + ' y retratos ' + S.kw + '.', ['variante' + (Vv + 1)])}
</section>`;
}

function ubicacion(S) {
  const Vv = S.num % 4;
  const layout = Vv === 0
    ? `.sf3__par > * { min-width:0; max-width:100%; }
.sf3__par { display:grid; grid-template-columns:1fr; gap:clamp(1.6rem,4vw,2.6rem); width:min(100%,960px); margin:0 auto; align-items:stretch; }
@media (min-width:860px){ .sf3__par { grid-template-columns:5fr 7fr; } }
.sf3__ticket { position:relative; padding:clamp(2rem,4.4vw,2.8rem) clamp(1.4rem,3.6vw,2.4rem) clamp(1.8rem,3.8vw,2.4rem) clamp(3.2rem,6vw,4rem); background:var(--surface-color); border:1px solid var(--surface-border-color); text-align:left; }
.sf3__ticket::before { content:''; position:absolute; left:18px; top:12%; bottom:12%; border-left:2px dashed var(--accent-color); }
.sf3__mapa { margin:0; border:1px solid var(--surface-border-color); overflow:hidden; }
.sf3__mapa iframe { display:block; width:100%; height:100%; min-height:320px; border:0; }`
    : Vv === 1
      ? `.sf3__centro { width:min(100%,700px); margin:0 auto; text-align:center; }
.sf3__rombo { width:min(100%,420px); aspect-ratio:1/1; margin:0 auto clamp(1.4rem,3.4vw,2rem); clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%); overflow:hidden; border:1px solid var(--primary-color); }
.sf3__rombo iframe { display:block; width:130%; height:130%; margin-left:-15%; margin-top:-15%; border:0; }
.sf3__lista { text-align:center; }`
      : Vv === 2
        ? `.sf3__slant { display:grid; grid-template-columns:1fr; width:min(100%,940px); margin:0 auto; }
@media (min-width:860px){ .sf3__slant { grid-template-columns:7fr 5fr; } }
.sf3__mapa { margin:0; clip-path:polygon(0 0, 100% 0, 86% 100%, 0 100%); overflow:hidden; }
.sf3__mapa iframe { display:block; width:100%; height:100%; min-height:360px; border:0; }
.sf3__info { padding:clamp(1.6rem,4vw,2.6rem) clamp(1.2rem,3.4vw,2rem); display:grid; align-content:center; gap:.5rem; }`
        : `.sf3__lienzo { position:relative; width:min(100%,860px); margin:0 auto; }
.sf3__mapa { margin:0; border:1px solid var(--surface-border-color); overflow:hidden; }
.sf3__mapa iframe { display:block; width:100%; height:min(56vw,420px); border:0; }
.sf3__barra { position:relative; margin-top:-72px; z-index:2; width:min(100%,86%); margin-left:auto; background:var(--surface-color); border:1px solid var(--surface-border-color); padding:clamp(1.1rem,2.8vw,1.6rem) clamp(1.2rem,3.4vw,2rem); transform:skewX(-7deg); }
.sf3__barra > * { transform:skewX(7deg); }`;
  const datosInner = Vv === 0
    ? `<p class="sf3__lugar" memory_type="text" memory_usage="custom" memory_key="ubicacion-nombre">Nombre del lugar</p>
      <address class="sf3__dato" memory_type="text" memory_usage="custom" memory_key="ubicacion-direccion">Calle Principal 214, Ciudad</address>
      <time class="sf3__dato" datetime="17:00" memory_type="text" memory_usage="custom" memory_key="ubicacion-hora">5:00 de la tarde</time>
      <figure class="sf3__foto" memory_type="image" memory_usage="custom" memory_source="library" style="margin:.9rem 0 .4rem; border-radius:12px; overflow:hidden; border:1px solid var(--surface-border-color);">
        <img src="https://loremflickr.com/700/420/' + S.kw + ',venue" alt="Vista del lugar" path="placeholder" data-library-category="bodas" data-asset-type="lugar" loading="lazy" />
        <figcaption hidden>Vista del lugar</figcaption>
      </figure>
      <a class="sf3__boton" href="https://www.google.com/maps?q=Lugar+del+evento" target="_blank" rel="noopener" memory_type="text" memory_usage="custom" memory_key="ubicacion-boton">Trazar ruta</a>`
    : `<p class="sf3__lugar" memory_type="text" memory_usage="custom" memory_key="ubicacion-nombre">Nombre del lugar</p>
      <address class="sf3__dato" memory_type="text" memory_usage="custom" memory_key="ubicacion-direccion">Calle Principal 214, Ciudad</address>
      <time class="sf3__dato" datetime="17:00" memory_type="text" memory_usage="custom" memory_key="ubicacion-hora">5:00 de la tarde</time>
      <figure class="sf3__foto" memory_type="image" memory_usage="custom" memory_source="library" style="margin:.9rem 0 .4rem; border-radius:12px; overflow:hidden; border:1px solid var(--surface-border-color);">
        <img src="https://loremflickr.com/700/420/' + S.kw + ',venue" alt="Vista del lugar" path="placeholder" data-library-category="bodas" data-asset-type="lugar" loading="lazy" />
        <figcaption hidden>Vista del lugar</figcaption>
      </figure>
      <a class="sf3__boton" href="https://www.google.com/maps?q=Lugar+del+evento" target="_blank" rel="noopener" memory_type="text" memory_usage="custom" memory_key="ubicacion-boton">Trazar ruta</a>`;
  return `<section class="sf3" data-gemini-id="ubicacion-ceremonia" memory_type="background" memory_usage="protected" memory_source="generated" path="placeholder">
<style>
.sf3 { ${V(S)};
  position:relative; isolation:isolate; overflow:hidden; box-sizing:border-box; padding:clamp(3.6rem,9vw,6.8rem) clamp(1rem,5vw,4rem); background:${S.bg}; background-color:var(--bg-color); color:var(--text-color); }
.sf3 *, .sf3 *::before, .sf3 *::after { box-sizing:border-box; }
.sf3::after { content:''; position:absolute; inset:0; z-index:0; background:color-mix(in srgb, var(--bg-color) 74%, transparent); }
.sf3 > * { position:relative; z-index:1; }
${ORN_CSS}
.rc3__cabecera, .sf3__cabecera { text-align:center; margin-bottom:clamp(2.2rem,5.5vw,3.2rem); }
.sf3__rotulo { margin:0 0 .4rem; font-family:'Courier New',monospace; font-size:clamp(.6rem,1.2vw,.72rem); letter-spacing:.6em; text-transform:uppercase; color:var(--secondary-color); }
.sf3__titulo { margin:0; font-family:${S.disp}; font-weight:400; font-size:clamp(1.9rem,4.6vw,3rem); color:var(--primary-color); }
.sf3__lugar { margin:0 0 .5rem; font-family:${S.disp}; font-weight:400; font-size:clamp(1.3rem,2.9vw,1.75rem); color:var(--primary-color); }
.sf3__dato { display:block; margin:0 0 .55rem; font-family:'Courier New',monospace; font-size:clamp(.76rem,1.5vw,.9rem); line-height:1.7; font-style:normal; color:var(--text-color); }
.sf3__boton { display:inline-block; padding:.85rem 2rem; font-family:'Courier New',monospace; font-size:clamp(.64rem,1.25vw,.76rem); letter-spacing:.3em; text-transform:uppercase; text-decoration:none; color:var(--bg-color); background:var(--primary-color); transition:transform .35s ease, box-shadow .35s ease; }
.sf3__boton:hover { transform:translateY(-2px); box-shadow:0 12px 26px color-mix(in srgb, var(--primary-color) 40%, transparent); }
${layout}
</style>
<header class="sf3__cabecera" memory_type="text" memory_usage="custom" memory_key="ubicacion-intro">
  <p class="sf3__rotulo" memory_type="text" memory_usage="custom" memory_key="ubicacion-rotulo">El lugar</p>
  <h2 class="sf3__titulo" memory_type="text" memory_usage="custom" memory_key="ubicacion-titulo">¿Dónde y cuándo?</h2>
  ${orn(S)}
</header>
${Vv === 0 ? `<div class="sf3__par">
  <div class="sf3__ticket" memory_type="text" memory_usage="custom" memory_key="ubicacion-lugar">${datosInner}</div>
  <figure class="sf3__mapa" memory_type="text" memory_usage="custom" memory_key="ubicacion-mapa-url"><iframe src="https://www.google.com/maps?q=Lugar%20del%20evento&output=embed" title="Mapa" loading="lazy" allowfullscreen></iframe></figure>
</div>` : Vv === 1 ? `<div class="sf3__centro">
  <figure class="sf3__rombo" memory_type="text" memory_usage="custom" memory_key="ubicacion-mapa-url"><iframe src="https://www.google.com/maps?q=Lugar%20del%20evento&output=embed" title="Mapa" loading="lazy" allowfullscreen></iframe></figure>
  <div class="sf3__lista" memory_type="text" memory_usage="custom" memory_key="ubicacion-lugar">${datosInner}</div>
</div>` : Vv === 2 ? `<div class="sf3__slant">
  <figure class="sf3__mapa" memory_type="text" memory_usage="custom" memory_key="ubicacion-mapa-url"><iframe src="https://www.google.com/maps?q=Lugar%20del%20evento&output=embed" title="Mapa" loading="lazy" allowfullscreen></iframe></figure>
  <div class="sf3__info" memory_type="text" memory_usage="custom" memory_key="ubicacion-lugar">${datosInner}</div>
</div>` : `<div class="sf3__lienzo">
  <figure class="sf3__mapa" memory_type="text" memory_usage="custom" memory_key="ubicacion-mapa-url"><iframe src="https://www.google.com/maps?q=Lugar%20del%20evento&output=embed" title="Mapa" loading="lazy" allowfullscreen></iframe></figure>
  <div class="sf3__barra" memory_type="text" memory_usage="custom" memory_key="ubicacion-lugar">${datosInner}</div>
</div>`}
${meta('ubicacion', 'ubicacion-sf' + S.num, S, 'Ubicación ' + S.theme + ' variante ' + (Vv + 1) + ' con mapa embebido y ornamento ' + S.motif + '.', ['variante' + (Vv + 1)])}
</section>`;
}

function itinerario(S) {
  const Vv = S.num % 4;
  const hitos = [['5:00 pm', '17:00', 'Recepción', 'Bienvenida y copas'], ['6:30 pm', '18:30', 'Ceremonia', 'El gran momento'], ['8:30 pm', '20:30', 'Banquete', 'Cena y brindis'], ['10:00 pm', '22:00', 'Baile', 'La pista se enciende']];
  const items = hitos.map(([hr, dt, t, d], i) => {
    if (Vv === 0) return `  <li class="sf4__hito">
    <span class="sf4__punto" aria-hidden="true"></span>
    <time class="sf4__hora" datetime="${dt}" memory_type="text" memory_usage="custom" memory_key="itinerario-hora-${i + 1}">${hr}</time>
    <div memory_type="text" memory_usage="custom" memory_key="itinerario-hito-${i + 1}">
      <h3 class="sf4__nombre" memory_type="text" memory_usage="custom" memory_key="itinerario-momento-${i + 1}">${t}</h3>
      <p class="sf4__detalle" memory_type="text" memory_usage="custom" memory_key="itinerario-det-${i + 1}">${d}</p>
    </div>
  </li>`;
    if (Vv === 1) return `  <li class="sf4__col">
    <span class="sf4__bola" aria-hidden="true"><b>${i + 1}</b></span>
    <time class="sf4__hora" datetime="${dt}" memory_type="text" memory_usage="custom" memory_key="itinerario-hora-${i + 1}">${hr}</time>
    <div memory_type="text" memory_usage="custom" memory_key="itinerario-hito-${i + 1}">
      <h3 class="sf4__nombre" memory_type="text" memory_usage="custom" memory_key="itinerario-momento-${i + 1}">${t}</h3>
      <p class="sf4__detalle" memory_type="text" memory_usage="custom" memory_key="itinerario-det-${i + 1}">${d}</p>
    </div>
  </li>`;
    if (Vv === 2) return `  <li class="sf4__boleto">
    <div class="sf4__cara">
      <span class="sf4__pica" aria-hidden="true"></span>
      <div class="sf4__fila"><span class="sf4__num" aria-hidden="true">Nº${i + 1}</span><time class="sf4__hora" datetime="${dt}" memory_type="text" memory_usage="custom" memory_key="itinerario-hora-${i + 1}">${hr}</time></div>
      <div memory_type="text" memory_usage="custom" memory_key="itinerario-hito-${i + 1}">
        <h3 class="sf4__nombre" memory_type="text" memory_usage="custom" memory_key="itinerario-momento-${i + 1}">${t}</h3>
        <p class="sf4__detalle" memory_type="text" memory_usage="custom" memory_key="itinerario-det-${i + 1}">${d}</p>
      </div>
    </div>
  </li>`;
    return `  <li class="sf4__escal">
    <span class="sf4__numbig" aria-hidden="true">0${i + 1}</span>
    <div memory_type="text" memory_usage="custom" memory_key="itinerario-hito-${i + 1}">
      <time class="sf4__hora" datetime="${dt}" memory_type="text" memory_usage="custom" memory_key="itinerario-hora-${i + 1}">${hr}</time>
      <h3 class="sf4__nombre" memory_type="text" memory_usage="custom" memory_key="itinerario-momento-${i + 1}">${t}</h3>
      <p class="sf4__detalle" memory_type="text" memory_usage="custom" memory_key="itinerario-det-${i + 1}">${d}</p>
    </div>
  </li>`;
  }).join('\n');
  const layout = Vv === 0
    ? `.sf4__lista { position:relative; list-style:none; margin:0 auto; padding:0; width:min(100%,620px); }
.sf4__lista::before { content:''; position:absolute; left:9px; top:8px; bottom:8px; width:1px; background:linear-gradient(180deg, transparent, var(--accent-color) 10% 90%, transparent); }
.sf4__hito { position:relative; padding:0 0 clamp(1.8rem,4vw,2.4rem) clamp(2.8rem,6vw,3.4rem); }
.sf4__hito:last-child { padding-bottom:0; }
.sf4__punto { position:absolute; left:2px; top:4px; width:15px; height:15px; transform:rotate(45deg); border:1px solid var(--primary-color); background:var(--bg-color); }
.sf4__punto::after { content:''; position:absolute; inset:4px; background:var(--primary-color); }`
    : Vv === 1
      ? `.sf4__lista { list-style:none; margin:0 auto; padding:0; width:min(100%,1000px); display:flex; flex-wrap:wrap; justify-content:center; gap:clamp(1.4rem,3.4vw,2.4rem); }
.sf4__lista::before { content:''; position:absolute; left:4%; right:4%; top:32px; border-top:2px dashed color-mix(in srgb, var(--accent-color) 65%, transparent); }
.sf4__col { position:relative; width:clamp(180px,21vw,220px); text-align:center; }
.sf4__bola { position:relative; width:56px; height:56px; margin:0 auto .8rem; border-radius:50%; border:1px solid var(--primary-color); background:var(--surface-color); display:grid; place-items:center; }
.sf4__bola b { font-family:Georgia,serif; font-weight:400; color:var(--primary-color); }
.sf4__col:nth-child(even) { transform:translateY(18px); }`
      : Vv === 2
        ? `.sf4__lista { list-style:none; margin:0 auto; padding:0; width:min(100%,1020px); display:flex; flex-wrap:wrap; justify-content:center; gap:clamp(1.4rem,3.6vw,2.6rem); }
.sf4__boleto { width:clamp(240px,29vw,300px); transform:rotate(var(--g)); transition:transform .5s cubic-bezier(.16,1,.3,1); }
.sf4__boleto:nth-child(1){ --g:-3deg; } .sf4__boleto:nth-child(2){ --g:2.4deg; margin-top:1.4rem; } .sf4__boleto:nth-child(3){ --g:-2deg; } .sf4__boleto:nth-child(4){ --g:3deg; margin-top:1.4rem; }
.sf4__boleto:hover { transform:rotate(0) scale(1.03); }
.sf4__cara { position:relative; padding:1.2rem 1.1rem 1.2rem 3rem; background:var(--surface-color); border:1px solid var(--surface-border-color); box-shadow:0 16px 34px rgba(0,0,0,.18); }
.sf4__pica { position:absolute; left:24px; top:14%; bottom:14%; border-left:2px dashed color-mix(in srgb, var(--accent-color) 60%, transparent); }
.sf4__fila { display:flex; align-items:baseline; gap:.7rem; }
.sf4__num { font-family:Georgia,serif; font-style:italic; font-size:1.3rem; color:var(--accent-color); }`
        : `.sf4__lista { list-style:none; margin:0 auto; padding:0; width:min(100%,720px); }
.sf4__escal { display:grid; grid-template-columns:auto 1fr; align-items:center; gap:clamp(1.2rem,3.4vw,2rem); padding:clamp(.9rem,2.2vw,1.3rem) 0; border-bottom:1px solid var(--surface-border-color); }
.sf4__escal:first-child { border-top:1px solid var(--surface-border-color); }
.sf4__escal:nth-child(even) { padding-left:clamp(2rem,6vw,4rem); }
.sf4__numbig { font-family:Georgia,serif; font-style:italic; font-size:clamp(2.2rem,6vw,3.4rem); line-height:1; color:var(--accent-color); }`;
  return `<section class="sf4" data-gemini-id="itinerario-agenda" memory_type="background" memory_usage="protected" memory_source="generated" path="placeholder">
<style>
.sf4 { ${V(S)};
  position:relative; isolation:isolate; overflow:hidden; box-sizing:border-box; padding:clamp(3.6rem,9vw,6.8rem) clamp(1rem,4vw,3rem); background:${S.bg}; background-color:var(--bg-color); color:var(--text-color); }
.sf4 *, .sf4 *::before, .sf4 *::after { box-sizing:border-box; }
.sf4::after { content:''; position:absolute; inset:0; z-index:0; background:color-mix(in srgb, var(--bg-color) 74%, transparent); }
.sf4 > * { position:relative; z-index:1; }
${ORN_CSS}
.sf4__cabecera { text-align:center; margin-bottom:clamp(2.4rem,6vw,3.4rem); }
.sf4__rotulo { margin:0 0 .4rem; font-family:'Courier New',monospace; font-size:clamp(.6rem,1.2vw,.72rem); letter-spacing:.6em; text-transform:uppercase; color:var(--secondary-color); }
.sf4__titulo { margin:0; font-family:${S.disp}; font-weight:400; font-size:clamp(2rem,5vw,3.2rem); color:var(--primary-color); }
.sf4__hora { font-family:'Courier New',monospace; font-size:clamp(.64rem,1.28vw,.78rem); letter-spacing:.32em; text-transform:uppercase; color:var(--secondary-color); }
.sf4__nombre { margin:.35rem 0 .25rem; font-family:${S.disp}; font-weight:400; font-size:clamp(1.1rem,2.3vw,1.4rem); color:var(--primary-color); }
.sf4__detalle { margin:0; font-family:${S.body}; font-size:clamp(.76rem,1.4vw,.86rem); line-height:1.6; color:var(--text-color); }
${layout}
@media (max-width:640px){ .sf4__lista::before { display:none; } .sf4__col, .sf4__boleto, .sf4__escal { transform:none !important; } }
@media (prefers-reduced-motion:reduce){ .sf4 * { transition:none !important; } }
</style>
<header class="sf4__cabecera" memory_type="text" memory_usage="custom" memory_key="itinerario-intro">
  <p class="sf4__rotulo" memory_type="text" memory_usage="custom" memory_key="itinerario-rotulo">Agenda</p>
  <h2 class="sf4__titulo" memory_type="text" memory_usage="custom" memory_key="itinerario-titulo">Itinerario</h2>
  ${orn(S)}
</header>
<ol class="sf4__lista">
${items}
</ol>
${meta('itinerario', 'itinerario-sf' + S.num, S, 'Itinerario ' + S.theme + ' variante ' + (Vv + 1) + ' con ornamento ' + S.motif + ' y jerarquía tipográfica del estilo.', ['variante' + (Vv + 1)])}
</section>`;
}

module.exports = { portada, padres, ubicacion, itinerario, meta, orn, ORN_CSS, V };
