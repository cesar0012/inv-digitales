/* Codemod: progressive enhancement para reveals de modulos-1.
 * El estado oculto (opacity:0 / clip-path / telones) solo aplica cuando el
 * script añade la clase "<px>-js" a la raíz; sin JS todo el contenido es visible.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', 'modulos-1');

const B = 'cubic-bezier(0.22, 0.8, 0.3, 1)';
const edits = [
  // ============ SET 1 ============
  {
    file: 'set-1/01-portada.html', js: 'hb-js',
    pairs: [
      [`    .hb-portada__linea-revel {\n      display: block;\n      clip-path: inset(0 0 105% 0);\n      transition: clip-path 0.5s ${B};`,
       `    .hb-portada.hb-js .hb-portada__linea-revel {\n      display: block;\n      clip-path: inset(0 0 105% 0);\n      transition: clip-path 0.5s ${B};`],
      [`      color: var(--text-color);\n      opacity: 0;\n      transform: translateY(12px);\n      transition: opacity 0.5s ease 0.28s, transform 0.5s ease 0.28s;\n    }\n    .hb-portada.esta-visto .hb-portada__fecha { opacity: 1; transform: none; }`,
       `      color: var(--text-color);\n      transition: opacity 0.5s ease 0.28s, transform 0.5s ease 0.28s;\n    }\n    .hb-portada.hb-js .hb-portada__fecha { opacity: 0; transform: translateY(12px); }\n    .hb-portada.esta-visto .hb-portada__fecha { opacity: 1; transform: none; }`],
      [`    .hb-portada__foto {\n      position: absolute;\n      right: clamp(0.4rem, 3vw, 2.2rem);\n      bottom: clamp(0.4rem, 3vw, 1.8rem);\n      width: clamp(96px, 14vw, 150px);`,
       `    .hb-portada__foto {\n      justify-self: end;\n      margin-top: 1.5rem;\n      width: clamp(96px, 14vw, 150px);`],
      [`      .hb-portada__foto { position: static; margin: 1.6rem auto 0; transform: rotate(-3deg); }`,
       `      .hb-portada__foto { justify-self: center; margin: 1.6rem auto 0; transform: rotate(-3deg); }`]
    ]
  },
  {
    file: 'set-1/02-padres.html', js: 'hb-js',
    pairs: [
      [`      opacity: 0;\n      transform: translateY(18px);\n      transition: opacity 0.5s ease, transform 0.5s ${B};\n    }\n    .hb-padres.esta-visto .hb-padres__tarjeta { opacity: 1; transform: none; }`,
       `      transition: opacity 0.5s ease, transform 0.5s ${B};\n    }\n    .hb-padres.hb-js .hb-padres__tarjeta { opacity: 0; transform: translateY(18px); }\n    .hb-padres.esta-visto .hb-padres__tarjeta { opacity: 1; transform: none; }`]
    ]
  },
  {
    file: 'set-1/04-itinerario.html', js: 'hb-js',
    pairs: [
      [`      opacity: 0;\n      transform: translateX(-14px);\n      transition: opacity 0.5s ease, transform 0.5s ${B};\n    }\n    .hb-itinerario__hito.esta-visto { opacity: 1; transform: none; }`,
       `      transition: opacity 0.5s ease, transform 0.5s ${B};\n    }\n    .hb-itinerario.hb-js .hb-itinerario__hito { opacity: 0; transform: translateX(-14px); }\n    .hb-itinerario__hito.esta-visto { opacity: 1; transform: none; }`]
    ]
  },
  {
    file: 'set-1/06-detalles.html', js: 'hb-js',
    pairs: [
      [`      opacity: 0;\n      transform: rotateX(38deg) translateY(16px);\n      transition: opacity 0.5s ease, transform 0.5s ${B}, box-shadow 0.5s ease;\n    }\n    .hb-detalles.esta-visto .hb-detalles__cara { opacity: 1; transform: none; }`,
       `      transition: opacity 0.5s ease, transform 0.5s ${B}, box-shadow 0.5s ease;\n    }\n    .hb-detalles.hb-js .hb-detalles__cara { opacity: 0; transform: rotateX(38deg) translateY(16px); }\n    .hb-detalles.esta-visto .hb-detalles__cara { opacity: 1; transform: none; }`]
    ]
  },
  {
    file: 'set-1/08-padrinos.html', js: 'hb-js',
    pairs: [
      [`      opacity: 0;\n      transform: translateY(16px) scale(0.97);\n      transition: opacity 0.5s ease, transform 0.5s ${B};\n    }\n    .hb-padrinos.esta-visto .hb-padrinos__medallon { opacity: 1; transform: none; }`,
       `      transition: opacity 0.5s ease, transform 0.5s ${B};\n    }\n    .hb-padrinos.hb-js .hb-padrinos__medallon { opacity: 0; transform: translateY(16px) scale(0.97); }\n    .hb-padrinos.esta-visto .hb-padrinos__medallon { opacity: 1; transform: none; }`]
    ]
  },
  {
    file: 'set-1/09-corte.html', js: 'hb-js',
    pairs: [
      [`    .hb-corte__telon {\n      position: absolute;\n      inset: 0;\n      display: flex;\n      pointer-events: none;\n    }`,
       `    .hb-corte__telon {\n      position: absolute;\n      inset: 0;\n      display: none;\n      pointer-events: none;\n    }\n    .hb-corte.hb-js .hb-corte__telon { display: flex; }`],
      [`      transition: opacity 0.4s ease, transform 0.5s ease;\n    }\n    .hb-corte.esta-visto .hb-corte__sello { opacity: 0; transform: translate(-50%, -50%) scale(1.3); }`,
       `      transition: opacity 0.4s ease, transform 0.5s ease;\n      display: none;\n    }\n    .hb-corte.hb-js .hb-corte__sello { display: block; }\n    .hb-corte.esta-visto .hb-corte__sello { opacity: 0; transform: translate(-50%, -50%) scale(1.3); }`],
      [`      .hb-corte__telon { display: none; }\n      .hb-corte__sello { display: none; }`,
       `      .hb-corte .hb-corte__telon { display: none !important; }\n      .hb-corte .hb-corte__sello { display: none !important; }`]
    ]
  },
  {
    file: 'set-1/10-galeria.html', js: 'hb-js',
    pairs: [
      [`      opacity: 0;\n      transform: translateY(16px);\n      transition: opacity 0.5s ease, transform 0.5s ${B}, box-shadow 0.5s ease;\n    }\n    .hb-galeria.esta-visto .hb-galeria__pieza { opacity: 1; transform: none; }\n    .hb-galeria__pieza:hover { box-shadow: 0 20px 40px rgba(35, 48, 31, 0.2); }\n    .hb-galeria__pieza:nth-child(odd) { transform: translateY(16px) rotate(-1.1deg); }\n    .hb-galeria.esta-visto .hb-galeria__pieza:nth-child(odd) { transform: rotate(-1.1deg); }\n    .hb-galeria__pieza:nth-child(even) { transform: translateY(16px) rotate(1deg); }\n    .hb-galeria.esta-visto .hb-galeria__pieza:nth-child(even) { transform: rotate(1deg); }`,
       `      transition: opacity 0.5s ease, transform 0.5s ${B}, box-shadow 0.5s ease;\n    }\n    .hb-galeria.hb-js .hb-galeria__pieza { opacity: 0; transform: translateY(16px); }\n    .hb-galeria.esta-visto .hb-galeria__pieza { opacity: 1; transform: none; }\n    .hb-galeria__pieza:hover { box-shadow: 0 20px 40px rgba(35, 48, 31, 0.2); }\n    .hb-galeria.hb-js .hb-galeria__pieza:nth-child(odd) { transform: translateY(16px) rotate(-1.1deg); }\n    .hb-galeria.esta-visto .hb-galeria__pieza:nth-child(odd) { transform: rotate(-1.1deg); }\n    .hb-galeria.hb-js .hb-galeria__pieza:nth-child(even) { transform: translateY(16px) rotate(1deg); }\n    .hb-galeria.esta-visto .hb-galeria__pieza:nth-child(even) { transform: rotate(1deg); }`]
    ]
  },
  {
    file: 'set-1/11-regalos.html', js: 'hb-js',
    pairs: [
      [`      opacity: 0;\n      transform: translateY(10px);\n      transition: opacity 0.5s ease, transform 0.5s ease;\n    }\n    .hb-regalos.esta-visto .hb-regalos__fila { opacity: 1; transform: none; }`,
       `      transition: opacity 0.5s ease, transform 0.5s ease;\n    }\n    .hb-regalos.hb-js .hb-regalos__fila { opacity: 0; transform: translateY(10px); }\n    .hb-regalos.esta-visto .hb-regalos__fila { opacity: 1; transform: none; }`]
    ]
  },
  {
    file: 'set-1/12-vestimenta.html', js: 'hb-js',
    pairs: [
      [`      transition: background 0.5s ease, transform 0.5s ease;\n      opacity: 0;\n      transform: scale(0.7);\n    }\n    .hb-vestimenta.esta-visto .hb-vestimenta__chispa { opacity: 1; transform: none; }`,
       `      transition: background 0.5s ease, transform 0.5s ease;\n    }\n    .hb-vestimenta.hb-js .hb-vestimenta__chispa { opacity: 0; transform: scale(0.7); }\n    .hb-vestimenta.esta-visto .hb-vestimenta__chispa { opacity: 1; transform: none; }`]
    ]
  },

  // ============ SET 2 ============
  {
    file: 'set-2/01-portada.html', js: 'dc-js',
    pairs: [
      [`    .dc-portada__titulo span {\n      display: inline-block;\n      opacity: 0;\n      transform: translateY(0.4em);\n      transition: opacity 0.5s ease, transform 0.5s ${B};\n    }\n    .dc-portada.esta-visto .dc-portada__titulo span { opacity: 1; transform: none; }`,
       `    .dc-portada__titulo span {\n      display: inline-block;\n      transition: opacity 0.5s ease, transform 0.5s ${B};\n    }\n    .dc-portada.dc-js .dc-portada__titulo span { opacity: 0; transform: translateY(0.4em); }\n    .dc-portada.esta-visto .dc-portada__titulo span { opacity: 1; transform: none; }`],
      [`      opacity: 0;\n      transform: translateY(14px);\n      transition: opacity 0.5s ease, transform 0.5s ${B};\n    }\n    .dc-portada.esta-visto .dc-portada__arco { opacity: 1; transform: none; }`,
       `      transition: opacity 0.5s ease, transform 0.5s ${B};\n    }\n    .dc-portada.dc-js .dc-portada__arco { opacity: 0; transform: translateY(14px); }\n    .dc-portada.esta-visto .dc-portada__arco { opacity: 1; transform: none; }`]
    ]
  },
  {
    file: 'set-2/02-padres.html', js: 'dc-js',
    pairs: [
      [`      opacity: 0;\n      transform: translateY(20px);\n      transition: opacity 0.5s ease, transform 0.5s ${B};\n    }\n    .dc-padres.esta-visto .dc-padres__panel { opacity: 1; transform: none; }`,
       `      transition: opacity 0.5s ease, transform 0.5s ${B};\n    }\n    .dc-padres.dc-js .dc-padres__panel { opacity: 0; transform: translateY(20px); }\n    .dc-padres.esta-visto .dc-padres__panel { opacity: 1; transform: none; }`]
    ]
  },
  {
    file: 'set-2/04-itinerario.html', js: 'dc-js',
    pairs: [
      [`      opacity: 0;\n      transform: translateY(16px);\n      transition: opacity 0.5s ease, transform 0.5s ${B};\n    }\n    .dc-itinerario__hito.esta-visto { opacity: 1; transform: none; }`,
       `      transition: opacity 0.5s ease, transform 0.5s ${B};\n    }\n    .dc-itinerario.dc-js .dc-itinerario__hito { opacity: 0; transform: translateY(16px); }\n    .dc-itinerario__hito.esta-visto { opacity: 1; transform: none; }`]
    ]
  },
  {
    file: 'set-2/06-detalles.html', js: 'dc-js',
    pairs: [
      [`      transition: transform 0.5s ${B}, box-shadow 0.5s ease, opacity 0.5s ease;\n      opacity: 0;\n      transform: rotateX(24deg) translateY(14px);\n    }\n    .dc-detalles.esta-visto .dc-detalles__tarjeta { opacity: 1; transform: none; }`,
       `      transition: transform 0.5s ${B}, box-shadow 0.5s ease, opacity 0.5s ease;\n    }\n    .dc-detalles.dc-js .dc-detalles__tarjeta { opacity: 0; transform: rotateX(24deg) translateY(14px); }\n    .dc-detalles.esta-visto .dc-detalles__tarjeta { opacity: 1; transform: none; }`]
    ]
  },
  {
    file: 'set-2/08-padrinos.html', js: 'dc-js',
    pairs: [
      [`      opacity: 0;\n      transform: translateY(18px);\n      transition: opacity 0.5s ease, transform 0.5s ${B};\n    }\n    .dc-padrinos.esta-visto .dc-padrinos__nicho { opacity: 1; transform: none; }`,
       `      transition: opacity 0.5s ease, transform 0.5s ${B};\n    }\n    .dc-padrinos.dc-js .dc-padrinos__nicho { opacity: 0; transform: translateY(18px); }\n    .dc-padrinos.esta-visto .dc-padrinos__nicho { opacity: 1; transform: none; }`]
    ]
  },
  {
    file: 'set-2/09-corte.html', js: 'dc-js',
    pairs: [
      [`    .dc-corte__telon {\n      position: absolute;\n      inset: 0;\n      z-index: 2;\n      display: flex;\n      pointer-events: none;\n    }`,
       `    .dc-corte__telon {\n      position: absolute;\n      inset: 0;\n      z-index: 2;\n      display: none;\n      pointer-events: none;\n    }\n    .dc-corte.dc-js .dc-corte__telon { display: flex; }`],
      [`      transition: opacity 0.4s ease, transform 0.5s ease;\n      animation: dcCortePulso 5s ease-in-out infinite;\n    }`,
       `      transition: opacity 0.4s ease, transform 0.5s ease;\n      animation: dcCortePulso 5s ease-in-out infinite;\n      display: none;\n    }\n    .dc-corte.dc-js .dc-corte__insignia { display: grid; }`],
      [`      .dc-corte__telon, .dc-corte__insignia { display: none; }`,
       `      .dc-corte .dc-corte__telon, .dc-corte .dc-corte__insignia { display: none !important; }`]
    ]
  },
  {
    file: 'set-2/10-galeria.html', js: 'dc-js',
    pairs: [
      [`      opacity: 0;\n      transform: translateY(18px);\n      transition: opacity 0.5s ease, transform 0.5s ${B}, box-shadow 0.5s ease;\n    }\n    .dc-galeria.esta-visto .dc-galeria__pieza { opacity: 1; transform: none; }`,
       `      transition: opacity 0.5s ease, transform 0.5s ${B}, box-shadow 0.5s ease;\n    }\n    .dc-galeria.dc-js .dc-galeria__pieza { opacity: 0; transform: translateY(18px); }\n    .dc-galeria.esta-visto .dc-galeria__pieza { opacity: 1; transform: none; }`]
    ]
  },
  {
    file: 'set-2/11-regalos.html', js: 'dc-js',
    pairs: [
      [`      opacity: 0;\n      transform: translateY(10px);\n      transition: opacity 0.5s ease, transform 0.5s ease;\n    }\n    .dc-regalos.esta-visto .dc-regalos__opcion { opacity: 1; transform: none; }`,
       `      transition: opacity 0.5s ease, transform 0.5s ease;\n    }\n    .dc-regalos.dc-js .dc-regalos__opcion { opacity: 0; transform: translateY(10px); }\n    .dc-regalos.esta-visto .dc-regalos__opcion { opacity: 1; transform: none; }`]
    ]
  },
  {
    file: 'set-2/12-vestimenta.html', js: 'dc-js',
    pairs: [
      [`      opacity: 0;\n      transform: translateY(14px);\n      transition: opacity 0.5s ease, transform 0.5s ${B};\n    }\n    .dc-vestimenta.esta-visto .dc-vestimenta__joya { opacity: 1; transform: none; }`,
       `      transition: opacity 0.5s ease, transform 0.5s ${B};\n    }\n    .dc-vestimenta.dc-js .dc-vestimenta__joya { opacity: 0; transform: translateY(14px); }\n    .dc-vestimenta.esta-visto .dc-vestimenta__joya { opacity: 1; transform: none; }`]
    ]
  },

  // ============ SET 3 ============
  {
    file: 'set-3/01-portada.html', js: 'pl-js',
    pairs: [
      [`    .pl-portada__titulo span {\n      display: inline-block;\n      opacity: 0;\n      transform: translateY(0.5em) rotateX(70deg);\n      transition: opacity 0.5s ease, transform 0.5s ${B};\n    }\n    .pl-portada.esta-visto .pl-portada__titulo span { opacity: 1; transform: none; }`,
       `    .pl-portada__titulo span {\n      display: inline-block;\n      transition: opacity 0.5s ease, transform 0.5s ${B};\n    }\n    .pl-portada.pl-js .pl-portada__titulo span { opacity: 0; transform: translateY(0.5em) rotateX(70deg); }\n    .pl-portada.esta-visto .pl-portada__titulo span { opacity: 1; transform: none; }`]
    ]
  },
  {
    file: 'set-3/02-padres.html', js: 'pl-js',
    pairs: [
      [`      opacity: 0;\n      transform: rotateX(28deg) translateY(18px);\n      transform-origin: top center;\n      transition: opacity 0.5s ease, transform 0.5s ${B};\n    }\n    .pl-padres.esta-visto .pl-padres__carta { opacity: 1; transform: none; }`,
       `      transform-origin: top center;\n      transition: opacity 0.5s ease, transform 0.5s ${B};\n    }\n    .pl-padres.pl-js .pl-padres__carta { opacity: 0; transform: rotateX(28deg) translateY(18px); }\n    .pl-padres.esta-visto .pl-padres__carta { opacity: 1; transform: none; }`]
    ]
  },
  {
    file: 'set-3/03-ubicacion.html', js: null,
    pairs: [
      [`    .pl-ubicacion__postal {\n      margin: 1.4rem 0 0;`,
       `    .pl-ubicacion__postal {\n      margin: 1.4rem 0 1.6rem;`]
    ]
  },
  {
    file: 'set-3/04-itinerario.html', js: 'pl-js',
    pairs: [
      [`      opacity: 0;\n      transform: translateX(-16px);\n      transition: opacity 0.5s ease, transform 0.5s ${B};\n    }\n    .pl-itinerario__hito.esta-visto { opacity: 1; transform: none; }`,
       `      transition: opacity 0.5s ease, transform 0.5s ${B};\n    }\n    .pl-itinerario.pl-js .pl-itinerario__hito { opacity: 0; transform: translateX(-16px); }\n    .pl-itinerario__hito.esta-visto { opacity: 1; transform: none; }`]
    ]
  },
  {
    file: 'set-3/05-confirmacion.html', js: 'pl-js',
    pairs: [
      [`      opacity: 0;\n      transform: translateY(20px);\n      transition: opacity 0.5s ease, transform 0.5s ${B};\n    }\n    .pl-confirmacion.esta-visto .pl-confirmacion__carta { opacity: 1; transform: none; }`,
       `      transition: opacity 0.5s ease, transform 0.5s ${B};\n    }\n    .pl-confirmacion.pl-js .pl-confirmacion__carta { opacity: 0; transform: translateY(20px); }\n    .pl-confirmacion.esta-visto .pl-confirmacion__carta { opacity: 1; transform: none; }`]
    ]
  },
  {
    file: 'set-3/06-detalles.html', js: 'pl-js',
    pairs: [
      [`      opacity: 0;\n      transform: rotateY(-40deg) translateX(-14px);\n      transform-origin: left center;\n      transition: opacity 0.5s ease, transform 0.5s ${B};\n    }\n    .pl-detalles.esta-visto .pl-detalles__solapa { opacity: 1; transform: none; }`,
       `      transform-origin: left center;\n      transition: opacity 0.5s ease, transform 0.5s ${B};\n    }\n    .pl-detalles.pl-js .pl-detalles__solapa { opacity: 0; transform: rotateY(-40deg) translateX(-14px); }\n    .pl-detalles.esta-visto .pl-detalles__solapa { opacity: 1; transform: none; }`]
    ]
  },
  {
    file: 'set-3/08-padrinos.html', js: 'pl-js',
    pairs: [
      [`      opacity: 0;\n      transform: translateY(-16px);\n      transition: opacity 0.5s ease, transform 0.5s ${B};\n    }\n    .pl-padrinos.esta-visto .pl-padrinos__banderin { opacity: 1; transform: none; }`,
       `      transition: opacity 0.5s ease, transform 0.5s ${B};\n    }\n    .pl-padrinos.pl-js .pl-padrinos__banderin { opacity: 0; transform: translateY(-16px); }\n    .pl-padrinos.esta-visto .pl-padrinos__banderin { opacity: 1; transform: none; }`]
    ]
  },
  {
    file: 'set-3/09-corte.html', js: 'pl-js',
    pairs: [
      [`    .pl-corte__acordeon {\n      position: absolute;\n      inset: 0;\n      z-index: 2;\n      display: flex;\n      pointer-events: none;\n    }`,
       `    .pl-corte__acordeon {\n      position: absolute;\n      inset: 0;\n      z-index: 2;\n      display: none;\n      pointer-events: none;\n    }\n    .pl-corte.pl-js .pl-corte__acordeon { display: flex; }`],
      [`      transition: opacity 0.4s ease, transform 0.5s ease;\n      animation: plCorteGira 14s linear infinite;\n    }`,
       `      transition: opacity 0.4s ease, transform 0.5s ease;\n      animation: plCorteGira 14s linear infinite;\n      display: none;\n    }\n    .pl-corte.pl-js .pl-corte__estrella { display: block; }`],
      [`      .pl-corte__acordeon, .pl-corte__estrella { display: none; }`,
       `      .pl-corte .pl-corte__acordeon, .pl-corte .pl-corte__estrella { display: none !important; }`]
    ]
  },
  {
    file: 'set-3/10-galeria.html', js: 'pl-js',
    pairs: [
      [`      opacity: 0;\n      transform: translateY(18px);\n      transition: opacity 0.5s ease, transform 0.5s ${B}, box-shadow 0.5s ease;\n    }\n    .pl-galeria.esta-visto .pl-galeria__figura { opacity: 1; transform: none; }`,
       `      transition: opacity 0.5s ease, transform 0.5s ${B}, box-shadow 0.5s ease;\n    }\n    .pl-galeria.pl-js .pl-galeria__figura { opacity: 0; transform: translateY(18px); }\n    .pl-galeria.esta-visto .pl-galeria__figura { opacity: 1; transform: none; }`]
    ]
  },
  {
    file: 'set-3/11-regalos.html', js: 'pl-js',
    pairs: [
      [`      opacity: 0;\n      transform: translateX(-12px);\n      transition: opacity 0.5s ease, transform 0.5s ease;\n    }\n    .pl-regalos.esta-visto .pl-regalos__item { opacity: 1; transform: none; }`,
       `      transition: opacity 0.5s ease, transform 0.5s ease;\n    }\n    .pl-regalos.pl-js .pl-regalos__item { opacity: 0; transform: translateX(-12px); }\n    .pl-regalos.esta-visto .pl-regalos__item { opacity: 1; transform: none; }`]
    ]
  },
  {
    file: 'set-3/12-vestimenta.html', js: 'pl-js',
    pairs: [
      [`      opacity: 0;\n      transform: translateY(12px) scale(0.85);\n      transition: opacity 0.5s ease, transform 0.5s ${B};\n    }\n    .pl-vestimenta.esta-visto .pl-vestimenta__gema-zona { opacity: 1; transform: none; }`,
       `      transition: opacity 0.5s ease, transform 0.5s ${B};\n    }\n    .pl-vestimenta.pl-js .pl-vestimenta__gema-zona { opacity: 0; transform: translateY(12px) scale(0.85); }\n    .pl-vestimenta.esta-visto .pl-vestimenta__gema-zona { opacity: 1; transform: none; }`]
    ]
  }
];

let totalPairs = 0, applied = 0;
for (const edit of edits) {
  const path = join(ROOT, edit.file);
  let html = readFileSync(path, 'utf-8');
  for (const [from, to] of edit.pairs) {
    totalPairs++;
    if (!html.includes(from)) {
      console.error(`✗ NO ENCONTRADO en ${edit.file}:\n---\n${from.split('\n')[0]}\n---`);
      process.exitCode = 1;
      continue;
    }
    html = html.replace(from, to);
    applied++;
  }
  if (edit.js) {
    const anchor = `      if (!root) return;\n`;
    if (!html.includes(anchor)) {
      console.error(`✗ sin anchor JS en ${edit.file}`);
      process.exitCode = 1;
    } else {
      html = html.replace(anchor, `      if (!root) return;\n      root.classList.add('${edit.js}');\n`);
      applied++;
      totalPairs++;
    }
  }
  writeFileSync(path, html);
}
console.log(`Codemod: ${applied}/${totalPairs} cambios aplicados`);
