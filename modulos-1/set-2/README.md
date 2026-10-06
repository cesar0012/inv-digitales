# SET 2 — "Salón Déco"

## Brief creativo (documento de dirección)

- **Fusión estética:** art déco luminoso × escultórico monumental con mármol y bronce
- **Concepto:** un gran salón ceremonial de hotel de los años dorados. Simetría solemne,
  sunbursts girando en el fondo, arcos triunfales, marcos escalonados en triple filete y
  focos precisos sobre cada pieza, como vitrina de joyería.
- **Layouts:** escena central con sunburst radial, paneles en arco, nichos de escaparate,
  espina central simétrica, placa con monograma.
- **Técnica estrella:** CSS 3D — tilt de vitrina con `pointermove` + tarjetas que entran en
  `rotateX`; sombras largas proyectadas en los títulos; sellos cónicos `conic-gradient`.
- **Firma visual:** monograma/insignia cónica que gira lentamente; marcos con esquinas déco.
- **Paleta neutral:** champán, bronce profundo, marfil (todo via variables genéricas).
- **Fotos:** retratos en arco con halo, foto superpuesta tipo postal sobre el mapa,
  vitrina en arco con tilt.

## Módulos

| Archivo | Tipo | Estilo |
|---|---|---|
| `01-portada.html` | portada | Sunburst giratorio + retrato en arco + nombres con sombra larga |
| `02-padres.html` | padres | Paneles ceremoniales en arco con halo dorado y stagger |
| `03-ubicacion.html` | ubicacion | Dos sedes con hora + mapa enmarcado + marcador rombo con latido |
| `04-itinerario.html` | itinerario | Espina central simétrica con medallones y avance por scroll |
| `05-confirmacion.html` | confirmacion | Placa con monograma cónico giratorio y fecha límite |
| `06-detalles.html` | detalles | Vitrina en arco con tilt 3D + tarjetas con glifos en rombo |
| `07-countdown.html` | countdown | Tablero de 4 celdas con remates + anillo de segundos |
| `08-padrinos.html` | padrinos | Nichos de escaparate con foco radial y stagger |
| `09-corte.html` | corte | Telón de terciopelo a rayas + insignia cónica que se disipa |
| `10-galeria.html` | galeria | Mosaico cuadrado con esquinas déco + lightbox |
| `11-regalos.html` | regalos | Placa de doble filete con opciones en romanos + botón agendar |
| `12-vestimenta.html` | vestimenta | Gemas facetadas sobre pedestales generadas por JS |

Todos los módulos pasan `validateGeneratedModule` (contrato RAG completo).
