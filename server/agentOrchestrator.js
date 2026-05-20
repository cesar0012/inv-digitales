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

const EVENT_PREFERRED_LAYOUTS = {
  'Boda Tradicional': ['full-screen-hero', 'editorial-magazine', 'layered-cards', 'cinematic-panes', 'centered-timeline', 'side-by-side-columns', 'overlap-photos'],
  'Boda Americana': ['cinematic-panes', 'split-screen', 'minimalist-center', 'parallax-layers', 'editorial-magazine', 'side-by-side-columns', 'broken-grid'],
  'Boda Gay (Hombres)': ['diagonal-clash', 'split-screen', 'diagonal-sections', 'full-screen-hero', 'layered-cards', 'asymmetric-bleed'],
  'Boda Gay (Mujeres)': ['overlapping-sections', 'storybook', 'wave-sections', 'full-screen-hero', 'collage', 'chaotic-collage'],
  'XV Años': ['full-screen-hero', 'storybook', 'scrapbook', 'card-based', 'layered-cards', 'wave-sections', 'chaotic-collage', 'scattered-polaroids'],
  'Bautizo': ['minimalist-center', 'centered-timeline', 'layered-cards', 'storybook', 'overlap-photos'],
  'Primera Comunión': ['centered-timeline', 'minimalist-center', 'storybook', 'layered-cards', 'overlap-photos'],
  'Confirmación': ['centered-timeline', 'minimalist-center', 'editorial-magazine', 'layered-cards'],
  'Cumpleaños Niño': ['card-based', 'collage', 'masonry-grid', 'diagonal-sections', 'scrapbook', 'poster-style', 'chaotic-collage', 'mosaic-chaos'],
  'Cumpleaños Niña': ['scrapbook', 'wave-sections', 'collage', 'card-based', 'storybook', 'masonry-grid', 'scattered-polaroids', 'chaotic-collage'],
  'Baby Shower': ['card-based', 'scrapbook', 'wave-sections', 'overlapping-sections', 'storybook', 'masonry-grid', 'scattered-polaroids'],
  'Otro': ['full-screen-hero', 'card-based', 'editorial-magazine', 'split-screen', 'minimalist-center', 'chaotic-collage', 'overlap-photos']
};

const EVENT_PREFERRED_ANIMATIONS = {
  'Boda Tradicional': ['fade-in-stagger', 'parallax-scroll', 'particle-shimmer', 'soft-drift', 'slide-up-reveal', 'collage-assemble'],
  'Boda Americana': ['cinematic-wipe', 'parallax-scroll', 'zoom-on-enter', 'fade-in-stagger', 'slide-up-reveal', 'chaotic-entrance'],
  'Boda Gay (Hombres)': ['rotate-reveal', 'elastic-scale', 'parallax-scroll', 'morph-shapes', 'slide-up-reveal', 'grunge-reveal'],
  'Boda Gay (Mujeres)': ['watercolor-bleed', 'floating-elements', 'soft-drift', 'ripple-effect', 'fade-in-stagger', 'collage-assemble'],
  'XV Años': ['bounce-in', 'flip-cards', 'particle-shimmer', 'curtain-open', 'slide-up-reveal', 'floating-elements', 'chaotic-entrance', 'photo-scatter'],
  'Bautizo': ['soft-drift', 'fade-in-stagger', 'floating-elements', 'ripple-effect', 'slide-up-reveal'],
  'Primera Comunión': ['fade-in-stagger', 'soft-drift', 'slide-up-reveal', 'particle-shimmer', 'floating-elements'],
  'Confirmación': ['fade-in-stagger', 'parallax-scroll', 'slide-up-reveal', 'soft-drift'],
  'Cumpleaños Niño': ['bounce-in', 'elastic-scale', 'glitch-entrance', 'morph-shapes', 'rotate-reveal', 'flip-cards', 'chaotic-entrance', 'photo-scatter'],
  'Cumpleaños Niña': ['bounce-in', 'watercolor-bleed', 'floating-elements', 'elastic-scale', 'ripple-effect', 'curtain-open', 'collage-assemble'],
  'Baby Shower': ['floating-elements', 'soft-drift', 'bounce-in', 'watercolor-bleed', 'ripple-effect', 'fade-in-stagger', 'photo-scatter'],
  'Otro': ['fade-in-stagger', 'slide-up-reveal', 'parallax-scroll', 'zoom-on-enter', 'bounce-in', 'chaotic-entrance']
};

const VISUAL_STYLE_PREFERENCES = {
  'Elegante Clásico': { layouts: ['full-screen-hero', 'editorial-magazine', 'layered-cards', 'cinematic-panes', 'overlap-photos'], typographies: ['elegant-serif-pair', 'calligraphic-body', 'luxury-thin'], colorStrategies: ['muted-elegant', 'monochrome-accent', 'tonal-layering'], sflows: ['linear-classic', 'alternating-bg', 'fullbleed-interleaved'] },
  'Moderno Minimalista': { layouts: ['minimalist-center', 'split-screen', 'side-by-side-columns', 'broken-grid'], typographies: ['modern-geometric', 'condensed-sans-expanded', 'display-sans'], colorStrategies: ['monochrome-accent', 'high-contrast', 'duotone'], sflows: ['linear-classic', 'scroll-snap-sections', 'card-stack'] },
  'Rústico Vintage': { layouts: ['scrapbook', 'storybook', 'collage', 'overlapping-sections', 'scattered-polaroids'], typographies: ['handwritten-clean', 'boho-handwritten', 'vintage-serif'], colorStrategies: ['earth-tones', 'warm-palette', 'analogous-harmony'], sflows: ['wave-divider', 'alternating-bg', 'overlay-sections'] },
  'Bohemio Floral': { layouts: ['overlapping-sections', 'scrapbook', 'wave-sections', 'storybook', 'chaotic-collage'], typographies: ['boho-handwritten', 'script-serif', 'calligraphic-body'], colorStrategies: ['earth-tones', 'pastel-spectrum', 'analogous-harmony'], sflows: ['wave-divider', 'overlay-sections', 'mosaic-grid'] },
  'Tropical Playa': { layouts: ['wave-sections', 'full-screen-hero', 'asymmetrical', 'diagonal-sections', 'asymmetric-bleed'], typographies: ['handwritten-clean', 'display-sans', 'playful-rounded'], colorStrategies: ['warm-palette', 'complementary-pop', 'triadic-vibrant'], sflows: ['wave-divider', 'fullbleed-interleaved', 'overlay-sections'] },
  'Art Deco': { layouts: ['editorial-magazine', 'diagonal-sections', 'split-screen', 'layered-cards', 'diagonal-clash'], typographies: ['art-deco-display', 'condensed-sans-expanded', 'luxury-thin'], colorStrategies: ['high-contrast', 'duotone', 'jewel-tones'], sflows: ['linear-classic', 'accordion-reveal', 'card-stack'] },
  'Romántico Suave': { layouts: ['full-screen-hero', 'storybook', 'wave-sections', 'layered-cards', 'overlap-photos'], typographies: ['script-serif', 'calligraphic-body', 'elegant-serif-pair'], colorStrategies: ['pastel-spectrum', 'analogous-harmony', 'muted-elegant'], sflows: ['linear-classic', 'wave-divider', 'alternating-bg'] },
  'Divertido Colorido': { layouts: ['collage', 'scrapbook', 'masonry-grid', 'card-based', 'poster-style', 'chaotic-collage', 'mosaic-chaos'], typographies: ['playful-rounded', 'display-sans', 'handwritten-clean', 'collage-typography'], colorStrategies: ['triadic-vibrant', 'complementary-pop', 'pastel-spectrum'], sflows: ['mosaic-grid', 'card-stack', 'scroll-snap-sections', 'chaotic-overlap'] },
  'Glamuroso': { layouts: ['full-screen-hero', 'cinematic-panes', 'editorial-magazine', 'layered-cards', 'overlap-photos'], typographies: ['luxury-thin', 'elegant-serif-pair', 'art-deco-display'], colorStrategies: ['jewel-tones', 'monochrome-accent', 'gradient-flow'], sflows: ['linear-classic', 'fullbleed-interleaved', 'alternating-bg'] },
  'Industrial Urbano': { layouts: ['asymmetrical', 'diagonal-sections', 'masonry-grid', 'split-screen', 'diagonal-clash', 'broken-grid'], typographies: ['condensed-sans-expanded', 'mono-display', 'retro-slab', 'brutalist-mix'], colorStrategies: ['high-contrast', 'monochrome-accent', 'duotone'], sflows: ['mosaic-grid', 'overlay-sections', 'card-stack', 'asymmetric-breaks'] },
  'Campestre Natural': { layouts: ['scrapbook', 'storybook', 'overlapping-sections', 'wave-sections', 'scattered-polaroids'], typographies: ['handwritten-clean', 'boho-handwritten', 'vintage-serif'], colorStrategies: ['earth-tones', 'analogous-harmony', 'warm-palette'], sflows: ['wave-divider', 'alternating-bg', 'overlay-sections'] },
  'Nocturno Lujoso': { layouts: ['cinematic-panes', 'full-screen-hero', 'editorial-magazine', 'parallax-layers', 'layered-z-messy'], typographies: ['luxury-thin', 'elegant-serif-pair', 'modern-geometric'], colorStrategies: ['jewel-tones', 'monochrome-accent', 'gradient-flow'], sflows: ['fullbleed-interleaved', 'linear-classic', 'accordion-reveal'] },
  'Acuarela Artístico': { layouts: ['overlapping-sections', 'wave-sections', 'scrapbook', 'storybook', 'chaotic-collage'], typographies: ['calligraphic-body', 'script-serif', 'boho-handwritten'], colorStrategies: ['pastel-spectrum', 'analogous-harmony', 'gradient-flow'], sflows: ['wave-divider', 'overlay-sections', 'mosaic-grid'] },
  'Geométrico Contemporáneo': { layouts: ['diagonal-sections', 'asymmetrical', 'masonry-grid', 'split-screen', 'diagonal-clash', 'broken-grid'], typographies: ['modern-geometric', 'condensed-sans-expanded', 'mono-display', 'extreme-contrast'], colorStrategies: ['high-contrast', 'duotone', 'complementary-pop'], sflows: ['mosaic-grid', 'card-stack', 'timeline-horizontal', 'asymmetric-breaks'] },
  'Brutalista Etéreo': { layouts: ['broken-grid', 'diagonal-clash', 'asymmetric-bleed', 'chaotic-collage', 'layered-z-messy'], typographies: ['brutalist-mix', 'extreme-contrast', 'collage-typography'], colorStrategies: ['high-contrast', 'duotone', 'neon-accents'], sflows: ['chaotic-overlap', 'asymmetric-breaks', 'collage-flow'] },
  'Cyberpunk Neon': { layouts: ['diagonal-clash', 'split-screen', 'layered-z-messy', 'asymmetric-bleed', 'broken-grid'], typographies: ['brutalist-mix', 'mono-display', 'extreme-contrast'], colorStrategies: ['neon-accents', 'high-contrast', 'duotone'], sflows: ['chaotic-overlap', 'mosaic-grid', 'asymmetric-breaks'] },
  'Neon Oscuro': { layouts: ['asymmetric-bleed', 'diagonal-clash', 'layered-z-messy', 'full-screen-hero', 'broken-grid'], typographies: ['brutalist-mix', 'extreme-contrast', 'mono-display'], colorStrategies: ['neon-accents', 'monochrome-accent', 'high-contrast'], sflows: ['chaotic-overlap', 'asymmetric-breaks', 'collage-flow'] },
  'Bioluminiscente Abisal': { layouts: ['full-screen-hero', 'parallax-layers', 'overlap-photos', 'cinematic-panes', 'layered-z-messy'], typographies: ['calligraphic-body', 'elegant-serif-pair', 'modern-geometric'], colorStrategies: ['gradient-flow', 'jewel-tones', 'tonal-layering'], sflows: ['fullbleed-interleaved', 'overlay-sections', 'wave-divider'] }
};

const MOOD_PREFERENCES = {
  'Romántico': { animations: ['soft-drift', 'fade-in-stagger', 'floating-elements', 'watercolor-bleed', 'collage-assemble'], sflows: ['wave-divider', 'alternating-bg', 'overlay-sections'] },
  'Festivo': { animations: ['bounce-in', 'elastic-scale', 'curtain-open', 'flip-cards', 'chaotic-entrance', 'photo-scatter'], sflows: ['scroll-snap-sections', 'card-stack', 'mosaic-grid', 'chaotic-overlap'] },
  'Solemne': { animations: ['fade-in-stagger', 'parallax-scroll', 'slide-up-reveal', 'curtain-open'], sflows: ['linear-classic', 'alternating-bg', 'fullbleed-interleaved'] },
  'Divertido': { animations: ['bounce-in', 'elastic-scale', 'glitch-entrance', 'morph-shapes', 'rotate-reveal', 'chaotic-entrance'], sflows: ['mosaic-grid', 'card-stack', 'scroll-snap-sections', 'chaotic-overlap'] },
  'Íntimo': { animations: ['soft-drift', 'fade-in-stagger', 'slide-up-reveal', 'ripple-effect'], sflows: ['linear-classic', 'wave-divider', 'overlay-sections'] },
  'Grandioso': { animations: ['cinematic-wipe', 'parallax-scroll', 'zoom-on-enter', 'particle-shimmer', 'collage-assemble'], sflows: ['fullbleed-interleaved', 'linear-classic', 'accordion-reveal'] },
  'Tranquilo': { animations: ['soft-drift', 'fade-in-stagger', 'floating-elements', 'watercolor-bleed'], sflows: ['wave-divider', 'alternating-bg', 'overlay-sections'] },
  'Enérgico': { animations: ['bounce-in', 'elastic-scale', 'rotate-reveal', 'glitch-entrance', 'morph-shapes', 'chaotic-entrance', 'photo-scatter'], sflows: ['mosaic-grid', 'scroll-snap-sections', 'card-stack', 'chaotic-overlap'] },
  'Nostálgico': { animations: ['typewriter-text', 'stamp-reveal', 'fade-in-stagger', 'parallax-scroll', 'collage-assemble'], sflows: ['wave-divider', 'overlay-sections', 'timeline-horizontal'] },
  'Místico': { animations: ['particle-shimmer', 'morph-shapes', 'ripple-effect', 'watercolor-bleed', 'grunge-reveal'], sflows: ['fullbleed-interleaved', 'overlay-sections', 'wave-divider'] }
};

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

const pickDifferent = (arr, exclude) => {
  const filtered = arr.filter(x => x !== exclude);
  return filtered.length > 0 ? pickRandom(filtered) : pickRandom(arr);
};

const generateDesignFingerprint = (eventType = '', theme = '', visualStyle = '', mood = '', primaryColor = '', secondaryColor = '') => {
  const preferredLayouts = EVENT_PREFERRED_LAYOUTS[eventType] || EVENT_PREFERRED_LAYOUTS['Otro'];
  const preferredAnimations = EVENT_PREFERRED_ANIMATIONS[eventType] || EVENT_PREFERRED_ANIMATIONS['Otro'];
  const aestheticFamily = AESTHETIC_FAMILY_MAP[eventType] || AESTHETIC_FAMILY_MAP['Otro'];
  const moduleSensations = MODULE_SENSATIONS_MAP[eventType] || MODULE_SENSATIONS_MAP['Otro'];

  const stylePrefs = VISUAL_STYLE_PREFERENCES[visualStyle] || null;
  const moodPrefs = MOOD_PREFERENCES[mood] || null;

  const layoutPool = stylePrefs ? [...new Set([...stylePrefs.layouts, ...preferredLayouts])] : preferredLayouts;
  const typographyPool = stylePrefs ? stylePrefs.typographies : TYPOGRAPHY_OPTIONS;
  const animationPool = moodPrefs ? [...new Set([...moodPrefs.animations, ...preferredAnimations])] : preferredAnimations;
  const colorStrategyPool = stylePrefs ? stylePrefs.colorStrategies : COLOR_STRATEGIES;
  const sflowPool = stylePrefs
    ? [...new Set([.stylePrefs.sflows, ...(moodPrefs ? moodPrefs.sflows : [])])]
    : (moodPrefs ? moodPrefs.sflows : SECTION_FLOW_OPTIONS);

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
    `AESTHETIC_FAMILY: ${aestheticFamily}`,
    `MODULE_SENSATIONS: ${moduleSensations}`,
    `MODULE_LAYOUTS: ${moduleAssignments.join(' | ')}`,
    `CHAOS_SEED: ${chaosSeed}`,
    `VARIATION_DIRECTIVE: Each module has an EXPLICIT per-module assignment in MODULE_LAYOUTS. You MUST follow the layout, typography, animation, photo treatment, and spacing specified for EACH module. NO two adjacent modules may share the same layout. The CHAOS_SEED is a unique token for this invitation — use it to seed visual randomness (e.g. rotation angles, offset values, clip-path variations, z-index stacking).`,
  ];

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
  const fingerprint = generateDesignFingerprint(eventType, theme, visualStyle, mood, primaryColor, secondaryColor);
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