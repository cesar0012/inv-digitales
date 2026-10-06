# SET 3 — "Plegado Celeste"

## Brief creativo (documento de dirección)

- **Fusión estética:** origami plegado en capas de papel × celestial nocturno con polvo de estrellas
- **Concepto:** un diorama de papel plegado bajo un cielo estrellado. Cada tarjeta es una carta
  con esquina doblada; una grulla de papel guía el itinerario; las paletas son gemas facetadas.
  Profundidad real con `rotateX`, capas de montañas en `clip-path` y constelaciones que se dibujan.
- **Layouts:** carta plegada con solapa, banderines con cordel, ruta punteada vertical,
  sobre con postal rotada, órbita con satélite.
- **Técnica estrella:** clip-path de pliegues (esquinas dobladas, hexágonos, diagonales) +
  `rotateX/rotateY` de despliegue de papel + diorama de capas con sombras.
- **Firma visual:** constelación que se conecta (stroke-dashoffset) y estrella satélite que
  orbita el anillo de segundos.
- **Paleta neutral:** azul tinta crepuscular, lavanda, papel blanco (todo via variables genéricas).
- **Fotos:** polaroid con cinta washi, retratos circulares punteados, postales rotadas,
  figuras con máscaras distintas por pieza.

## Módulos

| Archivo | Tipo | Estilo |
|---|---|---|
| `01-portada.html` | portada | Carta plegada + constelación dibujada + diorama de montañas de papel |
| `02-padres.html` | padres | Cartas con esquina doblada que se despliegan en rotateX |
| `03-ubicacion.html` | ubicacion | Sobre con marcador estrella + mapa postal + grulla planeando |
| `04-itinerario.html` | itinerario | Ruta punteada con grulla que desciende según el scroll |
| `05-confirmacion.html` | confirmacion | Carta con sello estrella flotante y fecha límite |
| `06-detalles.html` | detalles | Foto plegada con washi + solapas que se despliegan en rotateY |
| `07-countdown.html` | countdown | Órbita con satélite girando + constelación de nodos por unidad |
| `08-padrinos.html` | padrinos | Banderines con cordel y estrella, caída escalonada |
| `09-corte.html` | corte | Acordeón de 5 pliegues alternos + estrella giratoria |
| `10-galeria.html` | galeria | Máscaras clip-path distintas por figura + lightbox |
| `11-regalos.html` | regalos | Banderitas de papel + botón con estallido de confeti estelar |
| `12-vestimenta.html` | vestimenta | Gemas de origami facetadas generadas por JS |

Todos los módulos pasan `validateGeneratedModule` (contrato RAG completo).
