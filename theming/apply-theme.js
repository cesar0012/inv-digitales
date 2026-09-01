/**
 * ============================================================================
 * SUBSISTEMA DE TEMATIZACIÓN POST-RAG
 * ============================================================================
 * Aplica, de forma segura y determinista, los requerimientos de color y
 * tipografía del cliente a los módulos .html seleccionados por el RAG:
 *
 *   1. Validación del request contra theming/theme-contract.schema.json.
 *   2. Resolución de la Google Font (API pública con timeout + lista blanca
 *      local como respaldo offline; fallback documentado si no existe).
 *   3. Generación de un ÚNICO bloque `:root` con las variables genéricas
 *      (--primary-color, --text-color, --accent-color, --bg-color, ...)
 *      + <link> de Google Fonts, inyectado en el <head> del contenedor final.
 *   4. Procesamiento por módulo:
 *      - Si el módulo ya usa var(--primary-color) etc. NO se toca: la
 *        resolución es centralizada vía el override global.
 *      - Las redefiniciones locales de variables reservadas (p.ej.
 *        `.modulo { --primary-color: #1f1f1f }`) se eliminan (rebind) para
 *        que el :root del contenedor gobierne; quedan registradas en el
 *        manifiesto con su valor original.
 *      - Colores literales en contexto memory_usage="custom" se sustituyen
 *        por la variable semántica correspondiente.
 *      - PROHIBIDO tocar declaraciones de color dentro de bloques marcados
 *        memory_usage="protected" (la protección se determina por el ancestro
 *        más cercano con memory_usage).
 *   5. Unificación tipográfica: todo font-family → var(--font-base), o
 *      var(--font-heading) en selectores/elementos de encabezado h1..h6.
 *      Las fuentes en contexto protected solo se alteran si
 *      fontOptions.overrideProtectedFonts=true (exigencia explícita de
 *      unificación del cliente); cada caso queda registrado con
 *      wasProtected=true en el manifiesto.
 *
 * El resultado expone un manifiesto (theme-manifest.json) con el modelo de
 * datos por elemento (elementId, currentFont, originalFont) para que el
 * editor visual permita re-seleccionar Google Font por elemento a futuro.
 *
 * Sin dependencias nuevas: usa linkedom (ya presente en package.json) y
 * fetch nativo de Node >= 22.
 *
 * Uso CLI:
 *   node theming/apply-theme.js --input theming/example-request.json
 * Opciones: --output <dir> --container <file> --dry-run --strict --quiet
 */
import { readFile, writeFile, mkdir, stat } from 'fs/promises';
import { join, resolve, dirname, basename, posix } from 'path';
import { fileURLToPath } from 'url';
import { parseHTML } from 'linkedom';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Límites defensivos (resistencia a módulos corruptos / payloads enormes). */
const LIMITS = {
  requestBytes: 1024 * 1024,    // 1 MB para el JSON de requerimientos
  moduleBytes: 5 * 1024 * 1024, // 5 MB por módulo .html
  containerBytes: 8 * 1024 * 1024,
  fontTimeoutMs: 5000
};

/**
 * Variables CSS reservadas al subsistema de theming ("plomería temática").
 * Cualquier definición local de estas variables en un módulo se elimina para
 * que la resolución sea centralizada desde el :root del contenedor.
 * No son "estilos avanzados": son el mecanismo mismo de la tematización.
 */
const RESERVED_VARS = {
  '--primary-color': 'primary',
  '--text-color': 'text',
  '--accent-color': 'accent',
  '--bg-color': 'background',
  '--background-color': 'background', // alias usado por el ensamblador legacy
  '--surface-color': 'surface',
  '--border-color': 'border',
  '--surface-border-color': 'border', // alias común en módulos de la KB
  // Texto secundario/atenuado: los módulos KB lo usan como "texto gris". Se
  // define globalmente derivado del color de texto del cliente (ver
  // buildThemeVariables) y las definiciones locales se rebindan.
  '--secondary-color': 'secondary'
};

/** Colores literales que el subsistema sabe sustituir (hex / rgb / rgba). */
const COLOR_LITERAL_RE = /^(#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{8}|rgba?\(\s*[\d.]+%?\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?\s*(?:,\s*[\d.]+\s*)?\))$/;

/**
 * Definición de variable CSS local con valor de color literal opaco.
 * Los módulos adaptados por Gemini suelen inventar paletas propias
 * (--charcoal, --paper, --ink...); este patrón las detecta para poder
 * tematizar sus USOS (color/background/border) por propiedad.
 */
const LOCAL_COLOR_VAR_DEF_RE = /(--[a-zA-Z][\w-]*)\s*:\s*(#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{8}|rgba?\([^;{}]*\))\s*(?:;|\}|$)/g;

/** Selector que contiene un type-selector de encabezado (h1..h6). */
const HEADING_SELECTOR_RE = /(?:^|[\s,+>~])h[1-6](?=$|[\s,+>~:.#[*])/;

/** Lista blanca local de Google Fonts para validación offline. */
const GOOGLE_FONTS_WHITELIST = new Set([
  'Inter', 'Roboto', 'Open Sans', 'Montserrat', 'Poppins', 'Lato', 'Oswald',
  'Raleway', 'Nunito', 'Merriweather', 'Playfair Display', 'Lora',
  'Cormorant Garamond', 'EB Garamond', 'Libre Baskerville', 'Bodoni Moda',
  'Marcellus', 'Cormorant', 'Cardo', 'Source Serif 4', 'Josefin Sans',
  'Josefin Slab', 'Dancing Script', 'Great Vibes', 'Parisienne', 'Sacramento',
  'Alex Brush', 'Allura', 'Archivo', 'Archivo Black', 'Work Sans', 'Karla',
  'Mulish', 'Rubik', 'Manrope', 'Outfit', 'Sora', 'Space Grotesk', 'Fira Sans',
  'Barlow', 'Cabin', 'Quicksand', 'Comfortaa', 'Fredoka', 'Cinzel',
  'Cinzel Decorative', 'Playfair Display SC', 'Bitter', 'Domine', 'Karma',
  'Arvo', 'Vollkorn', 'Crimson Text', 'Crimson Pro', 'Spectral'
]);

// ============================================================================
// ERRORES ESTRUCTURADOS
// ============================================================================

export class ThemeContractError extends Error {
  constructor(errors) {
    super(`Request de tematización inválido: ${errors.map(e => `${e.path}: ${e.message}`).join(' | ')}`);
    this.name = 'ThemeContractError';
    this.errors = errors;
  }
}

const mkLogEntry = (level, code, message, extra = {}) => ({ level, code, message, ...extra });

// ============================================================================
// MINI-VALIDADOR DE ESQUEMA (subset draft-07: type, required, properties,
// additionalProperties, pattern, minLength, minItems, items, enum, $ref local)
// ============================================================================
function resolveRef(schema, root) {
  if (!schema || typeof schema !== 'object' || !schema.$ref) return schema;
  const parts = schema.$ref.replace(/^#\/?/, '').split('/');
  let target = root;
  for (const p of parts) target = target?.[p];
  return target;
}

function validateSchemaNode(data, schema, root, path, errors) {
  schema = resolveRef(schema, root);
  if (!schema || typeof schema !== 'object') return;
  if (schema.type) {
    const t = Array.isArray(schema.type) ? schema.type : [schema.type];
    const actual = Array.isArray(data) ? 'array' : typeof data;
    if (!t.includes(actual === 'integer' ? 'number' : actual)) {
      errors.push({ path, message: `debe ser de tipo ${t.join('|')} (es ${actual})` });
      return;
    }
  }
  if (schema.enum && !schema.enum.includes(data)) {
    errors.push({ path, message: `debe ser uno de: ${schema.enum.join(', ')}` });
  }
  if (typeof data === 'string') {
    if (schema.pattern && !new RegExp(schema.pattern).test(data)) {
      errors.push({ path, message: `no cumple el patrón requerido` });
    }
    if (schema.minLength !== undefined && data.length < schema.minLength) {
      errors.push({ path, message: `longitud mínima ${schema.minLength}` });
    }
  }
  if (Array.isArray(data)) {
    if (schema.minItems !== undefined && data.length < schema.minItems) {
      errors.push({ path, message: `debe tener al menos ${schema.minItems} elemento(s)` });
    }
    if (schema.items) {
      data.forEach((item, i) => validateSchemaNode(item, schema.items, root, `${path}[${i}]`, errors));
    }
  }
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    for (const key of schema.required || []) {
      if (!(key in data)) errors.push({ path: `${path}.${key}`, message: 'campo obligatorio ausente' });
    }
    if (schema.properties) {
      for (const [key, value] of Object.entries(data)) {
        if (schema.properties[key]) {
          validateSchemaNode(value, schema.properties[key], root, `${path}.${key}`, errors);
        } else if (schema.additionalProperties === false) {
          errors.push({ path: `${path}.${key}`, message: 'propiedad no permitida por el contrato' });
        }
      }
    }
  }
}

// ============================================================================
// VALIDACIÓN DEL REQUEST (Paso 1)
// ============================================================================
let _cachedSchema = null;
async function loadContractSchema() {
  if (_cachedSchema) return _cachedSchema;
  const raw = await readFile(join(__dirname, 'theme-contract.schema.json'), 'utf-8');
  _cachedSchema = JSON.parse(raw);
  return _cachedSchema;
}

/**
 * Valida el request contra theme-contract.schema.json y lo normaliza
 * (recorta espacios; NO evalúa nunca código arbitrario: solo JSON.parse).
 * @returns {{ valid: boolean, errors: Array, normalized: object }}
 */
export async function validateThemeRequest(request) {
  const schema = await loadContractSchema();
  const errors = [];
  validateSchemaNode(request, schema, schema, '$', errors);
  if (errors.length > 0) return { valid: false, errors, normalized: null };

  const colors = {};
  for (const [role, value] of Object.entries(request.colors)) {
    colors[role] = String(value).trim();
  }
  const normalized = {
    colors,
    font: null,
    fontOptions: { overrideProtectedFonts: request.fontOptions?.overrideProtectedFonts !== false },
    colorOptions: { overrideProtectedColors: request.colorOptions?.overrideProtectedColors !== false },
    modules: (request.modules || []).map(m => String(m).trim()).filter(Boolean),
    container: request.container ? String(request.container).trim() : null,
    output: request.output ? String(request.output).trim() : null,
    dryRun: request.dryRun === true
  };
  if (request.font) {
    normalized.font = {
      base: String(request.font.base).trim(),
      heading: request.font.heading ? String(request.font.heading).trim() : null,
      fallback: request.font.fallback ? String(request.font.fallback).trim() : 'Inter'
    };
    if (normalized.font.heading === normalized.font.base) normalized.font.heading = null;
  }
  return { valid: true, errors: [], normalized };
}

// ============================================================================
// UTILIDADES DE COLOR / FUENTE
// ============================================================================
function isOpaqueColorLiteral(value) {
  const v = String(value).trim();
  if (!COLOR_LITERAL_RE.test(v)) return false;
  if (/^#[0-9a-fA-F]{8}$/.test(v)) return v.slice(7).toLowerCase() === 'ff';
  const alphaMatch = v.match(/rgba?\([^)]*,\s*([\d.]+)\s*\)/i);
  if (alphaMatch) return parseFloat(alphaMatch[1]) >= 1;
  return true; // hex3/hex6/rgb() sin canal alfa
}

/** Parsea un literal hex/rgb a [r,g,b] (0-255); null si no es literal de color. */
function parseColorLiteral(value) {
  const v = String(value).trim();
  if (/^#[0-9a-fA-F]{3}$/.test(v)) {
    return [parseInt(v[1] + v[1], 16), parseInt(v[2] + v[2], 16), parseInt(v[3] + v[3], 16)];
  }
  if (/^#[0-9a-fA-F]{6}$/.test(v)) {
    return [parseInt(v.slice(1, 3), 16), parseInt(v.slice(3, 5), 16), parseInt(v.slice(5, 7), 16)];
  }
  const m = v.match(/^rgba?\(\s*([\d.]+)%?\s*,\s*([\d.]+)%?\s*,\s*([\d.]+)%?/i);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  return null;
}

/**
 * Luminancia percibida (0..1). En bloques protected, un `color` de texto con
 * luminancia extrema (>= 0.92 casi blanco, <= 0.08 casi negro) se considera
 * decisión de contraste del diseñador (texto sobre foto/overlay oscuro o
 * claro) y se PRESERVA: cambiarlo rompería la legibilidad.
 */
function colorLuminance(value) {
  const rgb = parseColorLiteral(value);
  if (!rgb) return null;
  return (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
}

const isExtremeTextLiteral = (value) => {
  const l = colorLuminance(value);
  return l !== null && (l >= 0.92 || l <= 0.08);
};

/**
 * Recolecta las variables de color definidas localmente en el documento con
 * valor literal opaco (paletas propias de módulos adaptados). Devuelve un
 * Map nombre→literal. Excluye las variables reservadas (esas se rebindan y
 * sus usos ya resuelven contra el :root central).
 */
function collectLocalOpaqueColorVars(cssTexts) {
  const map = new Map();
  for (const css of cssTexts) {
    if (!css) continue;
    LOCAL_COLOR_VAR_DEF_RE.lastIndex = 0;
    let m;
    while ((m = LOCAL_COLOR_VAR_DEF_RE.exec(css)) !== null) {
      const name = m[1];
      const value = m[2];
      if (RESERVED_VARS[name]) continue;
      if (isOpaqueColorLiteral(value) && !map.has(name)) map.set(name, value);
    }
  }
  return map;
}

const cssEscapeFontFamily = (name) => `'${String(name).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

function buildFontStack(family, generic) {
  return `${cssEscapeFontFamily(family)}, ${generic}`;
}

// ============================================================================
// RESOLUCIÓN DE GOOGLE FONTS (Paso 1b)
// ============================================================================
/**
 * Caché de resolución por familia (clave: lowercase). Evita revalidar contra
 * la API en cada generación de invitación durante la vida del proceso.
 */
const _fontResolutionCache = new Map();

/**
 * Resuelve una familia contra la API pública de Google Fonts con timeout.
 * Fast-path: las familias de la lista blanca local se aceptan sin llamada a
 * la red (son Google Fonts conocidas; el <link> del navegador las resuelve),
 * lo que elimina la latencia de validación del flujo de generación.
 * Degradación determinista para familias desconocidas:
 *   - 200            → status 'verified'
 *   - 400/404        → no existe → fallback (font.fallback) + advertencia
 *   - red caída/5xx  → lista blanca local ('whitelist') o 'assumed' + advertencia
 * @returns {Promise<{requested,family,status,warning?}>}
 */
export async function resolveGoogleFontFamily(name, { timeoutMs = LIMITS.fontTimeoutMs, fallback = 'Inter' } = {}) {
  const clean = String(name).trim();
  const cacheKey = clean.toLowerCase();
  if (_fontResolutionCache.has(cacheKey)) return _fontResolutionCache.get(cacheKey);

  let result;
  if (GOOGLE_FONTS_WHITELIST.has(cacheKey)) {
    // Fast-path: familia conocida, sin latencia de red.
    result = { requested: clean, family: clean, status: 'whitelist' };
  } else {
    const urlId = encodeURIComponent(clean).replace(/%20/g, '+');
    result = null;
    try {
      const res = await fetch(`https://fonts.googleapis.com/css2?family=${urlId}&display=swap`, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LinksociallyTheming/1.0)' }
      });
      if (res.ok) {
        result = { requested: clean, family: clean, status: 'verified' };
      } else if (res.status === 400 || res.status === 404) {
        result = {
          requested: clean, family: fallback, status: 'fallback',
          warning: `Google Fonts no reconoce la familia "${clean}"; se aplica el fallback "${fallback}".`
        };
      }
    } catch {
      /* sin red o timeout: degradar a 'assumed' más abajo */
    }
    if (!result) {
      result = {
        requested: clean, family: clean, status: 'assumed',
        warning: `Sin acceso a la API de Google Fonts y "${clean}" no está en la lista blanca local: se asume válida (el <link> la resolverá en el navegador).`
      };
    }
  }
  _fontResolutionCache.set(cacheKey, result);
  return result;
}

async function resolveRequestFonts(font, logger) {
  if (!font) return { base: null, heading: null, url: null, resolutions: {} };
  const resolutions = {};
  const families = [font.base];
  if (font.heading) families.push(font.heading);
  for (const family of families) {
    const key = family.toLowerCase();
    if (!resolutions[key]) {
      const resolution = await resolveGoogleFontFamily(family, { fallback: font.fallback });
      resolutions[key] = resolution;
      if (resolution.warning) logger.push(mkLogEntry('warn', 'FONT_RESOLUTION', resolution.warning));
    }
  }
  const base = resolutions[font.base.toLowerCase()];
  const heading = font.heading ? resolutions[font.heading.toLowerCase()] : null;
  const urlFamilies = [base.family];
  if (heading && heading.family.toLowerCase() !== base.family.toLowerCase()) urlFamilies.push(heading.family);
  const url = `https://fonts.googleapis.com/css2?family=${urlFamilies.map(f => encodeURIComponent(f).replace(/%20/g, '+')).join('&family=')}&display=swap`;
  return { base, heading, url, resolutions };
}

// ============================================================================
// TRANSFORMACIONES CSS (Pasos 3 y 4)
// ============================================================================

/** Enmascara comentarios, url(...) y strings para procesar CSS de forma segura. */
function maskCssFragments(text) {
  const store = [];
  const put = (s) => `\u0000${store.push(s) - 1}\u0000`;
  let out = text.replace(/\/\*[\s\S]*?\*\//g, m => put(m));
  out = out.replace(/url\(\s*(['"]?)[^)'"]*\1\s*\)/gi, m => put(m));
  out = out.replace(/'(?:[^'\\\u0000]|\\.)*'|"(?:[^"\\\u0000]|\\.)*"/g, m => put(m));
  return { text: out, store };
}

const unmaskCssFragments = (text, store) =>
  text.replace(/\u0000(\d+)\u0000/g, (_, i) => store[Number(i)] ?? '');

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Sustituciones sobre una lista de declaraciones CSS (cuerpo de regla o
 * atributo style=""). Los valores entre máscaras (strings/url) nunca se
 * interpretan como colores, evitando inyección vía contenido.
 */
function transformDeclarations(css, ctx) {
  let out = css;

  // (a) Rebind de variables reservadas: SIEMPRE (plomería temática centralizada).
  // El lead admite \s para declaraciones tras comentarios enmascarados o saltos
  // de línea; var(--x) como USO no matchea porque va precedido de '('.
  for (const [varName, role] of Object.entries(RESERVED_VARS)) {
    if (!ctx.roles.has(role)) continue;
    const re = new RegExp(`(^|[;{\\s])\\s*${escapeRe(varName)}\\s*:[^;{}]*;?`, 'g');
    out = out.replace(re, (m, lead) => (lead === ';' ? ';' : lead === '{' ? '{' : ''));
  }

  // (b) Sustitución de colores: literales opacos y usos de variables locales
  //     opacas (--charcoal, --paper...) mapeadas por propiedad. En contexto
  //     protected solo si colorOptions.overrideProtectedColors, preservando
  //     los `color` de luminancia extrema (contraste sobre fotos/overlays).
  if (ctx.allowColors) {
    const colorProps = 'color|background-color|background|border-color|border|border-top|border-right|border-bottom|border-left';
    out = out.replace(
      new RegExp(`(^|[{;\\s])(${colorProps})\\s*:\\s*([^;{}]+)`, 'g'),
      (full, lead, prop, rawValue) => {
        const important = /!important\s*$/.test(rawValue) ? ' !important' : '';
        const value = rawValue.replace(/\s*!important\s*$/, '').trim();
        const target = colorTargetForProperty(prop, ctx);
        if (!target) return full;

        // En protected, preservar color de texto de contraste extremo.
        const preserveProtectedText = (literal) =>
          ctx.isProtectedBlock && prop === 'color' && isExtremeTextLiteral(literal);

        const substituteToken = (tok) => {
          const t = tok.trim();
          if (!t) return null;
          if (isOpaqueColorLiteral(t)) {
            return preserveProtectedText(t) ? null : target;
          }
          const varUse = t.match(/^var\((--[a-zA-Z][\w-]*)\)$/);
          if (varUse && ctx.localColorVars) {
            const literal = ctx.localColorVars.get(varUse[1]);
            if (literal && !preserveProtectedText(literal)) return target;
          }
          return null;
        };

        if (prop === 'border' || prop.startsWith('border-')) {
          // Shorthand: sustituir solo los tokens de color del valor.
          let subs = 0;
          const replaced = value.split(/(\s+)/).map(tok => {
            const rep = substituteToken(tok);
            if (rep) { subs += 1; return rep; }
            return tok;
          }).join('');
          if (subs > 0) {
            ctx.changes.colorSubstitutions += subs;
            if (ctx.isProtectedBlock) ctx.changes.protectedColorOverrides += subs;
            return `${lead}${prop}: ${replaced}${important}`;
          }
          return full;
        }
        // color / background-color / background: sustituir solo si el valor
        // completo es un literal opaco o un var(--local) opaco (gradients,
        // overlays y vars reservadas se preservan).
        const replacement = value.includes(' ') ? null : substituteToken(value);
        if (replacement) {
          ctx.changes.colorSubstitutions += 1;
          if (ctx.isProtectedBlock) ctx.changes.protectedColorOverrides += 1;
          return `${lead}${prop}: ${replacement}${important}`;
        }
        return full;
      }
    );
  }

  // (c) Unificación tipográfica: todo font-family → var(--font-base/--font-heading).
  //     También los valores var(--x) NO reservados (p.ej. --serif de módulos
  //     adaptados); solo se preservan los ya unificados.
  if (ctx.allowFonts && ctx.baseVarValue) {
    out = out.replace(
      /(^|[{;\s])(font-family)\s*:\s*([^;{}]+)/g,
      (full, lead, prop, rawValue) => {
        if (/var\(--font-(base|heading)\)/.test(rawValue)) return full; // ya unificada
        const important = /!important\s*$/.test(rawValue) ? ' !important' : '';
        const original = unmaskCssFragments(rawValue.trim(), ctx.store);
        const varRef = (ctx.isHeading && ctx.headingVarValue) ? 'var(--font-heading)' : 'var(--font-base)';
        ctx.changes.fontSubstitutions += 1;
        ctx.recordFont(original, varRef, ctx);
        return `${lead}${prop}: ${varRef}${important}`;
      }
    );
  }

  return out;
}

/** Variable semántica destino según la propiedad y los roles proporcionados. */
function colorTargetForProperty(prop, ctx) {
  if (prop === 'color') return 'var(--text-color)';
  if (prop === 'background-color' || prop === 'background') {
    return ctx.roles.has('surface') ? 'var(--surface-color)' : 'var(--bg-color)';
  }
  // bordes: rol border si el cliente lo dio, si no primary (spec Paso 3)
  return ctx.roles.has('border') ? 'var(--border-color)' : 'var(--primary-color)';
}

/**
 * Procesa una hoja de estilo completa: localiza cada bloque interior
 * `selector { declaraciones }` (incluye anidados de @media/@keyframes) y
 * aplica las transformaciones con el contexto de selector correcto.
 */
function transformStylesheet(css, ctx) {
  const { text: masked, store } = maskCssFragments(css);
  ctx.store = store;
  const replaced = masked.replace(/\{([^{}]*)\}/g, (full, inner, offset) => {
    const before = masked.slice(0, offset);
    const lastBrace = Math.max(before.lastIndexOf('}'), before.lastIndexOf('{'));
    const selector = before.slice(lastBrace + 1).trim();
    const ruleCtx = { ...ctx, isHeading: HEADING_SELECTOR_RE.test(selector), selector };
    return `{${transformDeclarations(inner, ruleCtx)}}`;
  });
  return unmaskCssFragments(replaced, store);
}

/** Procesa el valor de un atributo style="..." de un elemento concreto. */
function transformInlineStyle(value, ctx, isHeadingTag) {
  const { text: masked, store } = maskCssFragments(value);
  ctx.store = store;
  const out = transformDeclarations(masked, { ...ctx, isHeading: isHeadingTag, selector: null });
  return unmaskCssFragments(out, store);
}

// ============================================================================
// PROCESAMIENTO DE MÓDULOS (Paso 3/4 sobre DOM)
// ============================================================================

/** memory_usage del ancestro más cercano (incluido el propio elemento). */
function nearestMemoryUsage(el) {
  let node = el;
  while (node && typeof node.getAttribute === 'function') {
    const usage = node.getAttribute('memory_usage');
    if (usage) return usage;
    node = node.parentElement;
  }
  return null;
}

/**
 * Serializa los hijos de un nodo contenedor preservando texto y comentarios.
 * linkedom trata un fragmento suelto como documentElement (le inyecta
 * head/body espurios), así que los fragmentos se parsean envueltos en un
 * div y aquí se devuelven sus hijos tal cual.
 */
function serializeChildren(containerEl) {
  let out = '';
  for (const n of containerEl.childNodes) {
    if (n.nodeType === 3) out += n.data;
    else if (n.nodeType === 8) out += `<!--${n.textContent}-->`;
    else if (typeof n.outerHTML === 'string') out += n.outerHTML;
  }
  return out;
}

function computeElementId(el, rootModuleId, index) {
  const own = el.getAttribute('data-gemini-id');
  const key = el.getAttribute('memory_key');
  if (own && key) return `${own}__${key}`;
  if (own) return own;
  if (rootModuleId && key) return `${rootModuleId}__${key}`;
  return `${rootModuleId || 'module'}__element-${index}`;
}

/** Colecta definiciones locales de variables reservadas presentes en un CSS. */
function collectRebindMatches(css, roles) {
  const found = [];
  for (const [varName, role] of Object.entries(RESERVED_VARS)) {
    if (!roles.has(role)) continue;
    const re = new RegExp(`${escapeRe(varName)}\\s*:\\s*([^;{}]+)`);
    const m = css.match(re);
    if (m) found.push({ var: varName, originalValue: m[1].trim() });
  }
  return found;
}

/**
 * Aplica la tematización al HTML de un módulo (fragmento) o documento.
 * @param {string} source HTML
 * @param {object} themeCtx { roles, fontEnabled, overrideProtectedFonts, overrideProtectedColors, baseVarValue, headingVarValue }
 * @param {string} label identificador para el reporte
 * @returns {{ html: string, report: object }}
 */
export function applyThemeToModuleHtml(source, themeCtx, label = 'module') {
  const isFullDoc = /<html[\s>]/i.test(source.trimStart());
  // Envolver fragmentos: linkedom usa el primer elemento como documentElement
  // y le inyecta head/body vacíos; el wrapper permite serializar los hijos
  // originales sin pérdidas.
  const WRAP_ID = '__theming_wrap__';
  const parseInput = isFullDoc ? source : `<div id="${WRAP_ID}">${source}</div>`;
  const { document } = parseHTML(parseInput);
  const changes = { colorSubstitutions: 0, fontSubstitutions: 0, protectedStyleBlocksSkipped: 0, protectedColorOverrides: 0, varRebinds: [], fontReplacements: [] };
  const elements = [];
  let activeFontElement = null;
  const recordFont = (original, applied, ctx) => {
    if (activeFontElement) {
      activeFontElement.originalFont = original;
      activeFontElement.currentFont = applied;
    } else {
      changes.fontReplacements.push({ selector: ctx?.selector || null, original, applied });
    }
  };

  // Paleta local del módulo: variables de color no reservadas definidas aquí
  // con literal opaco (--charcoal, --paper... típicas de módulos adaptados).
  // Recolectar ANTES de transformar nada.
  const cssTexts = [...document.querySelectorAll('style')].map(s => s.textContent || '');
  cssTexts.push(...[...document.querySelectorAll('[style]')].map(el => el.getAttribute('style') || ''));
  const localColorVars = collectLocalOpaqueColorVars(cssTexts);

  const rootModuleEl = document.querySelector('[data-gemini-id]');
  const rootModuleId = rootModuleEl ? rootModuleEl.getAttribute('data-gemini-id') : null;
  let elementIndex = 0;

  const makeCtx = (allowColors, allowFonts, isProtectedBlock) => ({
    roles: themeCtx.roles,
    allowColors,
    allowFonts,
    isProtectedBlock,
    localColorVars,
    baseVarValue: themeCtx.baseVarValue,
    headingVarValue: themeCtx.headingVarValue,
    changes,
    store: [],
    isHeading: false,
    selector: null,
    recordFont
  });

  // --- Hojas de estilo <style> ---
  for (const styleEl of document.querySelectorAll('style')) {
    const original = styleEl.textContent;
    if (!original || !original.trim()) continue;
    const usage = nearestMemoryUsage(styleEl);
    const isProtected = usage === 'protected';
    const allowColors = !isProtected || themeCtx.overrideProtectedColors;
    const allowFonts = themeCtx.fontEnabled && (!isProtected || themeCtx.overrideProtectedFonts);
    if (isProtected && !allowColors) changes.protectedStyleBlocksSkipped += 1;
    const beforeRebinds = collectRebindMatches(original, themeCtx.roles);
    const ctx = makeCtx(allowColors, allowFonts, isProtected);
    const transformed = transformStylesheet(original, ctx);
    if (transformed !== original) {
      styleEl.textContent = transformed;
      for (const rb of beforeRebinds) {
        if (!new RegExp(`${escapeRe(rb.var)}\\s*:`).test(transformed)) changes.varRebinds.push(rb);
      }
    }
  }

  // --- Atributos style="..." inline ---
  for (const el of document.querySelectorAll('[style]')) {
    const original = el.getAttribute('style');
    if (!original || !original.trim()) continue;
    const usage = nearestMemoryUsage(el);
    const isProtected = usage === 'protected';
    const allowColors = !isProtected || themeCtx.overrideProtectedColors;
    const allowFonts = themeCtx.fontEnabled && (!isProtected || themeCtx.overrideProtectedFonts);
    const ctx = makeCtx(allowColors, allowFonts, isProtected);
    const tag = (el.tagName || '').toLowerCase();
    const isHeadingTag = /^h[1-6]$/.test(tag);
    const hadFont = /font-family\s*:/.test(original);
    const memoryType = el.getAttribute('memory_type');
    if (hadFont || memoryType === 'text' || isHeadingTag) {
      elementIndex += 1;
      const entry = {
        elementId: computeElementId(el, rootModuleId, elementIndex),
        tag,
        memoryKey: el.getAttribute('memory_key') || null,
        memoryUsage: usage,
        wasProtected: isProtected,
        originalFont: null,
        currentFont: themeCtx.fontEnabled
          ? ((isHeadingTag && themeCtx.headingVarValue) ? 'var(--font-heading)' : 'var(--font-base)')
          : null
      };
      elements.push(entry);
      if (hadFont) activeFontElement = entry;
    }
    const transformed = transformInlineStyle(original, ctx, isHeadingTag);
    if (transformed !== original) el.setAttribute('style', transformed);
    activeFontElement = null;
  }

  // --- Elementos de texto sin style inline (modelo de datos para el editor) ---
  for (const el of document.querySelectorAll('[memory_type="text"], h1, h2, h3, h4, h5, h6')) {
    if (el.getAttribute('style')) continue; // ya registrados arriba
    const tag = (el.tagName || '').toLowerCase();
    const isHeadingTag = /^h[1-6]$/.test(tag);
    elementIndex += 1;
    elements.push({
      elementId: computeElementId(el, rootModuleId, elementIndex),
      tag,
      memoryKey: el.getAttribute('memory_key') || null,
      memoryUsage: el.getAttribute('memory_usage') || null,
      wasProtected: el.getAttribute('memory_usage') === 'protected',
      originalFont: null,
      currentFont: themeCtx.fontEnabled
        ? ((isHeadingTag && themeCtx.headingVarValue) ? 'var(--font-heading)' : 'var(--font-base)')
        : null
    });
  }

  const html = isFullDoc ? document.toString() : serializeChildren(document.querySelector(`#${WRAP_ID}`));
  return { html, report: { module: label, changes, elements } };
}

// ============================================================================
// OVERRIDE GLOBAL EN EL CONTENEDOR (Paso 2)
// ============================================================================

/**
 * Construye el mapa de variables del override :root a partir del request.
 */
export function buildThemeVariables(colors, fontResolution) {
  const vars = {
    '--primary-color': colors.primary,
    '--text-color': colors.text,
    '--accent-color': colors.accent,
    '--bg-color': colors.background,
    '--background-color': colors.background, // compat ensamblador legacy
    // Texto secundario/atenuado derivado del cliente: los módulos KB usan
    // var(--secondary-color) como "texto gris"; así hereda la paleta del
    // cliente en lugar del gris original del wireframe.
    '--secondary-color': 'color-mix(in srgb, var(--text-color) 72%, var(--bg-color))'
  };
  if (colors.surface) vars['--surface-color'] = colors.surface;
  if (colors.border) {
    vars['--border-color'] = colors.border;
    vars['--surface-border-color'] = colors.border;
  }
  if (fontResolution?.base) {
    vars['--font-base'] = buildFontStack(fontResolution.base.family, 'sans-serif');
    if (fontResolution.heading) vars['--font-heading'] = buildFontStack(fontResolution.heading.family, 'serif');
  }
  return vars;
}

/**
 * Inyecta/fusiona el override :root, el <link> de Google Fonts y la fuente
 * del body en el <head> del contenedor final. Idempotente (re-theming seguro).
 */
export function applyThemeToContainerHtml(containerHtml, { variables, googleFontsUrl }) {
  const { document } = parseHTML(containerHtml);
  let head = document.querySelector('head');
  if (!head) {
    head = document.createElement('head');
    document.documentElement.insertBefore(head, document.body || document.documentElement.firstChild);
  }

  const varEntries = Object.entries(variables);
  let rootStyle = null;
  for (const styleEl of document.querySelectorAll('style')) {
    if (/:root\s*\{/.test(styleEl.textContent || '')) { rootStyle = styleEl; break; }
  }
  if (!rootStyle) {
    rootStyle = document.createElement('style');
    rootStyle.setAttribute('data-theme-override', '1');
    head.appendChild(rootStyle);
    rootStyle.textContent = ':root {\n}';
  }

  let css = rootStyle.textContent;
  const rootMatch = css.match(/:root\s*\{([^}]*)\}/);
  if (rootMatch) {
    let rootBody = rootMatch[1];
    for (const [name, value] of varEntries) {
      const declRe = new RegExp(`(^|[;\\s])${escapeRe(name)}\\s*:\\s*[^;{}]*;?`);
      if (declRe.test(rootBody)) {
        rootBody = rootBody.replace(declRe, (m, lead) => `${(lead === ';' || lead === '{') ? lead : ''}${name}: ${value};`);
      } else {
        rootBody = rootBody.replace(/\s+$/, '') + `\n  ${name}: ${value};`;
      }
    }
    rootStyle.textContent = css.replace(rootMatch[0], `:root {${rootBody}}`);
  }

  const injected = ['root-override'];

  if (googleFontsUrl) {
    let link = document.querySelector('link[data-theme-font]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'stylesheet');
      link.setAttribute('data-theme-font', '1');
      if (!document.querySelector('link[rel="preconnect"][href*="fonts.gstatic"]')) {
        const pc = document.createElement('link');
        pc.setAttribute('rel', 'preconnect');
        pc.setAttribute('href', 'https://fonts.gstatic.com');
        pc.setAttribute('crossorigin', '');
        head.appendChild(pc);
      }
      head.appendChild(link);
      injected.push('font-link');
    }
    link.setAttribute('href', googleFontsUrl);

    // Unificar la fuente del body hacia var(--font-base)
    if (variables['--font-base']) {
      let bodyDone = false;
      for (const styleEl of document.querySelectorAll('style')) {
        const text = styleEl.textContent || '';
        const bodyRule = text.match(/(^|\})([^{}]*\bbody\b[^{}]*)\{([^{}]*)\}/);
        if (!bodyRule) continue;
        const isBodySelector = bodyRule[2].split(',').some(s => s.trim() === 'body');
        if (!isBodySelector || !/font-family\s*:/.test(bodyRule[3])) continue;
        const newInner = bodyRule[3].replace(/font-family\s*:\s*[^;{}]+;?/, 'font-family: var(--font-base);');
        styleEl.textContent = text.replace(bodyRule[0], `${bodyRule[1] || ''}${bodyRule[2]}{${newInner}}`);
        bodyDone = true;
        injected.push('body-font');
        break;
      }
      if (!bodyDone) {
        rootStyle.textContent += '\nbody { font-family: var(--font-base); }';
        injected.push('body-font');
      }
    }
  }

  return { html: document.toString(), injected };
}

// ============================================================================
// ENTRADA PROGRAMÁTICA PARA EL ORQUESTADOR (documento ya ensamblado)
// ============================================================================

/**
 * Tematiza el documento final ensamblado (módulos ya embebidos en el body):
 * procesa cada módulo según las reglas de protección y luego inyecta/fusiona
 * el override global en el <head>. Punto de integración de
 * server/agentOrchestrator.js (paso 5 del flujo modular).
 *
 * @param {string} html documento completo de la invitación
 * @param {{colors: object, font?: object, fontOptions?: object}} request requerimientos del cliente
 * @param {object} [logger] { push(entry) } para log estructurado
 * @returns {Promise<{ html: string, manifest: object }>}
 */
export async function applyPostRagTheme(html, request, logger = { push: () => {} }) {
  const validation = await validateThemeRequest({ ...request, modules: ['inline'] });
  if (!validation.valid) throw new ThemeContractError(validation.errors);
  const normalized = validation.normalized;
  const roles = new Set(Object.keys(normalized.colors));
  roles.add('secondary'); // rol derivado: --secondary-color se define globalmente desde text+bg

  const fontResolution = await resolveRequestFonts(normalized.font, logger);
  const variables = buildThemeVariables(normalized.colors, fontResolution);
  const themeCtx = {
    roles,
    fontEnabled: !!normalized.font,
    overrideProtectedFonts: normalized.fontOptions.overrideProtectedFonts,
    overrideProtectedColors: normalized.colorOptions.overrideProtectedColors,
    baseVarValue: variables['--font-base'] || null,
    headingVarValue: variables['--font-heading'] || null
  };

  // 1) Procesar módulos del body (reglas de protección por memory_usage)
  const processed = applyThemeToModuleHtml(html, themeCtx, 'document');
  // 2) Inyectar override centralizado en el head
  const container = applyThemeToContainerHtml(processed.html, {
    variables,
    googleFontsUrl: fontResolution.url
  });

  const manifest = {
    version: '1.0.0',
    appliedAt: new Date().toISOString(),
    mode: 'post-rag-document',
    theme: { variables, googleFontsUrl: fontResolution.url },
    document: { changes: processed.report.changes, elements: processed.report.elements },
    container: { injected: container.injected }
  };
  return { html: container.html, manifest };
}

// ============================================================================
// EJECUCIÓN POR ARCHIVOS + MANIFIESTO (CLI / orquestador basado en rutas)
// ============================================================================

async function readCapped(filePath, maxBytes, what) {
  const info = await stat(filePath);
  if (info.size > maxBytes) {
    throw new Error(`${what} excede el límite de ${Math.round(maxBytes / 1024)} KB`);
  }
  return readFile(filePath, 'utf-8');
}

/**
 * Ejecuta el request completo: valida, resuelve fuentes, procesa cada módulo
 * (continuando ante fallos individuales), tematiza el contenedor y escribe
 * salidas + theme-manifest.json.
 */
export async function runThemeRequest(request, { baseDir = __dirname, logger = null } = {}) {
  const log = logger ?? {
    entries: [],
    push(e) { this.entries.push(e); console.log(`[THEME][${e.level}] ${e.code}: ${e.message}`); }
  };
  const validation = await validateThemeRequest(request);
  if (!validation.valid) throw new ThemeContractError(validation.errors);
  const normalized = validation.normalized;
  const roles = new Set(Object.keys(normalized.colors));
  roles.add('secondary'); // rol derivado: --secondary-color se define globalmente desde text+bg

  const fontResolution = await resolveRequestFonts(normalized.font, log);
  const variables = buildThemeVariables(normalized.colors, fontResolution);
  const themeCtx = {
    roles,
    fontEnabled: !!normalized.font,
    overrideProtectedFonts: normalized.fontOptions.overrideProtectedFonts,
    overrideProtectedColors: normalized.colorOptions.overrideProtectedColors,
    baseVarValue: variables['--font-base'] || null,
    headingVarValue: variables['--font-heading'] || null
  };

  const manifest = {
    version: '1.0.0',
    appliedAt: new Date().toISOString(),
    mode: 'post-rag-modules',
    request: { colors: normalized.colors, font: normalized.font, fontOptions: normalized.fontOptions, colorOptions: normalized.colorOptions },
    theme: {
      variables,
      googleFontsUrl: fontResolution.url,
      fontResolution: {
        base: fontResolution.base ? { family: fontResolution.base.family, status: fontResolution.base.status } : null,
        heading: fontResolution.heading ? { family: fontResolution.heading.family, status: fontResolution.heading.status } : null
      }
    },
    modules: [],
    container: null,
    warnings: log.entries ?? []
  };

  const outputDir = resolve(baseDir, normalized.output || 'output');

  // --- Procesamiento por módulo: continuar ante fallos individuales ---
  for (const modulePath of normalized.modules) {
    const absPath = resolve(baseDir, modulePath);
    const rel = posix.join(...modulePath.split(/[\\/]/));
    try {
      if (!/\.html?$/i.test(absPath)) throw new Error('la ruta no apunta a un archivo .html');
      const source = await readCapped(absPath, LIMITS.moduleBytes, 'módulo');
      const { html, report } = applyThemeToModuleHtml(source, themeCtx, rel);
      const outPath = join(outputDir, basename(absPath));
      if (!normalized.dryRun) {
        await mkdir(outputDir, { recursive: true });
        await writeFile(outPath, html, 'utf-8');
      }
      manifest.modules.push({ module: rel, output: normalized.dryRun ? null : outPath, status: 'ok', ...report });
    } catch (error) {
      log.push(mkLogEntry('error', 'MODULE_FAILED', `Fallo procesando ${rel}: ${error.message}`, { module: rel }));
      manifest.modules.push({ module: rel, output: null, status: 'error', error: error.message, changes: null, elements: [] });
    }
  }

  // --- Contenedor final: inyección única del override + link de fuentes ---
  if (normalized.container) {
    try {
      const absPath = resolve(baseDir, normalized.container);
      const source = await readCapped(absPath, LIMITS.containerBytes, 'contenedor');
      // El contenedor embebe módulos: procesar cuerpo con las mismas reglas
      const processed = applyThemeToModuleHtml(source, themeCtx, 'container');
      const container = applyThemeToContainerHtml(processed.html, {
        variables,
        googleFontsUrl: fontResolution.url
      });
      const outPath = join(outputDir, basename(absPath));
      if (!normalized.dryRun) {
        await mkdir(outputDir, { recursive: true });
        await writeFile(outPath, container.html, 'utf-8');
      }
      manifest.container = {
        file: posix.join(...normalized.container.split(/[\\/]/)),
        output: normalized.dryRun ? null : outPath,
        injected: container.injected,
        changes: processed.report.changes,
        elements: processed.report.elements
      };
    } catch (error) {
      log.push(mkLogEntry('error', 'CONTAINER_FAILED', `Fallo tematizando el contenedor: ${error.message}`));
      manifest.container = { file: normalized.container, status: 'error', error: error.message };
    }
  }

  if (!normalized.dryRun) {
    await mkdir(outputDir, { recursive: true });
    await writeFile(join(outputDir, 'theme-manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');
  }

  const failedModules = manifest.modules.filter(m => m.status === 'error').length;
  manifest.summary = {
    modulesTotal: manifest.modules.length,
    modulesOk: manifest.modules.length - failedModules,
    modulesFailed: failedModules,
    colorSubstitutions: manifest.modules.reduce((a, m) => a + (m.changes?.colorSubstitutions || 0), 0) + (manifest.container?.changes?.colorSubstitutions || 0),
    fontSubstitutions: manifest.modules.reduce((a, m) => a + (m.changes?.fontSubstitutions || 0), 0) + (manifest.container?.changes?.fontSubstitutions || 0)
  };
  return { manifest, outputDir, log };
}

// ============================================================================
// CLI
// ============================================================================
function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--input') args.input = argv[++i];
    else if (a === '--output') args.output = argv[++i];
    else if (a === '--container') args.container = argv[++i];
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--strict') args.strict = true;
    else if (a === '--quiet') args.quiet = true;
    else if (a === '--help' || a === '-h') args.help = true;
    else args._.push(a);
  }
  return args;
}

const HELP = `Tematización Post-RAG — aplica colores y Google Font a módulos RAG.

Uso:
  node theming/apply-theme.js --input <request.json> [opciones]

Opciones:
  --input <file>     JSON de requerimientos (ver theme-contract.schema.json). Rutas relativas al JSON.
  --output <dir>     Directorio de salida (override del campo "output").
  --container <file> Contenedor final a tematizar (override del campo "container").
  --dry-run          No escribe archivos; solo log y manifiesto en memoria.
  --strict           Falla (exit 1) si hubo advertencias.
  --quiet            Solo errores en consola.

Salida: módulos tematizados + theme-manifest.json en el directorio de salida.
Exit codes: 0 = OK · 1 = fallos de módulos/advertencias estrictas · 2 = request inválido.`;

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help || !args.input) {
    console.log(HELP);
    return args.help ? 0 : 2;
  }

  const inputAbs = resolve(process.cwd(), args.input);
  let request;
  try {
    const raw = await readCapped(inputAbs, LIMITS.requestBytes, 'request');
    request = JSON.parse(raw); // solo JSON.parse: nunca eval
  } catch (error) {
    console.error(`[THEME][error] REQUEST_INVALID: no se pudo leer/parsear el request (${error.message})`);
    return 2;
  }

  if (args.output) request.output = args.output;
  if (args.container) request.container = args.container;
  if (args.dryRun) request.dryRun = true;

  const baseDir = dirname(inputAbs);
  const logEntries = [];
  const logger = {
    entries: logEntries,
    push(e) { logEntries.push(e); if (!args.quiet || e.level === 'error') console.log(`[THEME][${e.level}] ${e.code}: ${e.message}`); }
  };

  try {
    const { manifest, outputDir } = await runThemeRequest(request, { baseDir, logger });
    if (!args.quiet) {
      console.log(`[THEME] ${manifest.summary.modulesOk}/${manifest.summary.modulesTotal} módulo(s) tematizado(s) · ${manifest.summary.colorSubstitutions} sustitución(es) de color · ${manifest.summary.fontSubstitutions} de fuente`);
      console.log(`[THEME] Salida en: ${join(outputDir, 'theme-manifest.json')}`);
    }
    const failed = manifest.summary.modulesFailed > 0 || manifest.container?.status === 'error';
    const warnCount = logEntries.filter(e => e.level === 'warn').length;
    if (failed || (args.strict && warnCount > 0)) return 1;
    return 0;
  } catch (error) {
    if (error instanceof ThemeContractError) {
      for (const e of error.errors) console.error(`[THEME][error] CONTRACT: ${e.path}: ${e.message}`);
      return 2;
    }
    console.error(`[THEME][error] RUN_FAILED: ${error.message}`);
    return 1;
  }
}

// Ejecutar como CLI solo si es el punto de entrada
const isDirectRun = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  main().then(code => process.exit(code)).catch(err => {
    console.error('[THEME][error] FATAL:', err);
    process.exit(1);
  });
}
