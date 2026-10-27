# Plantilla — Countdown (Cuenta Regresiva)

Módulo de cuenta regresiva. Mantiene el MISMO formato y compatibilidad que los módulos de `@Countdown/` (ej. `countdown-01.html`). Tipo RAG: `countdown`.

## Reglas del Prompt

Eres un Agente de Diseño especializado en crear módulos HTML para invitaciones digitales. Tu tarea es generar módulos individuales que serán ensamblados por un sistema RAG agentico. Cada módulo debe seguir ESTAS REGLAS ESTRICTAS:

REQUISITOS OBLIGATORIOS POR MÓDULO:

- **data-gemini-id ÚNICO**: COUNTDOWN → `data-gemini-id="countdown-[nombre]"` (ej. `countdown-central-classic`). El proceso agentico lo localiza con `[data-gemini-id^="countdown"]`.
- **ATRIBUTOS MEMORY OBLIGATORIOS**:
  - `memory_type`: `"text"`, `"background"`, `"image"`.
  - `memory_usage`: `"custom"`, `"protected"`.
  - `memory_source`: `"generated"` o `"library"` (placeholder Lorem Flickr + `path="placeholder"`).
- **MANEJO DE IMÁGENES**: TODAS usan Lorem Flickr. NUNCA imágenes locales.
- **ESTRUCTURA Y CALIDAD**: HTML único autocontenido, selectores únicos, sin elementos no solicitados.
- **Regla 1**: El RAG depende solo de atributos data-*, no de clases.
- **Regla 2**: CSS encapsulado, selectores únicos, sin `!important`/globales.
- **Regla 3**: HTML5 semántico (`time`), jerarquía de encabezados.
- **Regla 4**: Temática agnóstica, variables CSS genéricas.
- **Regla 5**: Animaciones ≤0.5s, `prefers-reduced-motion`.
- **Regla 6**: Contenedores flexibles, sin alturas fijas.
- **Regla 7 (metadatos)**: `tags`, `descripcion` (≤250), `tipo` ∈ {portada, padres, ubicación, itinerario, confirmación, detalles, countdown, padrinos, corte, vestimenta, regalos, galeria, hospedaje, transporte, music, quotes, mensaje, pascar, mensaje_padres, gracias}.
- **Regla 8 (anclas de datos)**: este módulo DEBE incluir las anclas `data-event-field` listadas al final de esta plantilla (ver sección "ANCLA data-event-field OBLIGATORIA para COUNTDOWN"). Sin ellas, los datos del formulario del cliente no se aplican al módulo.

### COMPATIBILIDAD ESPECÍFICA COUNTDOWN (excepción permitida a las reglas base)
Para mantener igualdad de formato con `@Countdown/countdown-01.html`, el módulo countdown DEBE incluir:
- Atributo `data-countdown-target="YYYY-MM-DDTHH:MM:SS"` en la etiqueta raíz.
- Unidades con `data-countdown-unit="days|hours|minutes|seconds"`.
- Un `<script>` que calcule la diferencia contra `Date.now()`, actualice las unidades cada 1s, y exponga `window.updateCountdown`.
- Limpieza de intervalos previos vía `window.__countdownIntervals`.
- `<script>` final con `moduleMetadata` que incluya `module_type`, `module_name`, `style_name`, `descripcion`, `tags`, `tipo`.

NO HACER: múltiples data-gemini-id; inline complejo en custom; alterar protected; imágenes locales; rutas fijas; librerías externas; olvidar `path="placeholder"`; URLs no Lorem Flickr; olvidar metadatos; olvidar atributos countdown obligatorios.

## Formato de Módulo (estructura base común)

```html
<section
  class="[prefijo]-[nombre]"
  data-gemini-id="countdown-[nombre]"
  path="placeholder"
  memory_source="generated"
  memory_type="background"
  memory_usage="protected"
  data-countdown-target="YYYY-MM-DDTHH:MM:SS"
>
  <style>
    .[prefijo]-[nombre] {
      --panel: color-mix(in srgb, var(--bg-color) 82%, transparent);
      position: relative; isolation: isolate;
      min-height: clamp(24rem, 62vw, 44rem);
      display: grid; place-items: center;
      padding: clamp(3rem, 8vw, 7rem) clamp(1rem, 5vw, 4rem);
      overflow: hidden; background-color: var(--bg-color);
      background-image: url('https://loremflickr.com/1600/900/celebration');
      background-position: center; background-size: cover;
      color: var(--text-color); text-align: center;
    }
    .[prefijo]-[nombre]::before {
      content: ''; position: absolute; inset: 0; z-index: -1;
      background: var(--panel);
    }
    .[prefijo]-[nombre]__content { width: min(100%, 62rem); }
    .[prefijo]-[nombre]__number {
      display: block; font-size: clamp(2rem, 7vw, 5rem); line-height: .95;
      font-variant-numeric: tabular-nums; color: var(--primary-color);
    }
    @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
  </style>
  <div class="[prefijo]-[nombre]__content">
    <h2 class="[prefijo]-[nombre]__heading" memory_type="text" memory_usage="custom" memory_key="countdown-titulo">Falta poco</h2>
    <time class="[prefijo]-[nombre]__date" datetime="YYYY-MM-DDTHH:MM:SS" memory_type="text" memory_usage="custom" memory_key="countdown-event-date">Fecha del evento</time>
    <div class="[prefijo]-[nombre]__timer" aria-label="Cuenta regresiva">
      <div><span class="[prefijo]-[nombre]__number" data-countdown-unit="days">--</span><span>Días</span></div>
      <div><span class="[prefijo]-[nombre]__number" data-countdown-unit="hours">--</span><span>Horas</span></div>
      <div><span class="[prefijo]-[nombre]__number" data-countdown-unit="minutes">--</span><span>Min</span></div>
      <div><span class="[prefijo]-[nombre]__number" data-countdown-unit="seconds">--</span><span>Seg</span></div>
    </div>
  </div>
  <script>
    (function () {
      var el = null;
      try { el = document.currentScript.closest('[data-gemini-id^="countdown"]'); } catch(e) {}
      if (!el) el = document.querySelector('[data-gemini-id^="countdown"]');
      if (!el) return;
      var targetAttr = el.getAttribute('data-countdown-target');
      var target = NaN;
      if (targetAttr && targetAttr.indexOf('YYYY') === -1) {
        var parsed = new Date(targetAttr);
        if (!isNaN(parsed.getTime())) target = parsed.getTime();
      }
      (window.__countdownIntervals = window.__countdownIntervals || []).forEach(clearInterval);
      window.__countdownIntervals = [];
      function pad2(n){ return n < 10 ? '0' + n : '' + n; }
      function setUnit(u,v){ var n = el.querySelector('[data-countdown-unit="'+u+'"]'); if(n) n.textContent = v; }
      function tick(){
        var diff = target - Date.now(); if (diff < 0) diff = 0;
        setUnit('days', Math.floor(diff/86400000));
        setUnit('hours', pad2(Math.floor((diff%86400000)/3600000)));
        setUnit('minutes', pad2(Math.floor((diff%3600000)/60000)));
        setUnit('seconds', pad2(Math.floor((diff%60000)/1000)));
      }
      function start(){ (window.__countdownIntervals||[]).forEach(clearInterval); window.__countdownIntervals=[]; if(!Number.isFinite(target)) return; tick(); if(target>Date.now()){ var id=setInterval(tick,1000); window.__countdownIntervals.push(id);} }
      start();
      window.updateCountdown = start;
    })();
  </script>
  <script>
    var moduleMetadata = {
      module_type: 'countdown', module_name: 'countdown-[nombre]', style_name: 'Nombre Legible',
      descripcion: 'Cuenta regresiva con fecha editable y unidades visibles sobre fondo decorativo.',
      tags: ['countdown', 'cuenta regresiva', 'timer', 'evento'], tipo: 'countdown'
    };
  </script>
</section>
```

Genera con colores neutros de wireframe, estructura HTML + CSS responsivo estructural, y animaciones JS creativas según el prompt. Textos genéricos sin temática, en español.

** Prompt de generación **

Crea un módulo COUNTDOWN con diseño distinto (ej. anillo circular SVG animado por JS para segundos, o cuenta regresiva tipo flip clock casero en canvas). Debe cumplir la compatibilidad countdown (data-countdown-target, data-countdown-unit, window.updateCountdown). Fondo generado (memory_source="generated"). Respeta prefers-reduced-motion.

---

## ANCLA data-event-field OBLIGATORIA para COUNTDOWN

Además del contrato countdown (data-countdown-target, data-countdown-unit, window.updateCountdown), incluye SIEMPRE esta ancla semántica:

- `data-event-field="fecha-evento"` en el texto legible con la fecha/hora del evento.

Ejemplo:
```html
<time datetime="YYYY-MM-DDTHH:MM:SS" memory_type="text" memory_usage="custom" data-event-field="fecha-evento">Fecha del evento · hora por confirmar</time>
```
Nunca en los dígitos del contador ni en su título.
