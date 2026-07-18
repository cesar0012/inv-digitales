import https from 'https';
import db from './database.js';
import { CODER_SYSTEM_PROMPT, ADAPTER_SYSTEM_PROMPT } from './agents-prompt.js';
import { parseHTML } from 'linkedom';

const fetchNoSSL = async (url, options = {}) => {
  return new Promise((resolve, reject) => {
    const agent = new https.Agent({ rejectUnauthorized: false });
    resolve(fetch(url, { ...options, agent }));
  });
};

const LAYOUT_OPTIONS = [
  'full-screen-hero', 'split-screen', 'card-based', 'editorial-magazine', 'asymmetrical',
  'overlapping-sections', 'parallax-layers', 'horizontal-scroll-segments', 'masonry-grid',
  'centered-timeline', 'side-by-side-columns', 'cinematic-panes', 'scrapbook', 'minimalist-center',
  'diagonal-sections', 'layered-cards', 'wave-sections', 'storybook', 'poster-style', 'collage',
  'chaotic-collage', 'overlap-photos', 'asymmetric-bleed', 'scattered-polaroids',
  'broken-grid', 'diagonal-clash', 'mosaic-chaos', 'layered-z-messy'
];

const TYPOGRAPHY_OPTIONS = [
  'script-serif', 'display-sans', 'handwritten-clean', 'blackletter-modern', 'elegant-serif-pair',
  'condensed-sans-expanded', 'mono-display', 'vintage-serif', 'modern-geometric', 'calligraphic-body',
  'art-deco-display', 'boho-handwritten', 'retro-slab', 'luxury-thin', 'playful-rounded',
  'brutalist-mix', 'collage-typography', 'extreme-contrast'
];

const ANIMATION_OPTIONS = [
  'fade-in-stagger', 'slide-up-reveal', 'parallax-scroll', 'zoom-on-enter', 'flip-cards',
  'typewriter-text', 'floating-elements', 'particle-shimmer', 'wave-motion', 'rotate-reveal',
  'curtain-open', 'bounce-in', 'elastic-scale', 'glitch-entrance', 'watercolor-bleed',
  'stamp-reveal', 'ripple-effect', 'morph-shapes', 'cinematic-wipe', 'soft-drift',
  'chaotic-entrance', 'collage-assemble', 'photo-scatter', 'grunge-reveal'
];

const COLOR_STRATEGIES = [
  'gradient-flow', 'monochrome-accent', 'duotone', 'warm-palette', 'cool-palette',
  'pastel-spectrum', 'jewel-tones', 'earth-tones', 'neon-accents', 'muted-elegant',
  'high-contrast', 'tonal-layering', 'complementary-pop', 'analogous-harmony', 'triadic-vibrant',
  'user-palette-gradient', 'user-palette-duotone', 'user-palette-accent', 'user-palette-layered'
];

const SECTION_FLOW_OPTIONS = [
  'linear-classic', 'alternating-bg', 'overlay-sections', 'card-stack', 'accordion-reveal',
  'timeline-horizontal', 'mosaic-grid', 'scroll-snap-sections', 'fullbleed-interleaved', 'wave-divider',
  'chaotic-overlap', 'collage-flow', 'asymmetric-breaks'
];

const MODULES = [
  'portada', 'padres', 'countdown', 'itinerario', 'ubicacion',
  'padrinos', 'corte', 'vestimenta', 'regalos', 'confirmacion'
];

const PHOTO_TREATMENTS = [
  'none', 'grayscale', 'sepia', 'high-contrast', 'blur-edges', 'duotone',
  'vignette', 'saturate-boost', 'fade-overlay', 'clip-diagonal', 'clip-circle',
  'clip-polygon', 'rotate-slight', 'rotate-heavy', 'polaroid-frame', 'torn-edges',
  'double-exposure', 'halftone', 'noise-texture', 'color-invert-accent'
];

const CHAOS_TOKENS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
  'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T'
];

const SPACING_PATTERNS = [
  'py-32 gap-10', 'py-16 gap-6', 'py-40 gap-4', 'py-12 gap-12',
  'py-48 gap-2', 'py-20 gap-8', 'py-8 gap-16', 'py-24 gap-3',
  'py-28 gap-14', 'py-36 gap-6'
];

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

const pickN = (arr, n) => {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, n);
};

const pickDifferent = (arr, exclude) => {
  const filtered = arr.filter(x => x !== exclude);
  return filtered.length > 0 ? pickRandom(filtered) : pickRandom(arr);
};

const generateDesignFingerprint = (eventType = '', theme = '', visualStyle = '', mood = '', primaryColor = '', secondaryColor = '', ragTemplate = null) => {
  let layoutPool, typographyPool, animationPool, colorStrategyPool, sflowPool, aestheticFamily, moduleSensations;

  if (ragTemplate) {
    const lr = ragTemplate.layout_rules || {};
    const ar = ragTemplate.animation_rules || {};
    const ts = ragTemplate.typography_scale || {};
    const cp = ragTemplate.color_palette || {};
    const vp = ragTemplate.variation_params || {};

    layoutPool = Array.isArray(lr.layouts) && lr.layouts.length > 0 ? lr.layouts : LAYOUT_OPTIONS;
    animationPool = Array.isArray(ar.animations) && ar.animations.length > 0 ? ar.animations : ANIMATION_OPTIONS;
    typographyPool = Array.isArray(ts.options) && ts.options.length > 0 ? ts.options : TYPOGRAPHY_OPTIONS;
    colorStrategyPool = Array.isArray(cp.strategies) && cp.strategies.length > 0 ? cp.strategies : COLOR_STRATEGIES;
    sflowPool = Array.isArray(vp.section_flows) && vp.section_flows.length > 0 ? vp.section_flows : SECTION_FLOW_OPTIONS;
    aestheticFamily = lr.aesthetic_family || null;
    moduleSensations = ar.module_sensations || null;
  } else {
    layoutPool = LAYOUT_OPTIONS;
    typographyPool = TYPOGRAPHY_OPTIONS;
    animationPool = ANIMATION_OPTIONS;
    colorStrategyPool = COLOR_STRATEGIES;
    sflowPool = SECTION_FLOW_OPTIONS;
    aestheticFamily = null;
    moduleSensations = null;
  }

  const hasUserColors = primaryColor && secondaryColor;
  const userPaletteStrategies = ['user-palette-gradient', 'user-palette-duotone', 'user-palette-accent', 'user-palette-layered'];

  const isLayoutOutlier = Math.random() < 0.15;
  const isAnimationOutlier = Math.random() < 0.15;

  const primaryLayout = isLayoutOutlier ? pickRandom(LAYOUT_OPTIONS) : pickRandom(layoutPool);
  const primaryTypography = pickRandom(typographyPool);
  const primaryAnimation = isAnimationOutlier ? pickRandom(ANIMATION_OPTIONS) : pickRandom(animationPool);
  const colorStrategy = hasUserColors
    ? (Math.random() < 0.7 ? pickRandom(userPaletteStrategies) : pickRandom(colorStrategyPool))
    : pickRandom(colorStrategyPool);
  const sectionFlow = pickRandom(sflowPool);

  const secondaryLayout = pickDifferent(layoutPool, primaryLayout);
  const tertiaryLayout = pickDifferent(layoutPool, primaryLayout);
  const secondaryTypography = pickDifferent(typographyPool, primaryTypography);
  const secondaryAnimation = pickDifferent(animationPool, primaryAnimation);
  const altColorStrategy = hasUserColors
    ? pickDifferent(userPaletteStrategies, colorStrategy)
    : pickDifferent(colorStrategyPool, colorStrategy);

  const layoutRotation = [primaryLayout, secondaryLayout, tertiaryLayout];
  const typographyRotation = [primaryTypography, secondaryTypography, pickDifferent(typographyPool, primaryTypography)];
  const animationRotation = [primaryAnimation, secondaryAnimation, pickDifferent(animationPool, primaryAnimation)];

  const moduleAssignments = MODULES.map((mod, i) => {
    const modLayout = layoutRotation[i % layoutRotation.length];
    const modTypography = typographyRotation[i % typographyRotation.length];
    const modAnimation = animationRotation[i % animationRotation.length];
    const modPhoto = pickRandom(PHOTO_TREATMENTS);
    const modSpacing = pickRandom(SPACING_PATTERNS);
    return `${mod}:${modLayout}+${modTypography}+${modAnimation}+photo:${modPhoto}+${modSpacing}`;
  });

  const chaosSeed = pickN(CHAOS_TOKENS, 5).join('');

  const fingerprint = [
    `LAYOUT: ${primaryLayout}`,
    `LAYOUT_VARIANTS: ${secondaryLayout}, ${tertiaryLayout}`,
    `TYPOGRAPHY: ${primaryTypography} (primary) + ${secondaryTypography} (accent)`,
    `ANIMATION: ${primaryAnimation} (primary) + ${secondaryAnimation} (secondary)`,
    `COLOR_STRATEGY: ${colorStrategy} (primary) + ${altColorStrategy} (accent sections)`,
    `SECTION_FLOW: ${sectionFlow}`,
  ];

  if (aestheticFamily) fingerprint.push(`AESTHETIC_FAMILY: ${aestheticFamily}`);
  if (moduleSensations) fingerprint.push(`MODULE_SENSATIONS: ${moduleSensations}`);

  fingerprint.push(
    `MODULE_LAYOUTS: ${moduleAssignments.join(' | ')}`,
    `CHAOS_SEED: ${chaosSeed}`,
    `VARIATION_DIRECTIVE: Each module has an EXPLICIT per-module assignment in MODULE_LAYOUTS. You MUST follow the layout, typography, animation, photo treatment, and spacing specified for EACH module. NO two adjacent modules may share the same layout. The CHAOS_SEED is a unique token for this invitation — use it to seed visual randomness (e.g. rotation angles, offset values, clip-path variations, z-index stacking).`,
  );

  if (primaryColor) fingerprint.push(`USER_PRIMARY_COLOR: ${primaryColor}`);
  if (secondaryColor) fingerprint.push(`USER_SECONDARY_COLOR: ${secondaryColor}`);
  if (visualStyle) fingerprint.push(`VISUAL_STYLE: ${visualStyle}`);
  if (mood) fingerprint.push(`MOOD: ${mood}`);
  if (theme) fingerprint.push(`USER_THEME: ${theme}`);

  return {
    layout: primaryLayout,
    typography: primaryTypography,
    animation: primaryAnimation,
    colorStrategy,
    sectionFlow,
    aestheticFamily,
    moduleSensations,
    raw: fingerprint.join(' | ')
  };
};

const cleanHtml = (text) => {
  if (!text) return '';
  let cleanedHtml = text;
  cleanedHtml = cleanedHtml.replace(/```html\s*/g, '').replace(/```\s*/g, '').replace(/```/g, '');
  const htmlMatch = cleanedHtml.match(/<!DOCTYPE html>[\s\S]*<\/html>/i);
  if (htmlMatch) return htmlMatch[0];
  return cleanedHtml;
};

const fixTailwindBgGemini = (html) => {
  if (!html) return html;
  const bgTailwindRegex = /class="([^"]*?)bg-\[url\('GEMINI_GENERATE:([^']+)'\)\]([^"]*?)"/gi;
  let result = html;
  let match;
  let count = 0;
  while ((match = bgTailwindRegex.exec(html)) !== null) {
    const before = match[1];
    const description = match[2];
    const after = match[3];
    const newStyle = `style="background-image: url('GEMINI_GENERATE:${description}'); background-size: cover; background-position: center;"`;
    const classAttr = `class="${before}${after}"`;
    result = result.replace(match[0], `${classAttr} ${newStyle}`);
    count++;
  }
  if (count > 0) console.log(`[COMPILER] Fixed ${count} bg-[url('GEMINI_GENERATE:...')] → inline style`);
  return result;
};

const injectMandatoryLibraries = (html) => {
  if (!html || !html.includes('<!DOCTYPE')) return html;
  let result = html;

  const hasThreeJsCdn = result.includes('three.min.js');
  const hasTsParticlesCdn = result.includes('tsparticles');
  const hasGSAPCdn = result.includes('gsap.min.js');
  const hasScrollTriggerCdn = result.includes('ScrollTrigger');
  const hasAnimeCdn = result.includes('anime.min.js');
  const usesThreeJs = result.includes('THREE.');
  const usesTsParticles = result.includes('tsParticles.load') || result.includes('tsParticles.loadJSON');
  const usesGSAP = result.includes('gsap.') || result.includes('gsap.registerPlugin');
  const usesScrollTrigger = result.includes('ScrollTrigger');
  const usesAnime = result.includes('anime(') || result.includes('anime.timeline');

  const missingScripts = [];
  if (usesThreeJs && !hasThreeJsCdn) {
    missingScripts.push('<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>');
  }
  if (usesTsParticles && !hasTsParticlesCdn) {
    missingScripts.push('<script src="https://cdn.jsdelivr.net/npm/tsparticles-engine@2/tsparticles.engine.min.js"></script>');
    missingScripts.push('<script src="https://cdn.jsdelivr.net/npm/tsparticles@2/tsparticles.bundle.min.js"></script>');
  }
  if (usesGSAP && !hasGSAPCdn) {
    missingScripts.push('<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>');
  }
  if (usesScrollTrigger && !hasScrollTriggerCdn) {
    missingScripts.push('<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js"></script>');
  }
  if (usesAnime && !hasAnimeCdn) {
    missingScripts.push('<script src="https://cdn.jsdelivr.net/npm/animejs@3.2.2/lib/anime.min.js"></script>');
  }

  if (missingScripts.length > 0) {
    const injection = '\n    <!-- SAFETY NET: Missing CDN injected -->\n    ' + missingScripts.join('\n    ') + '\n';
    result = result.replace('</head>', injection + '</head>');
    console.log(`[COMPILER] Injected ${missingScripts.length} missing CDN scripts`);
  }
  return result;
};

const injectEditorMetadata = (html, eventType, theme, primaryColor, secondaryColor) => {
  if (!html || !html.includes('<!DOCTYPE')) return html;
  if (!eventType && !theme && !primaryColor && !secondaryColor) return html;

  const existingRegex = /<script type="application\/json" id="invitation-editor-metadata">[\s\S]*?<\/script>/g;
  const clean = html.replace(existingRegex, '');

  const metadata = {
    version: 1,
    createdAt: new Date().toISOString(),
    modifiedAt: new Date().toISOString(),
    eventType: eventType || '',
    theme: theme || '',
    primaryColor: primaryColor || '#f472b6',
    secondaryColor: secondaryColor || '#fb7185',
    hiddenModules: [],
    elementStyles: {}
  };

  const scriptTag = `<script type="application/json" id="invitation-editor-metadata">${JSON.stringify(metadata)}</script>`;
  console.log('[COMPILER] Injected editor metadata:', JSON.stringify({ eventType, theme, primaryColor, secondaryColor }));

  if (clean.includes('</body>')) {
    return clean.replace('</body>', `${scriptTag}\n</body>`);
  }
  return clean + '\n' + scriptTag;
};

const fixInvalidImagePaths = (html, imageFiles) => {
  if (!html || !imageFiles || imageFiles.length === 0) return html;
  const imgSrcRegex = /src="\/img\/([^/]+)\/([^"]+)"/gi;
  let result = html;
  let fixCount = 0;
  result = result.replace(imgSrcRegex, (match, folder, filename) => {
    const validFile = imageFiles.find(f => f.folder === folder && f.filename === filename);
    if (validFile) return match;
    const folderFiles = imageFiles.filter(f => f.folder === folder);
    if (folderFiles.length === 0) return match;
    const replacement = folderFiles[0].filename;
    fixCount++;
    console.log(`[COMPILER] Fixed invalid image: /img/${folder}/${filename} → /img/${folder}/${replacement}`);
    return `src="/img/${folder}/${replacement}"`;
  });
  if (fixCount > 0) console.log(`[COMPILER] Fixed ${fixCount} invalid image paths`);
  return result;
};

// === RAG FUNCTIONS ===
const queryRAGTemplate = async (eventType, theme) => {
  try {
    let query = 'SELECT * FROM knowledge_base WHERE is_active = 1';
    const params = [];

    if (eventType) {
      query += ' AND category = ?';
      params.push(eventType);
    }

    if (theme) {
      query += ' AND (style_name LIKE ? OR theme_tags LIKE ? OR description LIKE ?)';
      params.push(`%${theme}%`);
      params.push(`%${theme}%`);
      params.push(`%${theme}%`);
    }

    query += ' ORDER BY RANDOM() LIMIT 1';

    const template = db.prepare(query).get(...params);

    if (!template) {
      console.log('[RAG] No se encontró plantilla para:', { eventType, theme });
      return null;
    }

    console.log('[RAG] Plantilla encontrada:', template.style_name);

    // Parsear JSON fields
    return {
      ...template,
      theme_tags: JSON.parse(template.theme_tags || '[]'),
      color_palette: JSON.parse(template.color_palette || '{}'),
      typography_scale: JSON.parse(template.typography_scale || '{}'),
      layout_rules: JSON.parse(template.layout_rules || '{}'),
      modules_def: JSON.parse(template.modules_def || '{}'),
      base_cdns: JSON.parse(template.base_cdns || '[]'),
      js_dependencies: JSON.parse(template.js_dependencies || '[]'),
      animation_rules: JSON.parse(template.animation_rules || '{}'),
      variation_params: JSON.parse(template.variation_params || '{}')
    };
  } catch (error) {
    console.error('[RAG] Error query:', error);
    return null;
  }
};

const buildRAGPrompt = (ragTemplate) => {
  if (!ragTemplate) return '';

  const parts = [];

  parts.push(`===== RAG TEMPLATE: ${ragTemplate.style_name} =====`);
  parts.push(`Description: ${ragTemplate.description}`);
  parts.push(`Category: ${ragTemplate.category}`);
  parts.push(`Theme Tags: ${ragTemplate.theme_tags.join(', ')}`);

  // Design Tokens
  if (ragTemplate.color_palette && Object.keys(ragTemplate.color_palette).length > 0) {
    parts.push(`\nColor Palette:`);
    Object.entries(ragTemplate.color_palette).forEach(([key, value]) => {
      parts.push(`  ${key}: ${value}`);
    });
  }

  if (ragTemplate.typography_scale) {
    parts.push(`\nTypography:`);
    if (ragTemplate.typography_scale.display) {
      parts.push(`  Display: ${ragTemplate.typography_scale.display}`);
    }
    if (ragTemplate.typography_scale.ui) {
      parts.push(`  UI: ${ragTemplate.typography_scale.ui}`);
    }
  }

  if (ragTemplate.layout_rules) {
    parts.push(`\nLayout Rules:`);
    Object.entries(ragTemplate.layout_rules).forEach(([key, value]) => {
      parts.push(`  ${key}: ${value}`);
    });
  }

  if (ragTemplate.animation_rules) {
    parts.push(`\nAnimation Rules:`);
    Object.entries(ragTemplate.animation_rules).forEach(([key, value]) => {
      parts.push(`  ${key}: ${value}`);
    });
  }

  if (ragTemplate.variation_params) {
    parts.push(`\nVariation Parameters:`);
    Object.entries(ragTemplate.variation_params).forEach(([key, value]) => {
      parts.push(`  ${key}: ${JSON.stringify(value)}`);
    });
  }

  parts.push(`===== END RAG TEMPLATE =====\n`);

  return parts.join('\n');
};

const trackRAGUsage = (templateId, userId, eventType) => {
  try {
    db.prepare(`
      INSERT INTO knowledge_base_usage (template_id, user_id, event_type)
      VALUES (?, ?, ?)
    `).run(templateId, userId, eventType);
  } catch (error) {
    console.error('[RAG] Error tracking usage:', error);
  }
};

// === TEMPLATE ADAPTATION FLOW ===

const getTemplatesWithHtmlContent = () => {
  try {
    const rows = db.prepare(`
      SELECT id, style_name, description, category, theme_tags, color_palette,
             typography_scale, layout_rules, modules_def, base_cdns,
             js_dependencies, animation_rules, variation_params, html_content
      FROM knowledge_base
      WHERE is_active = 1 AND html_content IS NOT NULL AND html_content != ''
    `).all();

    if (!rows || rows.length === 0) {
      console.log('[RAG-TEMPLATE] ❌ No hay templates con html_content en la BD');
      return [];
    }

    console.log(`[RAG-TEMPLATE] 📋 ${rows.length} template(s) con html_content:`);
    rows.forEach(r => {
      console.log(`[RAG-TEMPLATE]   - id=${r.id} "${r.style_name}" category="${r.category}" html=${r.html_content.length} chars`);
    });

    return rows.map(row => {
      let parsed = {};
      try { parsed.theme_tags = JSON.parse(row.theme_tags || '[]'); } catch { parsed.theme_tags = []; }
      try { parsed.color_palette = JSON.parse(row.color_palette || '{}'); } catch { parsed.color_palette = {}; }
      try { parsed.typography_scale = JSON.parse(row.typography_scale || '{}'); } catch { parsed.typography_scale = {}; }
      try { parsed.layout_rules = JSON.parse(row.layout_rules || '{}'); } catch { parsed.layout_rules = {}; }
      try { parsed.modules_def = JSON.parse(row.modules_def || '{}'); } catch { parsed.modules_def = {}; }
      try { parsed.base_cdns = JSON.parse(row.base_cdns || '[]'); } catch { parsed.base_cdns = []; }
      try { parsed.js_dependencies = JSON.parse(row.js_dependencies || '[]'); } catch { parsed.js_dependencies = []; }
      try { parsed.animation_rules = JSON.parse(row.animation_rules || '{}'); } catch { parsed.animation_rules = {}; }
      try { parsed.variation_params = JSON.parse(row.variation_params || '{}'); } catch { parsed.variation_params = {}; }
      return { ...row, ...parsed };
    });
  } catch (error) {
    console.error('[ADAPTER] Error fetching templates with html_content:', error);
    return [];
  }
};

const buildTemplateSelectionContext = (templates) => {
  return templates.map(t => {
    const cp = t.color_palette || {};
    const paletteStr = typeof cp === 'object' && !Array.isArray(cp)
      ? Object.entries(cp).slice(0, 6).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ')
      : '';
    const modules = t.modules_def || {};
    const modulesStr = typeof modules === 'object' && !Array.isArray(modules) && modules.sections
      ? (Array.isArray(modules.sections) ? modules.sections.join(', ') : Object.keys(modules.sections).join(', '))
      : '';
    const animRules = t.animation_rules || {};
    const animStr = typeof animRules === 'object' && !Array.isArray(animRules)
      ? Object.entries(animRules).map(([k, v]) => `${k}:${v}`).join(', ')
      : '';
    const varParams = t.variation_params || {};
    const layoutsStr = varParams.layouts ? (Array.isArray(varParams.layouts) ? varParams.layouts.join(', ') : '') : '';
    const animsStr = varParams.animations ? (Array.isArray(varParams.animations) ? varParams.animations.join(', ') : '') : '';
    return `ID: ${t.id}
  style_name: ${t.style_name}
  description: ${(t.description || '').slice(0, 200)}
  category: ${t.category}
  theme_tags: ${(t.theme_tags || []).join(', ')}
  color_palette: ${paletteStr}
  modules: ${modulesStr}
  animation_rules: ${animStr}
  layouts: ${layoutsStr}
  animations: ${animsStr}
  html_size: ${t.html_content ? t.html_content.length : 0} chars`;
  }).join('\n---\n');
};

const selectTemplateWithGemini = async (prompt, eventType, theme, templates, apiKey, model) => {
  const selectionPrompt = `You are a template selector for digital invitation designs. Given a user's event request and a list of available templates, select the SINGLE best-matching template to adapt and amplify.

Selection criteria (in priority order):
1. Category match (boda→boda, xv→xv, etc.) — HIGHEST priority
2. Theme/mood alignment (tropical, boho, vintage, art deco, minimalist, etc.)
3. DRAMA AND COMPLEXITY PREFERENCE — STRONGLY prefer templates with:
   - Non-linear scroll systems (chronicle, phase-based, panel-based, cinematic)
   - Ornamental/ceremonial animation rules (ornamental, seal, chronicle, intro_screen)
   - Complex layout systems (panels, chronicle, cinematic, mosaic, decree)
   - Larger html_size (more complex templates have more elements to amplify)
   - Templates with "minimal", "sereno", or "simple" in their description should be DEPRIORITIZED unless the user explicitly asks for minimalism.
4. Color palette compatibility with user's requested colors (if any)
5. Module coverage (template has the sections the user needs)

When in doubt between two equally matching templates, ALWAYS choose the one with MORE drama, MORE animation complexity, and MORE ornamental elements. The adapter will amplify whatever template is chosen, so starting from a more dramatic base produces better results.

Return ONLY the template ID as a number. No explanation, no markdown, no text — just the numeric ID.

User event type: ${eventType || '(not specified)'}
User theme/mood: ${theme || '(not specified)'}
User prompt (truncated): ${prompt.slice(0, 1500)}

Available templates:
${buildTemplateSelectionContext(templates)}

Respond with ONLY the ID number of the best template:`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const response = await fetchNoSSL(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: selectionPrompt }] }],
      generationConfig: {
        temperature: 0.2,
        topP: 0.9,
        topK: 20,
        maxOutputTokens: 500
      }
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Template selection API error: ${error.error?.message || response.status}`);
  }

  const data = await response.json();

  // Modelos "thinking" pueden poner razonamiento en parts[0] (thought) y la
  // respuesta real en parts[1]+. Buscar el ID en todos los parts no-thought.
  const allParts = data.candidates?.[0]?.content?.parts || [];
  const contentText = allParts.filter(p => p?.text && !p?.thought).map(p => p.text).join(' ');
  console.log(`[ADAPTER] Selection response: ${allParts.length} part(s), content text: "${contentText.slice(0, 100)}"`);

  const match = contentText.match(/\d+/);
  if (!match) throw new Error(`Could not parse template ID from: ${contentText}`);

  const selectedId = parseInt(match[0], 10);
  const selected = templates.find(t => t.id === selectedId);
  if (!selected) throw new Error(`Selected ID ${selectedId} not in template list`);

  console.log(`[ADAPTER] Gemini selected template: ${selected.style_name} (ID: ${selectedId})`);
  return selected;
};

const adaptTemplateWithGemini = async (template, prompt, apiKey, model, options) => {
  const { eventType, theme, primaryColor, secondaryColor, visualStyle, mood, imageFiles, promptInstruction } = options;

  const currentDate = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const promptWithDate = prompt.replace(/SYSTEM_TIMESTAMP:\s*\S+/, `SYSTEM_TIMESTAMP: ${currentDate}`);

  const userContextParts = [
    `===== USER EVENT REQUEST =====`,
    `Event type: ${eventType || '(infer from prompt)'}`,
    `Theme: ${theme || '(infer from prompt)'}`,
  ];
  if (primaryColor) userContextParts.push(`USER_PRIMARY_COLOR: ${primaryColor}`);
  if (secondaryColor) userContextParts.push(`USER_SECONDARY_COLOR: ${secondaryColor}`);
  if (visualStyle) userContextParts.push(`VISUAL_STYLE: ${visualStyle}`);
  if (mood) userContextParts.push(`MOOD: ${mood}`);
  userContextParts.push(`===== END USER EVENT REQUEST =====`);

  const templateMetaParts = [
    `===== TEMPLATE METADATA =====`,
    `style_name: ${template.style_name}`,
    `description: ${template.description || ''}`,
    `category: ${template.category}`,
    `theme_tags: ${(template.theme_tags || []).join(', ')}`,
  ];
  if (template.color_palette && Object.keys(template.color_palette).length > 0) {
    userContextParts.push(`\nTemplate color_palette:`);
    Object.entries(template.color_palette).forEach(([k, v]) => templateMetaParts.push(`  ${k}: ${JSON.stringify(v)}`));
  }
  templateMetaParts.push(`===== END TEMPLATE METADATA =====`);

  const imageContext = promptInstruction ? `\n\n${promptInstruction}` : '';
  const userContext = userContextParts.join('\n');
  const templateMeta = templateMetaParts.join('\n');

  const maxTemplateSize = 15000;
  const templateContent = template.html_content.length > maxTemplateSize
    ? template.html_content.substring(0, maxTemplateSize) + '\n...[TEMPLATE TRUNCATED — CONTINUE WITH SAME STRUCTURE]...'
    : template.html_content;

  const fullPrompt = `${ADAPTER_SYSTEM_PROMPT}\n\n${userContext}\n\n${templateMeta}${imageContext}\n\n===== USER PROMPT =====\n${promptWithDate}\n===== END USER PROMPT =====\n\n===== BASE TEMPLATE HTML (ADAPT THIS) =====\n${templateContent}\n===== END BASE TEMPLATE HTML =====\n\nNow output the complete adapted HTML:`;

  const parts = [{ text: fullPrompt }];

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  console.log(`[ADAPTER] Calling Gemini for adaptation | Template: ${template.style_name} | Prompt length: ${fullPrompt.length}`);

  const response = await fetchNoSSL(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      contents: [{ parts: parts }],
      generationConfig: {
        temperature: 0.9,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 1500000
      }
    })
  });

  console.log('[ADAPTER] HTTP:', response.status);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Adaptation API error: ${error.error?.message || response.status}`);
  }

  const data = await response.json();

  // Modelos "thinking" pueden poner razonamiento en parts[0] (thought) y el
  // HTML real en parts[1]+. Concatenar solo parts que NO son thought.
  const allParts = data.candidates?.[0]?.content?.parts || [];
  console.log(`[ADAPTER] Response: ${allParts.length} part(s)`);
  allParts.forEach((p, i) => {
    const textLen = p?.text?.length || 0;
    const hasThought = p?.thought ? ' [thought]' : '';
    console.log(`[ADAPTER] Part[${i}]: ${textLen} chars${hasThought}`);
  });

  const contentParts = allParts.filter(p => p?.text && !p?.thought);
  const generatedText = contentParts.map(p => p.text).join('\n');
  console.log('[ADAPTER] Output length:', generatedText?.length || 0);

  if (!generatedText || generatedText.length < 50) {
    console.error('[ADAPTER] ❌ Respuesta vacía o muy corta. Data:', JSON.stringify(data).slice(0, 500));
    throw new Error('Empty response from Gemini during adaptation');
  }

  return generatedText;
};

// === REQUIRED IMAGES GUARANTEE ===
const normalizeEventType = (eventType) => {
  if (!eventType) return 'boda';
  const n = eventType.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  if (n.includes('boda') || n.includes('wedding') || n.includes('matrimo')) return 'boda';
  if (n.includes('xv') || n.includes('quince') || n.includes('15')) return 'xv-anos';
  if (n.includes('cumple') || n.includes('birthday')) return 'cumpleanos';
  if (n.includes('bauti') || n.includes('bautism')) return 'bautizo';
  if (n.includes('comunion') || n.includes('comunio')) return 'primera-comunion';
  if (n.includes('confirmac')) return 'confirmacion';
  return 'boda';
};

const IMAGE_DESCRIPTIONS = {
  'boda': {
    'portada-imagen': 'Elegant wedding couple portrait with romantic backdrop, bride and groom in formal attire, complete scene with full background',
    'padres-imagen': 'Elegant family celebration, parents and family members in formal attire at wedding, complete scene',
    'ubicacion-imagen': 'Beautiful wedding venue exterior, elegant event space with decorations, complete scene with full background'
  },
  'xv-anos': {
    'portada-imagen': 'Beautiful quinceanera portrait in elegant ball gown, celebratory backdrop, complete scene with full background',
    'padres-imagen': 'Family with quinceanera in formal attire, loving celebration scene, complete scene',
    'ubicacion-imagen': 'Elegant party hall decorated for quinceanera celebration, complete scene with full background'
  },
  'cumpleanos': {
    'portada-imagen': 'Joyful birthday celebration scene with cake and decorations, festive atmosphere, complete scene with full background',
    'padres-imagen': 'Family at birthday celebration, warm and happy scene, complete scene',
    'ubicacion-imagen': 'Birthday party venue with festive decorations, complete scene with full background'
  },
  'bautizo': {
    'portada-imagen': 'Baby baptism scene in church, soft and tender atmosphere, complete scene with full background',
    'padres-imagen': 'Parents holding baby at baptism, loving family scene, complete scene',
    'ubicacion-imagen': 'Church interior decorated for baptism ceremony, complete scene with full background'
  },
  'primera-comunion': {
    'portada-imagen': 'First communion child in white attire, church setting, serene atmosphere, complete scene with full background',
    'padres-imagen': 'Family with child at first communion, proud and loving scene, complete scene',
    'ubicacion-imagen': 'Church interior for first communion ceremony, complete scene with full background'
  },
  'confirmacion': {
    'portada-imagen': 'Confirmation scene with young person in formal attire, church setting, complete scene with full background',
    'padres-imagen': 'Family at confirmation ceremony, proud celebration scene, complete scene',
    'ubicacion-imagen': 'Church interior for confirmation ceremony, complete scene with full background'
  }
};

export const ensureRequiredImages = async (html, eventType, imageApiKey, imageModel) => {
  if (!imageApiKey) {
    console.log('[COMPILER] ⚠️ No image API key, skipping required images check');
    return html;
  }

  const normalizedEvent = normalizeEventType(eventType);
  const descriptions = IMAGE_DESCRIPTIONS[normalizedEvent] || IMAGE_DESCRIPTIONS['boda'];
  let result = html;

  console.log(`[COMPILER] 🔍 Checking required images for eventType="${eventType}" → normalized="${normalizedEvent}"`);

  for (const [id, description] of Object.entries(descriptions)) {
    const hasImage = result.includes(`data-gemini-id="${id}"`) ||
                     result.includes(`data-gemini-id='${id}'`);

    if (!hasImage) {
      console.log(`[COMPILER] ⚠️ Missing ${id}. Generating with NanoBanana...`);
      try {
        const { generateImageWithNanoBanana } = await import('./nanoBananaService.js');
        const fullPrompt = `IMPORTANT: Create a beautiful photograph with a COMPLETE BACKGROUND (no transparent backgrounds, no floating elements, no stickers, no isolated objects). The image must have a full scene. Description: ${description}`;
        const imgResult = await generateImageWithNanoBanana(fullPrompt, imageApiKey, imageModel);

        if (imgResult.success && imgResult.image) {
          const imgTag = `<img src="data:image/png;base64,${imgResult.image}" data-gemini-id="${id}" style="width:100%;max-width:600px;display:block;margin:20px auto;border-radius:8px">`;
          if (result.includes('</body>')) {
            result = result.replace('</body>', imgTag + '</body>');
          } else {
            result = result + imgTag;
          }
          console.log(`[COMPILER] ✅ Generated ${id}`);
        } else {
          console.log(`[COMPILER] ❌ Failed to generate ${id}: ${imgResult.error || 'unknown'}`);
        }
      } catch (err) {
        console.error(`[COMPILER] ❌ Error generating ${id}:`, err.message);
      }
    } else {
      console.log(`[COMPILER] ✅ ${id} already present, skipping`);
    }
  }

  return result;
};

// === MAIN ORCHESTRATION FUNCTION ===
export const runOrchestration = async (prompt, apiKey, model = 'gemini-3.1-pro', options = {}, attachments = []) => {
  const {
    eventType = '',
    theme = '',
    primaryColor = '',
    secondaryColor = '',
    visualStyle = '',
    mood = '',
    imageFiles = [],
    promptInstruction = '',
    userId = '',
    useRagTemplates = true,
    imageApiKey = '',
    imageModel = 'gemini-3.1-flash-image-preview'
  } = options;

  console.log('=== ORCHESTRATOR START ===');
  console.log('Event:', eventType, '| Theme:', theme, '| Model:', model, '| Attachments:', attachments?.length || 0);
  console.log('[RAG-TEMPLATE] use_rag_templates =', useRagTemplates, useRagTemplates ? '(HABILITADO)' : '(DESHABILITADO)');

  // ===== STEP 0: TEMPLATE ADAPTATION FLOW (preferred when templates with html_content exist) =====
  if (useRagTemplates) {
    console.log('[RAG-TEMPLATE] 🔍 Buscando templates con html_content para eventType="' + eventType + '"...');
    try {
      const templatesWithHtml = getTemplatesWithHtmlContent();
      if (templatesWithHtml.length > 0) {
        console.log('[RAG-TEMPLATE] ✅ ' + templatesWithHtml.length + ' template(s) con html_content encontrados. Intentando adaptación.');
        try {
          const selectedTemplate = await selectTemplateWithGemini(prompt, eventType, theme, templatesWithHtml, apiKey, model);
          console.log('[RAG-TEMPLATE] ✅ Template seleccionado: "' + selectedTemplate.style_name + '" (id=' + selectedTemplate.id + ', ' + (selectedTemplate.html_content ? selectedTemplate.html_content.length : 0) + ' chars)');

          const adaptedText = await adaptTemplateWithGemini(selectedTemplate, prompt, apiKey, model, options);

          // Track usage
          if (userId) {
            trackRAGUsage(selectedTemplate.id, userId, eventType);
          }

          // Post-processing pipeline (same as CODER flow)
          console.log('[RAG-TEMPLATE] Step 3: COMPILER post-processing...');
          const html = cleanHtml(adaptedText);
          const fixedHtml = fixTailwindBgGemini(html);
          const libHtml = injectMandatoryLibraries(fixedHtml);
          const metaHtml = injectEditorMetadata(libHtml, eventType, theme, primaryColor, secondaryColor);
          const finalHtml = fixInvalidImagePaths(metaHtml, imageFiles);

          console.log('=== ORCHESTRATOR COMPLETE (ADAPTATION FLOW) ===');
          console.log('Final HTML length:', finalHtml.length);
          return await ensureRequiredImages(finalHtml, eventType, imageApiKey, imageModel);
        } catch (adaptError) {
          console.error('[RAG-TEMPLATE] ⚠️ Adaptación falló: ' + adaptError.message + ', cayendo a generación desde cero');
        }
      } else {
        console.log('[RAG-TEMPLATE] ❌ No se encontraron templates con html_content, cayendo a generación desde cero');
      }
    } catch (fetchError) {
      console.error('[RAG-TEMPLATE] ⚠️ Error al buscar templates: ' + fetchError.message + ', cayendo a generación desde cero');
    }
  } else {
    console.log('[RAG-TEMPLATE] use_rag_templates=0 — adaptación deshabilitada, usando generación desde cero');
  }

  // ===== FALLBACK: CODER FLOW (from-scratch generation) =====
  console.log('[ORQUESTADOR] Using CODER (from-scratch) flow...');

  // ===== STEP 0b: CONSULTAR RAG (metadata-only, for fingerprint guidance) =====
  let ragContext = '';
  let ragTemplateFound = null;
  
  console.log('[ORQUESTADOR] Step 0b: Consultando RAG knowledge base...');
  const ragTemplate = await queryRAGTemplate(eventType, theme);
  
  if (ragTemplate) {
    ragContext = buildRAGPrompt(ragTemplate);
    ragTemplateFound = ragTemplate;
    console.log('[RAG] Usando plantilla:', ragTemplate.style_name);
    
    // Track usage
    if (userId) {
      trackRAGUsage(ragTemplate.id, userId, eventType);
    }
  } else {
    console.log('[RAG] Sin plantilla específica, usando fingerprint tradicional');
  }

  // ===== STEP 1: Generate fingerprint (solo si no hay RAG) =====
  console.log('[ORQUESTADOR] Step 1: Generating design fingerprint...');
  const fingerprint = generateDesignFingerprint(eventType, theme, visualStyle, mood, primaryColor, secondaryColor, ragTemplate);
  console.log('[ORQUESTADOR] Fingerprint:', fingerprint.raw);

  const currentDate = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const promptWithDate = prompt.replace(/SYSTEM_TIMESTAMP:\s*\S+/, `SYSTEM_TIMESTAMP: ${currentDate}`);

  // ===== STEP 2: GEMINI API — CODER call =====
  console.log('[ORQUESTADOR] Step 2: Calling Gemini with CODER prompt...');
  
  // SI hay RAG, usarlo como parte del prompt (además del fingerprint para variación)
  const ragContextBlock = ragContext ? `\n\n${ragContext}\n\n` : '';
  const fingerprintBlock = `\n\n===== DESIGN FINGERPRINT (FOLLOW EXACTLY) =====\n${fingerprint.raw}\n===== END FINGERPRINT =====\n\n`;
  const promptImageContext = promptInstruction ? `\n\n${promptInstruction}` : '';

  let referenceInstruction = '';
  const parts = [];

  if (attachments && attachments.length > 0) {
    referenceInstruction = `\n\n===== REFERENCE IMAGES =====\nThe user has attached ${attachments.length} reference image(s) for visual inspiration. Analyze their style, colors, layout, and mood. Use them as a PRIMARY visual reference for the invitation design — match the aesthetic feel, color palette, and design direction while adapting it to the event type and theme specified. If the images show specific design elements (typography style, layout patterns, decorative motifs), incorporate similar elements into the invitation.\n===== END REFERENCE IMAGES =====\n`;

    for (const att of attachments) {
      if (att.type === 'image' && att.content) {
        const base64Data = att.content.includes(',') ? att.content.split(',')[1] : att.content;
        const mimeType = att.mimeType || 'image/jpeg';
        parts.push({ inline_data: { mime_type: mimeType, data: base64Data } });
      }
    }
    console.log(`📎 [ORQUESTADOR] Including ${parts.length} reference image(s) in Gemini request`);
  }

  // SI hay RAG disponible, añadirlo después del fingerprint para dar guía de estilo
  const fullPrompt = ragContext 
    ? `${CODER_SYSTEM_PROMPT}${fingerprintBlock}${ragContextBlock}${promptImageContext}${referenceInstruction}${promptWithDate}`
    : `${CODER_SYSTEM_PROMPT}${fingerprintBlock}${promptImageContext}${referenceInstruction}${promptWithDate}`;
  parts.unshift({ text: fullPrompt });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  console.log('[ORQUESTADOR] Model:', model, '| Prompt length:', fullPrompt.length);

  const response = await fetchNoSSL(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      contents: [{
        parts: parts
      }],
      generationConfig: {
        temperature: 1.0,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 1500000
      }
    })
  });

  console.log('[ORQUESTADOR] HTTP:', response.status);

  if (!response.ok) {
    const error = await response.json();
    console.error('[ORQUESTADOR] API Error:', JSON.stringify(error, null, 2));
    throw new Error(error.error?.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  console.log('[ORQUESTADOR] Output length:', generatedText?.length || 0);

  if (!generatedText) {
    throw new Error('Empty response from Gemini');
  }

  // ===== STEP 3: LOCAL — COMPILER post-processing =====
  console.log('[ORQUESTADOR] Step 3: COMPILER post-processing...');
  const html = cleanHtml(generatedText);
  const fixedHtml = fixTailwindBgGemini(html);
  const libHtml = injectMandatoryLibraries(fixedHtml);
  const metaHtml = injectEditorMetadata(libHtml, eventType, theme, primaryColor, secondaryColor);
  const finalHtml = fixInvalidImagePaths(metaHtml, imageFiles);

  console.log('=== ORCHESTRATOR COMPLETE ===');
  console.log('Final HTML length:', finalHtml.length);

  return await ensureRequiredImages(finalHtml, eventType, imageApiKey, imageModel);
};

// ==================== FUNCIONES PARA RAG MODULAR ====================

import { MODULE_SYSTEM_PROMPT, MODULE_ADAPTER_PROMPT, MODULE_ASSEMBLER_PROMPT } from './agents-prompt-modular.js';

/**
 * Helper para llamar a Gemini API (patrón existente en selectTemplateWithGemini)
 */
const callGeminiAPI = async (prompt, apiKey, model, contentsOverride = null) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const contents = contentsOverride || [{ parts: [{ text: prompt }] }];
  
  const response = await fetchNoSSL(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      contents: contents,
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 4096
      }
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Gemini API error: ${error.error?.message || response.status}`);
  }

  return await response.json();
};

/**
 * Extrae contenido de respuesta de Gemini (maneja modelos "thinking")
 */
const extractContent = (data) => {
  const allParts = data.candidates?.[0]?.content?.parts || [];
  const contentText = allParts.filter(p => p?.text && !p?.thought).map(p => p.text).join(' ');
  return contentText;
};

/**
 * Extrae HTML de respuesta de Gemini (quita markdown)
 */
const extractHtmlFromResponse = (content) => {
  let html = content;
  // Quitar bloques markdown
  html = html.replace(/```html\s*/gi, '').replace(/```\s*/gi, '');
  // Extraer DOCTYPE si existe
  const doctypeMatch = html.match(/<!DOCTYPE html[^>]*>/i);
  if (doctypeMatch) {
    const start = html.indexOf('<!DOCTYPE');
    const end = html.lastIndexOf('</html>');
    if (start >= 0 && end > start) {
      return html.substring(start, end + 8);
    }
  }
  // Si no hay DOCTYPE, buscar <html>
  const htmlStart = html.indexOf('<html');
  const htmlEnd = html.lastIndexOf('</html>');
  if (htmlStart >= 0 && htmlEnd > htmlStart) {
    return html.substring(htmlStart, htmlEnd + 7);
  }
  return html;
};

/**
 * Genera imagen con Nano Banana (import dinámico)
 */
const generateImageWithNanoBanana = async (prompt, apiKey, model = 'gemini-3.1-flash-image-preview') => {
  const { generateImageWithNanoBanana: nanoFn } = await import('./nanoBananaService.js');
  return await nanoFn(prompt, apiKey, model);
};

/**
 * Query módulos por tipo desde knowledge_base_modules
 */
const queryRAGModules = async (moduleType, tags = null, category = null, limit = 5) => {
  try {
    let query = `
      SELECT id, module_id, module_type, style_name, description, tags,
             theme_tags, color_palette, css_variables, memory_sources,
             category, html_content, html_size
      FROM knowledge_base_modules 
      WHERE is_active = 1 AND module_type = ?
    `;
    const params = [moduleType];

    if (category && category !== 'general') {
      query += ' AND category = ?';
      params.push(category);
    }

    if (tags) {
      const tagList = tags.split(',').map(t => t.trim());
      const tagConditions = tagList.map(() => 'tags LIKE ?').join(' OR ');
      query += ` AND (${tagConditions})`;
      tagList.forEach(tag => {
        params.push(`%"${tag}"%`);
      });
    }

    query += ' ORDER BY RANDOM() LIMIT ?';
    params.push(limit);

    console.log('[RAG-MODULE] SQL:', query.replace(/\s+/g, ' ').trim());
    console.log('[RAG-MODULE] Params:', JSON.stringify(params));

    const modules = db.prepare(query).all(...params);
    console.log(`[RAG-MODULE] Rows: ${modules ? modules.length : 0} for module_type="${moduleType}"`);

    if (!modules || modules.length === 0) {
      console.log(`[RAG-MODULE] No se encontraron módulos para module_type="${moduleType}"`);
      return [];
    }

    console.log(`[RAG-MODULE] ${modules.length} módulo(s) encontrado(s) para "${moduleType}":`);
    modules.forEach(m => {
      console.log(`  - id=${m.id} "${m.style_name}" html=${m.html_content ? m.html_content.length : 0} chars`);
    });

    // Parsear JSON fields
    return modules.map(m => ({
      ...m,
      tags: JSON.parse(m.tags || '[]'),
      theme_tags: JSON.parse(m.theme_tags || []),
      color_palette: JSON.parse(m.color_palette || {}),
      css_variables: JSON.parse(m.css_variables || {}),
      memory_sources: JSON.parse(m.memory_sources || {})
    }));
  } catch (error) {
    console.error('[RAG-MODULE] Error query:', error);
    return [];
  }
};

/**
 * Selecciona el mejor módulo entre candidatos usando Gemini
 */
const selectModuleWithGemini = async (candidates, eventType, theme, apiKey, model) => {
  if (!candidates || candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  const context = candidates.map((c, i) => `
CANDIDATE ${i + 1}:
  id: ${c.id}
  module_id: ${c.module_id}
  style_name: ${c.style_name}
  description: ${(c.description || '').slice(0, 150)}
  tags: ${c.tags.join(', ')}
  theme_tags: ${c.theme_tags.join(', ')}
  html_size: ${c.html_size} chars
`).join('\n---\n');

  const prompt = `You are a module selector for modular digital invitations. Given a user's event request and a list of available modules for a specific module_type, select the SINGLE best-matching module.

Selection criteria:
1. Category match (general → any, boda → boda, etc.)
2. Theme/mood alignment with user request
3. Tag relevance (more matching tags = better)
4. HTML complexity (prefer richer modules when drama/complexity is requested)
5. UNIVERSAL PREFERENCE: Cuando el theme del usuario no coincida exactamente con un módulo temático específico, preferir módulos universales/agnósticos (style_name/tags sin palabras como "western", "floral", "rústico", "vintage", "bohemio"). Los módulos universales son más adaptables a cualquier temática.

User request: "${theme || eventType || 'evento elegante'}"
Event type: "${eventType || 'general'}"

${context}

Return ONLY the candidate ID number (1-${candidates.length}). No explanations.`;

  try {
    const response = await callGeminiAPI(prompt, apiKey, model);
    const content = extractContent(response);
    const match = content.match(/\d+/);
    const selectedIndex = match ? parseInt(match[0], 10) - 1 : 0;

    if (selectedIndex >= 0 && selectedIndex < candidates.length) {
      const selected = candidates[selectedIndex];
      console.log(`[RAG-MODULE] ✅ Módulo seleccionado: "${selected.style_name}" (id=${selected.id})`);
      return selected;
    }

    console.log(`[RAG-MODULE] ⚠️ Índice inválido (${selectedIndex}), usando primero`);
    return candidates[0];
  } catch (error) {
    console.error('[RAG-MODULE] Error selecting module:', error);
    return candidates[0];
  }
};

/**
 * Adapta un módulo wireframe a la temática del usuario.
 * userData (opcional): contexto estructurado del usuario construido por
 * buildUserEventContext a partir del prompt libre. Se inyecta al prompt para que
 * Gemini personalice con datos concretos (nombres, fecha, lugar, etc.).
 * En cualquier fallback (RECITATION/MAX_TOKENS/SAFETY/HTML inválido/error), en
 * lugar de devolver el wireframe tal cual, se aplica applyDynamicContent para
 * reemplazar al menos los textos básicos con los datos del usuario.
 */
const adaptModuleWithGemini = async (module, userRequest, theme, eventType, apiKey, model, userData = {}) => {
  const datosEventoBlock = buildDatosEventoBlock(userData);
  const prompt = `${MODULE_ADAPTER_PROMPT}

===== MÓDULO WIREFRAME =====
${module.html_content}

===== TEMÁTICA DEL USUARIO =====
Evento: ${eventType || 'general'}
Tema/Mood: ${theme || 'elegante'}
${datosEventoBlock}

Descripción completa: ${userRequest || 'evento elegante y sofisticado'}

Adapta este módulo siguiendo las reglas del prompt.`;

  const ctxForFallback = { module_id: module.module_id, moduleType: module.module_type };

  try {
    const response = await callGeminiAPI(prompt, apiKey, model);
    // Detectar finishReason no-STOP (RECITATION, SAFETY, OTHER, etc.)
    // Gemini responde 200 OK pero con content vacío cuando filtra. Sin este check,
    // el JSON crudo con finishReason se loguea de forma críptica y el fallback es silencioso.
    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
      console.warn(`[ADAPTER-MODULE] Gemini filtró el output (finishReason=${finishReason}). Fallback con reemplazo de textos base.`);
      return applyDynamicContent(module.html_content, userData, ctxForFallback);
    }
    const content = extractContent(response);
    const adapted = extractHtmlFromResponse(content);
    // Validación robusta: el output debe ser HTML válido con data-gemini-id
    // Y contener <section o <div (rechazar strings markdown que mencionen el atributo sin ser HTML).
    const isValidHtml = adapted
      && adapted.includes('data-gemini-id')
      && (adapted.includes('<section') || adapted.includes('<div'));
    if (!isValidHtml) {
      console.warn('[ADAPTER-MODULE] Output no es HTML válido con data-gemini-id, fallback con reemplazo de textos base');
      return applyDynamicContent(module.html_content, userData, ctxForFallback);
    }
    return adapted;
  } catch (error) {
    console.error('[ADAPTER-MODULE] Error:', error);
    return applyDynamicContent(module.html_content, userData, ctxForFallback);
  }
};

/**
 * Ensambla múltiples módulos en un único HTML
 */
const assembleModules = (modules, theme, eventType) => {
  if (!modules || modules.length === 0) {
    console.log('[ASSEMBLER] No hay módulos para ensamblar');
    return '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Invitación</title></head><body></body></html>';
  }

  // Extraer CDNs necesarios de todos los módulos
  const allCdns = new Set(['tailwindcss']);
  const allJsDeps = new Set();
  modules.forEach(m => {
    if (m.html_content.includes('gsap')) allJsDeps.add('gsap');
    if (m.html_content.includes('three')) allJsDeps.add('three');
    if (m.html_content.includes('parallax')) allJsDeps.add('parallax');
  });

  const cdnsHtml = `
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    ${allJsDeps.has('gsap') ? '<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>' : ''}
    ${allJsDeps.has('gsap') ? '<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js"></script>' : ''}
    ${allJsDeps.has('three') ? '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>' : ''}
  `.trim();

  // Concatenar módulos
  const modulesHtml = modules.map(m => m.html_content).join('\n\n');

  // Construir HTML final
  const finalHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${eventType || 'Invitación'} - ${theme || 'Elegante'}</title>
  ${cdnsHtml}
  <style>
    :root {
      --primary-color: #1f1f1f;
      --text-color: #2f2f2f;
      --accent-color: #b89a63;
      --background-color: #ffffff;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body>
  ${modulesHtml}
  
  <script>
    // Metadata del editor
    const invitationMetadata = {
      version: '2.0-modular',
      eventType: '${eventType || 'general'}',
      theme: '${theme || 'elegante'}',
      assembledAt: '${new Date().toISOString()}',
      modules: ${JSON.stringify(modules.map(m => ({ module_id: m.module_id, module_type: m.module_type })))}
    };
    
    // Registrar metadata en el DOM
    const metaScript = document.createElement('script');
    metaScript.id = 'invitation-editor-metadata';
    metaScript.type = 'application/json';
    metaScript.textContent = JSON.stringify(invitationMetadata);
    document.body.appendChild(metaScript);
  <\/script>
</body>
</html>`;

  console.log(`[ASSEMBLER] ✅ ${modules.length} módulo(s) ensamblado(s), ${finalHtml.length} chars`);
  return finalHtml;
};

// Inyecta data-gemini-id en elementos editables internos del flujo modular.
// El editor (EditorSidebar.parseEditableElements) detecta editables via
// querySelectorAll('[data-gemini-id]'), pero el flujo modular solo emite
// data-gemini-id en la raiz de cada <section> (marcada memory_usage=protected
// y por tanto filtrada por el editor). Los editables internos usan
// memory_type=text/image + memory_key, que el editor no lee. Esta funcion
// bridgea ambos schemas: inyecta data-gemini-id="<module_id>__<memory_key>" en
// cada editable interno para que el editor los detecte sin cambios.
const injectEditableIds = (html) => {
  try {
    const { document } = parseHTML(html);
    let injected = 0;

    // Para cada section con data-gemini-id (raiz del modulo), buscar elementos
    // internos con memory_type=text o memory_type=image y asignarles
    // data-gemini-id basado en el module_id de la raiz + memory_key (o fallback).
    const moduleSections = document.querySelectorAll('[data-gemini-id]');
    for (const section of moduleSections) {
      const moduleId = section.getAttribute('data-gemini-id') || 'module';
      // memory_usage=protected en la section raiz: el editor la filtrara, lo cual
      // es correcto (no se edita el background entero como texto). Solo nos
      // importan sus descendientes editables.
      const editables = section.querySelectorAll('[memory_type="text"], [memory_type="image"]');
      let elementCounter = 0;
      for (const el of editables) {
        // Defensivo: no sobrescribir si ya tiene data-gemini-id
        if (el.getAttribute('data-gemini-id')) continue;
        const memoryKey = el.getAttribute('memory_key');
        let suffix = memoryKey;
        if (!suffix) {
          elementCounter += 1;
          suffix = `element-${elementCounter}`;
        }
        // Sanitizar suffix para que sea un atributo valido (sin espacios ni comillas)
        suffix = String(suffix).replace(/[\s"']/g, '-');
        const newId = `${moduleId}__${suffix}`;
        el.setAttribute('data-gemini-id', newId);
        injected += 1;
      }
    }

    if (injected > 0) {
      console.log(`[INJECT-IDS] ${injected} data-gemini-id(s) inyectados en editables modulares`);
      return document.documentElement.outerHTML;
    }
    return html; // sin cambios, devolver original
  } catch (error) {
    console.error('[INJECT-IDS] Error:', error.message);
    return html; // fail-safe: devolver HTML original sin inyeccion
  }
};

/**
 * Resuelve placeholders de imágenes según memory_source
 */
const resolvePlaceholders = async (html, eventType, theme, imageApiKey, imageModel) => {
  try {
    const { document } = parseHTML(html);
    let modified = false;
    let libraryAssetCounter = 0;

    // Buscar todos los [path="placeholder"]
    const placeholders = document.querySelectorAll('[path="placeholder"]');
    console.log(`[RESOLVER] ${placeholders.length} placeholder(s) encontrado(s)`);

    for (const placeholder of placeholders) {
      // Determinar memory_source (puede estar en el elemento o en el ancestro)
      let memorySource = placeholder.getAttribute('memory_source');
      let ancestor = placeholder.parentElement;
      while (!memorySource && ancestor) {
        memorySource = ancestor.getAttribute('memory_source');
        ancestor = ancestor.parentElement;
      }

      if (!memorySource) {
        console.log('[RESOLVER] ⚠️ Placeholder sin memory_source, saltando');
        continue;
      }

      if (memorySource === 'generated') {
        // Nano Banana: prompt basado en theme + tipo de módulo (data-gemini-id).
        // El módulo aporta estructura, no temática visual. Los tags del módulo se filtran
        // para excluir términos que inducen a generar personas/parejas/novios o
        // marcadores estructurales (western, portada, hero, boda, sombrero...) sin valor
        // visual. El theme elegido por el usuario captura la temática visual.
        const EXCLUDE_TAGS = /^(novios|pareja|retrato|retrato de pareja|foto de pareja|fotos inclinadas|familias|portada|hero|boda|quinceanera|cumpleanos|baby shower|graduacion|despedida|aniversario|evento|modulo universal|responsive|slider|3 slides|background slider|tarjeta|tarjeta central|tarjeta editorial|tarjetas|overlay|overlay oscuro|moderno|minimalista|editorial|ubicacion|ceremonia|recepcion|mapa|mapa integrado|asistencia|rsvp|confirmacion|itinerario|agenda|western|vaquera|charra|sombrero|caballo|monograma|boton|cuenta regresiva|countdown|padres|festejados|historia|organizacion|personas|personas importantes|galeria|galeria grid|galeria fotos|mesa|mesa regalos|regalos|dress code|vestimenta)$/i;

        // Plantillas de prompt por tipo de módulo formal (definidos en
        // components/admin/RAGModuleModal.tsx y AdminRAGModules.tsx).
        // {theme} se reemplaza por el theme elegido por el usuario.
        const PROMPT_TEMPLATES = {
          portada: 'Fondo ambiental amplio y solemne para portada de invitación, sin personas, sin novios, sin retratos, sin parejas, sin texto. Estilo: {theme}. Ambiente decorativo, fotografía profesional, alta resolución, fondo completo.',
          padres: 'Fondo decorativo elegante y sobrio para sección de familias, sin personas, sin retratos, sin nombres, sin texto. Estilo: {theme}. Decoración floral o geométrica discreta, fotografía profesional, alta resolución, fondo uniforme.',
          ubicacion: 'Vista panorámica de entorno natural o urbano apropiado para ceremonia, sin personas, sin novios, sin edificios prominentes, sin señales, sin texto. Estilo: {theme}. Ambiente amplio, fotografía profesional, alta resolución.',
          itinerario: 'Fondo decorativo sutil y minimalista para itinerario, sin personas, sin texto, sin relojes, sin iconos. Estilo: {theme}. Elementos decorativos discretos, fotografía profesional, alta resolución, fondo uniforme.',
          confirmacion: 'Fondo elegante y limpio para sección de confirmación, sin personas, sin texto visible, sin formularios, sin botones. Estilo: {theme}. Decoración abstracta sutil, fotografía profesional, alta resolución, fondo uniforme.',
          detalles: 'Fondo decorativo con elementos discretos para sección de detalles, sin personas, sin texto, sin iconos, sin listas. Estilo: {theme}. Decoración sutil de fondo, fotografía profesional, alta resolución, fondo uniforme.',
          countdown: 'Fondo decorativo atmosférico para cuenta regresiva, sin personas, sin números, sin texto, sin relojes. Estilo: {theme}. Ambiente festivo elegante, fotografía profesional, alta resolución, fondo uniforme.',
          general: 'Fondo decorativo profesional, sin personas, sin texto. Estilo: {theme}. Fotografía profesional, alta resolución, fondo completo.'
        };
        // Bug previo: `document.querySelector('script')` agarraba el PRIMER script del
        // documento (de cualquier módulo). Ahora `placeholder.querySelector('script')`
        // busca el script DENTRO del placeholder actual.
        const tagsEl = placeholder.querySelector('script');
        let tags = [];
        if (tagsEl && tagsEl.textContent) {
          const metaMatch = tagsEl.textContent.match(/moduleMetadata\s*=\s*(\{[\s\S]*?\});/);
          if (metaMatch) {
            try {
              const fn = new Function(`return (${metaMatch[1]});`);
              const meta = fn();
              tags = meta.tags || [];
            } catch (e) {}
          }
        }

        const memoryType = placeholder.getAttribute('memory_type');
        const dataGeminiId = placeholder.getAttribute('data-gemini-id') || '';
        const moduleType = dataGeminiId.split('-')[0];
        const cleanTags = tags.filter((t) => !EXCLUDE_TAGS.test(t.trim()));

        let prompt;
        if (memoryType === 'background') {
          const template = PROMPT_TEMPLATES[moduleType] || PROMPT_TEMPLATES.general;
          prompt = template.replace(/\{theme\}/g, theme || 'elegante');
        } else {
          // memory_type="image" (IMG dentro de un módulo): se conservan los tags limpios
          // como pista de elementos visuales a ilustrar.
          prompt = `Imagen decorativa profesional, ${theme || 'elegante'}.${cleanTags.length ? ` Elementos: ${cleanTags.join(', ')}.` : ''} Fotografía profesional, sin personas, sin retratos.`;
        }
        console.log(`[RESOLVER] \ud83c\udfa8 Nano Banana [${memoryType || '?'}/${moduleType || '?'}]: "${prompt.slice(0, 80)}..."`);

        const imageData = await generateImageWithNanoBanana(prompt, imageApiKey, imageModel);
        if (imageData && imageData.image) {
          const base64 = `data:image/png;base64,${imageData.image}`;

          // Reemplazar en background-image o src
          if (placeholder.tagName === 'SECTION' || placeholder.tagName === 'DIV') {
            // Buscar en <style> del módulo
            const style = placeholder.querySelector('style');
            if (style) {
              const loremMatch = style.textContent.match(/url\(['"]?(https?:\/\/loremflickr\.com\/[^'")\s]+)['"]?\)/i);
              if (loremMatch) {
                style.textContent = style.textContent.replace(loremMatch[0], `url('${base64}')`);
                modified = true;
                console.log('[RESOLVER] ✅ Background reemplazado');
              }
            }
          } else if (placeholder.tagName === 'IMG') {
            const loremMatch = placeholder.getAttribute('src');
            if (loremMatch && loremMatch.includes('loremflickr.com')) {
              placeholder.setAttribute('src', base64);
              modified = true;
              console.log('[RESOLVER] ✅ IMG src reemplazado');
            }
          }
        }
      } else if (memorySource === 'library') {
        // Library: intenta resolver la URL de Lorem Flickr con una imagen real de /img/<folder>/.
        // Si no existe la carpeta o no hay imágenes, mantiene el placeholder original.
        const libraryIndex = libraryAssetCounter++;
        const categoryFolder = mapCategoryToFolder(eventType);
        const resolvedUrl = await resolveLibraryAsset(categoryFolder, libraryIndex);

        if (resolvedUrl) {
          // Reemplazar en background-image o src según el tipo de elemento
          if (placeholder.tagName === 'SECTION' || placeholder.tagName === 'DIV') {
            const style = placeholder.querySelector('style');
            if (style) {
              const loremMatch = style.textContent.match(/url\(['"]?(https?:\/\/loremflickr\.com\/[^'")\s]+)['"]?\)/i);
              if (loremMatch) {
                style.textContent = style.textContent.replace(loremMatch[0], `url('${resolvedUrl}')`);
                modified = true;
                console.log(`[RESOLVER] 📚 Library background reemplazado: ${resolvedUrl}`);
              }
            }
            // Tambien soporta style inline via atributo style=
            const inlineStyle = placeholder.getAttribute('style');
            if (inlineStyle) {
              const loremMatch = inlineStyle.match(/url\(['"]?(https?:\/\/loremflickr\.com\/[^'")\s]+)['"]?\)/i);
              if (loremMatch) {
                placeholder.setAttribute('style', inlineStyle.replace(loremMatch[0], `url('${resolvedUrl}')`));
                modified = true;
                console.log(`[RESOLVER] 📚 Library inline background reemplazado: ${resolvedUrl}`);
              }
            }
          } else if (placeholder.tagName === 'IMG') {
            const src = placeholder.getAttribute('src');
            if (src && src.includes('loremflickr.com')) {
              placeholder.setAttribute('src', resolvedUrl);
              modified = true;
              console.log(`[RESOLVER] 📚 Library IMG src reemplazado: ${resolvedUrl}`);
            }
          } else {
            // Fallback: reemplazar primer <img> dentro del placeholder
            const innerImg = placeholder.querySelector('img');
            if (innerImg) {
              const src = innerImg.getAttribute('src');
              if (src && src.includes('loremflickr.com')) {
                innerImg.setAttribute('src', resolvedUrl);
                modified = true;
                console.log(`[RESOLVER] 📚 Library inner IMG reemplazado: ${resolvedUrl}`);
              }
            }
            // Y buscar en estilos de hijos
            const innerStyled = placeholder.querySelector('[style*="loremflickr"]');
            if (innerStyled) {
              const styleAttr = innerStyled.getAttribute('style');
              const loremMatch = styleAttr.match(/url\(['"]?(https?:\/\/loremflickr\.com\/[^'")\s]+)['"]?\)/i);
              if (loremMatch) {
                innerStyled.setAttribute('style', styleAttr.replace(loremMatch[0], `url('${resolvedUrl}')`));
                modified = true;
                console.log(`[RESOLVER] 📚 Library inner background reemplazado: ${resolvedUrl}`);
              }
            }
          }
        } else {
          const assetType = placeholder.getAttribute('data-asset-type') || 'general';
          console.log(`[RESOLVER] ⚠️ Library asset no encontrado en disco: /img/${categoryFolder}/ (assetType=${assetType}, placeholder mantenido)`);
        }
      }
    }

    return modified ? document.documentElement.outerHTML : html;
  } catch (error) {
    console.error('[RESOLVER] Error:', error);
    return html;
  }
};

/**
 * Aplica temática vía variables CSS
 */
const applyTheme = (html, primaryColor, secondaryColor, accentColor, fontFamily, fontFamilyHeading) => {
  try {
    const { document } = parseHTML(html);

    // Actualizar :root variables
    const style = document.querySelector('style');
    if (style) {
      const rootMatch = style.textContent.match(/:root\s*\{([^}]+)\}/);
      if (rootMatch) {
        let rootContent = rootMatch[1];

        if (primaryColor) rootContent = rootContent.replace(/--primary-color:\s*[^;]+;/, `--primary-color: ${primaryColor};`);
        if (secondaryColor) rootContent = rootContent.replace(/--text-color:\s*[^;]+;/, `--text-color: ${secondaryColor};`);
        if (accentColor) rootContent = rootContent.replace(/--accent-color:\s*[^;]+;/, `--accent-color: ${accentColor};`);

        style.textContent = style.textContent.replace(rootMatch[0], `:root {${rootContent}}`);
      }
    }

    // Inyectar Google Fonts si se especificó
    if (fontFamily || fontFamilyHeading) {
      const head = document.querySelector('head');
      const fonts = [];
      if (fontFamilyHeading) fonts.push(fontFamilyHeading.replace(/['"]/g, '').replace(/\s+/g, '+'));
      if (fontFamily && fontFamily !== fontFamilyHeading) fonts.push(fontFamily.replace(/['"]/g, '').replace(/\s+/g, '+'));

      if (fonts.length > 0) {
        const fontLink = document.createElement('link');
        fontLink.rel = 'stylesheet';
        fontLink.href = `https://fonts.googleapis.com/css2?family=${fonts.join('&family=')}&display=swap`;
        head.insertBefore(fontLink, head.firstChild);
      }
    }

    return document.documentElement.outerHTML;
  } catch (error) {
    console.error('[APPLY-THEME] Error:', error);
    return html;
  }
};

/**
 * Mons. en castellano para mapear texto de mes -> número y viceversa.
 */
const MESES_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

/**
 * Parsea el prompt libre del usuario y extrae un contexto estructurado del evento:
 * nombres, fecha, hora, lugar, ciudad, padres (novia/novio), itinerario,
 * vestimenta y fecha límite de RSVP. Heurísticas regex ES/EN, alta confianza.
 * Devuelve SIEMPRE un objeto (campos vacíos si no hay match).
 */
const parsePromptForEventContext = (rawPrompt) => {
  const out = {
    nombres: '',
    nombresLista: [],
    fecha: '',
    fechaHumana: '',
    fechaISO: '',
    hora: '',
    lugar: '',
    ciudad: '',
    padresNovia: '',
    padresNovio: '',
    padresHeader: '',
    padresMasculino: '',
    padresFemenino: '',
    itinerario: [],
    vestimenta: '',
    vestimentaHombres: '',
    vestimentaMujeres: '',
    vestimentaNota: '',
    fechaLimiteRSVP: '',
    recepcion: ''
  };
  if (!rawPrompt || typeof rawPrompt !== 'string') return out;
  const prompt = rawPrompt.trim();

  // Nombres: "Boda de X y Y", "Casamiento de X y Y", "XV Años de X", "Cumpleaños de X".
  // Cada parte admite 1 o 2 tokens capitalizados (p. ej. "María José", "San Miguel").
  // NOTA 1: En Node/V8 sin bandera 'u', \w NO incluye acentos. Por eso \w se evita y
  //   se usa una clase de caracteres explícita (incluye ÁÉÍÓÚÑáéíóúñ).
  // NOTA 2: Búsqueda case-insensitive (el usuario puede escribir "boda" o "Boda").
  //   Para evitar capturar palabras genéricas ("y Anna con amor"), filtramos por blacklist.
  const NAME_TOKEN = '[A-ZÁÉÍÓÚÑa-záéíóúñ][A-Za-zÁÉÍÓÚÑáéíóúñ]+';
  const NAME_PART = `${NAME_TOKEN}(?:\\s+${NAME_TOKEN})?`;
  const NOMBRE_BLACKLIST = new Set([
    'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas',
    'mi', 'mis', 'tu', 'tus', 'su', 'sus',
    'de', 'del', 'al', 'y', 'o', 'e', 'u', 'con', 'sin', 'para', 'por',
    'amor', 'fiesta', 'celebracion', 'invitacion', 'evento', 'ceremonia',
    'boda', 'casamiento', 'matrimonio', 'wedding',
    'xv', 'anos', 'años', 'cumpleanos', 'cumpleaños', 'quinceanera', 'quinceañera',
    'bautizo', 'comunion', 'comunión', 'primera', 'baby', 'shower',
    'floral', 'elegante', 'clasico', 'clásico', 'moderno', 'tradicional',
    'palacio', 'blanco', 'bohemio', 'romantico', 'romántico', 'intimo',
    'the', 'and', 'our', 'of', 'my'
  ]);
  const mNombres = prompt.match(
    new RegExp(`(?:boda|casamiento|matrimonio|wedding)\\s+de\\s+(${NAME_PART})\\s*(?:y|&)\\s*(${NAME_PART})`, 'i')
  )
    || prompt.match(
      new RegExp(`(?:para|invitamos\\s+a|invitaci[oó]n\\s+(?:de|para))\\s+(${NAME_PART})\\s*(?:y|&)\\s*(${NAME_PART})`, 'i')
    )
    || prompt.match(
      new RegExp(`^(${NAME_PART})\\s*(?:y|&)\\s*(${NAME_PART})\\b`, 'im')
    )
    || prompt.match(
      new RegExp(`(?:xv\\s+a[ñn]os|cumplea[ñn]os?|quincea[ñn]era|bautizo|primera\\s+comuni[óo]n)\\s+de\\s+(${NAME_PART})`, 'i')
    );
  if (mNombres) {
    const firstRaw = (mNombres[1] || '').trim();
    const secondRaw = (mNombres[2] || '').trim();
    // Filtro blacklist: si la primera palabra es genérica, descartar el match entero
    const firstWordLower = firstRaw.split(/\s+/)[0].toLowerCase();
    if (!NOMBRE_BLACKLIST.has(firstWordLower)) {
      out.nombresLista = secondRaw ? [firstRaw, secondRaw] : [firstRaw];
      out.nombres = secondRaw ? `${firstRaw} y ${secondRaw}` : firstRaw;
    }
  }

  // Fecha: "15 de septiembre de 2026" | "15/09/2026" | "2026-09-15" | "Sept 15, 2026"
  const mFecha = prompt.match(
    /(\d{1,2})\s+de\s+([a-záéíóúñ]+)(?:\s+de\s+(\d{4}))?/i
  ) || prompt.match(
    /(\d{1,2})[/-](\d{1,2})[/-](\d{4})/
  ) || prompt.match(
    /(\d{4})-(\d{1,2})-(\d{1,2})/
  ) || prompt.match(
    /\b([a-záéíóúñ]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})/i
  );
  if (mFecha) {
    let dia, mesStr, anio;
    if (mFecha[1] && mFecha[1].length === 4 && !mFecha[3]) {
      // YYYY-MM-DD
      anio = mFecha[1];
      mesStr = mFecha[2];
      dia = mFecha[3];
    } else if (mFecha[3] && mFecha[3].length === 4) {
      // "DD de MES de YYYY" o "DD/MM/YYYY"
      dia = mFecha[1];
      mesStr = mFecha[2];
      anio = mFecha[3];
    } else {
      // "DD de MES" sin año, o "MES DD, YYYY"
      if (/^\d+$/.test(mFecha[1])) {
        dia = mFecha[1];
        mesStr = mFecha[2];
        anio = mFecha[3] || (new Date().getFullYear()).toString();
      } else {
        mesStr = mFecha[1];
        dia = mFecha[2];
        anio = mFecha[3];
      }
    }
    const mesIdx = MESES_ES.findIndex(m => mesStr && m.startsWith(mesStr.toLowerCase().slice(0, 3)));
    const mesNum = mesIdx >= 0 ? mesIdx + 1 : (parseInt(mesStr, 10) || 0);
    if (dia && mesNum) {
      const diaP = String(dia).padStart(2, '0');
      const mesP = String(mesNum).padStart(2, '0');
      const anioP = anio || (new Date().getFullYear()).toString();
      out.fecha = `${diaP}/${mesP}/${anioP}`;
      out.fechaISO = `${anioP}-${mesP}-${diaP}`;
      // Si el match original vino del formulario "DD de MES [de YYYY]", preservar
      // la forma humana legible para usarla en los textos visible.
      const esFormatoHumano = /^\d{1,2}\s+de\s+[a-záéíóúñ]+/i.test(mFecha[0]);
      if (esFormatoHumano) {
        const mesHumanizado = mesIdx >= 0 ? MESES_ES[mesIdx] : mesStr;
        out.fechaHumana = anioP
          ? `${dia} de ${mesHumanizado} de ${anioP}`
          : `${dia} de ${mesHumanizado}`;
      } else {
        out.fechaHumana = out.fecha;
      }
    }
  }

  // Hora: "6:00 PM" | "18:00" | "Hora: 6:00 PM"
  const mHora = prompt.match(/\bhora:\s*(\d{1,2}):(\d{2})\s*(am|pm)?/i)
    || prompt.match(/\b(\d{1,2}):(\d{2})\s*(am|pm)\b/i)
    || prompt.match(/\b(\d{1,2}):(\d{2})\b(?!\s*[-/]\s*\d)/);
  if (mHora) {
    const hh = mHora[1];
    const mm = mHora[2];
    const ampm = (mHora[3] || '').toUpperCase();
    out.hora = ampm ? `${hh}:${mm} ${ampm}` : `${hh}:${mm}`;
  }

  // Lugar: "Lugar: X" / "Lugar: X, Ciudad" | "en X" (con heurística de capitalización)
  const mLugar = prompt.match(/^lugar:\s*(.+)$/im)
    || prompt.match(/^direcci[oó]n:\s*(.+)$/im)
    || prompt.match(/^sal[oó]n:\s*(.+)$/im)
    || prompt.match(/^ubicaci[oó]n:\s*(.+)$/im);
  if (mLugar) {
    const lugarFull = mLugar[1].trim().replace(/\s+$/, '');
    // Separar "Lugar, Ciudad" si hay coma
    const partes = lugarFull.split(',').map(s => s.trim()).filter(Boolean);
    out.lugar = partes[0] || lugarFull;
    out.ciudad = partes.slice(1).join(', ') || '';
    out.recepcion = out.lugar;
  }

  // Padres de la novia / novio. Acepta "Padres...", "Los padres...", "Los/Las padres...".
  const mPadresNovia = prompt.match(/^(?:los?\s+|las?\s+)?padres?\s+de\s+la\s+novia:\s*(.+)$/im);
  if (mPadresNovia) out.padresNovia = mPadresNovia[1].trim();
  const mPadresNovio = prompt.match(/^(?:los?\s+|las?\s+)?padres?\s+del\s+novio:\s*(.+)$/im);
  if (mPadresNovio) out.padresNovio = mPadresNovio[1].trim();
  const mPadresBautizo = prompt.match(/^(?:los?\s+|las?\s+)?padres(?:\s+del\s+(?:cumplea[ñn]ero|festejado?|bautizado))?:\s*(.+)$/im);
  if (mPadresBautizo && !out.padresNovia && !out.padresNovio) out.padresNovia = mPadresBautizo[1].trim();

  out.padresHeader = out.padresNovia || out.padresNovio ? 'Nuestros Padres' : '';

  // Itinerario: líneas "- 6:00 PM Ceremonia" o "6:00 PM - Ceremonia"
  const lines = prompt.split(/\r?\n/);
  const itin = [];
  for (const ln of lines) {
    const mItin = ln.match(/^\s*[-•·*]\s*(.+)$/);
    if (mItin && /\d{1,2}:\s*\d{2}/.test(mItin[1])) {
      itin.push(mItin[1].trim());
      continue;
    }
    const mTime = ln.match(/^\s*(\d{1,2}:\d{2}\s*(?:am|pm)?)\s*[-—–:]\s*(.+)$/i);
    if (mTime) itin.push(`${mTime[1]} ${mTime[2]}`.trim());
  }
  out.itinerario = itin;

  // Vestimenta
  const mVest = prompt.match(/^vestimenta:\s*(.+)$/im)
    || prompt.match(/^dress\s*code:\s*(.+)$/im)
    || prompt.match(/^c[oó]digo\s+de\s+vestir:\s*(.+)$/im);
  if (mVest) out.vestimenta = mVest[1].trim();

  // Fecha límite RSVP
  const mRSVP = prompt.match(/confirm(?:ar)?(?:\s+(?:su\s+)?asistencia)?\s+antes\s+del?\s{0,2}(\d{1,2}\s+de\s+[a-záéíóúñ]+(?:\s+de\s+\d{4})?)/i);
  if (mRSVP) out.fechaLimiteRSVP = mRSVP[1].trim();

  return out;
};

/**
 * Consolida el contexto estructurado del usuario mezclando:
 *   - datos parseados del prompt libre (parsePromptForEventContext)
 *   - campos genéricos pasados en options (eventType, theme, mood, visualStyle)
 * El usuario NO completa datos en la pantalla de generación (ver decisión producto),
 * por eso la mayoría de campos estructurados vienen vacíos y se rellenan vía parser.
 */
const buildUserEventContext = ({ prompt, eventType, theme, mood, visualStyle } = {}) => {
  const parsed = parsePromptForEventContext(prompt || '');
  return {
    ...parsed,
    eventType: eventType || '',
    theme: theme || '',
    mood: mood || '',
    visualStyle: visualStyle || ''
  };
};

/**
 * Construye un bloque de texto plano "DATOS DEL EVENTO" para inyectar al prompt
 * del adaptador Gemini. Solo incluye líneas de campos no vacíos.
 */
const buildDatosEventoBlock = (ud) => {
  if (!ud) return '';
  const lines = [];
  if (ud.nombres) lines.push(`- Anfitriones / Novios: ${ud.nombres}`);
  if (ud.fechaHumana || ud.fecha) lines.push(`- Fecha del evento: ${ud.fechaHumana || ud.fecha}`);
  if (ud.hora) lines.push(`- Hora: ${ud.hora}`);
  if (ud.lugar) {
    const lugarFull = ud.ciudad ? `${ud.lugar}, ${ud.ciudad}` : ud.lugar;
    lines.push(`- Lugar: ${lugarFull}`);
  } else if (ud.ciudad) {
    lines.push(`- Ciudad: ${ud.ciudad}`);
  }
  if (ud.padresNovia) lines.push(`- Padres de la novia: ${ud.padresNovia}`);
  if (ud.padresNovio) lines.push(`- Padres del novio: ${ud.padresNovio}`);
  if (ud.itinerario && ud.itinerario.length) {
    lines.push('- Itinerario:');
    for (const item of ud.itinerario) lines.push(`    · ${item}`);
  }
  if (ud.vestimenta) lines.push(`- Vestimenta: ${ud.vestimenta}`);
  if (ud.fechaLimiteRSVP) lines.push(`- Confirmar asistencia antes del: ${ud.fechaLimiteRSVP}`);
  if (!lines.length) return '';
  return `===== DATOS DEL EVENTO =====\n${lines.join('\n')}`;
};

/**
 * Tabla de mapeo memory_key -> función que produce el texto reemplazo a partir
 * de userData. Indices derivados del inventario de módulos catálogo (Tradicional,
 * Vaquera, Moderna). Las keys son case-insensitive (se lowercasen al comparar).
 * Cada entrada devuelve `null` si el dato del usuario no existe (mantener placeholder).
 */
const MEMORY_KEY_MAP = {
  'hero-main-title': ud => ud.nombres || null,
  'couple-names':   ud => ud.nombres || null,
  'hero-date-line': ud => ud.fechaHumana || ud.fecha || null,
  'hero-subtitle':  ud => ud.nombres
    ? `Te invitamos a celebrar con nosotros. ${ud.fechaHumana || ud.fecha || ''}`.trim()
    : null,
  'hero-primary-cta':  ud => 'Ver detalles del evento',
  'hero-secondary-cta': ud => 'Nuestra historia',

  // Countdown / fecha
  'countdown-event-date':   ud => ud.fechaHumana || ud.fecha || null,
  'countdown-strip-heading': ud => (ud.fechaHumana || ud.fecha) ? `Faltan pocos días para nuestra boda · ${ud.fechaHumana || ud.fecha}` : null,
  'countdown-header':       ud => (ud.fechaHumana || ud.fecha) ? `Cuenta regresiva · ${ud.fechaHumana || ud.fecha}` : null,
  'countdown-values':       ud => null, // valores numéricos: no se reemplazan, se calculan en JS

  // Padres / personas importantes
  'important-people-header': ud => ud.padresNovia || ud.padresNovio ? 'Nuestros Padres' : null,
  'celebrated-header':       ud => ud.padresNovia || ud.padresNovio ? 'Nuestros Padres' : null,
  'celebrated-usage-note':   ud => ud.padresNovia || ud.padresNovio ? 'Homenaje a quienes nos acompañan.' : null,
  'important-group-1':       ud => ud.padresNovia || null,
  'important-group-2':       ud => ud.padresNovio || null,
  'celebrated-card-1':       ud => ud.padresNovia || null,
  'celebrated-card-2':       ud => ud.padresNovio || null,

  // Itinerario / organización
  'organization-header':         ud => 'Itinerario del evento',
  'organization-image-caption':  ud => ud.lugar || null,
  'organization-item-1': ud => ud.itinerario?.[0] || null,
  'organization-item-2': ud => ud.itinerario?.[1] || null,
  'organization-item-3': ud => ud.itinerario?.[2] || null,
  'organization-item-4': ud => ud.itinerario?.[3] || null,

  // Galería captions
  'gallery-grid-caption-1': ud => ud.lugar || 'Ceremonia',
  'gallery-grid-caption-2': ud => ud.itinerario?.[0] || 'Recepción',
  'gallery-grid-caption-3': ud => 'Momento especial',
  'gallery-grid-caption-4': ud => ud.recepcion || ud.lugar || 'Celebración',
  'gallery-grid-caption-5': ud => 'Detalle',
  'gallery-grid-caption-6': ud => 'Retrato',
  'gallery-grid-caption-7': ud => 'Ceremonia',
  'gallery-grid-caption-8': ud => 'Celebración',

  // RSVP
  'rsvp-header':        ud => 'Confirmación de asistencia',
  'rsvp-copy':          ud => ud.nombres ? `Confirma tu asistencia a la celebración de ${ud.nombres}.` : null,
  'rsvp-monogram':      ud => ud.nombres ? (ud.nombres.split(' y ')[0]?.[0] || ud.nombres[0]) : null,
  'rsvp-deadline':      ud => ud.fechaLimiteRSVP ? `Confirma tu asistencia antes del ${ud.fechaLimiteRSVP}.` : null,
  'rsvp-button':        ud => 'Confirmar asistencia',
  'rsvp-submit-button': ud => 'Confirmar',
  'rsvp-form-fields':   ud => null, // campos de form se preservan
  'rsvp-form-content':  ud => null,

  // Dress code
  'dress-code-header':  ud => ud.vestimenta ? `Código de vestimenta · ${ud.vestimenta}` : 'Código de vestimenta',
  'dress-code-men':     ud => ud.vestimenta || null,
  'dress-code-women':   ud => ud.vestimenta || null,
  'dress-code-note':    ud => ud.vestimenta ? `Te sugerimos ${ud.vestimenta.toLowerCase()}.` : null,
  'dress-code-details': ud => ud.vestimenta || null,
  'details-header':     ud => 'Detalles para invitados',

  // regalos / gift table
  'gift-table-header':  ud => 'Mesa de regalos',
  'gift-table-note':    ud => 'Tu presencia es el mejor regalo.',
  'gift-store-1-link':  ud => 'Ver lista',
  'gift-store-2-link':  ud => 'Ver lista',
  'gift-store-3-link':  ud => 'Ver lista',
  'gift-store-4-link':  ud => 'Ver lista',
  'gift-content':       ud => 'Mesa de regalos',
  'gift-quote':         ud => 'El mejor regalo es celebrar juntos.',
  'gift-details':       ud => 'Tu presencia es nuestro mayor regalo.',
  'gift-primary-action':   ud => 'Ver lista de regalos',
  'gift-secondary-action': ud => 'Nota de regalo'
};

/**
 * Heurísticas de fallback: cuando el elemento NO tiene memory_key (wireframes
 * universales del seed), mapeamos por texto visible placeholder + tagName.
 * Devuelve `null` si no hay match o no hay dato del usuario asociado.
 */
const PLACEHOLDER_PATTERNS = [
  // Cabecera de padres/padrinos. Resuelve siempre: es texto editable fijo.
  // Solo casos no ambiguos: cuando hay UN padre (no los 4 wireframes), se respeta.
  { test: /^nuestros\s+padres$/i, field: 'padresHeader' },
  // "Nombre de los Novios" / "Nombre de los/Novios" — solo si tenemos nombres y NO hay
  // ambigüedad (no hay padres múltiples). Para evitar aplastar el "Nombre del Padre",
  // "Nombre de la Madre", "Padre de la Novia", etc., NO los tocamos aquí. El editor
  // visual es AU­TFNTICO lugar de edición para los nombres individuales.
  { test: /^nombre(?:s)?\s+(?:de\s+)?(?:los|las)\s+novios?$/i, field: 'nombres' },
  // "Nuestra Boda" sin contexto — reemplazo por nombres si disponibles
  { test: /^nuestra\s+boda$/i, field: 'nombres' },
  // Fecha / Save the date / fecha del evento
  { test: /\bsave\s+the\s+date\b/i,        field: 'fechaHumana', fallbackField: 'fecha' },
  { test: /\bfecha\s+del\s+evento\b/i,     field: 'fechaHumana', fallbackField: 'fecha' },
  // CTAs genéricos
  { test: /\bconfirm(?:ar)?(?:\s+asistencia)?\b/i, resolve: () => 'Confirmar asistencia' },
  { test: /\bsubmit\s+now\b/i,            resolve: () => 'Confirmar' },
  { test: /\bopen\s+(?:the\s+)?invitation\b/i, resolve: () => 'Ver invitación' },
  { test: /\bmain\s+event\b/i,             resolve: () => 'Ver detalles del evento' },
  { test: /\bfeatured\s+detail\b/i,       resolve: () => 'Detalle del evento' },
  // Lugar (placeholder "Direccion" / "rivée）
  { test: /^\s*direcci[oó]n\s*:?$/i,       field: 'lugar' }
];

/**
 * Heurística por texto placeholder visible. Devuelve el texto reemplazo o null.
 * Soporta patrones:
 *   - resolve: () => string          -> texto fijo
 *   - field: 'userDataKey'            -> copia userData[field] (si existe)
 *   - field + fallbackField           -> intenta field, si vacío usa fallbackField
 * Para placeholders de nombres individuales ("Nombre del Padre", "Madre de la Novia",
 * etc.) NO se definen patrones: requieren discrimination que el parser no tiene. Esos
 * slots se editan en el editor visual.
 */

// Fallback hint normalizer: derivar padresMasculino/padresFemenino desde padresNovia/Novio
const resolveFemeninoMasculino = (ud, roleHint) => {
  if (roleHint === 'm') return ud.padresMasculino || ud.padresNovio || null;
  if (roleHint === 'f') return ud.padresFemenino || ud.padresNovia || null;
  return null;
};

/**
 * Reemplaza el texto del último textNode no-vacío de un elemento, conservando
 * atributos, hijos decorativos (<span>, <i>, iconos) y structura. Importante para
 * no destruir CTAs con span/icono inline.
 */
const setElementTextPreservingInlineFormat = (el, newText) => {
  if (!newText || typeof newText !== 'string') return;
  const textChildren = Array.from(el.childNodes).filter(n => n.nodeType === 3); // textNodes
  if (textChildren.length === 0) {
    // Sin textNode directo: append uno (no rompe elementos decorativos existentes)
    el.appendChild(el.ownerDocument.createTextNode(newText));
    return;
  }
  // Borrar todos los textNodes excepto el ultimo, y sustituir el último
  for (let i = 0; i < textChildren.length - 1; i++) {
    textChildren[i].remove();
  }
  textChildren[textChildren.length - 1].nodeValue = newText;
};

/**
 * Reemplaza contenido dinámico (memory_type="text") en el HTML del módulo.
 * - Capa 1 (selector A): elementos con memory_type="text".
 *   - Si tienen memory_key: usa MEMORY_KEY_MAP (catálogo).
 *   - Si no: heurística por texto placeholder visible (PLACEHOLDER_PATTERNS).
 * - Capa 2 (selector B): elementos SIN memory_type en tags comunes de texto
 *   (h1,h2,h3,p,a,button,figcaption,time,span) cuyo texto visible matchee
 *   PLACEHOLDER_PATTERNS. Esto cubre wireframes universales sin schema (seed)
 *   cuyos placeholders ("Nombre del Padre", "Nuestros Padres", "Save the date")
 *   no llevan memory_type. Solo aplica si el match es por patrón (no por
 *   memory_key, que no tienen) y respeta elementos decorativos (span/icono).
 *
 * ctx = { module_id, moduleType } sólo informativo, para logging.
 */
const applyDynamicContent = (html, userData, ctx = {}) => {
  if (!userData || typeof userData !== 'object' || Object.keys(userData).length === 0) return html;
  try {
    const { document } = parseHTML(html);
    let replaced = 0;
    const processed = new Set();

    // Selector A: elementos con memory_type="text" (catálogo)
    const textosAnotados = document.querySelectorAll('[memory_type="text"]');
    textosAnotados.forEach(el => {
      const tagName = el.tagName.toLowerCase();
      const memoryKey = (el.getAttribute('memory_key') || '').toLowerCase();
      const visibleText = (el.textContent || '').trim();

      // Capa 1: mapeo por memory_key (catálogo)
      let newText = null;
      if (memoryKey && MEMORY_KEY_MAP[memoryKey]) {
        const produced = MEMORY_KEY_MAP[memoryKey](userData);
        if (produced) newText = String(produced);
      }

      // Capa 1b (mismo elemento sin memory_key): heurística por texto visible
      if (!newText && visibleText) {
        newText = matchPlaceholderPattern(visibleText, userData);
      }

      if (newText) {
        setElementTextPreservingInlineFormat(el, newText);
        if (tagName === 'time' && userData.fechaISO) el.setAttribute('datetime', userData.fechaISO);
        replaced += 1;
      }
      processed.add(el);
    });

    // Selector B: elementos SIN memory_type en tags HOJA de texto (no contenedores).
    // Deliberadamente excluimos <header>, <article>, <figure>, <figcaption>, <form>
    // porque su textContent incluye el de sus hijos y reemplazar todo el contenedor
    // aplastaría a los <p>/<span> internos. Solo hojas: h1,h2,h3,p,a,button,time,span.
    const tagsCandidatos = 'h1, h2, h3, p, a, button, time, span';
    const candidatos = document.querySelectorAll(tagsCandidatos);
    candidatos.forEach(el => {
      if (processed.has(el)) return;
      // Saltar si tiene cualquier memory_type (incluso text/image) — queremos sólo los quirúrgicamente NO anotados
      if (el.hasAttribute && el.hasAttribute('memory_type')) return;
      // Saltar si algún ancestro ya fue procesado (evita doble toque)
      let ancestor = el.parentElement;
      while (ancestor) {
        if (processed.has(ancestor)) return;
        ancestor = ancestor.parentElement;
      }

      const tagName = el.tagName.toLowerCase();
      const visibleText = (el.textContent || '').trim();
      if (!visibleText) return;

      const newText = matchPlaceholderPattern(visibleText, userData);
      if (newText) {
        setElementTextPreservingInlineFormat(el, newText);
        if (tagName === 'time' && userData.fechaISO) el.setAttribute('datetime', userData.fechaISO);
        replaced += 1;
        processed.add(el);
      }
    });

    if (replaced > 0) {
      console.log(`[APPLY-CONTENT] ${replaced} texto(s) reemplazado(s) (módulo=${ctx.moduleType || ctx.module_id || 'n/a'})`);
      return document.documentElement.outerHTML;
    }
    return html;
  } catch (error) {
    console.error('[APPLY-CONTENT] Error:', error.message || error);
    return html;
  }
};

/**
 * Heurística por texto placeholder visible. Devuelve el texto reemplazo o null.
 * Soporta 3 tipos de patrones:
 *   - resolve: () => string          -> texto fijo
 *   - field: 'userDataKey', role: 'm'|'f' -> copia userData[field] o (role) userData...
 *   - roleByCapture + fieldsByRole   -> inspecciona el sustantivo (m/f) y elige userData[fieldsByRole[x]]
 */
const matchPlaceholderPattern = (visibleText, userData) => {
  for (const pat of PLACEHOLDER_PATTERNS) {
    const m = pat.test.exec(visibleText);
    if (!m) continue;
    if (pat.resolve) {
      return pat.resolve();
    }
    if (pat.field) {
      let v = userData[pat.field];
      if (!v && pat.fallbackField) v = userData[pat.fallbackField];
      if (v) return String(v);
    }
  }
  return null;
};

/**
 * Normaliza el eventType del usuario (ej: "Boda Tradicional", "XV Años") a una
 * categoría canónica ("boda", "xv-anos", "cumpleanos", "bautizo", "primera-comunion")
 * reconocida por mapCategoryToFolder. Case-insensitive, partial-match.
 */
const normalizeEventTypeToCategory = (eventType) => {
  if (!eventType || typeof eventType !== 'string') return 'boda';
  const s = eventType.toLowerCase().trim();
  if (s.includes('xv') || s.includes('quince') || s.includes('15')) return 'xv-anos';
  if (s.includes('cumple') || s.includes('birthday')) return 'cumpleanos';
  if (s.includes('bautizo') || s.includes('christening')) return 'bautizo';
  if (s.includes('comunion') || s.includes('comunión') || s.includes('communion')) return 'primera-comunion';
  if (s.includes('baby') || s.includes('shower')) return 'baby-shower';
  if (s.includes('boda') || s.includes('wedding') || s.includes('matrimoni')) return 'boda';
  return 'boda';
};

/**
 * Mapea categoría a folder de imágenes
 */
const mapCategoryToFolder = (categoryOrEventType) => {
  const normalized = normalizeEventTypeToCategory(categoryOrEventType);
  const map = {
    'boda': 'boda-color',
    'xv-anos': 'xv-años',
    'cumpleanos': 'cumpleaños-niño',
    'bautizo': 'bautizo',
    'primera-comunion': 'primera-comunión',
    'baby-shower': 'baby-shower'
  };
  return map[normalized] || 'boda-color';
};

/**
 * Resuelve un placeholder library reemplazando URL loremflickr por una imagen
 * existente en /img/<folder>/. Rotación simple basada en index.
 * Devuelve la URL /img/... si encuentra un archivo, o null si no hay disponible.
 */
const resolveLibraryAsset = async (folder, indexHint = 0) => {
  try {
    const { readdirSync, existsSync } = await import('fs');
    const { join } = await import('path');
    const folderPath = join(process.cwd(), 'img', folder);
    if (!existsSync(folderPath)) {
      console.log(`[RESOLVER] ⚠️ Library: carpeta no existe /img/${folder}/`);
      return null;
    }
    const files = readdirSync(folderPath).filter(f => /\.(jpg|jpeg|png|webp|gif)$/i.test(f));
    if (files.length === 0) {
      console.log(`[RESOLVER] ⚠️ Library: no hay imágenes en /img/${folder}/`);
      return null;
    }
    const chosen = files[indexHint % files.length];
    return `/img/${folder}/${chosen}`;
  } catch (err) {
    console.log(`[RESOLVER] ⚠️ Library error leyendo /img/${folder}/:`, err.message);
    return null;
  }
};

/**
 * Orquestación modular: selecciona, adapta y ensambla módulos
 */
export const runModularOrchestration = async (prompt, apiKey, model = 'gemini-3.1-pro', options = {}, attachments = []) => {
  const {
    eventType = '',
    theme = '',
    primaryColor = '',
    secondaryColor = '',
    visualStyle = '',
    mood = '',
    imageFiles = [],
    promptInstruction = '',
    userId = '',
    imageApiKey = '',
    imageModel = 'gemini-3.1-flash-image-preview'
  } = options;

  console.log('=== ORCHESTRATOR MODULAR START ===');
  console.log('Event:', eventType, '| Theme:', theme, '| Model:', model);

  // Construir contexto estructurado del usuario a partir del prompt libre.
  // El usuario NO completa datos en la pantalla de generación, por esto se parsea el prompt.
  const userData = buildUserEventContext({ prompt, eventType, theme, mood, visualStyle });
  console.log('[Módular] userData parsed:', JSON.stringify({
    nombres: userData.nombres, fecha: userData.fecha, hora: userData.hora,
    lugar: userData.lugar, ciudad: userData.ciudad,
    padresNovia: userData.padresNovia ? '<set>' : '', padresNovio: userData.padresNovio ? '<set>' : '',
    itinerario: userData.itinerario.length, vestimenta: userData.vestimenta ? '<set>' : '',
    fechaLimiteRSVP: userData.fechaLimiteRSVP ? '<set>' : ''
  }));

  const requiredModules = ['portada', 'padres', 'ubicacion', 'itinerario', 'confirmacion', 'detalles'];

  // 1. Query y selección de módulos
  const selectedModules = [];
  for (const moduleType of requiredModules) {
    console.log(`\n[Módular] Buscando módulo: ${moduleType}`);
    const candidates = await queryRAGModules(moduleType, null, null, 5);

    if (candidates.length === 0) {
      console.log(`[Módular] ⚠️ No hay módulos para ${moduleType}, saltando`);
      continue;
    }

    const selected = await selectModuleWithGemini(candidates, eventType, theme, apiKey, model);
    if (selected) {
      console.log(`[Módular] ✅ Seleccionado: ${selected.style_name}`);
      selectedModules.push(selected);
    }
  }

  if (selectedModules.length === 0) {
    console.log('[Módular] ❌ No se seleccionó ningún módulo, fallback a orquestación tradicional');
    return await runOrchestration(prompt, apiKey, model, options, attachments);
  }

  // 2. Adaptar cada módulo a la temática
  console.log('\n[Módular] Adaptando módulos...');
  const adaptedModules = [];
  for (const module of selectedModules) {
    console.log(`[Módular] Adaptando: ${module.module_id}`);
    const adapted = await adaptModuleWithGemini(module, prompt, theme, eventType, apiKey, model, userData);
    // Pase de sanitización SIEMPRE: aunque el adaptador tuvo éxito, puede haber dejado
    // intactos algunos slots textuales (memory_type="text"). Esto garantiza que nombres,
    // fecha, lugar y otros datos del usuario queden contextualizados en cada generación.
    const sanitized = applyDynamicContent(adapted, userData, {
      module_id: module.module_id,
      moduleType: module.module_type
    });
    adaptedModules.push({ ...module, html_content: sanitized });
  }

  // 3. Ensamblar módulos
  console.log('\n[Módular] Ensamblando módulos...');
  const assembledHtml = assembleModules(adaptedModules, theme, eventType);

  // 3.5 Inyectar data-gemini-id en editables internos (bridge schema modular → editor)
  const withEditableIds = injectEditableIds(assembledHtml);

  // 4. Resolver placeholders (imágenes)
  console.log('\n[Módular] Resolviendo placeholders...');
  const resolvedHtml = await resolvePlaceholders(withEditableIds, eventType, theme, imageApiKey, imageModel);

  // 5. Aplicar temática
  console.log('[Módular] Aplicando temática...');
  const themedHtml = applyTheme(resolvedHtml, primaryColor, secondaryColor, '', '', '');

  // 6. Post-proceso
  console.log('[Módular] Post-proceso...');
  const clean = cleanHtml(themedHtml);
  const fixed = injectMandatoryLibraries(clean);
  const finalHtml = injectEditorMetadata(fixed, eventType, theme, primaryColor, secondaryColor);

  console.log('=== ORCHESTRATOR MODULAR COMPLETE ===');
  console.log('Final HTML length:', finalHtml.length);

  return finalHtml;
};