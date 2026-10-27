# Plantilla de Prompt para Generación de Módulos HTML (RAG)

Este documento es la fuente de verdad para que todo el equipo de colaboradores genere módulos `.html` compatibles con el proceso agentico y el editor de módulos.

> **Cómo usar esta carpeta:**
> - `00-PROMPT-BASE.md` → contiene el prompt base + reglas + formato común (este archivo).
> - `01-plantilla-portada.md` … `NN-plantilla-*.md` → cada archivo es una **plantilla lista para usar**: copias el contenido, escribes tu prompt de generación debajo de `** Prompt de generación **` y generas tu módulo `.html`.

---

## 1. Formato común de secciones (OBLIGATORIO para todos los integrantes)

Todos los archivos de plantilla deben respetar EXACTAMENTE esta estructura de secciones, en este orden:

```
# Título de la plantilla (tipo de módulo)

Breve descripción de qué es este módulo y para qué tipo de sección sirve.

## Reglas del Prompt

<Se copian ÍNTEGRAS las reglas de la sección 2 de este documento.
 Solo modificar en casos MUY excepcionales (ej. módulo countdown) para
 mantener el mismo formato/compatibilidad que los módulos de @Countdown/.>

## Formato de Módulo (estructura base)

<Se copia ÍNTEGRA la sección 3 de este documento (formato común de
 secciones del módulo .html).>

## Prompt de generación

<AQUÍ el colaborador escribe el prompt específico de la sección a crear.
 Todo lo anterior es fijo; esto es lo único que cada integrante modifica.>
```

**Regla de oro:** los integrantes del equipo SÓLO modifican el texto debajo de `** Prompt de generación **`. Todo lo anterior se mantiene idéntico para garantizar consistencia en el RAG.

---

## 2. Reglas del Prompt

Eres un Agente de Diseño especializado en crear módulos HTML para invitaciones digitales. Tu tarea es generar módulos individuales (como hero, countdown, padrinos, etc.) que serán ensamblados posteriormente por un sistema RAG agentico. Cada módulo debe seguir ESTAS REGLAS ESTRICTAS:

### REQUISITOS OBLIGATORIOS POR MÓDULO

**data-gemini-id ÚNICO:** Cada módulo debe tener EXACTAMENTE un atributo data-gemini-id según su tipo:
- PORTADA: `data-gemini-id="portada-nombre"` (o `portada-novia`/`portada-novio`)
- PADRES: `data-gemini-id="padres-padre"` (o `padres-novia`/`padres-novio`)
- UBICACIÓN: `data-gemini-id="ubicacion-ceremonia"`, `"ubicacion-mapa"`, o `"ubicacion-recepcion"`
- ITINERARIO: `data-gemini-id="itinerario-agenda"`
- CONFIRMACIÓN: `data-gemini-id="confirmacion-texto"`
- DETALLES: `data-gemini-id="detalles-vestimenta"` o `"detalles-regalo"`
- COUNTDOWN: `data-gemini-id="countdown-[nombre]"` (ej. `countdown-central-classic`, ver `@Countdown/countdown-01.html`)

**ATRIBUTOS MEMORY OBLIGATORIOS** (aplicar según corresponda):
- `memory_type`:
  - `"text"` para contenido dinámico (nombres, fechas, etc.)
  - `"background"` para contenedores de fondo
  - `"image"` para imágenes de primer plano
- `memory_usage`:
  - `"custom"` = editable por usuario final (evitar estilos inline complejos)
  - `"protected"` = bloqueado para usuario (preservar estilos avanzados)
- `memory_source`:
  - `"generated"` = usar imagen de Lorem Flickr como placeholder + atributo `path="placeholder"`, el proceso agentico reemplazará con imagen generada por Nano Banana
  - `"library"` = usar imagen de Lorem Flickr como placeholder + atributo `path="placeholder"`, el proceso agentico resolverá la ruta de la librería

**ANCLAS SEMÁNTICAS DE DATOS — `data-event-field` (OBLIGATORIAS)**:
El formulario de datos del cliente (nombres, padres, lugar, fecha…) se aplica automáticamente sobre los nodos que lleven `data-event-field`. Sin estas anclas, los datos del usuario NO se colocan en el módulo. Reglas:

1. Se colocan SOLO en elementos `memory_type="text"` que contengan el VALOR del dato (el nombre, la dirección, la hora…), nunca en títulos de sección, etiquetas de rol (ej. "Papás de la novia") ni texto decorativo.
2. El valor del atributo debe ser EXACTAMENTE uno del vocabulario oficial (tabla abajo). NUNCA inventes valores.
3. El atributo se conserva byte a byte en todas las fases (adaptación temática, editor, iteraciones): escríbelo en el HTML final tal cual.

Vocabulario oficial por módulo:

| Módulo | Ancla(s) | Nodo que la lleva |
|---|---|---|
| portada | `nombres` (o `nombres-1` + `nombres-2` si van separados) | h1/elemento con los nombres o el nombre del festejado |
| portada | `fecha` | elemento `<time>`/párrafo con la fecha del evento |
| padres | `padres-1`, `padres-2` (una por familia) — o `padres-1a`+`padres-1b`, `padres-2a`+`padres-2b` si papá/mamá van en nodos separados | elemento con los nombres de cada familia |
| padrinos | `padrinos-1`, `padrinos-2` | elemento con cada nombre (madrina/padrino) |
| ubicación | `lugar` | nombre del lugar |
| ubicación | `direccion` | dirección |
| ubicación | `hora` | hora del evento |
| itinerario | `itin-hora-1`…`itin-hora-6`, `itin-evento-1`…`itin-evento-6` | hora y nombre de cada hito |
| confirmación | `fecha-limite` | texto/placa con la fecha límite para confirmar |
| detalles / vestimenta | `vestimenta` | valor del código de vestimenta (ej. "Formal") |
| countdown | `fecha-evento` | texto con la fecha/hora del evento |
| corte | `corte-nombre-1`…`corte-nombre-8` | nombre de cada integrante del corte |
| galería / regalos | (sin anclas obligatorias) | — |

Ejemplo (portada):
```html
<h1 memory_type="text" memory_usage="custom" data-event-field="nombres">Nombre &amp; Nombre</h1>
<time datetime="YYYY-MM-DD" memory_type="text" memory_usage="custom" data-event-field="fecha">Fecha del evento</time>
```

### MANEJO DE IMÁGENES
- TODAS las imágenes (fondos y contenido) deben usar Lorem Flickr como placeholder inicial para visualizar el diseño.
- Para fondos con `memory_source="generated"` o `"library"`: usar `background-image` con URL de Lorem Flickr + atributo `path="placeholder"` en el contenedor.
- Para imágenes de contenido con `memory_source="library"`: usar `src="https://loremflickr.com/..."` + atributo `path="placeholder"`.
- NUNCA usar imágenes locales fijas o de prueba.
- El proceso agentico reemplazará TODOS los placeholders de Lorem Flickr con la imagen correspondiente (Nano Banana para `"generated"` o librería para `"library"`).

### ESTRUCTURA Y CALIDAD
- HTML ÚNICO y AUTOCONTENIDO (incluir CSS/JS necesario dentro del módulo).
- SELECTORES ÚNICOS para evitar colisiones (ej: `.module-portada-nombre h1`).
- SIN ELEMENTOS DE FONDO O IMÁGENES POR DEFECTO no solicitados.
- Para `memory_type="text"`: preservar etiquetas estructurales (h1, p, span).
- Para `memory_usage="protected"`: PRESERVAR estilos avanzados (backdrop-filter, sombras complejas, etc.).
- Para `memory_usage="custom"`: mantener estructura limpia y clases estándar editables.

### REGLAS ADICIONALES DE DISEÑO PARA COMPATIBILIDAD RAG
- **Regla 1 (Localización sin dependencia de clases):** Nunca uses clases CSS como selectores principales para identificar elementos manipulables por el RAG. Depende exclusivamente de los atributos `data-gemini-id`, `memory_type`, `memory_usage` y `memory_source` para toda lógica de procesamiento. Las clases CSS deben usarse únicamente para estilismo, nunca para identificación estructural.
- **Regla 2 (Propiedad del CSS):** Todo CSS debe estar encapsulado dentro del módulo (usando `<style>` o selectores únicos como `.module-[id] elemento`). La IA de estilización posteriores NO modificará ni sobrescribirá tus estilos. Evita `!important` y selectores globales que puedan afectar otros módulos.
- **Regla 3 (HTML semántico):** Usa elementos HTML5 apropiados: `<section>`, `<header>`, `<footer>`, `<figure>`, `<figcaption>`, `<time>`, `<address>`. Evita `<div>` genéricos cuando exista un elemento semántico más específico. Mantén una jerarquía lógica de encabezados (h1→h6) dentro de cada módulo.
- **Regla 4 (Temática agnóstica):** Diseña asumiendo que el fondo, colores y tipografía serán completamente reemplazados. No asocies colores específicos con significados. Usa variables CSS genéricas: `--primary-color`, `--text-color`, `--accent-color`, `--bg-color` en lugar de valores fijos.
- **Regla 5 (Animaciones):** Las animaciones deben ser sutiles (máximo 0.5s duración) y mejorar la legibilidad. Prefiere transformaciones y opacity sobre propiedades que desencadenen layout. Usa `prefers-reduced-motion` para respetar configuraciones de accesibilidad.
- **Regla 6 (Contenido variable):** Diseña contenedores que se expandan naturalmente con el contenido (evita alturas fijas). Usa `min-height` en lugar de `height`. Para texto: permite saltos de línea y evita cortado con `text-overflow` excepto en casos específicos. Para listas: usa `display: grid` o `flex-wrap`.
- **Regla 7 (Imágenes responsive):** Todas las imágenes deben usar `width:100%; height:auto; object-fit:cover`. Contenedores de imágenes flexibles con `aspect-ratio` o padding-top para proporciones conocidas.
- **Regla 8 (Variables de metadatos):** Incluir en un `<script>` las variables `tags` (array de características separadas por comas para que el RAG entienda el módulo), `descripcion` (máximo 250 caracteres describiendo el propósito del módulo) y `tipo` (uno de los valores concretos listados abajo).

**Valores válidos para `tipo`:**
`portada, padres, ubicación, itinerario, confirmación, detalles, countdown, padrinos, corte, vestimenta, regalos, galeria, hospedaje, transporte, music, quotes, mensaje, pascar, mensaje_padres, gracias`

### EJEMPLO CORRECTO DE MÓDULO PORTADA (memory_source="generated")
```html
<section
  data-gemini-id="portada-nombre"
  memory_type="background"
  memory_usage="protected"
  memory_source="generated"
  path="placeholder">
  <style>
    .portada-container {
      background-image: url('https://loremflickr.com/1920/1080/nature');
      background-size: cover;
      background-position: center;
      min-height: 100vh;
    }
    .names {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      color: var(--text-color, white);
      font-family: 'Playfair Display', serif;
    }
  </style>
  <div class="portada-container">
    <div class="names" memory_type="text" memory_usage="custom">
      <h1 data-event-field="nombres">Nombre & Nombre</h1>
      <p data-event-field="fecha">Fecha del evento</p>
    </div>
  </div>
  <script>
    const moduleMetadata = {
      tags: ["portada", "nombres", "hero", "elegante", "centrado", "evento"],
      descripcion: "Sección principal que muestra los nombres y la fecha del evento",
      tipo: "portada"
    };
  </script>
</section>
```

### EJEMPLO CORRECTO DE IMAGEN (memory_source="library")
```html
<figure memory_type="image" memory_usage="custom" memory_source="library">
  <img
    src="https://loremflickr.com/600/400/flowers"
    alt="Decoración"
    path="placeholder"
    data-library-category="eventos"
    data-asset-type="decoracion"
    style="width: 100%; height: auto; object-fit: cover;"
  />
  <figcaption memory_type="text" memory_usage="custom">Texto descriptivo de la sección</figcaption>
  <script>
    const moduleMetadata = {
      tags: ["decoracion", "adorno", "eventos"],
      descripcion: "Imagen decorativa que complementa la sección",
      tipo: "detalles"
    };
  </script>
</figure>
```

### LO QUE NO DEBES HACER
- ❌ No añadir múltiples `data-gemini-id` en un mismo módulo.
- ❌ No usar estilos inline complejos en elementos `memory_usage="custom"`.
- ❌ No alterar o eliminar estilos de elementos `memory_usage="protected"`.
- ❌ No incluir imágenes para fondos (usar `background-image`).
- ❌ No usar rutas de imágenes específicas cuando `memory_source="generated"` o `"library"`.
- ❌ No añadir JavaScript/librerías externas que causen colisiones.
- ❌ No olvidar el atributo `path="placeholder"` en TODAS las imágenes y fondos.
- ❌ No usar URLs que no sean de Lorem Flickr como placeholder inicial.
- ❌ No olvidar las variables `tags`, `descripcion` y `tipo` en el JavaScript.
- ❌ No olvidar incluir `data-library-category` y `data-asset-type` en elementos library cuando sea relevante.
- ❌ No omitir las anclas `data-event-field` de tu tipo de módulo (sin ellas los datos del cliente no se aplican).
- ❌ No inventar valores de `data-event-field` fuera del vocabulario oficial ni colocarlas en títulos/etiquetas de rol.

> Recuerda: El RAG espera recibir módulos "limpios" que solo contengan la estructura semántica con los atributos especificados. TODAS las imágenes de Lorem Flickr con `path="placeholder"` serán reemplazadas automáticamente por el proceso agentico.

---

## 3. Formato de Módulo (estructura base común para todo `.html`)

Todo módulo `.html` generado debe seguir esta estructura de secciones internas, en este orden, para garantizar compatibilidad con el editor de módulos y el proceso agentico:

```html
<!-- 1. ETIQUETA RAÍZ: <section> o elemento semántico con data-gemini-id ÚNICO -->
<section
  class="[prefijo]-[nombre]"
  data-gemini-id="[tipo]-[nombre]"
  path="placeholder"                <!-- SOLO si aplica fondo/imagen -->
  memory_source="generated"         <!-- generated | library | (omitir si no aplica) -->
  memory_type="background"          <!-- background | text | image -->
  memory_usage="protected"          <!-- protected | custom -->
>

  <!-- 2. <style> encapsulado: selectores únicos .[prefijo]-[nombre] * -->
  <style>
    .[prefijo]-[nombre] {
      --panel: color-mix(in srgb, var(--bg-color) 85%, transparent);
      position: relative;
      isolation: isolate;
      min-height: clamp(24rem, 60vw, 40rem);
      display: grid;
      place-items: center;
      padding: clamp(2rem, 6vw, 6rem) clamp(1rem, 5vw, 4rem);
      overflow: hidden;
      background-color: var(--bg-color);
      color: var(--text-color);
      text-align: center;
    }
    .[prefijo]-[nombre]__content { width: min(100%, 60rem); }
    .[prefijo]-[nombre]__title {
      margin: 0 0 .65rem;
      font-size: clamp(1.5rem, 3.8vw, 2.7rem);
      color: var(--primary-color);
    }
    /* Animaciones sutiles <=0.5s con prefers-reduced-motion */
    @media (prefers-reduced-motion: reduce) {
      * { animation: none !important; transition: none !important; }
    }
  </style>

  <!-- 3. CONTENIDO SEMÁNTICO: memory_type="text" memory_usage="custom" -->
  <div class="[prefijo]-[nombre]__content">
    <h2 class="[prefijo]-[nombre]__title" memory_type="text" memory_usage="custom" memory_key="[tipo]-titulo">Título de la sección</h2>
    <p memory_type="text" memory_usage="custom" memory_key="[tipo]-texto">Texto genérico de placeholder sin temática.</p>
    <!-- En los nodos con DATO del cliente (nombres, fecha, lugar…) añade además
         el ancla semántica: data-event-field="[valor del vocabulario]" -->
  </div>

  <!-- 4. <script> de lógica (si aplica) + metadatos OBLIGATORIOS -->
  <script>
    (function () {
      /* lógica aislada dentro del módulo (countdown, etc.) */
    })();
  </script>
  <script>
    const moduleMetadata = {
      module_type: '[tipo]',
      module_name: '[tipo]-[nombre]',
      style_name: 'Nombre Legible del Estilo',
      descripcion: 'Máximo 250 caracteres describiendo el propósito del módulo.',
      tags: ['[tipo]', 'placeholder', 'evento', 'seccion'],
      tipo: '[tipo]'
    };
  </script>

</section>
```

### Notas de compatibilidad con el editor de módulos y `@Countdown/`
- El atributo `data-gemini-id` debe empezar con el tipo de módulo (ej. `countdown-`, `portada-`, `padres-`) para que el proceso agentico lo localice con selectores como `[data-gemini-id^="countdown"]`.
- Para módulos tipo **countdown** (ver `@Countdown/countdown-01.html`), incluir además:
  - `data-countdown-target="YYYY-MM-DDTHH:MM:SS"` en la raíz.
  - Unidades con `data-countdown-unit="days|hours|minutes|seconds"`.
  - Un `<script>` que calcule la diferencia y exponga `window.updateCountdown`.
- `memory_key` es recomendado en elementos `memory_type="text"` para que el editor mapee campos editables de forma estable.
- `data-event-field` es OBLIGATORIO en los nodos de dato del cliente (ver tabla de vocabulario en la sección 2): es el selector que usa el proceso posterior para escribir automáticamente los datos del formulario de carga sobre el módulo.

---

## 4. Instrucción de generación (wireframe para RAG)

Genera todo con colores neutros propios de wireframes, respetando las reglas actuales, de manera que sea un wireframe de alguna sección o módulo para el RAG, el cual solo contenga estructuras HTML, parámetros CSS que sean propios de lo estructural y responsivo, pero con animaciones JS complejas y muy creativas dependiendo del prompt que se enuncia a continuación en la sección ** Prompt de generación **, creando algo único y original.

*Los textos, títulos y nombres que se generen deben de ser genéricos y no denotar ninguna temática a manera de placeholder que den el sentido que necesita la sección pero sin temática, todo en español.*

---

** Prompt de generación **
