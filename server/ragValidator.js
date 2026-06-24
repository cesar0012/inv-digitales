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

  return {
    description,
    colors,
    ui_elements: uiElements,
    found_tags: foundTags
  };
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