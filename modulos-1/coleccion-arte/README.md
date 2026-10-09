# Colección Arte — 20 módulos espectaculares

20 módulos individuales, cada uno con un movimiento artístico o tendencia visual distinta.
Ninguno se parece a otro ni a los sets 1-12. Todos pasan `validateGeneratedModule`
(contrato RAG completo: `memory_*`, placeholders loremflickr, variables genéricas).

**Abre `index.html` en el navegador para verlos apilados en orden.**

| # | Archivo | Tipo | Estilo / Gancho visual |
|---|---|---|---|
| 01 | `01-artnouveau-portada.html` | portada | Art Nouveau (Mucha): halo ornamentado giratorio, retrato en arco dorado, titulares por línea, whiplash que se traza |
| 02 | `02-impresionismo-galeria.html` | galeria | Impresionismo: marcos dorados colgados torcidos, filtro de óleo + trama de pinceladas soft-light, rotulación de museo |
| 03 | `03-cubismo-padres.html` | padres | Cubismo: fotos rotas en 4 shards con clip-path (espejados/teñidos), planos de color en multiply |
| 04 | `04-brutalismo-itinerario.html` | itinerario | Brutalismo tipográfico: titulares Impact, números colosales, marquesina amarilla de advertencia |
| 05 | `05-y2k-countdown.html` | countdown | Y2K cromo líquido: orbes metálicos flotantes, cifras con degradado recortado al texto, pastillas de vidrio |
| 06 | `06-synthwave-ubicacion.html` | ubicacion | Synthwave: sol de rayas, rejilla en perspectiva infinita, mapa en tinte magenta, holograma con foto |
| 07 | `07-ukiyoe-gracias.html` | gracias | Ukiyo-e: sello hanko rojo, kana espaciado, triple ola de madera con crestas espumadas |
| 08 | `08-vitral-confirmacion.html` | confirmacion | Vitral gótico: rosetón SVG flotante, rayos que barren, panel de mulliones con plomos dorados |
| 09 | `09-papercraft-portada.html` | portada | Papercraft: sol de papel + 5 capas de sierras recortadas con sombra entre capas, carta flotante |
| 10 | `10-surrealismo-detalles.html` | detalles | Surrealismo: nubes imposibles, retrato flotante en marco dorado, objetos con sombras de acento |
| 11 | `11-talavera-regalos.html` | regalos | Talavera: cenefas de grecas, tarjetas loza con medallón radial y doble filo punteado |
| 12 | `12-fairycore-padrinos.html` | padrinos | Fairycore: 16 luciérnagas JS, portales iridiscentes con retrato en luminosidad, glow morado |
| 13 | `13-constructivismo-padrinos.html` | padrinos | Constructivismo: diagonal roja, foto B/N con plano multiply, cuadrados rotados como sellos |
| 14 | `14-risograph-galeria.html` | galeria | Risograph: prints con borde de tinta, saturación de sobreimpresión, pies de edición numerados |
| 15 | `15-tropical-ubicacion.html` | ubicacion | Tropical maximalista: hojas gigantes, tarjetas con doble sombra, postal + mapa redondeados |
| 16 | `16-cosmico-countdown.html` | countdown | Barroco cósmico: marco circular dorado, dos órbitas con planetas en sentidos opuestos, cifra gigante |
| 17 | `17-claymorphism-vestimenta.html` | vestimenta | Claymorphism: blobs 3D flotantes, tarjetas puffy con esferas de dress code |
| 18 | `18-darkacademia-itinerario.html` | itinerario | Dark academia: capítulos de libro en arcos góticos con sello de lacre |
| 19 | `19-candy-gracias.html` | gracias | Candy pop: GRACIAS en degradado tricolor, confeti JS cayendo, chispas de nombres |
| 20 | `20-vinilo-music.html` | music | Vinilo retro: disco 33rpm girando con surcos reales, lista de pistas lado A/B |

## Contrato

Todos cumplen `validateGeneratedModule`: atributos `memory_*`, `path="placeholder"`,
imágenes loremflickr grandes, variables CSS genéricas, responsive con `clamp()`,
`moduleMetadata` con `tipo` válido. Verificación: `node scripts/test-coleccion-arte.js`.
