/* Shaper estructural: garantiza que ningún set comparta composición con otro
 * dentro del mismo tipo de módulo. Tres ejes por set:
 *   ord    = num % 3            → colocación de la cabecera (arriba / abajo /
 *                                 dividida: rótulo arriba, título abajo)
 *   espejo = floor((num-1)/12)  → invierte el orden de los bloques de contenido
 *   rv     = num % 4            → coreografía de entrada (fade-up/slide/zoom/blur)
 * 4 variantes base × 3 ords × 2 espejos = 24 composiciones por tipo.
 * Los cambios son de DOM y CSS reales (no cosméticos). */
const { parseHTML } = require('linkedom');

const RV_CLASS = ['rv-fade', 'rv-slide', 'rv-zoom', 'rv-blur'];

const REVEAL_CSS = `
[data-gemini-id] .rv-fade > *:not(style):not(script), [data-gemini-id] .rv-slide > *:not(style):not(script),
[data-gemini-id] .rv-zoom > *:not(style):not(script), [data-gemini-id] .rv-blur > *:not(style):not(script) {
  opacity:0; transition:opacity .7s ease, transform .7s cubic-bezier(.16,1,.3,1), filter .7s ease;
}
[data-gemini-id] .rv-fade > .sf-orn-wrap { opacity:1; transform:none; filter:none; }
.rv-fade.enVista > *:not(style):not(script) { opacity:1; transform:none; }
.rv-slide.enVista > *:not(style):not(script) { opacity:1; transform:none; }
.rv-zoom.enVista > *:not(style):not(script) { opacity:1; transform:none; }
.rv-blur.enVista > *:not(style):not(script) { opacity:1; filter:none; transform:none; }
.rv-slide > *:not(style):not(script) { transform:translateX(-34px); }
.rv-zoom  > *:not(style):not(script) { transform:scale(.86); }
.rv-blur  > *:not(style):not(script) { filter:blur(10px); transform:translateY(16px); }
.enVista > *:not(style):not(script):nth-child(2) { transition-delay:.12s; }
.enVista > *:not(style):not(script):nth-child(3) { transition-delay:.24s; }
.enVista > *:not(style):not(script):nth-child(4) { transition-delay:.36s; }
.enVista > *:not(style):not(script):nth-child(5) { transition-delay:.48s; }
@media (prefers-reduced-motion:reduce){
  [data-gemini-id] .rv-fade > *, [data-gemini-id] .rv-slide > *, [data-gemini-id] .rv-zoom > *, [data-gemini-id] .rv-blur > * { opacity:1 !important; transform:none !important; filter:none !important; transition:none !important; }
}`;

const REVEAL_JS = `
<script>
(function () {
  var el = null;
  try { el = document.currentScript.closest('[data-gemini-id]'); } catch (e) {}
  if (!el) return;
  var mostra = function () { el.classList.add('enVista'); };
  if (!('IntersectionObserver' in window)) { mostra(); return; }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { if (en.isIntersecting) { mostra(); io.disconnect(); } });
  }, { threshold: 0.18 });
  io.observe(el);
  setTimeout(mostra, 2600);
})();
</script>`;

/* Vestimenta decorativa por set: 6 tratamientos de marco/banda distintos que
 * cambian la silueta visual del módulo (esquinas, rieles, viñeta, cinta). */
const DRESS = [
  /* 0 — sin tratamiento */
  { el: '', css: '' },
  /* 1 — esquinas caladas */
  { el: '<i class="sf-dress sf-dress--corners" aria-hidden="true"></i>',
    css: `.sf-dress--corners { position:absolute; inset:clamp(10px,2vw,18px); pointer-events:none; z-index:1;
  background:
    linear-gradient(var(--primary-color), var(--primary-color)) top left / 34px 3px,
    linear-gradient(var(--primary-color), var(--primary-color)) top left / 3px 34px,
    linear-gradient(var(--primary-color), var(--primary-color)) top right / 34px 3px,
    linear-gradient(var(--primary-color), var(--primary-color)) top right / 3px 34px,
    linear-gradient(var(--primary-color), var(--primary-color)) bottom left / 34px 3px,
    linear-gradient(var(--primary-color), var(--primary-color)) bottom left / 3px 34px,
    linear-gradient(var(--primary-color), var(--primary-color)) bottom right / 34px 3px,
    linear-gradient(var(--primary-color), var(--primary-color)) bottom right / 3px 34px;
  background-repeat:no-repeat; opacity:.85; }` },
  /* 2 — riel lateral con marcas */
  { el: '<i class="sf-dress sf-dress--rail" aria-hidden="true"></i>',
    css: `.sf-dress--rail { position:absolute; left:clamp(8px,1.6vw,16px); top:12%; bottom:12%; width:6px; pointer-events:none; z-index:1;
  background:repeating-linear-gradient(180deg, var(--primary-color) 0 12px, transparent 12px 26px); opacity:.6; }
section.sf-dress--rail-pad { padding-left:clamp(1.6rem,4.5vw,3.2rem) !important; }` },
  /* 3 — viñeta doble marco */
  { el: '<i class="sf-dress sf-dress--vignette" aria-hidden="true"></i>',
    css: `.sf-dress--vignette { position:absolute; inset:0; pointer-events:none; z-index:1;
  box-shadow:inset 0 0 0 2px color-mix(in srgb, var(--primary-color) 55%, transparent), inset 0 0 0 8px color-mix(in srgb, var(--bg-color) 40%, transparent), inset 0 0 60px color-mix(in srgb, var(--bg-color) 60%, transparent); }` },
  /* 4 — cinta superior e inferior */
  { el: '<i class="sf-dress sf-dress--ribbons" aria-hidden="true"></i>',
    css: `.sf-dress--ribbons { position:absolute; inset:0; pointer-events:none; z-index:1; opacity:.8;
  background:
    repeating-linear-gradient(90deg, color-mix(in srgb, var(--primary-color) 34%, transparent) 0 16px, transparent 16px 30px) top / 100% 5px,
    repeating-linear-gradient(90deg, color-mix(in srgb, var(--secondary-color) 30%, transparent) 0 16px, transparent 16px 30px) bottom / 100% 5px;
  background-repeat:no-repeat; }` },
  /* 5 — arcos de esquina */
  { el: '<i class="sf-dress sf-dress--arches" aria-hidden="true"></i>',
    css: `.sf-dress--arches { position:absolute; inset:0; pointer-events:none; z-index:1; opacity:.55;
  background:
    radial-gradient(circle at top left, transparent 68px, var(--primary-color) 69px, transparent 71px) top left / 120px 120px,
    radial-gradient(circle at top right, transparent 68px, var(--primary-color) 69px, transparent 71px) top right / 120px 120px,
    radial-gradient(circle at bottom left, transparent 68px, var(--primary-color) 69px, transparent 71px) bottom left / 120px 120px,
    radial-gradient(circle at bottom right, transparent 68px, var(--primary-color) 69px, transparent 71px) bottom right / 120px 120px;
  background-repeat:no-repeat; }` }
];

function shape(S, html) {
  try {
    const { document } = parseHTML(html);
    const section = document.querySelector('section[data-gemini-id]');
    if (!section) return html;

    const ord = S.num % 3;
    const espejo = Math.floor((S.num - 1) / 12) === 1;
    /* rv y dress usan índices descorrelacionados del layout (num%6) para que
     * dos sets con el mismo layout nunca compartan vestimenta ni coreografía. */
    const rv = RV_CLASS[Math.floor((S.num - 1) / 6) % 4];

    // Los hijos "de contenido": todo menos <style> y <script>.
    const isContent = (n) => n.nodeType === 1 && n.tagName !== 'STYLE' && n.tagName !== 'SCRIPT';
    const content = Array.from(section.childNodes).filter(isContent);
    const header = content.find((n) => n.tagName === 'HEADER');

    /* Eje ORD — recolocación real de la cabecera. */
    if (ord === 1 && header) {
      // Cabecera al final (antes del primer script).
      const firstScript = Array.from(section.childNodes).find((n) => n.nodeType === 1 && n.tagName === 'SCRIPT');
      if (firstScript) section.insertBefore(header, firstScript);
      else section.appendChild(header);
    } else if (ord === 2 && header) {
      // Cabecera dividida: el rótulo queda arriba; título y ornamento bajan.
      const children = Array.from(header.childNodes).filter((n) => n.nodeType === 1);
      const rotulo = children.find((n) => n.tagName === 'P');
      const cola = document.createElement('footer');
      cola.setAttribute('class', header.getAttribute('class'));
      for (const c of children) { if (c !== rotulo) cola.appendChild(c); }
      while (header.childNodes.length) header.removeChild(header.firstChild);
      if (rotulo) header.appendChild(rotulo);
      const firstScript = Array.from(section.childNodes).find((n) => n.nodeType === 1 && n.tagName === 'SCRIPT');
      if (firstScript) section.insertBefore(cola, firstScript);
      else section.appendChild(cola);
    }

    /* Eje ESPEJO — invierte el orden de los bloques de contenido. */
    if (espejo && content.length > 1) {
      const reales = Array.from(section.childNodes).filter(isContent);
      const reves = reales.slice().reverse();
      for (const nodo of reves) section.appendChild(nodo);
    }

    /* Eje RV — coreografía de entrada + micro-flotación del ornamento. */
    section.classList.add(rv);
    const styleEl = section.querySelector('style');
    if (styleEl) styleEl.textContent += REVEAL_CSS + `
.${rv} .sf-orn-wrap svg { animation:${rv === 'rv-zoom' ? 'sfOrnFlota 5s ease-in-out infinite alternate' : rv === 'rv-slide' ? 'sfOrnGira 9s linear infinite' : 'sfOrnFlota 6s ease-in-out infinite alternate'}; }
@keyframes sfOrnFlota { to { transform:translateY(-5px); } }
@keyframes sfOrnGira { to { transform:rotate(4deg) translateY(-4px); } }`;

    /* Eje DRESS — tratamiento de marco/banda distinto por set (descorrelacionado
     * del layout: bloques de 4 sets por vestimenta). */
    const dress = DRESS[Math.floor((S.num - 1) / 4) % 6];
    if (dress.css && styleEl) {
      styleEl.textContent += '\n' + dress.css;
      section.insertAdjacentHTML('afterbegin', dress.el);
    }

    // Script de reveal al final (después de los demás scripts).
    section.insertAdjacentHTML('beforeend', REVEAL_JS);
    return section.outerHTML;
  } catch (e) {
    console.error('⚠ shaper falló para set ' + S.num + ': ' + e.message);
    return html;
  }
}

module.exports = { shape };
