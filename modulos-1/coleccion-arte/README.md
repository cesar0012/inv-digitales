# Colección Arte — 20 sets completos (240 módulos)

20 sets completos de módulos de invitación, cada uno con un movimiento artístico
o tendencia visual distinta. Cada set contiene los 12 módulos del contrato
(`portada, padres, ubicacion, itinerario, confirmacion, detalles, countdown,
padrinos, corte, galeria, regalos, vestimenta`). Ningún set se parece a otro ni
a los sets 1-12 de `modulos-1/`. Todos pasan `validateGeneratedModule`
(contrato RAG completo: `memory_*`, placeholders loremflickr, variables genéricas,
countdown con contrato completo, galería con lightbox).

**Abre `index.html` en el navegador para los 240 módulos apilados por set.**
Capturas de referencia en `shots-coleccion-arte/` (desktop 1280px + móvil 390px).

## Estructura

```
coleccion-arte/
  set-01-mucha/01-portada.html … 12-vestimenta.html
  set-02-oleo/…
  …
  set-20-vinilo/…
  gen/            ← generador (styles.cjs + plantillas + run.cjs)
  index.html      ← preview global con los 240 módulos
  _referencia/    ← los 20 módulos individuales originales (concepto)
```

## Los 20 sets

| Set | Estilo | Gancho visual |
|---|---|---|
| 01 | Art Nouveau — Mucha | Halo ornamentado, marcos dorados, serif clásica |
| 02 | Impresionismo — Óleo | Marcos dorados gruesos, manchas de óleo, titles rotados |
| 03 | Cubismo — Fragmentos | Planos de color, sombras duras desplazadas, tipografía geo |
| 04 | Brutalismo — Crónica | Impact, sombras offset duras, banner de advertencia |
| 05 | Y2K — Cromo Líquido | Orbes cromados, vidrio esmerilado, degradados neón |
| 06 | Synthwave — Zona Neón | Sol de rayas, rejilla, glow cian/magenta, mono total |
| 07 | Ukiyo-e — Ola | Washi crema, sello hanko, tintas planas |
| 08 | Vitral Gótico | Rosetón, plomos dorados, navy profundo |
| 09 | Papercraft — Capas | Sol y sierras de papel, sombras entre capas |
| 10 | Surrealismo — Ensueño | Lavanda imposible, marcos flotantes, sombras largas |
| 11 | Talavera | Cenefa de grecas, loza azul/amarillo |
| 12 | Fairycore | Glow iridiscente, arcos pastel, brillos |
| 13 | Constructivismo | Diagonal roja, bloques, tipografía de cartel |
| 14 | Risograph | Sobreimpresión, tramas de puntos, tintas planas |
| 15 | Tropical | Hojas gigantes, verdes profundos, postal |
| 16 | Cósmico | Órbitas doradas, navy estelar, cifras gigantes |
| 17 | Claymorphism | Blobs puffy 3D, sombras internas, pastel vivo |
| 18 | Dark Academia | Lacre, serifs de libro, marrones y vino |
| 19 | Candy Pop | Confeti, rosa chicle, círculos felices |
| 20 | Vinilo Retro | Franjas de surco, crema/naranja retro, mono |

## Generador

Los 240 archivos se emiten desde `gen/` (tokens por estilo en `styles.cjs`,
plantillas por módulo en `tpl-a/b/c.cjs`, orquestador `run.cjs` que aplica
además correcciones automáticas de legibilidad WCAG sobre los tokens).
Regenerar: `node modulos-1/coleccion-arte/gen/run.cjs`

## Contrato y verificación

Todos cumplen `validateGeneratedModule`: atributos `memory_*`, `path="placeholder"`,
imágenes loremflickr grandes, variables CSS genéricas, responsive con `clamp()`,
`moduleMetadata` con `tipo` válido, countdown con `data-countdown-target` +
`window.updateCountdown` + limpieza de `__countdownIntervals`.

- Validación: `node scripts/test-coleccion-arte.js` → 240/240
- Capturas: `node scripts/shoot-coleccion-arte.js` (placeholder local para
  loremflickr porque responde 401 desde este entorno; en producción el proceso
  agéntico reemplaza todos los placeholders).
