/* Plantillas A: portada, padres, ubicacion, itinerario. */
const meta = (tipo, name, style, desc, tags) =>
  '<script>var moduleMetadata = { module_type: ' + JSON.stringify(tipo) +
  ', module_name: ' + JSON.stringify(name) +
  ', style_name: ' + JSON.stringify(style) +
  ', descripcion: ' + JSON.stringify(desc) +
  ', tags: ' + JSON.stringify(tags) +
  ', tipo: ' + JSON.stringify(tipo) + ' };</' + 'script>';

const orn = (S) => {
  const M = {
    mucha: '<svg viewBox="0 0 600 300" style="position:absolute;top:-2%;left:50%;width:120%;transform:translateX(-50%);opacity:.5;animation:ornG 90s linear infinite;" aria-hidden="true"><circle cx="300" cy="150" r="140" stroke="var(--accent-color)" fill="none" stroke-dasharray="4 10"/><g fill="var(--accent-color)" opacity=".6"><circle cx="300" cy="20" r="9"/><circle cx="300" cy="280" r="9"/><circle cx="160" cy="150" r="9"/><circle cx="440" cy="150" r="9"/></g></svg>',
    brutal: '<div style="position:absolute;top:10px;left:-8px;right:-8px;background:var(--accent-color);border:3px solid var(--primary-color);transform:rotate(-2deg);padding:.4rem;font-family:Impact,sans-serif;letter-spacing:.1em;text-transform:uppercase;">★ EDICION UNICA ★ SIN FILTROS ★</div>',
    papercraft: '<span style="position:absolute;top:clamp(2rem,6vw,4rem);left:50%;transform:translateX(-50%);width:clamp(100px,20vw,220px);aspect-ratio:1/1;border-radius:50%;background:var(--secondary-color);box-shadow:0 0 0 12px color-mix(in srgb, var(--surface-color) 60%, transparent), 0 0 0 24px color-mix(in srgb, var(--surface-color) 32%, transparent);"></span>',
    vitral: '<svg viewBox="0 0 200 200" style="position:absolute;top:4%;left:50%;width:clamp(150px,28vw,240px);transform:translateX(-50%);filter:drop-shadow(0 0 22px rgba(232,176,75,.4));" aria-hidden="true"><circle cx="100" cy="100" r="94" fill="#7a4fbf" opacity=".8"/><circle cx="100" cy="100" r="64" fill="#e8b04b" opacity=".75"/><circle cx="100" cy="100" r="36" fill="#0d1b4c"/><circle cx="100" cy="100" r="94" fill="none" stroke="#060b24" stroke-width="6"/></svg>',
    fairy: '<span style="position:absolute;top:10%;left:8%;width:70px;aspect-ratio:1/1;border-radius:50%;background:radial-gradient(circle at 34% 30%, #fff, var(--accent-color) 55%, transparent 75%);box-shadow:0 0 30px var(--accent-color);"></span>',
    synth: '<span style="position:absolute;top:6%;left:50%;width:clamp(160px,32vw,340px);aspect-ratio:1/1;transform:translateX(-50%);border-radius:50%;background:linear-gradient(180deg,#ff71ce,#fffb96 55%,#01cdfe);-webkit-mask:linear-gradient(#000 0 0) top/100% 55% no-repeat, repeating-linear-gradient(180deg,#000 0 14px,transparent 14px 26px) bottom/100% 100% no-repeat;opacity:.85;"></span>',
    cosmico: '<svg viewBox="0 0 300 300" style="position:absolute;top:-4%;left:50%;width:clamp(200px,40vw,340px);transform:translateX(-50%);" aria-hidden="true"><circle cx="150" cy="150" r="140" stroke="var(--surface-border-color)" fill="none"/><circle cx="150" cy="150" r="100" stroke="var(--accent-color)" stroke-dasharray="1 8" fill="none"/><circle cx="290" cy="150" r="10" fill="var(--secondary-color)"/><circle cx="150" cy="12" r="7" fill="var(--accent-color)"/></svg>',
    oleo: '<svg viewBox="0 0 300 60" style="width:min(300px,70%);color:var(--accent-color);" aria-hidden="true"><path d="M10 30 C 70 4, 120 56, 180 30 S 260 10, 290 30" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>',
    talavera: '<div style="position:absolute;top:0;left:0;right:0;height:22px;background:repeating-conic-gradient(from 45deg at 50% 50%, var(--accent-color) 0 90deg, #fff 90deg 180deg, var(--primary-color) 180deg 270deg, var(--secondary-color) 270deg 360deg) 0 0/22px 22px;"></div>',
    cubismo: '<span style="position:absolute;top:-30px;right:4%;width:clamp(90px,16vw,170px);aspect-ratio:1/1;background:var(--secondary-color);opacity:.7;transform:rotate(14deg);"></span>',
    surreal: '<span style="position:absolute;top:8%;left:6%;width:clamp(100px,20vw,220px);aspect-ratio:2/1;background:var(--surface-color);border-radius:999px;box-shadow:0 16px 26px rgba(43,29,58,.25);"></span>',
    riso: '<div style="position:absolute;top:0;left:0;right:0;height:8px;background:repeating-linear-gradient(90deg, var(--primary-color) 0 30px, var(--secondary-color) 30px 60px);"></div>',
    tropical: '<svg viewBox="0 0 200 200" style="position:absolute;top:-30px;left:-40px;width:clamp(120px,22vw,260px);color:var(--primary-color);" aria-hidden="true"><path d="M100 10 C 40 40, 20 120, 100 190 C 180 120, 160 40, 100 10 Z" fill="currentColor"/><path d="M100 30 V170" stroke="#fdf6ec" stroke-width="3"/></svg>',
    clay: '<span style="position:absolute;top:7%;left:6%;width:clamp(70px,12vw,130px);aspect-ratio:1/1;border-radius:42% 58% 62% 38%/55% 43% 57% 45%;background:linear-gradient(145deg,#a29bfe,#6c5ce7);box-shadow:inset 10px 10px 24px rgba(255,255,255,.5), inset -12px -12px 24px rgba(0,0,0,.14), 0 24px 40px rgba(108,92,231,.3);"></span>',
    darkaca: '<span style="position:absolute;top:12px;left:50%;transform:translateX(-50%) rotate(45deg);width:18px;height:18px;background:var(--accent-color);box-shadow:0 0 12px rgba(179,38,30,.7);"></span>',
    y2k: '<span style="position:absolute;top:9%;left:7%;width:clamp(60px,11vw,110px);aspect-ratio:1/1;border-radius:50%;background:radial-gradient(circle at 32% 28%, #fff 0%, var(--accent-color) 22%, #b06ef5 48%, #35156b 78%, #0c0620 100%);filter:saturate(1.2);"></span>',
    cosmico2: '',
    vinilo: '<div style="position:absolute;top:0;left:0;right:0;height:8px;background:repeating-linear-gradient(90deg, var(--secondary-color) 0 30px, transparent 30px 60px);"></div>',
    ukiyoe: '<span style="position:absolute;top:clamp(1rem,3vw,2rem);right:clamp(1rem,3vw,2.4rem);width:clamp(50px,7vw,68px);aspect-ratio:1/1;display:grid;place-items:center;border-radius:8px;background:var(--secondary-color);color:var(--surface-color);font-family:Georgia,serif;font-weight:700;transform:rotate(6deg);box-shadow:inset 0 0 0 3px var(--surface-color);">印</span>'
  };
  return M[S.cls] || '';
};

function portada(S) {
  return `<section class="${S.cls}-p" data-gemini-id="portada-nombre" memory_type="background" memory_usage="protected" memory_source="generated" path="placeholder">
<style>
.${S.cls}-p { ${Object.entries(S.v).map(([k, v]) => k + ':' + v).join('; ')};
  position:relative; isolation:isolate; overflow:hidden; box-sizing:border-box; min-height:100svh; display:grid; place-items:center; padding:clamp(2.6rem,7vw,5rem) clamp(1rem,5vw,3.4rem);
  background:${S.bg}; background-size:cover; background-position:center; color:var(--text-color); text-align:center; }
.${S.cls}-p *, .${S.cls}-p *::before, .${S.cls}-p *::after { box-sizing:border-box; }
.${S.cls}-p::before { content:''; position:absolute; inset:0; z-index:-1; background:${(S.num % 2 === 0) ? 'color-mix(in srgb, var(--bg-color) 86%, transparent)' : 'color-mix(in srgb, var(--bg-color) 55%, transparent)'}; }
.${S.cls}-p__orn { position:absolute; z-index:0; pointer-events:none; }
.${S.cls}-p__panel { position:relative; z-index:2; width:min(100%,640px); padding:clamp(1.8rem,4.5vw,3rem) clamp(1.4rem,4vw,2.8rem); ${S.card} }
.${S.cls}-p__lema { margin:0 0 .7rem; font-family:${S.body}; font-size:clamp(.62rem,1.25vw,.74rem); letter-spacing:.48em; text-transform:uppercase; color:var(--accent-color); }
.${S.cls}-p__titulo { margin:0 0 .8rem; font-family:${S.disp}; font-weight:${(S.num % 3 === 0) ? '700' : '400'}; font-size:clamp(2.1rem,6vw,3.9rem); line-height:1.04; color:var(--primary-color); }
.${S.cls}-p__titulo em { font-style:italic; color:var(--accent-color); }
.${S.cls}-p__mid { width:min(220px,64%); margin:clamp(.9rem,2.4vw,1.4rem) auto; color:var(--accent-color); }
.${S.cls}-p__mid path { fill:none; stroke:currentColor; stroke-width:2.4; stroke-linecap:round; }
.${S.cls}-p__fecha { display:inline-block; padding:.55rem 1.6rem; font-family:${S.mono}; font-size:clamp(.72rem,1.45vw,.86rem); letter-spacing:.3em; text-transform:uppercase; color:var(--text-color); background:color-mix(in srgb, var(--bg-color) 88%, transparent); border:1px solid var(--accent-color); }
.${S.cls}-p__foto { position:relative; z-index:2; width:min(100%,500px); margin:0 auto clamp(1.4rem,3vw,2rem); }
.${S.cls}-p__foto img { display:block; width:100%; height:auto; aspect-ratio:16/10; object-fit:cover; }
@media (max-width:560px){ .${S.cls}-p__panel { padding:1.5rem 1.1rem; } }
@media (prefers-reduced-motion:reduce){ .${S.cls}-p * { animation:none !important; } }
</style>
<div class="${S.cls}-p__orn">${orn(S)}</div>
<div class="${S.cls}-p__panel">
  <figure class="${S.cls}-p__foto" memory_type="image" memory_usage="custom" memory_source="library" memory_key="portada-foto">
    <img src="https://loremflickr.com/900/560/${S.kw}" alt="Retrato de los anfitriones" path="placeholder" data-library-category="bodas" data-asset-type="foto-pareja" loading="lazy" />
    <figcaption hidden>Retrato principal</figcaption>
  </figure>
  <p class="${S.cls}-p__lema" memory_type="text" memory_usage="custom" memory_key="portada-lema">${S.name}</p>
  <div memory_type="text" memory_usage="custom" memory_key="portada-nombres">
    <h1 class="${S.cls}-p__titulo" memory_type="text" memory_usage="custom" memory_key="portada-titulo">Nombre de la Novia <em>&amp;</em> Nombre del Novio</h1>
  </div>
  <svg class="${S.cls}-p__mid" viewBox="0 0 220 30" aria-hidden="true"><path d="M6 15 C 40 2, 80 28, 120 15 S 190 4, 214 15"/></svg>
  <time class="${S.cls}-p__fecha" datetime="YYYY-MM-DD" memory_type="text" memory_usage="custom" memory_key="portada-fecha">Fecha del evento</time>
</div>
${meta('portada', 'portada-nombre', S.name + ' — Portada', 'Portada ' + S.theme + ' con foto grande, titulares protagonicos y ornamentos propios del movimiento.', ['portada', S.cls, S.theme, 'hero', 'ornamental'])}
</section>`;
}

function padres(S) {
  const roles = [['Padres de la novia', 'padres-bloque-1'], ['Padres del novio', 'padres-bloque-2']];
  return `<section class="${S.cls}-pd" data-gemini-id="padres-padre" memory_type="background" memory_usage="protected" memory_source="generated" path="placeholder">
<style>
.${S.cls}-pd { ${Object.entries(S.v).map(([k, v]) => k + ':' + v).join('; ')};
  position:relative; isolation:isolate; overflow:hidden; box-sizing:border-box; padding:clamp(3rem,8vw,6rem) clamp(1rem,5vw,4rem);
  background:${S.bg}; background-size:cover; background-position:center; color:var(--text-color); text-align:center; }
.${S.cls}-pd *, .${S.cls}-pd *::before, .${S.cls}-pd *::after { box-sizing:border-box; }
.${S.cls}-pd::before { content:''; position:absolute; inset:0; z-index:-1; background:color-mix(in srgb, var(--bg-color) 82%, transparent); }
.${S.cls}-pd__titulo { margin:0 0 .5rem; font-family:${S.disp}; font-weight:${(S.num % 2) ? '400' : '700'}; font-size:clamp(1.9rem,4.4vw,2.9rem); color:var(--primary-color); transform:rotate(${(S.num % 2) ? '-1.2deg' : '0deg'}); }
.${S.cls}-pd__intro { margin:0 auto clamp(2.2rem,5.5vw,3.2rem); max-width:46ch; font-family:${S.body}; font-size:clamp(.84rem,1.55vw,.96rem); line-height:1.75; color:var(--secondary-color); }
.${S.cls}-pd__dupla { display:grid; grid-template-columns:repeat(auto-fit, minmax(min(260px,100%),1fr)); gap:clamp(1.6rem,4vw,3rem); width:min(100%,920px); margin:0 auto; }
.${S.cls}-pd__casa { position:relative; padding:clamp(1.5rem,3.4vw,2.2rem) clamp(1.2rem,3vw,1.9rem); ${S.card} transform:rotate(var(--g)); transition:transform .5s cubic-bezier(.22,.8,.3,1); }
.${S.cls}-pd__casa:hover { transform:rotate(0) translateY(-8px); }
.${S.cls}-pd__casa:nth-child(1){ --g:${(S.num % 2) ? '-1.8deg' : '1.4deg'}; }
.${S.cls}-pd__casa:nth-child(2){ --g:${(S.num % 2) ? '2deg' : '-1.4deg'}; }
.${S.cls}-pd__foto { margin:0 auto 1rem; width:clamp(120px,18vw,168px); aspect-ratio:4/5; overflow:hidden; border:2px solid var(--accent-color); }
.${S.cls}-pd__foto img { display:block; width:100%; height:100%; object-fit:cover; filter:saturate(1.05); }
.${S.cls}-pd__rol { margin:0 0 .3rem; font-family:${S.mono}; font-size:clamp(.56rem,1.05vw,.64rem); letter-spacing:.34em; text-transform:uppercase; color:var(--accent-color); }
.${S.cls}-pd__nombres { margin:0; font-family:${S.disp}; font-size:clamp(1rem,2.1vw,1.28rem); line-height:1.3; color:var(--primary-color); }
@media (max-width:700px){ .${S.cls}-pd__dupla { grid-template-columns:1fr; max-width:360px; } }
</style>
<header memory_type="text" memory_usage="custom" memory_key="padres-intro">
  <h2 class="${S.cls}-pd__titulo" memory_type="text" memory_usage="custom" memory_key="padres-titulo">Con el amor de nuestras familias</h2>
  <p class="${S.cls}-pd__intro" memory_type="text" memory_usage="custom" memory_key="padres-texto">Dos casas, una celebracion: gracias por guiarnos hasta aqui.</p>
</header>
<div class="${S.cls}-pd__dupla">
${roles.map(([rol, key], i) => `  <article class="${S.cls}-pd__casa">
    <figure class="${S.cls}-pd__foto" memory_type="image" memory_usage="custom" memory_source="library" memory_key="padres-retrato-${['uno', 'dos'][i]}">
      <img src="https://loremflickr.com/520/650/${S.kw},family" alt="Retrato de la familia" path="placeholder" data-library-category="bodas" data-asset-type="retrato-familia" loading="lazy" />
      <figcaption hidden>Familia ${i + 1}</figcaption>
    </figure>
    <div memory_type="text" memory_usage="custom" memory_key="${key}">
      <p class="${S.cls}-pd__rol">${rol}</p>
      <h3 class="${S.cls}-pd__nombres">Nombre Papa &amp; Nombre Mama</h3>
    </div>
  </article>`).join('\n')}
</div>
${meta('padres', 'padres-padre', S.name + ' — Padres', 'Familias en tarjetas ' + S.theme + ' con retratos grandes y marcos propios del estilo.', ['padres', 'familias', S.cls, S.theme])}
</section>`;
}

function ubicacion(S) {
  return `<section class="${S.cls}-ub" data-gemini-id="ubicacion-ceremonia" memory_type="background" memory_usage="protected" memory_source="generated" path="placeholder">
<style>
.${S.cls}-ub { ${Object.entries(S.v).map(([k, v]) => k + ':' + v).join('; ')};
  position:relative; isolation:isolate; overflow:hidden; box-sizing:border-box; padding:clamp(3rem,8vw,6rem) clamp(1rem,5vw,4rem);
  background:${S.bg}; background-size:cover; background-position:center; color:var(--text-color); }
.${S.cls}-ub *, .${S.cls}-ub *::before, .${S.cls}-ub *::after { box-sizing:border-box; }
.${S.cls}-ub::before { content:''; position:absolute; inset:0; z-index:-1; background:color-mix(in srgb, var(--bg-color) 82%, transparent); }
.${S.cls}-ub__titulo { margin:0 0 .5rem; font-family:${S.disp}; font-weight:${(S.num % 2) ? '400' : '700'}; font-size:clamp(1.9rem,4.4vw,2.9rem); color:var(--primary-color); }
.${S.cls}-ub__sub { margin:0 0 clamp(1.8rem,4vw,2.6rem); font-family:${S.body}; font-size:clamp(.84rem,1.55vw,.96rem); line-height:1.7; color:var(--secondary-color); }
.${S.cls}-ub__grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(min(280px,100%),1fr)); gap:clamp(1.4rem,3.6vw,2.6rem); width:min(100%,940px); margin:0 auto; align-items:stretch; }
.${S.cls}-ub__tarjeta { padding:clamp(1.4rem,3.2vw,2rem); ${S.card} }
.${S.cls}-ub__rotulo { margin:0 0 .3rem; font-family:${S.mono}; font-size:clamp(.56rem,1.05vw,.64rem); letter-spacing:.32em; text-transform:uppercase; color:var(--accent-color); }
.${S.cls}-ub__nombre { margin:0 0 .4rem; font-family:${S.disp}; font-size:clamp(1.1rem,2.3vw,1.44rem); color:var(--primary-color); }
.${S.cls}-ub__dato { margin:0 0 .5rem; font-style:normal; font-family:${S.body}; font-size:clamp(.84rem,1.55vw,.96rem); line-height:1.7; color:var(--secondary-color); }
.${S.cls}-ub__boton { display:inline-block; margin-top:.4rem; padding:.7rem 1.7rem; font-family:${S.mono}; font-size:clamp(.66rem,1.25vw,.78rem); letter-spacing:.28em; text-transform:uppercase; text-decoration:none; color:var(--bg-color); background:var(--accent-color); transition:transform .4s ease, box-shadow .4s ease; }
.${S.cls}-ub__boton:hover { transform:translateY(-2px); box-shadow:0 12px 26px color-mix(in srgb, var(--accent-color) 45%, transparent); }
.${S.cls}-ub__mapa-zona { margin:0; display:flex; flex-direction:column; border:1px solid var(--surface-border-color); overflow:hidden; ${S.card} }
.${S.cls}-ub__mapa { flex:1; display:flex; }
.${S.cls}-ub__mapa iframe { display:block; width:100%; height:100%; min-height:340px; border:0; }
.${S.cls}-ub__foto { margin:0 0 1.1rem; }
.${S.cls}-ub__foto img { display:block; width:100%; height:auto; aspect-ratio:16/9; object-fit:cover; filter:saturate(1.08); }
@media (prefers-reduced-motion:reduce){ .${S.cls}-ub * { transition:none !important; } }
</style>
<div class="${S.cls}-ub__grid">
  <div class="${S.cls}-ub__tarjeta">
    <p class="${S.cls}-ub__rotulo" memory_type="text" memory_usage="custom" memory_key="ubicacion-rotulo">Punto de encuentro</p>
    <h2 class="${S.cls}-ub__nombre" memory_type="text" memory_usage="custom" memory_key="ubicacion-lugar">Nombre del lugar</h2>
    <address class="${S.cls}-ub__dato" memory_type="text" memory_usage="custom" memory_key="ubicacion-direccion">Calle Principal 123, Ciudad</address>
    <time class="${S.cls}-ub__dato" datetime="17:00" memory_type="text" memory_usage="custom" memory_key="ubicacion-hora">17:00 h</time>
    <figure class="${S.cls}-ub__foto" memory_type="image" memory_usage="custom" memory_source="library" memory_key="ubicacion-foto">
      <img src="https://loremflickr.com/800/450/${S.kw},venue" alt="Vista del lugar del evento" path="placeholder" data-library-category="bodas" data-asset-type="lugar" loading="lazy" />
      <figcaption hidden>Vista del lugar</figcaption>
    </figure>
    <a class="${S.cls}-ub__boton" href="https://www.google.com/maps?q=Ubicacion+del+evento" target="_blank" rel="noopener" memory_type="text" memory_usage="custom" memory_key="ubicacion-boton">Como llegar</a>
  </div>
  <div class="${S.cls}-ub__mapa-zona" memory_type="text" memory_usage="custom" memory_key="ubicacion-mapa-url">
    <iframe src="https://www.google.com/maps?q=Ubicaci%C3%B3n+del+evento&output=embed" title="Mapa de la ubicación" loading="lazy" allowfullscreen></iframe>
  </div>
</div>
${meta('ubicacion', 'ubicacion-ceremonia', S.name + ' — Ubicacion', 'Ubicacion ' + S.theme + ': datos del lugar, foto grande del recinto y mapa embebido en marco del estilo.', ['ubicacion', 'mapa', S.cls, S.theme])}
</section>`;
}

function itinerario(S) {
  const V = (S.num % 4);
  const layout =
    V === 0 ? 'display:flex; flex-wrap:wrap; justify-content:center; gap:clamp(1rem,3vw,1.8rem);'
    : V === 1 ? 'display:grid; grid-template-columns:repeat(auto-fit, minmax(min(250px,100%),1fr)); gap:clamp(1.2rem,3.2vw,2rem);'
    : V === 2 ? 'position:relative; width:min(100%,860px); margin:0 auto; transform:rotate(-1.4deg);'
    : 'display:grid; grid-template-columns:1fr; width:min(100%,720px); margin:0 auto;';
  const tilt = (i) => V === 2 ? (i % 2 ? 'rotate(1.6deg) translateX(6%)' : 'rotate(-1.8deg) translateX(-4%)') : (V === 0 ? (i % 2 ? 'rotate(1.4deg) translateY(8px)' : 'rotate(-1.4deg)') : 'rotate(0)');
  const hitos = [
    ['16:00', 'Recepcion', 'Bienvenida y primeros abrazos.'],
    ['17:30', 'Ceremonia', 'El voto principal de la velada.'],
    ['19:30', 'Banquete', 'Cena larga y copas altas.'],
    ['21:30', 'Fiesta', 'La pista abre hasta el final.']
  ].map(([h, mo, de], i) => `  <article class="${S.cls}-it__hito" style="transform:${(V === 2) ? tilt(i) : 'none'}; ${V === 0 && i % 2 ? 'margin-top:1.2rem;' : ''}">
    <time class="${S.cls}-it__hora" datetime="${['16:00', '17:30', '19:30', '21:30'][i]}" memory_type="text" memory_usage="custom" memory_key="itinerario-hora-${i + 1}">${h} h</time>
    <div memory_type="text" memory_usage="custom" memory_key="itinerario-hito-${i + 1}">
      <h3 class="${S.cls}-it__momento" memory_type="text" memory_usage="custom" memory_key="itinerario-momento-${i + 1}">${mo}</h3>
      <p class="${S.cls}-it__detalle" memory_type="text" memory_usage="custom" memory_key="itinerario-det-${i + 1}">${de}</p>
    </div>
  </article>`).join('\n');
  return `<section class="${S.cls}-it" data-gemini-id="itinerario-agenda" memory_type="background" memory_usage="protected" memory_source="generated" path="placeholder">
<style>
.${S.cls}-it { ${Object.entries(S.v).map(([k, v]) => k + ':' + v).join('; ')};
  position:relative; isolation:isolate; overflow:hidden; box-sizing:border-box; padding:clamp(3rem,8vw,6rem) clamp(1rem,5vw,4rem);
  background:${S.bg}; background-size:cover; background-position:center; color:var(--text-color); }
.${S.cls}-it *, .${S.cls}-it *::before, .${S.cls}-it *::after { box-sizing:border-box; }
.${S.cls}-it::before { content:''; position:absolute; inset:0; z-index:-1; background:color-mix(in srgb, var(--bg-color) 82%, transparent); }
.${S.cls}-it__titulo { position:relative; z-index:2; margin:0 auto clamp(1.8rem,4vw,2.6rem); width:min(100%,860px); font-family:${S.disp}; font-weight:${(S.num % 2) ? '400' : '700'}; font-size:clamp(1.9rem,4.4vw,2.9rem); color:var(--primary-color); transform:rotate(${(S.num % 2) ? '-1deg' : '0deg'}); }
.${S.cls}-it__titulo em { font-style:italic; color:var(--accent-color); }
.${S.cls}-it__tira { ${layout} }
.${S.cls}-it__hito { padding:clamp(1.1rem,2.6vw,1.6rem) clamp(1.2rem,3vw,1.9rem); ${S.card} transition:transform .5s cubic-bezier(.22,.8,.3,1); }
.${S.cls}-it__hito:hover { transform:translateY(-6px) rotate(0); z-index:5; }
.${S.cls}-it__hora { display:inline-block; margin-bottom:.3rem; font-family:${S.mono}; font-size:clamp(.66rem,1.3vw,.78rem); letter-spacing:.24em; color:var(--accent-color); }
.${S.cls}-it__momento { margin:0 0 .25rem; font-family:${S.disp}; font-size:clamp(1.04rem,2.1vw,1.3rem); color:var(--primary-color); }
.${S.cls}-it__detalle { margin:0; font-family:${S.body}; font-size:clamp(.78rem,1.4vw,.88rem); line-height:1.6; color:var(--secondary-color); }
@media (max-width:640px){ .${S.cls}-it__hito { transform:none !important; width:100% !important; margin-left:0 !important; } .${S.cls}-it__tira { transform:none; } }
</style>
<h2 class="${S.cls}-it__titulo" memory_type="text" memory_usage="custom" memory_key="itinerario-titulo">Itinerario <em>${S.theme}</em></h2>
<div class="${S.cls}-it__tira">
${hitos}
</div>
${meta('itinerario', 'itinerario-agenda', S.name + ' — Itinerario', 'Itinerario ' + S.theme + ' con cuatro hitos, layout propio del movimiento y marcos del estilo.', ['itinerario', S.cls, S.theme, 'timeline'])}
</section>`;
}

module.exports = { portada, padres, ubicacion, itinerario, meta };
