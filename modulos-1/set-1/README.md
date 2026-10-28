# SET 1 — "Herbario de Línea"

## Brief creativo (documento de dirección)

- **Fusión estética:** botánico científico vintage × editorial de revista de moda
- **Concepto:** un herbario de expedición dibujado a línea. Papel claro, láminas numeradas,
  filetes dobles, ramas line-art y sellos con borde dentado. Aire, retícula y detalle diminuto.
- **Layouts:** plancha central tipo lámina, tarjetas numeradas, medallones ovalados,
  timeline de cuaderno de campo, índice editorial.
- **Técnica estrella:** bordes de doble filete + line-art SVG trazado a mano.
- **Firma visual:** líneas que se dibujan al entrar en pantalla (stroke-dashoffset) y
  revelados por máscara clip-path.
- **Paleta neutral:** blanco papel, tinta gris cálida, acento salvia (todo via variables
  genéricas `--primary-color`, `--accent-color`, etc.; el sistema la tematiza después).
- **Fotos:** polaroids con cinta adhesiva, retratos circulares con marco doble, mapa enmarcado
  como lámina con rosa de los vientos.

## Módulos

| Archivo | Tipo | Estilo |
|---|---|---|
| `01-portada.html` | portada | Plancha botánica con sello giratorio y nombres en revelado por máscara |
| `02-padres.html` | padres | Láminas I/II con retratos circulares y stagger |
| `03-ubicacion.html` | ubicacion | Mapa con doble filete, rosa de los vientos, marcador de pulso |
| `04-itinerario.html` | itinerario | Riel que se dibuja con el scroll + hojas marcadoras |
| `05-confirmacion.html` | confirmacion | RSVP informativo con sello estrella y esquinas de filete |
| `06-detalles.html` | detalles | Foto con esquina recortada + tarjetas en perspectiva 3D |
| `07-countdown.html` | countdown | Dial circular con arco de segundos y hoja central |
| `08-padrinos.html` | padrinos | Medallones en píldora con doble marco circular |
| `09-corte.html` | corte | Telón de papel a rayas que se abre en dos paneles |
| `10-galeria.html` | galeria | Polaroids numeradas rotadas + lightbox propio |
| `11-regalos.html` | regalos | Índice editorial con rombos y botón agendar animado |
| `12-vestimenta.html` | vestimenta | Gotas de acuarela generadas por JS |

Todos los módulos pasan `validateGeneratedModule` (contrato RAG completo: data-gemini-id,
memory_*, path="placeholder", loremflickr, variables genéricas, responsive, metadatos).
