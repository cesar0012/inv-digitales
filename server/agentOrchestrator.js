import https from 'https';
import db from './database.js';
import { CODER_SYSTEM_PROMPT, ADAPTER_SYSTEM_PROMPT } from './agents-prompt.js';

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