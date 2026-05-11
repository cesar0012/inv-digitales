import https from 'https';
import { CODER_SYSTEM_PROMPT, AESTHETIC_FAMILY_MAP, MODULE_SENSATIONS_MAP } from './agents-prompt.js';

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
  'diagonal-sections', 'layered-cards', 'wave-sections', 'storybook', 'poster-style', 'collage'
];

const TYPOGRAPHY_OPTIONS = [
  'script-serif', 'display-sans', 'handwritten-clean', 'blackletter-modern', 'elegant-serif-pair',
  'condensed-sans-expanded', 'mono-display', 'vintage-serif', 'modern-geometric', 'calligraphic-body',
  'art-deco-display', 'boho-handwritten', 'retro-slab', 'luxury-thin', 'playful-rounded'
];

const ANIMATION_OPTIONS = [
  'fade-in-stagger', 'slide-up-reveal', 'parallax-scroll', 'zoom-on-enter', 'flip-cards',
  'typewriter-text', 'floating-elements', 'particle-shimmer', 'wave-motion', 'rotate-reveal',
  'curtain-open', 'bounce-in', 'elastic-scale', 'glitch-entrance', 'watercolor-bleed',
  'stamp-reveal', 'ripple-effect', 'morph-shapes', 'cinematic-wipe', 'soft-drift'
];

const COLOR_STRATEGIES = [
  'gradient-flow', 'monochrome-accent', 'duotone', 'warm-palette', 'cool-palette',
  'pastel-spectrum', 'jewel-tones', 'earth-tones', 'neon-accents', 'muted-elegant',
  'high-contrast', 'tonal-layering', 'complementary-pop', 'analogous-harmony', 'triadic-vibrant'
];

const SECTION_FLOW_OPTIONS = [
  'linear-classic', 'alternating-bg', 'overlay-sections', 'card-stack', 'accordion-reveal',
  'timeline-horizontal', 'mosaic-grid', 'scroll-snap-sections', 'fullbleed-interleaved', 'wave-divider'
];

const EVENT_PREFERRED_LAYOUTS = {
  'Boda Tradicional': ['full-screen-hero', 'editorial-magazine', 'layered-cards', 'cinematic-panes', 'centered-timeline', 'side-by-side-columns'],
  'Boda Americana': ['cinematic-panes', 'split-screen', 'minimalist-center', 'parallax-layers', 'editorial-magazine', 'side-by-side-columns'],
  'Boda Gay (Hombres)': ['modern-geometric', 'split-screen', 'diagonal-sections', 'full-screen-hero', 'layered-cards'],
  'Boda Gay (Mujeres)': ['overlapping-sections', 'storybook', 'wave-sections', 'full-screen-hero', 'collage'],
  'XV Años': ['full-screen-hero', 'storybook', 'scrapbook', 'card-based', 'layered-cards', 'wave-sections'],
  'Bautizo': ['soft-drift', 'minimalist-center', 'centered-timeline', 'layered-cards', 'storybook'],
  'Primera Comunión': ['centered-timeline', 'minimalist-center', 'soft-drift', 'storybook', 'layered-cards'],
  'Confirmación': ['centered-timeline', 'minimalist-center', 'editorial-magazine', 'layered-cards'],
  'Cumpleaños Niño': ['card-based', 'collage', 'masonry-grid', 'diagonal-sections', 'scrapbook', 'poster-style'],
  'Cumpleaños Niña': ['scrapbook', 'wave-sections', 'collage', 'card-based', 'storybook', 'masonry-grid'],
  'Baby Shower': ['card-based', 'scrapbook', 'wave-sections', 'overlapping-sections', 'storybook', 'masonry-grid'],
  'Otro': ['full-screen-hero', 'card-based', 'editorial-magazine', 'spregit-screen', 'minimalist-center']
};

const EVENT_PREFERRED_ANIMATIONS = {
  'Boda Tradicional': ['fade-in-stagger', 'parallax-scroll', 'particle-shimmer', 'soft-drift', 'slide-up-reveal'],
  'Boda Americana': ['cinematic-wipe', 'parallax-scroll', 'zoom-on-enter', 'fade-in-stagger', 'slide-up-reveal'],
  'Boda Gay (Hombres)': ['rotate-reveal', 'elastic-scale', 'parallax-scroll', 'morph-shapes', 'slide-up-reveal'],
  'Boda Gay (Mujeres)': ['watercolor-bleed', 'floating-elements', 'soft-drift', 'ripple-effect', 'fade-in-stagger'],
  'XV Años': ['bounce-in', 'flip-cards', 'particle-shimmer', 'curtain-open', 'slide-up-reveal', 'floating-elements'],
  'Bautizo': ['soft-drift', 'fade-in-stagger', 'floating-elements', 'ripple-effect', 'slide-up-reveal'],
  'Primera Comunión': ['fade-in-stagger', 'soft-drift', 'slide-up-reveal', 'particle-shimmer', 'floating-elements'],
  'Confirmación': ['fade-in-stagger', 'parallax-scroll', 'slide-up-reveal', 'soft-drift'],
  'Cumpleaños Niño': ['bounce-in', 'elastic-scale', 'glitch-entrance', 'morph-shapes', 'rotate-reveal', 'flip-cards'],
  'Cumpleaños Niña': ['bounce-in', 'watercolor-bleed', 'floating-elements', 'elastic-scale', 'ripple-effect', 'curtain-open'],
  'Baby Shower': ['floating-elements', 'soft-drift', 'bounce-in', 'watercolor-bleed', 'ripple-effect', 'fade-in-stagger'],
  'Otro': ['fade-in-stagger', 'slide-up-reveal', 'parallax-scroll', 'zoom-on-enter', 'bounce-in']
};

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

const generateDesignFingerprint = (eventType = '') => {
  const preferredLayouts = EVENT_PREFERRED_LAYOUTS[eventType] || EVENT_PREFERRED_LAYOUTS['Otro'];
  const preferredAnimations = EVENT_PREFERRED_ANIMATIONS[eventType] || EVENT_PREFERRED_ANIMATIONS['Otro'];

  const isLayoutOutlier = Math.random() < 0.25;
  const isAnimationOutlier = Math.random() < 0.20;

  const layout = isLayoutOutlier ? pickRandom(LAYOUT_OPTIONS) : pickRandom(preferredLayouts);
  const typography = pickRandom(TYPOGRAPHY_OPTIONS);
  const animation = isAnimationOutlier ? pickRandom(ANIMATION_OPTIONS) : pickRandom(preferredAnimations);
  const colorStrategy = pickRandom(COLOR_STRATEGIES);
  const sectionFlow = pickRandom(SECTION_FLOW_OPTIONS);
  const aestheticFamily = AESTHETIC_FAMILY_MAP[eventType] || AESTHETIC_FAMILY_MAP['Otro'];
  const moduleSensations = MODULE_SENSATIONS_MAP[eventType] || MODULE_SENSATIONS_MAP['Otro'];

  return {
    layout,
    typography,
    animation,
    colorStrategy,
    sectionFlow,
    aestheticFamily,
    moduleSensations,
    raw: [
      `LAYOUT: ${layout}`,
      `TYPOGRAPHY: ${typography}`,
      `ANIMATION: ${animation}`,
      `COLOR_STRATEGY: ${colorStrategy}`,
      `SECTION_FLOW: ${sectionFlow}`,
      `AESTHETIC_FAMILY: ${aestheticFamily}`,
      `MODULE_SENSATIONS: ${moduleSensations}`
    ].join(' | ')
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

export const runOrchestration = async (prompt, apiKey, model = 'gemini-3.1-pro', options = {}) => {
  const {
    eventType = '',
    theme = '',
    primaryColor = '',
    secondaryColor = '',
    visualStyle = '',
    mood = '',
    imageFiles = [],
    promptInstruction = ''
  } = options;

  console.log('=== ORCHESTRATOR START ===');
  console.log('Event:', eventType, '| Theme:', theme, '| Model:', model);

  // ===== STEP 1: LOCAL — Generate fingerprint & extract metadata =====
  console.log('[ORQUESTADOR] Step 1: Generating design fingerprint...');
  const fingerprint = generateDesignFingerprint(eventType);
  console.log('[ORQUESTADOR] Fingerprint:', fingerprint.raw);

  const currentDate = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const promptWithDate = prompt.replace(/SYSTEM_TIMESTAMP:\s*\S+/, `SYSTEM_TIMESTAMP: ${currentDate}`);

  // ===== STEP 2: GEMINI API — CODER call =====
  console.log('[ORQUESTADOR] Step 2: Calling Gemini with CODER prompt...');
  const fingerprintBlock = `\n\n===== DESIGN FINGERPRINT (FOLLOW EXACTLY) =====\n${fingerprint.raw}\n===== END FINGERPRINT =====\n\n`;
  const promptImageContext = promptInstruction ? `\n\n${promptInstruction}` : '';
  const fullPrompt = `${CODER_SYSTEM_PROMPT}${fingerprintBlock}${promptImageContext}${promptWithDate}`;

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
        parts: [{ text: fullPrompt }]
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

  return finalHtml;
};