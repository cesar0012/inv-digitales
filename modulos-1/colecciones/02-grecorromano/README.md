# Colección 02 · Grecorromano

Set completo de 12 módulos con espíritu de templo antiguo y estándares
modernistas de invitación digital: mármol marfil, bronce, terracota,
serif en versalitas, meandros y laurel. La firma de la colección es la
**animación de pasaje**: hojas de mármol que se abren al entrar, columnas
que se apartan y relieves que emergen al recorrer la página (siempre con
red de seguridad: sin JS todo queda visible, y a los 2.5 s se fuerza la
apertura de cualquier elemento que no haya revelado).

**Abre `index.html` para recorrer la colección completa.**

| # | Módulo | Concepto |
|---|---|---|
| 01 | Portada | **Puertas del templo** con argollas que se abren al cargar; escena gigante detrás del título, frontón, laurel y meandros |
| 02 | Padres | Estelas de mármol con arco sobre **columnas estriadas**; emergen como pasaje |
| 03 | Ubicación | Tarjeta con frontón + mapa del oráculo; **columnas que se apartan** como portal |
| 04 | Itinerario | **La Vía**: calzada romana con miliarios circulares (I-IV) que emergen en cascada |
| 05 | Confirmación | Tabilla de bronce con argolla, meandro y juramento por WhatsApp |
| 06 | Detalles | Tablones dobles: dress code con paleta de mármol/bronce + ofrendas |
| 07 | Countdown | **Horologium**: reloj de sol con numerales romanos, gnomon y sombra animada; unidades en placas de bronce |
| 08 | Padrinos | Medalliones circulares **coronados con laurel** |
| 09 | Corte | Galería de frescos I/II/III en marcos dorados, en cascada |
| 10 | Galería | **Corredor de frescos**: cada obra está tras hojas de mármol que se abren al llegar (IO) + lightbox |
| 11 | Regalos | Tributos: ánfora dorada, doble placa de datos y filo interior |
| 12 | Vestimenta | **Friso de atuendos** en forma de estela; el dorado reservado aparece tachado |

## Contrato

Todos pasan `validateGeneratedModule`: `data-gemini-id` único, atributos
`memory_*`, fondos e imágenes loremflickr + `path="placeholder"`, variables CSS
genéricas, responsive con `clamp()` y media queries, `moduleMetadata` con `tipo`
válido, countdown con contrato completo (`data-countdown-target`, 4 unidades,
`window.updateCountdown`, limpieza de `__countdownIntervals`).

Patrón de animación progresiva: los estados ocultos solo aplican bajo la clase
`mq2-js` (añadida por JS); IntersectionObserver revela al entrar y un
`setTimeout(…, 2500)` garantiza contenido visible siempre.

## Verificación y capturas

- Validación: `node scripts/test-colecciones.js` → 24/24 (colecciones 01 y 02)
- Capturas: `node scripts/shoot-coleccion.js 02-grecorromano` → `shots-colecciones/`
  (placeholder local por el 401 de loremflickr en este entorno).
