# Colecciones 04 · 05 · 06 — basadas en referencias reales

Tres sets completos de 12 módulos diseñados a partir de los mejores ejemplos
buscados en internet. Cada uno es una web distinta; todos pasan el contrato
modular completo (`validateGeneratedModule` 12/12 por set, 72/72 en total).

## 04 · Noir & Oro (imgs 15-17: suite negro/oro con lacre)

Boda de noche de lujo: casi-negro cálido, degradado oro animado en nombres y
cifras, filos dobles, esquinas deco, lacre de monograma. Ver `README.md` de
su carpeta y `index.html`.

Firmas: retrato tras velo en portada · countdown con cifras gigantes de oro ·
confirmación con lacre R&A · itinerario con hilo de rombos.

## 05 · Botánico Acuarela (imgs 1-3, 18: acuarela botánica)

Boda de día aireada: papel blanco, manchas de acuarela, salvia/azul polvo,
guirnaldas de hojas, script. Firmas: countdown con **corona de hojas que
gira** alrededor de los días · itinerario con horarios dentro de hojas
orgánicas · galería de pétalos recortados.

## 06 · Editorial Terracota (imgs 10, 12, 14: minimal/arco)

Minimalista editorial: ecru cálido, terracota, arcos plenos, tipografía
enorme, reglas finas. Firmas: portada con foto en arco y tipografía gigante ·
itinerario como tabla tipográfica · countdown de cifras puras.

## Estandares

Todos los módulos: `data-gemini-id` único, `memory_*`, fondos/imágenes
loremflickr + `path="placeholder"`, variables CSS genéricas, responsive con
`clamp()` + grid/flex + media queries, `moduleMetadata` con `tipo` válido y
countdown con contrato completo.

## Verificación

- `node scripts/test-colecciones.js` → 72/72 (colecciones 01-06)
- `node scripts/shoot-coleccion.js 04-noir-oro` (etc.) → `shots-colecciones/`
