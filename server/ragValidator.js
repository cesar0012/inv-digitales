export const REQUIRED_TAGS = {
  'boda': ['portada', 'padres', 'ubicacion', 'itinerario', 'confirmacion', 'detalles'],
  'xv-anos': ['portada', 'padres', 'ubicacion', 'itinerario', 'confirmacion', 'detalles'],
  'bautizo': ['portada', 'ubicacion', 'confirmacion'],
  'primera-comunion': ['portada', 'ubicacion', 'confirmacion'],
  'confirmacion': ['portada', 'ubicacion', 'confirmacion']
};

export function extractMetadata(htmlContent) {
  const metaMatch = htmlContent.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
  const description = metaMatch ? metaMatch[1].trim() : '';

  const rootBlocks = htmlContent.match(/:root\s*\{[^}]*\}/g) || [];
  const colors = {};
  for (const block of rootBlocks) {
    const varRegex = /(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})/g;
    let vMatch;
    while ((vMatch = varRegex.exec(block)) !== null) {
      if (!colors[vMatch[1]]) {
        colors[vMatch[1]] = vMatch[2];
      }
    }
  }

  const foundTags = [];
  const tagRegex = /data-gemini-id="([^"]+)"/g;
  let tagMatch;
  while ((tagMatch = tagRegex.exec(htmlContent)) !== null) {
    foundTags.push(tagMatch[1]);
  }

  const uiElements = [];
  const modules = new Set(foundTags.map(t => t.split('-')[0]));
  if (modules.has('portada')) uiElements.push('hero');
  if (modules.has('itinerario') || /id=["']itinerario["']/i.test(htmlContent)) uiElements.push('timeline');
  if (modules.has('galeria')) uiElements.push('gallery');
  if (modules.has('confirmacion') || /<form/i.test(htmlContent)) uiElements.push('rsvp');
  if (/<iframe/i.test(htmlContent)) uiElements.push('map');
  if (modules.has('padres')) uiElements.push('parents');
  if (modules.has('vestimenta')) uiElements.push('dresscode');
  if (modules.has('detalles')) uiElements.push('details');
  if (/countdown/i.test(htmlContent)) uiElements.push('countdown');

  const themeTags = extractThemeTags(htmlContent, modules);
  const colorPalette = extractColorPalette(colors);

  return {
    description,
    colors,
    ui_elements: uiElements,
    found_tags: foundTags,
    theme_tags: themeTags,
    color_palette: colorPalette
  };
}

function extractThemeTags(htmlContent, modules) {
  const tags = new Set();

  const keywordsMatch = htmlContent.match(/<meta\s+name=["']keywords["']\s+content=["']([^"']*)["']/i);
  if (keywordsMatch) {
    keywordsMatch[1].split(',').forEach(k => {
      const t = k.trim().toLowerCase();
      if (t) tags.add(t);
    });
  }

  const fontFamilies = (htmlContent.match(/font-family\s*:\s*([^;"'}]+)/gi) || []).join(' ').toLowerCase();
  if (/playfair|cormorant|serif|bodoni|didot/.test(fontFamilies)) tags.add('elegante');
  if (/montserrat|poppins|inter|roboto|open\s*sans/.test(fontFamilies)) tags.add('moderno');
  if (/dancing|script|great\s*vibes|parisienne|sacramento/.test(fontFamilies)) tags.add('romantico');
  if (/bebas|oswald|anton|archivo\s*black/.test(fontFamilies)) tags.add('impactante');

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

  const moduleLabels = {
    portada: 'hero', padres: 'padres', ubicacion: 'ubicacion',
    itinerario: 'itinerario', vestimenta: 'vestimenta', detalles: 'detalles',
    galeria: 'galeria', confirmacion: 'confirmacion', padrinos: 'padrinos',
    corte: 'corte', countdown: 'cuenta-regresiva', regalos: 'regalos'
  };
  for (const m of modules) {
    if (moduleLabels[m]) tags.add(moduleLabels[m]);
  }

  return Array.from(tags);
}

function extractColorPalette(colors) {
  const palette = {};
  const mapRules = [
    { key: 'bg_primary', patterns: [/primary/i, /^--bg$/, /^--background/i, /^--main$/, /^--base$/] },
    { key: 'bg_secondary', patterns: [/secondary/i, /^--bg-secondary$/i, /^--surface$/i, /^--card$/i] },
    { key: 'accent', patterns: [/accent/i, /highlight/i, /^--gold$/i, /^--cta$/i] },
    { key: 'text', patterns: [/^--text$/i, /^--fg$/i, /^--color-text$/i, /^--foreground$/i, /^--ink$/i] },
    { key: 'text_secondary', patterns: [/text-secondary/i, /muted/i, /^--text-light$/i, /^--subtext$/i] }
  ];

  const used = new Set();
  for (const rule of mapRules) {
    for (const [varName, value] of Object.entries(colors)) {
      if (used.has(varName)) continue;
      if (rule.patterns.some(p => p.test(varName))) {
        palette[rule.key] = value;
        used.add(varName);
        break;
      }
    }
  }

  for (const [varName, value] of Object.entries(colors)) {
    if (used.has(varName)) continue;
    palette[varName] = value;
  }

  return palette;
}

export function validateTemplate(htmlContent, eventType) {
  const required = REQUIRED_TAGS[eventType] || [];

  const foundTags = [];
  const tagRegex = /data-gemini-id="([^"]+)"/g;
  let tagMatch;
  while ((tagMatch = tagRegex.exec(htmlContent)) !== null) {
    foundTags.push(tagMatch[1]);
  }

  const presentModules = new Set(foundTags.map(t => t.split('-')[0]));
  const found = required.filter(m => presentModules.has(m));
  const missing = required.filter(m => !presentModules.has(m));

  return {
    isValid: missing.length === 0,
    totalRequired: required.length,
    foundCount: found.length,
    missing,
    found
  };
}

export function analyzeTemplate(htmlContent, eventType) {
  const metadata = extractMetadata(htmlContent);
  const validation = validateTemplate(htmlContent, eventType);
  return {
    ...metadata,
    ...validation,
    eventType
  };
}