import { parseHTML } from 'linkedom';

// === IDs válidos por tipo de módulo (según docs/prompt_rag_actualizado.md) ===
export const VALID_MODULE_IDS = {
  portada: ['portada-nombre', 'portada-novia', 'portada-novio'],
  padres: ['padres-padre', 'padres-novia', 'padres-novio'],
  ubicacion: ['ubicacion-ceremonia', 'ubicacion-mapa', 'ubicacion-recepcion'],
  itinerario: ['itinerario-agenda'],
  confirmacion: ['confirmacion-texto'],
  detalles: ['detalles-vestimenta', 'detalles-regalo']
};

// Mantenemos compatibilidad con tipos adicionales comunes (no estrictos)
export const EXTRA_MODULE_TYPES = [
  'countdown', 'padrinos', 'corte', 'galeria', 'regalos',
  'vestimenta', 'hospedaje', 'transporte', 'music', 'quotes',
  'mensaje', 'pascar', 'mensaje_padres', 'gracias'
];

export const VALID_MEMORY_TYPES = ['text', 'background', 'image'];
export const VALID_MEMORY_USAGE = ['custom', 'protected'];
export const VALID_MEMORY_SOURCES = ['generated', 'library'];

/**
 * Extrae todo el metadata de un módulo individual HTML.
 * Espera un <section data-gemini-id="..." ...>...</section> con su <script> moduleMetadata.
 *
 * @param {string} htmlContent - HTML del módulo individual
 * @returns {object} metadata estructurado + validation
 */
export function extractModuleMetadata(htmlContent) {
  const { document } = parseHTML(htmlContent);

  // 1. Buscar el módulo principal: primer [data-gemini-id] en el árbol
  const moduleRoot = document.querySelector('[data-gemini-id]');
  let dataGeminiId = null;
  let moduleType = null;
  let memoryType = null;
  let memoryUsage = null;
  let memorySource = null;
  let hasPathPlaceholder = false;

  if (moduleRoot) {
    dataGeminiId = moduleRoot.getAttribute('data-gemini-id');
    moduleType = dataGeminiId ? dataGeminiId.split('-')[0] : null;
    memoryType = moduleRoot.getAttribute('memory_type');
    memoryUsage = moduleRoot.getAttribute('memory_usage');
    memorySource = moduleRoot.getAttribute('memory_source');
    hasPathPlaceholder = moduleRoot.getAttribute('path') === 'placeholder';
  }

  // 2. Recolectar todos los data-gemini-id presentes en el módulo
  const allGeminiIds = [];
  document.querySelectorAll('[data-gemini-id]').forEach(el => {
    const id = el.getAttribute('data-gemini-id');
    if (id && !allGeminiIds.includes(id)) allGeminiIds.push(id);
  });

  // 3. Extraer moduleMetadata del <script> embebido
  let moduleMetadata = { tags: [], descripcion: '' };
  const scripts = document.querySelectorAll('script');
  for (const script of scripts) {
    if (script.hasAttribute('src')) continue;
    const code = script.textContent || '';
    // Buscar `const moduleMetadata = { ... };` o similar
    const metaMatch = code.match(/(?:const|let|var)\s+moduleMetadata\s*=\s*(\{[\s\S]*?\});/);
    if (metaMatch) {
      try {
        // Evaluar el objeto de forma segura (esperamos { tags: [...], descripcion: "..." })
        // Usamos Function en vez de eval para limitar el scope
        const fn = new Function(`return (${metaMatch[1]});`);
        const parsed = fn();
        if (parsed && Array.isArray(parsed.tags)) {
          moduleMetadata.tags = parsed.tags.map(String);
        }
        if (parsed && typeof parsed.descripcion === 'string') {
          moduleMetadata.descripcion = parsed.descripcion.slice(0, 250);
        }
      } catch (err) {
        // JSON falló, intentar un parser más permisivo
        try {
          const tagsMatch = code.match(/tags\s*:\s*\[([^\]]*)\]/);
          const descMatch = code.match(/descripcion\s*:\s*["']([^"']*)["']/);
          if (tagsMatch) {
            moduleMetadata.tags = tagsMatch[1]
              .split(',')
              .map(t => t.trim().replace(/["']/g, ''))
              .filter(Boolean);
          }
          if (descMatch) moduleMetadata.descripcion = descMatch[1].slice(0, 250);
        } catch (e) {}
      }
      break;
    }
  }

  // 4. Contar y clasificar elementos memory_*
  const memoryCounts = { text: 0, background: 0, image: 0 };
  const memoryUsages = { custom: 0, protected: 0 };
  const memorySources = { generated: 0, library: 0 };
  const placeholderCount = { generated: 0, library: 0 };

  document.querySelectorAll('[memory_type]').forEach(el => {
    const t = el.getAttribute('memory_type');
    if (memoryCounts[t] !== undefined) memoryCounts[t]++;

    const u = el.getAttribute('memory_usage');
    if (memoryUsages[u] !== undefined) memoryUsages[u]++;

    const s = el.getAttribute('memory_source');
    if (memorySources[s] !== undefined) memorySources[s]++;

    // Si el propio elemento tiene path placeholder y memory_source, contar
    if (el.getAttribute('path') === 'placeholder' && s) {
      placeholderCount[s] = (placeholderCount[s] || 0) + 1;
    }
  });

  // 4b. Detectar placeholders en subelementos cuyo memory_source viene del ancestro
  // (ej: <figure memory_source="library"><img path="placeholder"></figure>)
  document.querySelectorAll('[path="placeholder"]').forEach(el => {
    const ownSource = el.getAttribute('memory_source');
    if (ownSource) return; // ya contado arriba

    // Buscar el ancestro más cercano con memory_source
    let ancestor = el.parentElement;
    while (ancestor) {
      const ancSource = ancestor.getAttribute('memory_source');
      if (ancSource) {
        placeholderCount[ancSource] = (placeholderCount[ancSource] || 0) + 1;
        break;
      }
      ancestor = ancestor.parentElement;
    }
  });

  // 5. Variables CSS genéricas presentes en el módulo
  const cssVariables = {};
  const styleBlocks = document.querySelectorAll('style');
  styleBlocks.forEach(style => {
    const text = style.textContent || '';
    // :root { --x: y; } o .module { --x: y; }
    const varRegex = /(--[\w-]+)\s*:\s*([^;}{]+);/g;
    let m;
    while ((m = varRegex.exec(text)) !== null) {
      const name = m[1].trim();
      const val = m[2].trim();
      if (!cssVariables[name]) cssVariables[name] = val;
    }
  });

  // Mapeo de variables CSS a color_palette canónica
  const colorPalette = extractColorPalette(cssVariables);

  // 6. Theme tags heurísticos (preservar compatibilidad)
  const themeTags = extractThemeTags(htmlContent, moduleRoot);

  // 7. data-asset-type (para library, opcional)
  const assetTypes = [];
  document.querySelectorAll('[data-asset-type]').forEach(el => {
    const t = el.getAttribute('data-asset-type');
    if (t && !assetTypes.includes(t)) assetTypes.push(t);
  });

  // 8. memory_keys (cuando están presentes como guía)
  const memoryKeys = [];
  document.querySelectorAll('[memory_key]').forEach(el => {
    const k = el.getAttribute('memory_key');
    if (k && !memoryKeys.includes(k)) memoryKeys.push(k);
  });

  return {
    data_gemini_id: dataGeminiId,
    module_type: moduleType,
    memory_type: memoryType,
    memory_usage: memoryUsage,
    memory_source: memorySource,
    has_path_placeholder: hasPathPlaceholder,
    has_memory_attributes: moduleRoot !== null,
    all_gemini_ids: allGeminiIds,
    module_metadata: moduleMetadata,
    memory_counts: memoryCounts,
    memory_usages: memoryUsages,
    memory_sources: memorySources,
    placeholder_count: placeholderCount,
    css_variables: cssVariables,
    color_palette: colorPalette,
    theme_tags: themeTags,
    asset_types: assetTypes,
    memory_keys: memoryKeys,
    description: moduleMetadata.descripcion
  };
}

/**
 * Valida un módulo individual según el estándar modular.
 * Reglas estrictas:
 * - Debe tener exactamente un data-gemini-id principal
 * - El data-gemini-id debe corresponder a un module_type conocido
 * - moduleMetadata debe estar presente con tags y descripcion
 * - Si memory_source está presente debe ser "generated" o "library"
 * - Si memory_type="image" o "background" con memory_source, debe tener path="placeholder"
 */
export function validateModule(htmlContent) {
  const meta = extractModuleMetadata(htmlContent);
  const errors = [];
  const warnings = [];

  // data-gemini-id presente
  if (!meta.data_gemini_id) {
    errors.push('Falta data-gemini-id en el módulo.');
  }

  // module_type conocido
  const isStandardType = meta.module_type && Object.keys(VALID_MODULE_IDS).includes(meta.module_type);
  const isExtraType = meta.module_type && EXTRA_MODULE_TYPES.includes(meta.module_type);
  if (meta.data_gemini_id && !isStandardType && !isExtraType) {
    warnings.push(`module_type "${meta.module_type}" no es estándar pero se permite.`);
  }

  // moduleMetadata presente
  if (!meta.module_metadata.tags.length) {
    warnings.push('moduleMetadata.tags vacío o no encontrado. Se recomienda incluir tags en el <script>.');
  }
  if (!meta.module_metadata.descripcion) {
    warnings.push('moduleMetadata.descripcion vacío o no encontrado. Se recomienda incluir descripcion en el <script>.');
  }

  // Coherencia de memory_source
  if (meta.memory_source && !VALID_MEMORY_SOURCES.includes(meta.memory_source)) {
    errors.push(`memory_source inválido: "${meta.memory_source}". Debe ser "generated" o "library".`);
  }

  // memory_type válido
  if (meta.memory_type && !VALID_MEMORY_TYPES.includes(meta.memory_type)) {
    errors.push(`memory_type inválido: "${meta.memory_type}". Debe ser "text", "background" o "image".`);
  }

  // memory_usage válido
  if (meta.memory_usage && !VALID_MEMORY_USAGE.includes(meta.memory_usage)) {
    errors.push(`memory_usage inválido: "${meta.memory_usage}". Debe ser "custom" o "protected".`);
  }

  // Placeholders: si hay memory_source en el módulo root con fondo/imagen y no tiene path, advertir
  if (meta.memory_source && (meta.memory_type === 'background' || meta.memory_type === 'image')) {
    if (!meta.has_path_placeholder) {
      // Verificar placeholders en subelementos
      const totalImgPlaceholders =
        (meta.placeholder_count.generated || 0) + (meta.placeholder_count.library || 0);
      if (totalImgPlaceholders === 0) {
        warnings.push('memory_source presente pero sin path="placeholder" detectado. Las imágenes no se reemplazarán.');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    metadata: meta
  };
}

/**
 * Genera un module_id sugerido a partir del nombre de archivo.
 * Ej: "Hero-01.html" → "hero-01"
 */
export function generateModuleIdFromFilename(filename) {
  return filename
    .toLowerCase()
    .replace(/\.html?$/, '')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Genera un style_name a partir del moduleMetadata.descripcion o filename.
 */
export function generateStyleName(metadata, filename) {
  if (metadata && metadata.module_metadata && metadata.module_metadata.descripcion) {
    const desc = metadata.module_metadata.descripcion;
    // Tomar las primeras 6-8 palabras como style_name
    const words = desc.split(' ').slice(0, 8).join(' ');
    return words.length < 80 ? words : words.slice(0, 80);
  }
  if (filename) {
    return filename.replace(/\.html?$/i, '').replace(/[-_]/g, ' ');
  }
  return 'Módulo sin nombre';
}

/**
 * Analiza un módulo completo y devuelve un objeto listo para INSERT en DB.
 */
export function analyzeModule(htmlContent, moduleTypeHint = null) {
  const meta = extractModuleMetadata(htmlContent);
  const validation = validateModule(htmlContent);

  return {
    module_id: meta.data_gemini_id, // se puede override
    module_type: moduleTypeHint || meta.module_type,
    style_name: generateStyleName(meta, null),
    description: meta.description || meta.module_metadata.descripcion || '',
    tags: JSON.stringify(meta.module_metadata.tags || []),
    descripcion_larga: JSON.stringify(meta.module_metadata.descripcion || ''),
    theme_tags: JSON.stringify(meta.theme_tags || []),
    color_palette: JSON.stringify(meta.color_palette || {}),
    css_variables: JSON.stringify(meta.css_variables || {}),
    has_memory_attributes: meta.has_memory_attributes ? 1 : 0,
    memory_sources: JSON.stringify(meta.memory_sources || {}),
    html_content: htmlContent,
    html_size: Buffer.byteLength(htmlContent, 'utf8'),
    is_valid: validation.isValid,
    errors: validation.errors,
    warnings: validation.warnings,
    metadata: meta
  };
}

function extractColorPalette(cssVars) {
  const palette = {};
  const mapRules = [
    { key: 'bg_primary', patterns: [/primary/i, /^--bg$/, /^--background/i, /^--main$/, /^--base$/, /^--surface$/] },
    { key: 'bg_secondary', patterns: [/secondary/i, /^--bg-secondary$/i, /^--surface-secondary$/i, /^--card$/i] },
    { key: 'accent', patterns: [/accent/i, /highlight/i, /^--gold$/i, /^--cta$/i, /^--accent-color$/] },
    { key: 'text', patterns: [/^--text$/i, /^--fg$/i, /^--color-text$/i, /^--foreground$/i, /^--ink$/i, /^--text-color$/] },
    { key: 'text_secondary', patterns: [/text-secondary/i, /muted/i, /^--text-light$/i, /^--subtext$/i, /^--muted-color$/] }
  ];

  const used = new Set();
  for (const rule of mapRules) {
    for (const [varName, value] of Object.entries(cssVars)) {
      if (used.has(varName)) continue;
      if (rule.patterns.some(p => p.test(varName))) {
        palette[rule.key] = value;
        used.add(varName);
        break;
      }
    }
  }
  for (const [varName, value] of Object.entries(cssVars)) {
    if (used.has(varName)) continue;
    palette[varName] = value;
  }

  return palette;
}

function extractThemeTags(htmlContent, moduleRoot) {
  const tags = new Set();

  // Font families heurísticas
  const fontFamilies = (htmlContent.match(/font-family\s*:\s*([^;"'}]+)/gi) || []).join(' ').toLowerCase();
  if (/playfair|cormorant|serif|bodoni|didot|georgia/.test(fontFamilies)) tags.add('elegante');
  if (/montserrat|poppins|inter|roboto|open\s*sans/.test(fontFamilies)) tags.add('moderno');
  if (/dancing|script|great\s*vibes|parisienne|sacramento/.test(fontFamilies)) tags.add('romantico');
  if (/bebas|oswald|anton|archivo\s*black/.test(fontFamilies)) tags.add('impactante');

  // Técnicas CSS
  if (/backdrop-filter/.test(htmlContent)) tags.add('glassmorphism');
  if (/box-shadow/.test(htmlContent)) tags.add('profundidad');
  const radiusMatches = htmlContent.match(/border-radius\s*:\s*(\d+)/gi) || [];
  for (const r of radiusMatches) {
    const val = parseInt(r.match(/\d+/)[0], 10);
    if (val >= 30) { tags.add('redondeado'); break; }
  }
  if (/linear-gradient|radial-gradient/.test(htmlContent)) tags.add('gradientes');
  if (/@keyframes|animation\s*:|transition\s*:/.test(htmlContent)) tags.add('animado');
  if (/gsap|scrolltrigger|aos|wow\.js|intersectionobserver/i.test(htmlContent)) tags.add('cinematografico');
  if (/position\s*:\s*fixed|position\s*:\s*sticky/i.test(htmlContent)) tags.add('navegacion-fija');

  // Tags del moduleMetadata también como theme_tags (componente cruzado)
  // (extractModuleMetadata ya se encarga, no duplicar aquí)

  return Array.from(tags);
}
