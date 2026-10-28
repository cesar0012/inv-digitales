# Colección 01 · Modernista Quince

Set completo de 12 módulos para XV años, diseñado **a mano** como una web propia:
rosa empolvado + dorado champán + berenjena, serif en cursiva y etiquetas en mono.
Nada de plantillas genéricas: cada módulo tiene su propio concepto.

**Abre `index.html` para recorrer la colección completa.**

| # | Módulo | Concepto |
|---|---|---|
| 01 | Portada | Retrato gigante a pantalla completa detrás del título, pétalos cayendo, fecha en placa suave |
| 02 | Padres | Marcos tipo postal inclinados **hacia afuera**, nombres contrainclinados |
| 03 | Ubicación | Tarjeta con arco + sello de rosa dorada, mapa en arco invertido |
| 04 | Itinerario | Cada evento dentro de un círculo con numeral romano, hilados por camino punteado en zigzag |
| 05 | Confirmación | Sobre con solapa, sello de lacre «XV» y mariposas flotantes; botones WhatsApp |
| 06 | Detalles | Dress code y regalo en paneles con arco superior + paleta de círculos |
| 07 | Countdown | **Reloj estilo Alicia en el País de las Maravillas**: numerales romanos, manecillas animadas, 3 mariposas y unidades en cameos ovalados |
| 08 | Padrinos | Retratos ovalados tipo medallón colgados de cordones dorados |
| 09 | Corte | Momentos clave en etiquetas colgantes con hilo y numeración i. ii. iii. |
| 10 | Galería | **Cinta deslizable** (scroll-snap) con 6 marcos en ritmo diagonal + lightbox |
| 11 | Regalos | «Lluvia de sobres»: tarjeta con filo punteado dorado y sobre con moneda |
| 12 | Vestimenta | Paleta en **abanico** de círculos; el tono reservado de la quinceañera aparece tachado |

## Contrato

Todos pasan `validateGeneratedModule`: `data-gemini-id` único, atributos `memory_*`,
fondos e imágenes con placeholder loremflickr + `path="placeholder"`, variables CSS
genéricas, responsive con `clamp()` y media queries, `moduleMetadata` con `tipo` válido,
y countdown con contrato completo (`data-countdown-target`, 4 unidades,
`window.updateCountdown`, limpieza de `__countdownIntervals`).

## Verificación y capturas

- Validación: `node scripts/test-colecciones.js` → 12/12
- Capturas: `node scripts/shoot-coleccion.js 01-modernista-quince` → `shots-colecciones/`
  (loremflickr responde 401 en este entorno; el script dibuja placeholders locales
  rosados — en producción el proceso agéntico reemplaza todo).

## Siguientes colecciones

Cada nueva colección se agrega como `modulos-1/colecciones/NN-nombre/` y se diseña
como una web distinta (otra paleta, otra tipografía, otros adornos, otro layout).
