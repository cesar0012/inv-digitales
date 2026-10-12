# Radical Conceptos — 12 módulos, 12 universos

Set experimental donde **cada módulo nace del concepto de una foto de
referencia distinta** (de las 24 fuentes de `rag-visual-fuentes/`). Nada de
tarjetas redondeadas con base cuadrada: formas nuevas (clip-paths diagonales,
boletos con muescas, hexágonos, rombos, círculos de tinta, etiquetas
colgantes) y una interacción protagonista por módulo.

**Abre `index.html` para recorrerlos.**

| # | Módulo | Foto-concepto | Universo e interacción |
|---|---|---|---|
| 01 | Portada | XV arco dorado + tiara | Rayos dorados giratorios, arco que se traza, tiara que cae con rebote, destellos, nombre de oro líquido, foto en arco |
| 02 | Padres | Navy laser-cut | **Puertas perforadas que se abren** al cargar; retratos **hexagonales con tilt 3D** |
| 03 | Ubicación | Sobre kraft + hortensias | **Sobre con solapa que gira en 3D** (hover/auto) revelando mapa; polaroid adherida |
| 04 | Itinerario | Confeti dorado 25 | **Boletos perforados inclinados que voltean en 3D** (hover/tap) con reverso; confeti cayendo en bucle |
| 05 | Confirmación | Lacre negro/oro | **Lacre gigante que se ROMPE al tocar** (con autoapertura de respaldo) liberando los botones |
| 06 | Detalles | Peonías rojas acuarela | **Split diagonal** con lavados acuarela, postal inclinada y panel de cristal tras el texto |
| 07 | Countdown | Glitter laser morado | **Rombos de neón** con anillos de marquesina girando y pasadas de luz; texto degradado animado |
| 08 | Padrinos | Griega azul + oro caligrafía | **Anillos de tinta que se dibujan** al entrar; roles en pinceladas; nombres en script |
| 09 | Corte | 18 floral rosa | **Polaroids colgando de una cuerda con pinzas**, columpio infinito; se enderezan al pasar |
| 10 | Galería | Espejadas oro/plata | **Pared espejada en 3D** (perspectiva + tilt), destello que barre cada marco, lightbox |
| 11 | Regalos | Lluvia de sobres | **Sobres que cruzan la pantalla** en vuelo infinito; tarjeta de sombra dura juguetona |
| 12 | Vestimenta | Otoño con moño | **Etiquetas de madera colgando de un cordel**, columpio desfasado; crema tachada |

## Contrato

12/12 pasan `validateGeneratedModule`: `data-gemini-id` único, `memory_*`,
fondos/imágenes loremflickr + `path="placeholder"`, variables CSS genéricas,
responsive con `clamp()` + grid/flex + media queries, `moduleMetadata` con
`tipo` válido, countdown con contrato completo y galería con lightbox.

Seguridad de animaciones: contenido crítico nunca queda oculto sin JS
(puertas/lacre tienen autoapertura a 2.5-6 s) y `prefers-reduced-motion`
desactiva todo. Velos del color del tema garantizan legibilidad sobre
cualquier fotografía de fondo.

## Verificación

- Validación: `node scripts/test-colecciones.js` (colecciones) + gate directo
  sobre esta carpeta → 12/12
- Capturas: `node scripts/shoot-radical-conceptos.js` → `shots-radical-conceptos/`
