# Subsistema de Tematización Post-RAG

Aplica los requerimientos de **color** y **tipografía** del cliente a los módulos `.html`
seleccionados por el RAG, de forma **segura y determinista**, sin alterar los estilos
avanzados protegidos (`memory_usage="protected"`) y sin romper la compatibilidad con el
editor de módulos ni el proceso agéntico.

## Flujo

```
pantalla de generación ──► request JSON (theme-contract.schema.json)
                                │
   1. Validación y normalización ◄── rechaza entradas malformadas / inyección
   2. Resolución de Google Fonts (API pública c/ timeout → lista blanca → fallback)
   3. Override centralizado: :root del contenedor + <link> de fonts (UNA vez)
   4. Procesamiento por módulo (protección por memory_usage)
   5. Manifiesto theme-manifest.json (modelo por elemento para el editor)
```

## Contrato de entrada (`theme-contract.schema.json`)

```jsonc
{
  "colors": {
    "primary":    "#8A4F3D",   // obligatorio
    "text":       "#2E2A26",   // obligatorio
    "accent":     "#B98A5E",   // obligatorio
    "background": "#FAF6F0",   // obligatorio
    "surface":    "#FFFFFF",   // opcional
    "border":     "#E5DCCF"    // opcional
  },
  "font": {                     // opcional; si se omite no se unifican fuentes
    "base": "Playfair Display",
    "heading": "Cormorant Garamond",  // opcional (títulos h1–h6)
    "fallback": "Inter"                // opcional (si la familia no existe)
  },
  "fontOptions": { "overrideProtectedFonts": true },
  "modules": [ "../Countdown/countdown-01.html" ],  // rutas relativas al request
  "container": "./test-fixtures/container.html",    // opcional
  "output": "./test-output",                         // opcional (default: theming/output)
  "dryRun": false
}
```

- **Colores**: solo se aceptan `#rgb`, `#rrggbb`, `#rrggbbaa` y `rgb()/rgba()` decimales.
  Cualquier otra cosa (nombres CSS, `url()`, `}`…) se rechaza en validación — el request
  nunca se evalúa, solo se parsea con `JSON.parse`.
- **`font.base`/`heading`**: solo letras, dígitos, espacios, guiones y apóstrofos.
- **Roles adicionales** se rechazan (`additionalProperties: false`).

## Variables reservadas (plomería temática)

| Variable | Rol | Notas |
|---|---|---|
| `--primary-color` | primary | |
| `--text-color` | text | |
| `--accent-color` | accent | |
| `--bg-color` | background | la que usan los módulos |
| `--background-color` | background | alias del ensamblador legacy |
| `--surface-color` | surface | solo si el cliente lo envía |
| `--border-color`, `--surface-border-color` | border | solo si el cliente lo envía |
| `--font-base` / `--font-heading` | — | stacks completos (family + genérica) |

**Regla de oro:** el bloque `:root` se inyecta **una sola vez** en el `<head>` del
contenedor final. Si el contenedor ya define `:root`, se **fusiona** (los valores de las
variables reservadas se reemplazan; el resto de declaraciones y variables no reservadas
se preservan). Si un **módulo** redefine localmente una variable reservada
(p. ej. `.modulo { --primary-color: #1f1f1f }`, patrón común en la KB), esa definición se
**elimina (rebind)** para que gobierne el `:root` central; el valor original queda
registrado en el manifiesto (`varRebinds`) y es revertible. Las variables reservadas no
son "estilos avanzados": son el mecanismo mismo de la tematización.

## Reglas de protección (`memory_usage`)

La protección se determina por el **ancestro más cercano** con `memory_usage`
(el propio elemento cuenta). El `<style>` de un módulo hereda la marca de su sección raíz.

| Contexto | Colores literales | `font-family` | Variables reservadas |
|---|---|---|---|
| `custom` o sin marca | se sustituyen por la variable semántica | → `var(--font-base[/heading])` | rebind |
| `protected` | **NO se tocan** | se unifican solo con `overrideProtectedFonts: true` (default) | rebind |

- Sustitución semántica: `color`→`--text-color`; `background[-color]`→`--surface-color`
  (o `--bg-color`); bordes→`--border-color` (o `--primary-color`).
- **Solo se sustituyen literales opacos** (`#333`, `rgb(1,2,3)`). Los `rgba(...)` con
  transparencia (overlays, capas) y los gradientes se **preservan**: cambiarlos rompería
  la intención de diseño.
- La unificación de fuentes en contexto `protected` responde a la exigencia explícita del
  cliente (Paso 4 del spec); cada reemplazo queda documentado con `wasProtected`/selector
  en el manifiesto. Con `overrideProtectedFonts: false` se desactiva.
- `var(--primary-color)` **como uso** nunca se toca: se resuelve centralizadamente.

## Manifiesto (`theme-manifest.json`)

Expone el modelo de datos por elemento para que el editor permita re-seleccionar Google
Font por elemento sin re-procesar:

```jsonc
{
  "theme": { "variables": { "--primary-color": "#8A4F3D", "...": "..." }, "googleFontsUrl": "..." },
  "modules": [{
    "module": "Countdown/countdown-01.html", "output": "...", "status": "ok",
    "changes": { "colorSubstitutions": 3, "fontSubstitutions": 2,
                 "protectedStyleBlocksSkipped": 1,
                 "varRebinds": [{ "var": "--primary-color", "originalValue": "#123456" }],
                 "fontReplacements": [{ "selector": ".tarjeta", "original": "Georgia, serif", "applied": "var(--font-base)" }] },
    "elements": [{ "elementId": "detalles-regalo__fixture-title", "tag": "h3",
                   "memoryKey": "fixture-title", "currentFont": "var(--font-heading)",
                   "originalFont": "'Times New Roman', serif", "wasProtected": false }]
  }],
  "summary": { "modulesOk": 3, "modulesFailed": 0, "colorSubstitutions": 14, "fontSubstitutions": 7 }
}
```

`elementId` sigue la convención del editor: `data-gemini-id` + `__` + `memory_key`.

## Uso

### CLI

```bash
node theming/apply-theme.js --input theming/example-request.json
# --output <dir> --container <file> --dry-run --strict --quiet
```

Exit codes: `0` OK · `1` fallos de módulos (o warnings con `--strict`) · `2` request inválido.

### Programático (orquestador)

`server/agentOrchestrator.js` (paso 5 de `runModularOrchestration`) ya integra
`applyPostRagTheme(html, request)` sobre el documento ensamblado, con fallback al
`applyTheme` legacy ante cualquier error. La pantalla de generación puede enviar además:
`textColor`, `accentColor`, `bgColor`, `surfaceColor`, `borderColor`, `fontBase`,
`fontHeading`; lo que no llega usa los defaults del ensamblador.

```js
import { applyPostRagTheme } from '../theming/apply-theme.js';
const { html, manifest } = await applyPostRagTheme(assembledHtml, {
  colors: { primary: '#8A4F3D', text: '#2E2A26', accent: '#B98A5E', background: '#FAF6F0' },
  font: { base: 'Playfair Display', heading: 'Cormorant Garamond' }
});
```

## Seguridad y resiliencia

- Request solo se parsea (`JSON.parse`), nunca se evalúa. Patrones estrictos para colores,
  nombres de fuente y rutas. Comentarios/`url()`/strings del CSS se enmascaran antes de
  transformar, impidiendo inyección vía contenido.
- Sin credenciales ni rutas absolutas en logs/manifiesto (rutas relativas POSIX).
- Google Fonts: fetch con timeout de 5 s (`AbortSignal.timeout`); sin red degrada a lista
  blanca local y de ahí a "asumida" (el `<link>` la resuelve el navegador). Si la API
  confirma que la familia no existe, aplica `fallback` con advertencia.
- Cada módulo se procesa en try/catch: un módulo corrupto no aborta el resto; el fallo
  queda en `manifest.modules[].status = "error"` y en el log estructurado
  (`[THEME][error] MODULE_FAILED`).
- Límites de tamaño: request 1 MB, módulo 5 MB, contenedor 8 MB.
- **Sin dependencias nuevas**: usa `linkedom` (ya en `package.json`) y `fetch` nativo.

## Pruebas

```bash
node theming/test-theme.js
```

Cubre: override centralizado + fusión de `:root`, módulo var-driven intacto,
sustitución de literales en `custom`, protección de bloques `protected`, rebinds,
unificación tipográfica, rechazo de entradas maliciosas, resiliencia ante módulos
inexistentes, idempotencia del re-theming y smoke del CLI. Salidas de inspección en
`theming/test-output/`.

## Decisiones y límites conocidos

- `--secondary-color` y otras variables semánticas locales de módulos (p. ej.
  `--overlay-color`) **no** son reservadas: se preservan (no hay rol del cliente que las
  reemplace de forma segura).
- El shorthand `font:` (fuente+tamano en una declaración) no se unifica; solo `font-family`.
- La sustitución de color en shorthands `border` se hace por token: solo literales opacos.
- La serialización pasa por linkedom: puede normalizarse cosméticamente el HTML (comillas,
  barras de auto-cierre), nunca el contenido de los `<style>` protegidos.
