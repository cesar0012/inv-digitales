/**
 * ============================================================================
 * MODULE GENERATOR — proceso agéntico de generación de módulos de producción
 * ============================================================================
 * Independiente del orquestador de invitaciones: no toca ningún proceso
 * existente. Diseñado para "obligar" a cualquier LLM (gratis, rotado) a
 * producir módulos de calidad de producción mediante un pipeline de 3 fases
 * con validación determinista y critic loop:
 *
 *   1. BRIEF CREATIVO: semillas ALEATORIAS servidas por el servidor (estética,
 *      layout, técnica, firma visual) que un LLM convierte en un brief JSON.
 *      La aleatoriedad vive acá: dos generaciones del mismo tipo nunca salen
 *      iguales aunque el modelo repita patrones.
 *   2. GENERACIÓN: prompt de sistema ESTRICTO por tipo de módulo (contrato del
 *      00-PROMPT-BASE + requisitos específicos: data-gemini-id válido, atributos
 *      memory_*, API de countdown, variables CSS genéricas, etc.).
 *   3. VALIDACIÓN + CRITIC LOOP: ragModuleValidator + sandbox propio; si falla,
 *      se reintenta inyectando el feedback de errores y EXCLUYENDO al modelo
 *      anterior de la misión (diversidad + segunda opinión de otro LLM).
 *
 * El LLM se elige y rota con server/llmRotator.js (misión por generación).
 */
import { validateModule, extractModuleMetadata, VALID_MODULE_IDS } from './ragModuleValidator.js';
import { createMission, createConfiguredMission, isPremiumConfigured } from './llmRotator.js';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MAX_ATTEMPTS = 4;

// Ejemplo canónico del contrato: un módulo REAL de la KB (Countdown/countdown-01)
// que cumple todo el validador. Los LLMs flojos generan MUCHO mejor con un
// ejemplo few-shot que con 20 reglas escritas.
let _canonicalExample = null;
function getCanonicalExample() {
  if (_canonicalExample !== null) return _canonicalExample;
  const p = join(__dirname, '..', 'Countdown', 'countdown-01.html');
  try {
    _canonicalExample = existsSync(p) ? readFileSync(p, 'utf-8') : '';
  } catch {
    _canonicalExample = '';
  }
  return _canonicalExample;
}

// ----------------------------------------------------------------------------
// Semillas creativas (aleatoriedad servida, no dependiente del modelo)
// ----------------------------------------------------------------------------
const AESTHETICS = [
  'editorial de revista de moda', 'art déco luminoso', 'minimalismo japonés (ma y wabi-sabi)',
  'romántico etéreo con veladuras', 'boho cálido con texturas artesanales', 'brutalista elegante de alto contraste',
  'botánico científico vintage', 'cinematográfico con luz dorada', 'celestial nocturno con polvo de estrellas',
  'mediterráneo fresco con cal y terracota', 'vintage años 50 con serigrafía', 'futurista suave con degradados auróra',
  'rústico refinado con lino y madera', 'acuarela orgánica difuminada', 'geometría bauhaus juguetona',
  'preppy clásico con marcos finos', 'tropical chic de resort', 'gótico delicado con filigrana'
];
const LAYOUTS = [
  'composición central simétrica y solemne', 'asimétrica editorial en diagonal', 'tarjeta flotante sobre fondo amplio',
  'franja horizontal con ritmo de columnas', 'escalonado en zigzag descendente', 'marco doble con esquinas ornamentadas',
  'lienzo completo con tipografía protagonista', 'collage superpuesto con capas', 'timeline vertical con hitos',
  'split-screen con dos mitades dialogantes', 'círculos concéntricos ceremoniales', 'rejilla de tarjetas intercaladas'
];
const TECHNIQUES = [
  'sombras multicapa suaves y profundidad', 'bordes con doble filete fino', 'máscaras orgánicas con clip-path',
  'degradados radiales sutiles de fondo', 'patrones repetitivos en SVG inline', 'line-art decorativo trazado a mano',
  'glassmorphism contenido (solo backdrop-filter delgado)', 'detalle tipográfico con versalitas y tracking amplio',
  'ornamentos geométricos animados', 'textura de grano fino con opacity baja'
];
const SIGNATURES = [
  'una línea divisoria que se dibuja al hacer scroll', 'números tabulares que rotan al cambiar',
  'un sello circular que gira lentamente', 'iniciales entrelazadas en monograma',
  'puntos que conectan formando una constelación', 'una cinta que ondea suavemente',
  'marcadores de sección con animación escalonada', 'un degradado que respira (hue-rotate lento)'
];
// Direcciones creativas automáticas para lotes SIN input del usuario: cada
// set recibe una distinta (con exclusión dentro del lote) para que ningún
// par de sets comparta atmósfera.
const CONCEPT_DIRECTIONS = [
  'que se sienta como una galería de arte contemporáneo, sobrio y con mucho aire',
  'con calidez artesanal, como una invitación escrita a mano sobre papel de algodón',
  'de elegancia nocturna, como una gala: terciopelo, brasa y destellos sutiles',
  'luminoso y botánico, como un invernadero al mediodía',
  'con carácter editorial de revista de arquitectura, retícula visible y tipografía protagonista',
  'romántico clásico, como una carta de otra época con sellos y filigranas',
  'modernista geométrico, círculos y líneas finas en equilibrio',
  'etéreo y minimalista, casi un susurro: mucho espacio negativo y detalle diminuto',
  'festivo refinado, confeti de lujo en pequeñas dosis doradas',
  'orgánico y terrenal, texturas de lino, barro y madera clara',
  'celestial, degradados de cielo nocturno y polvo de estrellas fino',
  'urbanista chic, como el menú de un restaurante con estrella'
];
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
/** Elige aleatorio EXCLUYENDO los ya usados en el lote (variedad forzada);
 *  si todo el pool está usado, libera y empieza de nuevo. */
function pickExcluding(arr, usedSet, label) {
  const free = arr.filter((x) => !usedSet.has(`${label}:${x}`));
  const chosen = pick(free.length > 0 ? free : arr);
  usedSet.add(`${label}:${chosen}`);
  return chosen;
}

// ----------------------------------------------------------------------------
// Contrato por tipo de módulo (adaptación estricta de Plantillas-Prompt/00-PROMPT-BASE.md)
// ----------------------------------------------------------------------------
const GENERIC_IDS = {}; // tipos con id libre "<tipo>-<nombre>"
function validIdsFor(type) {
  const ids = VALID_MODULE_IDS[type];
  if (ids) return ids;
  return null; // id libre: <tipo>-<kebab>
}

const TYPE_SPECIFICS = {
  countdown: `Requisitos COUNTDOWN: atributo data-countdown-target="YYYY-MM-DDTHH:MM:SS" en la raíz; cuatro unidades con data-countdown-unit="days|hours|minutes|seconds"; <script> autocontenido que calcula la diferencia, expone window.updateCountdown y limpia window.__countdownIntervals al iniciar.`,
  ubicacion: `Muestra ceremonia/recepción con lugar, dirección y hora como memory_type="text" custom. INCLUYE un mapa de Google Maps embebido con EXACTAMENTE este patrón (único iframe permitido):
<div class="<prefijo>__mapa" memory_type="text" memory_usage="custom" memory_key="ubicacion-mapa-url">
  <iframe src="https://www.google.com/maps?q=Ubicaci%C3%B3n+del+evento&output=embed" title="Mapa de la ubicación" loading="lazy" allowfullscreen></iframe>
</div>
El CSS del iframe: width:100%; aspect-ratio:16/9 (o 4/3); border:0; border-radius heredado del diseño. La query del mapa ("Ubicación del evento") es placeholder que el sistema reemplaza con la dirección real del cliente.`,
  itinerario: 'Lista de momentos del evento (hora + título + descripción corta) como elementos editables memory_type="text".',
  confirmacion: 'TEXTO informativo de confirmación (RSVP por enlace único); PROHIBIDO cualquier formulario, input o botón interactivo.',
  galeria: 'Rejilla de 3 a 6 imágenes de contenido memory_source="library": <img src="https://loremflickr.com/600/400/..." path="placeholder" data-library-category="eventos" data-asset-type="galeria" ...> con captions opcionales editables.',
  music: 'Lista de momentos musicales como texto editable; PROHIBIDO <audio> ni embeds externos.',
  portada: 'Hero protagonista con nombres (h1) y fecha como memory_type="text" custom; min-height generosa (clamp o svh); fondo memory_source="generated" con loremflickr.',
  padres: 'Nombres de padres/familias en bloques de texto editables, jerarquía sobria; fondo memory_source="generated" con loremflickr.',
  padrinos: 'Nombres de padrinos/madrinas en bloques de texto editables; fondo memory_source="generated" con loremflickr.',
  detalles: 'Información de vestimenta o regalos como texto editable con iconografía CSS/SVG inline; puede llevar una imagen decorativa memory_source="library".',
  gracias: 'Mensaje de cierre/agradecimiento elegante, breve y editable; fondo memory_source="generated" con loremflickr.',
  quotes: 'Cita o frase decorativa editable con composición tipográfica protagonista; fondo memory_source="generated" con loremflickr.'
};

/**
 * Fotos placeholder obligatorias por tipo (lineamiento del proceso agéntico:
 * TODO placeholder se reemplaza después — generated via Nano Banana, library
 * via /img). 'bg' = fondo loremflickr con memory_source="generated";
 * { imgs: n } = al menos n <img> loremflickr con path="placeholder".
 */
const PHOTO_REQUIREMENTS = {
  portada: { bg: true },
  countdown: { bg: true },
  padres: { bg: true },
  padrinos: { bg: true },
  gracias: { bg: true },
  quotes: { bg: true },
  confirmacion: { bg: true },
  galeria: { imgs: 3 },
  ubicacion: { mapEmbed: true }
};

/** Único iframe permitido: embed de Google Maps (módulo ubicacion). */
const GOOGLE_MAPS_EMBED_RE = /^https:\/\/(www\.google\.com|maps\.google\.com)\/maps\?/;

function buildSystemPrompt(type) {
  const ids = validIdsFor(type);
  const idRule = ids
    ? `data-gemini-id DEBE ser exactamente uno de: ${ids.map((i) => `"${i}"`).join(', ')}.`
    : `data-gemini-id DEBE empezar con "${type}-" seguido de un nombre kebab-case único y creativo.`;

  return `Eres un Diseñador Senior de módulos HTML para invitaciones digitales de PRODUCCIÓN. Generas UN módulo autocontenido que pasará un validador automático estricto: si falla algo, se rechaza.

===== CONTRATO OBLIGATORIO (verificación automática) =====
1. Raíz: <section> con ${idRule}
2. Atributos memory_* en la raíz e hijos editables:
   - memory_type="background|text|image"
   - memory_usage="protected" (estilos avanzados del contenedor) | "custom" (contenido editable)
   - memory_source="generated|library" SOLO donde aplique imagen/fondo, con path="placeholder"
3. Variables CSS GENÉRICAS para todo color/tipografía: var(--primary-color), var(--text-color), var(--accent-color), var(--bg-color), var(--secondary-color). PROHIBIDO fijar paletas literales de marca: el sistema las tematiza después.
4. FOTOS PLACEHOLDER (obligatorio según tipo — después el sistema las reemplaza por las reales):
   - Fondos: en el <style>, background-image: url('https://loremflickr.com/1600/900/...') sobre loremflickr.com, con memory_source="generated" y path="placeholder" en la raíz.
   - Imágenes de contenido: <img src="https://loremflickr.com/600/400/..." path="placeholder" data-library-category="..." data-asset-type="..." /> con memory_source="library" en el contenedor.
   - NUNCA rutas locales, data: URIs, ni otros dominios de imágenes.
5. ÚNICO iframe permitido: el embed de Google Maps del módulo ubicacion (patrón de los requisitos específicos). Cualquier otro iframe/embed está PROHIBIDO.
6. Autocontenido: todo CSS en <style> interno con selectores únicos prefijados; <script> opcional aislado (IIFE). PROHIBIDO: <script src>, <link>, frameworks externos, fetch/XHR, localStorage, eval, document.cookie.
7. RESPONSIVE OBLIGATORIO (verificación automática): tipografía con clamp(), espaciados con clamp() o variables, layout con grid o flex, al menos un @media de ajuste móvil, imágenes/fluid con aspect-ratio o width:100%. El módulo debe verse impecable a 390px, 768px y 1280px.
8. Estructura semántica HTML5 (section/header/figure/time/figcaption), animaciones ≤0.5s con @media (prefers-reduced-motion: reduce).
9. Metadatos OBLIGATORIOS al final: <script> var moduleMetadata = { module_type: '${type}', module_name: '<data-gemini-id>', style_name: '<Nombre Legible del Estilo>', descripcion: '<≤250 chars, propósito del módulo>', tags: ['${type}', ...5-8 tags útiles para RAG], tipo: '${type}' }; </script>
${TYPE_SPECIFICS[type] ? `\n===== REQUISITOS ESPECÍFICOS ${type.toUpperCase()} =====\n${TYPE_SPECIFICS[type]}` : ''}

===== CALIDAD DE PRODUCCIÓN (un crítico automático puntuará esto) =====
- Composición intencional: jerarquía clara, ritmo, espacio negativo generoso.
- Detalle artesanal: ornamentos CSS/SVG inline, tipografía cuidada, estados hover sutiles, esquinas y sombras coherentes.
- Textos placeholder en ESPAÑOL, genéricos (sin temática de evento concreto: "Nombre de los Novios", "Fecha del evento").
- Temática AGNÓSTICA: colores/tipografía serán reemplazados por el sistema de tematización.

SALIDA: SOLO el HTML del módulo (de <section> a </section> incluyendo los <script>). Sin markdown, sin explicaciones.`;
}

// ----------------------------------------------------------------------------
// Validación determinista propia (suma la del ragModuleValidator + sandbox)
// ----------------------------------------------------------------------------
const SANDBOX_RULES = [
  [/<script[^>]+src=/i, 'prohibido <script src> (debe ser autocontenido)'],
  [/<link[\s>]/i, 'prohibido <link> externo'],
  [/\bfetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|document\.cookie|\beval\s*\(/i, 'prohibido fetch/storage/eval (módulo estático y aislado)'],
  [/https?:\/\/(?!loremflickr\.com)[^"'\s)]+\.(png|jpe?g|webp|gif|svg)/i, 'imágenes solo de loremflickr.com (placeholder)'],
  [/https?:\/\/(?!loremflickr\.com|fonts\.gstatic|fonts\.googleapis)[a-z0-9.-]+\/[^"'\s)]*\.(woff2?|ttf)/i, 'fuentes web externas prohibidas (usa familias del sistema en el wireframe)']
];

export function validateGeneratedModule(html, type) {
  const errors = [];
  if (!html || !/<section[\s>]/i.test(html)) {
    return { valid: false, errors: ['el output no contiene <section>'] };
  }
  // Validador canónico del RAG
  const canonical = validateModule(html);
  if (canonical && Array.isArray(canonical.errors)) errors.push(...canonical.errors);
  if (canonical && Array.isArray(canonical.warnings)) {
    // warnings críticos que tratamos como error de producción
    for (const w of canonical.warnings) {
      if (/memory_|data-gemini-id|moduleMetadata/i.test(w)) errors.push(w);
    }
  }
  // Sandbox propio
  for (const [re, msg] of SANDBOX_RULES) {
    if (re.test(html)) errors.push(msg);
  }
  // iframes: SOLO embeds de Google Maps permitidos (módulo ubicacion)
  for (const m of html.matchAll(/<iframe[^>]+src=["']([^"']+)["']/gi)) {
    if (!GOOGLE_MAPS_EMBED_RE.test(m[1])) {
      errors.push('iframe prohibido: solo se permite el embed de Google Maps (https://www.google.com/maps?q=...&output=embed)');
    }
  }
  // data-gemini-id correcto por tipo
  const ids = validIdsFor(type);
  const idMatch = html.match(/data-gemini-id="([^"]+)"/);
  if (!idMatch) errors.push('falta data-gemini-id en la raíz');
  else if (ids && !ids.includes(idMatch[1])) errors.push(`data-gemini-id "${idMatch[1]}" inválido para ${type}: debe ser uno de ${ids.join(', ')}`);
  else if (!ids && !idMatch[1].startsWith(`${type}-`)) errors.push(`data-gemini-id debe empezar con "${type}-"`);
  // Variables genéricas presentes (tematización)
  if (!/var\(--(text|primary|accent|bg)-color/.test(html)) {
    errors.push('no usa variables CSS genéricas (--text-color/--primary-color/--accent-color/--bg-color): el sistema de tematización no podrá aplicarlo');
  }
  // Responsividad verificable (el crítico exige verse bien a 390/768/1280)
  if (!/clamp\(/.test(html) || !(/@media/.test(html) || /grid|flex/.test(html))) {
    errors.push('responsivo insuficiente: se exige tipografía/espaciados con clamp() y layout grid/flex o ajustes @media');
  }
  // Fotos placeholder obligatorias por tipo (el proceso agéntico las reemplaza luego)
  const photoReq = PHOTO_REQUIREMENTS[type];
  if (photoReq) {
    if (photoReq.bg) {
      const hasBg = /url\(['"]?https?:\/\/loremflickr\.com\//i.test(html) && /memory_source="generated"/.test(html) && /path="placeholder"/.test(html);
      if (!hasBg) errors.push('falta el FONDO placeholder obligatorio: background-image url(loremflickr) + memory_source="generated" + path="placeholder" (el sistema lo reemplaza por la imagen generada)');
    }
    if (photoReq.imgs) {
      const imgs = [...html.matchAll(/<img[^>]+src=["']https?:\/\/loremflickr\.com\/[^"']+["'][^>]*path="placeholder"/gi)].length;
      if (imgs < photoReq.imgs) errors.push(`se requieren al menos ${photoReq.imgs} <img> loremflickr con path="placeholder" (library) para este tipo (encontradas: ${imgs})`);
    }
    if (photoReq.mapEmbed) {
      if (!/<iframe[^>]+src=["']https:\/\/(www\.google\.com|maps\.google\.com)\/maps\?/i.test(html)) {
        errors.push('falta el mapa de Google Maps embebido (iframe https://www.google.com/maps?q=...&output=embed)');
      }
    }
  }
  return { valid: errors.length === 0, errors: [...new Set(errors)] };
}

// ----------------------------------------------------------------------------
// Extracción del HTML del output del LLM
// ----------------------------------------------------------------------------
function extractModuleHtml(content) {
  let html = String(content || '').replace(/```html\s*/gi, '').replace(/```/g, '').trim();
  const secStart = html.search(/<section[\s>]/i);
  if (secStart >= 0) {
    const lastSection = html.toLowerCase().lastIndexOf('</section>');
    if (lastSection >= 0) {
      // Conservar TODOS los <script> posteriores al cierre (lógica del módulo
      // + moduleMetadata), no solo el primero.
      const after = html.slice(lastSection + 10);
      const scripts = [...after.matchAll(/<script[\s\S]*?<\/script>/gi)].map((m) => m[0]).join('\n');
      return html.slice(secStart, lastSection + 10) + (scripts ? `\n${scripts}` : '');
    }
  }
  return html;
}

// ----------------------------------------------------------------------------
// Fase de refinamiento: crítico por rúbrica + refinador (sube el nivel de
// cualquier LLM: puntúa el módulo contra un estándar de producción y aplica
// las mejoras; si el refinado rompe el contrato, se conserva el original).
// ----------------------------------------------------------------------------
const REFINE_SCORE_THRESHOLD = 85;

async function refineModule(mission, type, html) {
  try {
    const { content: critiqueText, modelKey: criticModel } = await mission.call({
      system: 'Eres un CRÍTICO de diseño web senior, exigente y objetivo. Respondes SOLO JSON válido.',
      prompt: `Puntúa de 0 a 100 este módulo de invitación digital (tipo ${type}) contra la RÚBRICA:
1. Composición y jerarquía visual (25 pts)
2. Responsividad real a 390/768/1280 px: clamp, grid/flex, @media (25 pts)
3. Detalle artesanal: ornamentos, tipografía, ritmo, espacio negativo (20 pts)
4. Fotos placeholder correctas según el tipo + composición con ellas (15 pts)
5. Accesibilidad y semántica (alt/aria/labels, HTML5) (15 pts)
Resta puntos por: textos que se perderían sobre el fondo, paddings pobres, tipografía plana, fotos ausentes o mal ubicadas, desorden en móvil.

MÓDULO:
${html}

Devuelve SOLO: {"score": <0-100>, "mejoras": ["mejora concreta 1", "mejora concreta 2", ...]}`,
      temperature: 0.3,
      maxTokens: 900
    });

    let critique = null;
    try {
      const jsonText = critiqueText.slice(critiqueText.indexOf('{'), critiqueText.lastIndexOf('}') + 1);
      critique = JSON.parse(jsonText);
    } catch { /* crítica ilegible: no refinamos */ }
    if (!critique || typeof critique.score !== 'number') {
      return { applied: false, critique: null, criticModel };
    }

    const needsRefine = critique.score < REFINE_SCORE_THRESHOLD || (critique.mejoras || []).length >= 2;
    if (!needsRefine) {
      return { applied: false, critique, criticModel };
    }

    const { content: refinedText, modelKey: refinerModel } = await mission.call({
      system: buildSystemPrompt(type),
      prompt: `aplica las mejoras del crítico a este módulo SIN romper el contrato (data-gemini-id, memory_*, variables CSS genéricas, placeholders loremflickr, metadatos). MÁXIMA CALIDAD DE PRODUCCIÓN.

MEJORAS DEL CRÍTICO (score actual: ${critique.score}/100):
${(critique.mejoras || []).map((x, i) => `${i + 1}. ${x}`).join('\n')}

MÓDULO ACTUAL:
${html}

Devuelve el módulo COMPLETO mejorado (SOLO HTML).`,
      temperature: 0.7,
      maxTokens: 8192
    });

    const candidate = extractModuleHtml(refinedText);
    const check = validateGeneratedModule(candidate, type);
    if (check.valid) {
      console.log(`[MODULE-GEN][${type}] ✨ refinado aplicado (score ${critique.score} → mejoras: ${(critique.mejoras || []).length})`);
      return { applied: true, critique, html: candidate, criticModel, refinerModel };
    }
    console.warn(`[MODULE-GEN][${type}] refinado inválido (se conserva el original): ${check.errors.slice(0, 2).join(' | ')}`);
    return { applied: false, critique, criticModel, refinerModel };
  } catch (e) {
    console.warn(`[MODULE-GEN][${type}] fase de refinamiento omitida: ${e.message}`);
    return { applied: false, critique: null };
  }
}
/**
 * Genera UN módulo de tipo `type` con el proceso agéntico completo.
 * @param {string} type tipo de módulo (KNOWN_MODULE_TYPES)
 * @param {{extraInstructions?: string, mission?: object, temperature?: number}} opts
 * @returns {Promise<{moduleType, html, attempts, models, validation, brief}>}
 */
export async function generateModule(type, { extraInstructions = '', mission = null, missionFactory = null, seedUsed = null, forcedSeeds = null } = {}) {
  // missionFactory permite re-crear misiones frescas si una se agota (todos
  // sus modelos muertos): la generación de un módulo NO se abandona mientras
  // quede algún modelo del catálogo por intentar.
  // Modo LLM del admin: premium (OpenAI-compatible) si está habilitado; si no,
  // rotator. Tras un agotamiento se degrada: premium → rotator (nunca rendirse).
  let degradedToRotator = false;
  const freshMission = () => (missionFactory ? missionFactory() : createConfiguredMission({ forceRotator: degradedToRotator }));
  let m = mission || freshMission();
  const models = [];
  const used = seedUsed || new Set();
  const briefSeeds = {
    estetica: pickExcluding(AESTHETICS, used, 'estetica'),
    layout: pickExcluding(LAYOUTS, used, 'layout'),
    tecnica: pickExcluding(TECHNIQUES, used, 'tecnica'),
    firma: pickExcluding(SIGNATURES, used, 'firma')
  };
  // Semillas forzadas del SET (coherencia estética dentro de una misma
  // invitación): la estética/firma del set ganan a las aleatorias.
  if (forcedSeeds) {
    for (const [k, v] of Object.entries(forcedSeeds)) {
      if (v) { briefSeeds[k] = v; used.add(`${k === 'estetica' ? 'estetica' : 'firma'}:${v}`); }
    }
  }

  // Fase 1: brief creativo (JSON corto)
  const briefPrompt = `Diseña un BRIEF creativo para un módulo de invitación digital tipo "${type}".
Semillas OBLIGATORIAS (combínalas con libertad creativa):
- Estética: ${briefSeeds.estetica}
- Layout: ${briefSeeds.layout}
- Técnica destacada: ${briefSeeds.tecnica}
- Firma visual (momento memorable): ${briefSeeds.firma}
${extraInstructions ? `Instrucciones extra del administrador (prioridad máxima): ${extraInstructions}` : ''}
Devuelve SOLO JSON: {"style_name": "...", "concepto": "1-2 frases", "paleta_neutral": "descripción de tonos neutros (no hex)", "tipografia": "carácter tipográfico", "animaciones": ["...", "..."], "ornamentos": ["..."]}
No inventes colores de marca: el sistema aplica la paleta del cliente después.`;
  const brief = { seeds: briefSeeds };
  try {
    const { content, modelKey } = await m.call({ system: 'Eres director creativo. Respondes SOLO JSON válido.', prompt: briefPrompt, temperature: 1.0, maxTokens: 1400 });
    models.push(modelKey);
    const jsonText = content.slice(content.indexOf('{'), content.lastIndexOf('}') + 1);
    Object.assign(brief, JSON.parse(jsonText));
  } catch (e) {
    console.warn(`[MODULE-GEN][${type}] brief falló (${e.message}); sigo solo con semillas`);
  }

  // Fases 2+3: generación + critic loop
  const canonical = getCanonicalExample();
  let feedback = [];
  let lastHtml = '';
  let validation = { valid: false, errors: [] };
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let content, modelKey;
    try {
      ({ content, modelKey } = await m.call({
        system: buildSystemPrompt(type),
        prompt: `Genera el módulo "${type}" siguiendo ESTE brief creativo:

${JSON.stringify(brief, null, 2)}
${canonical ? `\n===== EJEMPLO CANÓNICO DE REFERENCIA =====
Este es un módulo REAL que CUMPLE todo el contrato (estructura, atributos memory_*, variables CSS genéricas, fondo loremflickr placeholder, responsive, metadatos). Úsalo como referencia de NIVEL y ESTRUCTURA — NO lo copies: crea un diseño completamente distinto acorde al brief y al tipo "${type}".

${canonical}
===== FIN EJEMPLO =====` : ''}
${feedback.length > 0 ? `\n===== INTENTO ANTERIOR RECHAZADO — CORRIGE EXACTAMENTE ESTO =====\n${feedback.map((f, i) => `${i + 1}. ${f}`).join('\n')}\nReentrega el módulo COMPLETO corregido.` : ''}
Recuerda: SOLO HTML, temática agnóstica, textos placeholder en español, nivel producción.`.trim(),
        temperature: 0.95,
        maxTokens: 8192
      }));
    } catch (callError) {
      // La misión agotó el catálogo (o error no rotable): NO abandonar el
      // módulo — reintentar con una misión FRESCA (catálogo completo otra vez).
      console.warn(`[MODULE-GEN][${type}] intento ${attempt}: la misión se agotó (${callError.message}) — ${isPremiumConfigured() && !degradedToRotator ? 'degradando al rotator' : 'reintentando con misión fresca'}`);
      feedback = [`La llamada al LLM falló: ${callError.message}. Genera el módulo completo de nuevo.`];
      degradedToRotator = true; // si el premium está caído, el respaldo cae al rotator
      m = freshMission();
      continue;
    }
    models.push(modelKey);

    lastHtml = extractModuleHtml(content);
    validation = validateGeneratedModule(lastHtml, type);
    if (validation.valid) {
      console.log(`[MODULE-GEN][${type}] ✅ válido en intento ${attempt} (${modelKey})`);
      // Fase de refinamiento: crítico por rúbrica + mejora (sube el nivel de
      // cualquier LLM; si el refinado rompe el contrato se conserva el original)
      const refined = await refineModule(m, type, lastHtml);
      const finalHtml = refined?.applied && refined.html ? refined.html : lastHtml;
      const recheck = refined?.applied ? validateGeneratedModule(finalHtml, type) : validation;
      models.push(...[refined?.criticModel, refined?.refinerModel].filter(Boolean));
      return {
        moduleType: type, html: finalHtml, attempts: attempt, models,
        validation: recheck, brief,
        critique: refined?.critique || null, refined: !!refined?.applied
      };
    }
    feedback = validation.errors;
    console.warn(`[MODULE-GEN][${type}] intento ${attempt} inválido (${validation.errors.length} errores, ${modelKey}): ${validation.errors.slice(0, 3).join(' | ')}`);
    // Diversidad + segunda opinión: el próximo intento lo intenta OTRO modelo
    m.excludeModel(modelKey);
  }

  return { moduleType: type, html: lastHtml, attempts: MAX_ATTEMPTS, models, validation, brief, failed: true };
}

// ----------------------------------------------------------------------------
// Importación al RAG modular (mismo esquema que el endpoint manual existente)
// ----------------------------------------------------------------------------
/**
 * Importa módulos validados a knowledge_base_modules.
 * @param {Array<{html: string, styleName?: string, category?: string}>} modules
 * @param {*} dbInstance instancia de better-sqlite3 (server/database.js)
 * @returns {Array} resultado por módulo
 */
export function importGeneratedModules(modules, dbInstance) {
  const results = [];
  const slug = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  for (const mod of modules) {
    try {
      const html = String(mod.html || '');
      const check = validateGeneratedModule(html, (html.match(/data-gemini-id="([a-z]+)/i)?.[1]) || '');
      const meta = extractModuleMetadata(html);
      const type = meta?.module_metadata?.tipo || meta?.module_type || html.match(/data-gemini-id="([a-z0-9]+)-/i)?.[1] || 'general';
      if (!check.valid) {
        results.push({ ok: false, error: `módulo inválido: ${check.errors.slice(0, 3).join('; ')}` });
        continue;
      }
      const styleName = mod.styleName || meta?.module_metadata?.style_name || `Generado ${new Date().toISOString().slice(0, 10)}`;
      const moduleId = `${type}-${slug(styleName) || 'gen'}-${Date.now().toString(36).slice(-4)}${Math.floor(Math.random() * 100)}`;
      const tags = meta?.module_metadata?.tags || [type, 'generado'];
      dbInstance.prepare(`
        INSERT INTO knowledge_base_modules (
          module_id, module_type, style_name, description,
          tags, descripcion_larga, theme_tags, color_palette,
          css_variables, has_memory_attributes, memory_sources,
          html_content, category, is_active, html_size
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
      `).run(
        moduleId,
        type,
        styleName,
        meta?.module_metadata?.descripcion || '',
        JSON.stringify(tags),
        JSON.stringify(meta?.module_metadata?.descripcion || ''),
        JSON.stringify(['generado', 'produccion']),
        JSON.stringify(meta?.color_palette || {}),
        JSON.stringify(meta?.css_variables || {}),
        meta?.has_memory_attributes ? 1 : 0,
        JSON.stringify(meta?.memory_sources || {}),
        html,
        mod.category || 'general',
        Buffer.byteLength(html, 'utf-8')
      );
      results.push({ ok: true, module_id: moduleId, module_type: type, style_name: styleName });
    } catch (error) {
      results.push({ ok: false, error: error.message });
    }
  }
  return results;
}

// ----------------------------------------------------------------------------
// SETS de módulos (lotes automáticos): coherencia DENTRO del set (misma
// estética/firma, como una invitación real) y divergencia TOTAL entre sets
// (exclusión de estética/layout/firma/dirección ya usados en el lote).
// Sin input del usuario, cada set recibe una DIRECCIÓN CREATIVA automática
// distinta que actúa como instrucciones del "cliente imaginario".
// ----------------------------------------------------------------------------
/**
 * Genera un set completo de módulos.
 * @param {string[]} moduleTypes tipos del set
 * @param {{extraInstructions?: string, batchSeeds?: Set<string>, mission?: object}} opts
 * @returns {Promise<{modules: Array, setSeeds: object, autoDirection: string}>}
 */
export async function generateSet(moduleTypes, { extraInstructions = '', batchSeeds = new Set(), mission = null, missionFactory = null } = {}) {
  const setSeeds = {
    estetica: pickExcluding(AESTHETICS, batchSeeds, 'estetica'),
    firma: pickExcluding(SIGNATURES, batchSeeds, 'firma')
  };
  const autoDirection = extraInstructions.trim()
    ? ''
    : pickExcluding(CONCEPT_DIRECTIONS, batchSeeds, 'concepto');
  const setInstructions = [autoDirection, extraInstructions].filter(Boolean).join('. ');

  const modules = [];
  for (const type of moduleTypes) {
    try {
      const result = await generateModule(type, {
        extraInstructions: setInstructions,
        mission,
        missionFactory,
        seedUsed: batchSeeds,
        forcedSeeds: setSeeds
      });
      modules.push(result);
    } catch (error) {
      console.warn(`[MODULE-GEN][set] módulo ${type} falló en el set: ${error.message}`);
      modules.push({ moduleType: type, failed: true, error: error.message, attempts: 0, models: [], validation: { valid: false, errors: [error.message] }, html: '' });
    }
  }
  return { modules, setSeeds, autoDirection };
}

// ----------------------------------------------------------------------------
// Persistencia de resultados para revisión posterior
// ----------------------------------------------------------------------------
/**
 * Guarda un módulo generado en module_generator_results.
 * @returns {number} id de la fila
 */
export function saveGeneratedResult(dbInstance, { batchId, setIndex, result }) {
  const info = dbInstance.prepare(`
    INSERT INTO module_generator_results
      (batch_id, set_index, module_type, style_name, brief_json, html, critique_score, models_json, attempts, valid, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'generated')
  `).run(
    batchId || null,
    setIndex || 0,
    result.moduleType || '',
    result.brief?.style_name || null,
    JSON.stringify({ brief: result.brief || null, critique: result.critique || null, refined: !!result.refined }),
    result.html || '',
    typeof result.critique?.score === 'number' ? result.critique.score : null,
    JSON.stringify(result.models || []),
    result.attempts || 0,
    result.validation?.valid ? 1 : 0
  );
  return info.lastInsertRowid;
}
