# Colección 03 · Jardín de Lavanda

Set completo de 12 módulos con la estética más moderna de la casa (2026):
lavanda y lila sobre blanco, **prisma de plata que se traza solo**, tiara,
cristal esmerilado (glassmorphism), tipografía script, mariposas flotantes y
rosas en las esquinas con máscara suave — inspirada en la invitación de rosas
acuarela moradas con marco geométrico plateado.

**Abre `index.html` para recorrer la colección completa.**

| # | Módulo | Concepto |
|---|---|---|
| 01 | Portada | **Prisma plateado que se dibuja** (stroke-dashoffset), tiara, nombre en script gigante, rosas lila enmascaradas en las 4 esquinas, quinceañera de gala con velo degradado, mariposas y destellos titilando |
| 02 | Padres | Tarjetas de cristal con retratos ovales de **aro plateado** |
| 03 | Ubicación | Cristal + botón con **brillo de seda animado**, mapa enmarcado |
| 04 | Itinerario | Camino vertical de **gemas romboidales** lavanda con cascada escalonada |
| 05 | Confirmación | Sello de **mariposa** lavanda, botón degradado animado |
| 06 | Detalles | Dress code con **paleta de gemas** + ofrendas |
| 07 | Countdown | 4 **prismas de cristal con pasadas de luz** periódicas, tiara y mariposas |
| 08 | Padrinos | Reliquias de cristal con destellos que titilan |
| 09 | Corte | Tres gemas numeradas sobre tarjetas de cristal |
| 10 | Galería | **Mosaico escalonado** de cristal con pies en píldora + lightbox |
| 11 | Regalos | «Lluvia de sobres» con sobre, mariposa y brillo de seda |
| 12 | Vestimenta | **Gemas de paleta** en abanico; el morado reservado aparece tachado |

## Animación 2026

- **Revelado desenfoque→nítido**: cada bloque entra con `blur(10px)→0` +
  elevación, en cascada escalonada (`cubic-bezier(.16,1,.3,1)`).
- **Brillo de seda**: degradado que recorre botones y pastillas en bucle.
- **Prisma autotrazado**: el marco de plata se dibuja con `stroke-dashoffset`.
- Seguro por contrato: estados ocultos solo bajo `.mq3-js` (JS presente),
  IntersectionObserver revela al entrar y `setTimeout(…, 2500)` garantiza
  contenido visible siempre; `prefers-reduced-motion` lo desactiva todo.

## Contrato

Todos pasan `validateGeneratedModule`: `data-gemini-id` único, `memory_*`,
fondos e imágenes loremflickr + `path="placeholder"`, variables CSS genéricas,
responsive con `clamp()` y media queries, `moduleMetadata` con `tipo` válido y
countdown completo (`data-countdown-target`, 4 unidades, `window.updateCountdown`,
limpieza de `__countdownIntervals`).

## Verificación y capturas

- Validación: `node scripts/test-colecciones.js` → 36/36 (colecciones 01-03)
- Capturas: `node scripts/shoot-coleccion.js 03-jardin-lavanda` → `shots-colecciones/`
  (placeholder local por el 401 de loremflickr en este entorno).
