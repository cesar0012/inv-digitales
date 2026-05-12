import { createHash } from 'crypto';
import https from 'https';
import { AESTHETIC_FAMILY_MAP, MODULE_SENSATIONS_MAP } from './agents-prompt.js';

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

const pickN = (arr, n) => {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, shuffled.length));
};

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
    ? [...new Set([...stylePrefs.sflows, ...(moodPrefs ? moodPrefs.sflows : [])])]
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

  const fingerprint = [
    `LAYOUT: ${primaryLayout}`,
    `LAYOUT_VARIANTS: ${secondaryLayout}, ${tertiaryLayout}`,
    `TYPOGRAPHY: ${primaryTypography} (primary) + ${secondaryTypography} (accent)`,
    `ANIMATION: ${primaryAnimation} (primary) + ${secondaryAnimation} (secondary)`,
    `COLOR_STRATEGY: ${colorStrategy} (primary) + ${altColorStrategy} (accent sections)`,
    `SECTION_FLOW: ${sectionFlow}`,
    `AESTHETIC_FAMILY: ${aestheticFamily}`,
    `MODULE_SENSATIONS: ${moduleSensations}`,
    `VARIATION_DIRECTIVE: Each module/section MUST have a distinct micro-layout. Use ${primaryLayout} as the OVERALL structure, but rotate between ${primaryLayout}, ${secondaryLayout}, and ${tertiaryLayout} for individual sections. Alternate typography between primary (${primaryTypography}) and accent (${secondaryTypography}). Alternate animation between primary (${primaryAnimation}) and secondary (${secondaryAnimation}). NO two adjacent sections should look identical.`,
  ];

  if (primaryColor) fingerprint.push(`USER_PRIMARY_COLOR: ${primaryColor}`);
  if (secondaryColor) fingerprint.push(`USER_SECONDARY_COLOR: ${secondaryColor}`);
  if (visualStyle) fingerprint.push(`VISUAL_STYLE: ${visualStyle}`);
  if (mood) fingerprint.push(`MOOD: ${mood}`);
  if (theme) fingerprint.push(`USER_THEME: ${theme}`);

  return fingerprint.join(' | ');
};

const SYSTEM_INSTRUCTION = `You generate ONE complete HTML file for a digital invitation. Output raw HTML only — no markdown.

===== USER'S STYLE — HIGHEST PRIORITY =====
When the fingerprint contains USER_PRIMARY_COLOR, USER_SECONDARY_COLOR, USER_THEME, VISUAL_STYLE, or MOOD, these are your HIGHEST PRIORITY design directives. They OVERRIDE any default aesthetic tendencies:
- USER_PRIMARY_COLOR and USER_SECONDARY_COLOR MUST be the dominant colors of the invitation. Use them as --color-primary and --color-secondary in CSS :root and apply them EVERYWHERE: backgrounds, headings, accents, borders, overlays, buttons, decorations. The invitation MUST feel like it belongs to these colors.
- USER_THEME is your PRIMARY design guide. If the user says "tropical beach party", the entire design screams tropical — not generic elegant. If they say "dark cyberpunk", it's dark cyberpunk — NOT pastel minimalist.
- VISUAL_STYLE shapes layout, typography, and color strategy preferences. Match it.
- MOOD shapes animation and section flow. Match it.
NEVER fall back to a generic "elegant dark" default when the user specified a theme. The user's description is LAW.

===== DESIGN FINGERPRINT (MANDATORY) =====
A design fingerprint will be injected before your prompt. It contains MANDATORY creative direction:
- LAYOUT: You MUST use this layout structure. Do not substitute a different layout.
- TYPOGRAPHY: You MUST choose fonts from this pairing. Use Google Fonts that match.
- ANIMATION: You MUST use this as your primary animation/transition style.
- COLOR STRATEGY: You MUST apply colors using this strategy (gradient, duotone, monochrome+accent, etc.) — BUT always anchored on USER_PRIMARY_COLOR and USER_SECONDARY_COLOR when present.
- SECTION FLOW: You MUST organize sections using this flow pattern.
- AESTHETIC FAMILY: You MUST apply the aesthetic direction described.
- MODULE SENSATIONS: You MUST vary the "sensación" per module as specified.
The fingerprint is LAW, not a suggestion. If the fingerprint says "card-based layout", do NOT create a full-screen hero. If it says "typewriter animation", include typewriter effects. OBEY THE FINGERPRINT.

===== ANTI-MONOTONY PRINCIPLES (CRITICAL) =====
RULE: 70% of each module follows expected structure / 20% is INTENTIONAL VARIATION / 10% is SURPRISE.
The memorable design lives in the 20% and 10%. The 70% is expected; the memorable is unexpected.

MONOTONY TRAPS TO AVOID:
- Using card-based layout for EVERY module
- Same section order every time
- Same image treatment (saturate, grayscale) applied globally
- Same font pair (Playfair + DM Sans) in every invitation
- Same spacing (py-24, gap-8) in every section
- fade-in as default animation everywhere
- Same hover translateY(-5px) on every interactive element
- Same 3-col grid for padrinos/corte/regalos
- Same centered floating card for confirmación

INSTEAD, CREATE DIVERSITY BY:
- Varying layout per module (not one layout for the whole page)
- Mixing and recombining design tokens in non-obvious ways
- Applying different image filters per module and theme
- Using typography that breaks conventions of the theme
- Creating spacing that generates visual rhythm (not uniform)
- Applying organic animations, not mechanical ones
- Surprising with unexpected interactions
- When in doubt, choose the LESS PREDICTABLE option

PER-MODULE SENSATION GUIDE (follow the MODULE_SENSATIONS from the fingerprint):
- PORTADA: The first impression sets the ENTIRE tone. Surprise? Elegance? Anticipation? Choose accordingly.
- PADRES: How we honor family — traditional, modern, or creative? Vary from invitation to invitation.
- COUNTDOWN: Time should FEEL the atmosphere — urgent, elegant, or celebratory? Not always horizontal flex.
- ITINERARIO: Information can be clear AND beautiful — vertical, horizontal scroll, zigzag, not always left-line.
- UBICACION: The place should entice, not just inform — functional, atmospheric, or minimal? Vary.
- PADRINOS: Celebration vs. information — grid, list, constellation? Not always 3-col glass cards.
- CORTE: Present people memorably — uniform, polaroids, marquee? Not always 5-col grid.
- VESTIMENTA: Clarity without losing style — swatches, icons, mood board? Not always centered column.
- REGALOS: Functionality with elegance — cards, glassmorphism, minimal? Not always 3-col grid.
- CONFIRMACION: The close should be as memorable as the experience — fluid, terminal, confetti? Not always floating card.

ANTI-MONOTONY CHECKLIST (verify before output):
- Do layouts vary by module?
- Are fonts NOT the same across the entire page?
- Do image treatments change based on context?
- Are animations NOT all fade-in?
- Does negative space have purpose?
- Is there SOMETHING unexpected in the 20-10%?

===== DYNAMIC & CHAOTIC DESIGN PRINCIPLES =====
EVERY invitation MUST feel ALIVE, DYNAMIC, and UNCONVENTIONAL. Avoid cookie-cutter layouts. Create designs that SURPRISE:
- OVERLAP PHOTOS: Images should overlap, bleed into each other, break boundaries. Use negative margins, absolute positioning, z-index layering, and clip-path to create photo collisions. Photos should NOT sit neatly in grids — they should FEEL dynamic.
- BREAK THE GRID: Use asymmetric layouts, diagonal sections, broken grids, overlapping elements, and mixed layout patterns PER MODULE. Not every section needs the same structure.
- VARIED PER MODULE: Each section (portada, padres, countdown, itinerario, etc.) should have its OWN micro-layout. Mix: full-bleed photos with floating text, split-screens with overlapping cards, timelines with scattered elements.
- COLLAGE AESTHETIC: Embrace messy, artistic layouts — photos at angles, tape/pin decorations, polaroid stacks, torn paper edges, stamp effects. Make it feel HANDCRAFTED, not templated.
- COLOR COLLISION: When USER colors are provided, use them boldly and dynamically — gradients that shift between them, overlays that blend, accent pops in unexpected places. Don't just apply them as flat backgrounds.
- TYPOGRAPHY AS DESIGN: Let typography BE the design element — oversized titles, mixed weights, text that overlaps images, rotated text, text as texture.
- DEPTH & LAYERING: Use shadows, z-index stacking, parallax, and scale to create visual depth. Elements should feel like they exist in 3D space.
- NEVER DEFAULT TO: centered text on solid background, neat 3-column grids, uniform spacing (py-24 everywhere), same card style for every module, fade-in as the only animation.

Vary between invitations:
- Layout: full-screen hero, split-screen, card-based, editorial, asymmetrical, overlapping sections, parallax layers, horizontal scroll segments, masonry grids, centered timeline, chaotic-collage, overlap-photos, broken-grid, diagonal-clash, scattered-polaroids, etc.
- Typography: choose fonts that match the theme — script + serif, display + sans, handwritten + clean, blackletter + modern, brutalist-mix, collage-typography, etc. Use 2-3 Google Fonts per invitation.
- Color application: ALWAYS anchored on user colors. Gradients, duotone, monochrome+accent, layered — but the BASE is always the user's chosen palette.
- Section transitions: hard cuts, fades, slides, reveals, parallax, zoom — mix and match freely per section.
- Countdown styles: flip cards, circular progress, minimal numbers, ornate frames, watercolor circles, scattered numbers, etc.
- Hover effects: vary them — scale, glow, lift, color shift, underline animation, border reveal, tilt, etc.
- Decorative elements: ornamental borders, watercolor splashes, geometric patterns, floral illustrations, foil textures, paper textures, torn edges, tape, pins, stamps, etc.
- Animation approach: use ANY combination of CSS animations, scroll-triggered effects, hover interactions, entrance animations, parallax, particle effects, etc. Differ per section.

The user's theme/description is your PRIMARY design guide. Follow it closely. If no theme is specified, choose a distinctive style yourself — NEVER fall back to a generic "cinemonic dark" default.

===== AESTHETIC FAMILIES =====
Match the AESTHETIC_FAMILY from the fingerprint to apply the right atmosphere:

EDITORIAL ELEGANTE — Atmósfera: Revistas de lujo europeas, espacio negativo protagonista, serif/sans contrast.
Tokens: Ivory (#F7F3EE), Charcoal (#1A1A1A), Champagne (#C9A96E). Fuentes: Playfair Display + DM Sans. Tratamientos: parallax, desaturación sutil, overlay gradients. Espaciado: py-24+ generoso.

CYBERPUNK NEON — Atmósfera: Tokio futurista, hologramas, partículas, glow effects, glassmorphism.
Tokens: Deep black (#050508), Neon Purple (#A855F7), Neon Blue (#22D3EE), Neon Pink (#F472B6). Fuentes: Orbitron + Inter. Tratamientos: Canvas particles, box-shadow glow, clip-path diagonales. Espaciado: gap-4 responsivo.

BOHEMIO ORGÁNICO — Atmósfera: Naturaleza, scrapbook, rituales tradicionales, texturas papel, formas irregulares.
Tokens: Linen (#F5EFE6), Terra (#B5613A), Olive (#7A8C5E). Fuentes: Caveat + Cormorant Garamond. Tratamientos: border-radius asimétrico, papel shadow, cinta adhesiva, SVG botánico. Espaciado: gap-10+ generoso.

BRUTALISMO ETÉREO — Atmósfera: Crudeza técnica + etérea, collage caótico, tipografía desproporcionada.
Tokens: Deep Onyx (#0a0a0c), Radioactive Lavender (#b026ff), Crimson Rust (#8b0000). Fuentes: Cinzel Decorative + Syncopate. Tratamientos: mix-blend-modes, z-index layering, margins negativos. Espaciado: -mt-40 para superposición.

BIOLUMINISCENCIA ABISAL — Atmósfera: Profundidades marinas, holografismo, glassmorphism oscuro, bubbles.
Tokens: Abyss (#050714), Biolum Cyan (#00F0FF), Biolum Pink (#FF007A). Fuentes: Cormorant Garamond italic + Syne. Tratamientos: animated gradient clip, glass-orbs, bubbles JS, caustic overlays. Espaciado: mt-20 offsets asimétricos.

NEON OSCURO (Post-Cyberpunk) — Atmósfera: Sistema corrupto, collide tipográfico, chrome-liquid effects.
Tokens: Onyx (#030303), Neon Cyan (#00E5FF), Chrome Light (#E0E5EC). Fuentes: Playfair Display italic + Space Mono. Tratamientos: text-stroke, chrome-liquid, neon box-shadow, noise texture. Layout: absolute positioning.

===== AVAILABLE <head> CDN SCRIPTS (include ONLY what you use) =====
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script> <!-- ONLY if using Three.js particles -->
<script src="https://cdn.jsdelivr.net/npm/tsparticles-engine@2/tsparticles.engine.min.js"></script> <!-- ONLY if using tsParticles -->
<script src="https://cdn.jsdelivr.net/npm/tsparticles@2/tsparticles.bundle.min.js"></script> <!-- ONLY if using tsParticles -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script> <!-- ONLY if using GSAP -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js"></script> <!-- ONLY if using ScrollTrigger -->
<script src="https://cdn.jsdelivr.net/npm/animejs@3.2.2/lib/anime.min.js"></script> <!-- ONLY if using Anime.js -->
<link href="https://fonts.googleapis.com/css2?family=..." rel="stylesheet">

No other libraries.

===== EFFECTS (OPTIONAL — use what fits the design) =====
You MAY use Three.js particles, tsParticles, GSAP/ScrollTrigger, Anime.js, or purely CSS animations — choose based on what matches the theme. Examples:
- Elegant/formal: subtle fade-ins, parallax, gold particle shimmer
- Rustic/vintage: paper texture transitions, stamp-like reveals, handwritten feel
- Modern/minimal: clean slide-ins, geometric animations, monochrome accents
- Bohemian/floral: floating elements, watercolor effects, organic shapes
- Tropical/beach: wave animations, sun glow, palm silhouettes
- Art deco: geometric patterns, gold lines, symmetrical reveals
You are NOT required to use all libraries. Use NONE, ONE, TWO, or ALL as the design demands.
Keep particle counts <150 for mobile performance.

ANIME.JS EFFECTS (available):
- Letter split + stagger: for hero titles (portada names, XV names)
- Timeline secuencial: for itinerario, corte module reveals
- SVG path drawing: for decorative lines, dividers
- Staggered grid: for galería image reveals
- Flip digits: for countdown
- Marquee: for corte de honor banner
- Color morph: for hover states
- Glitch text: for bold headers

===== GEMINI_GENERATE BACKGROUNDS =====
✅ ONLY correct usage — inline style on a section/div:
   style="background-image: url('GEMINI_GENERATE:description here'); background-size: cover; background-position: center;"
   Then add overlay: <div class="absolute inset-0 bg-gradient-to-b from-black/50 to-black/70"></div>

❌ FORBIDDEN — These will BREAK the page:
   - class="bg-[url('GEMINI_GENERATE:...')]" ← Tailwind JIT CANNOT process this at runtime
   - <img src="GEMINI_GENERATE:..."> for backgrounds
   - GEMINI_GENERATE as small/floating/decorative elements
   - GEMINI_GENERATE without overlay for text readability

===== LOCAL EVENT PHOTOS =====
Use <img src="/img/FOLDER/file.jpg" data-gemini-id="MODULE-imagen" class="object-cover"> inside sized containers.
Folders: xv-años, boda-color, boda-americana, boda-gay-hombres, boda-gay-mujeres, bautizo, primera-comunión, cumpleaños-niño, cumpleaños-niña, baby-shower
These are placeholders the user will replace.
⚠️ CRITICAL: ONLY use filenames that are EXPLICITLY listed in the user's prompt under "Available images". NEVER invent, guess, or fabricate filenames like foto-1.jpg, image-1.jpg, photo.jpg, imagen.jpg, hero.jpg, background.jpg, or ANY name not in the provided list. If no images are listed, use GEMINI_GENERATE backgrounds instead.

===== MANDATORY PHOTOS BY MODULE (when images are available) =====
When the prompt includes "Available images", you MUST include <img> tags with those photos in the following modules:
- PORTADA (hero/cover): MUST include <img src="/img/FOLDER/[hero-portrait-file]" data-gemini-id="portada-imagen" class="object-cover"> as the main hero image. This is NON-OPTIONAL.
- PADRES (parents): MUST include <img src="/img/FOLDER/[parents-file]" data-gemini-id="padres-imagen" class="object-cover"> showing the parents/family.
- UBICACION (location): SHOULD include <img src="/img/FOLDER/[venue-file]" data-gemini-id="ubicacion-imagen" class="object-cover"> if a suitable venue/exterior image exists.
- BAUTIZO/PRIMERA COMUNION modules: MUST include <img> with ceremony-appropriate image.
Pick the best matching file for each module based on the filename keywords (portrait→hero, parents→padres, church→ubicacion, etc.).

===== data-gemini-id (MANDATORY on ALL text/image elements) =====
Format: data-gemini-id="MODULE-ELEMENT" (e.g., portada-titulo, padres-nombre, itinerario-hora)
Must be on ALL: h1-h6, p, span, a, img, iframe
Modules: portada, padres, itinerario, ubicacion, countdown, padrinos, corte, vestimenta, regalos

===== STRUCTURE RULES =====
- CSS :root { --color-primary: #hex; --color-secondary: #hex; } — define the user's chosen colors as variables and USE them throughout the ENTIRE invitation. These are NON-NEGOTIABLE. Apply them to: backgrounds, headings, accents, borders, overlays, buttons, gradients, decorative elements, hover states, section dividers.
- 2-3 Google Fonts that match the theme (decorative headings + elegant body, or any combination that fits).
- ITINERARY: vertical timeline with flexbox ONLY. NEVER <table>. Left=time badge, center=dot+line, right=card — BUT vary the visual style: dots can be custom icons, lines can be dashed/dotted/gradient, cards can overlap or tilt.
- MUST be responsive and mobile-first.
- Each section MUST be VISUALLY DISTINCT — vary backgrounds, spacing, typography scale, decorative elements, AND micro-layouts between sections. No two sections should feel the same.
- PHOTOS MUST OVERLAP and interact with each other and with text. Use negative margins, absolute positioning, z-index layering, clip-path, rotation. Photos should NEVER sit in neat isolated containers unless the style specifically calls for it.
- Countdown timer MUST work (use real JavaScript countdown logic, not just static numbers).
- When COLOR_STRATEGY is "user-palette-gradient", "user-palette-duotone", "user-palette-accent", or "user-palette-layered": derive ALL colors from USER_PRIMARY_COLOR and USER_SECONDARY_COLOR. Generate tints, shades, complementary tones from these two colors. The result should feel like a cohesive palette built from the user's choice.

===== METADATA (after </html>) =====
<!-- INVITATION_DATA:
{"title":"[Spanish title]","eventType":"[XV Años|Boda Tradicional|etc]","theme":"[Design theme]","colors":["Color (#hex)","Color (#hex)"],"tags":["kw1","kw2","kw3","kw4","kw5"],"generatedAt":"YYYY-MM-DD HH:mm:ss"}
-->

Now generate the complete HTML invitation: `;

export const generateWithGemini = async (prompt, apiKey, model = 'gemini-3.1-pro', options = {}) => {
  const { eventType, theme, primaryColor, secondaryColor, imageFiles, promptInstruction, visualStyle, mood } = options;
  const currentDate = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const promptWithDate = prompt.replace(/SYSTEM_TIMESTAMP:\s*\S+/, `SYSTEM_TIMESTAMP: ${currentDate}`);
  
  const fingerprint = generateDesignFingerprint(eventType, theme, visualStyle, mood, primaryColor, secondaryColor);
  console.log('=== DESIGN FINGERPRINT ===');
  console.log('Event:', eventType, '| Theme:', theme, '| VisualStyle:', visualStyle, '| Mood:', mood, '| Primary:', primaryColor, '| Secondary:', secondaryColor);
  console.log('Fingerprint:', fingerprint);
  console.log('=========================');
  
  const fingerprintBlock = `\n\n===== DESIGN FINGERPRINT (FOLLOW EXACTLY) =====\n${fingerprint}\n===== END FINGERPRINT =====\n\n`;
  const promptImageContext = promptInstruction ? `\n\n${promptInstruction}` : '';
  const fullPrompt = `${SYSTEM_INSTRUCTION}${fingerprintBlock}${promptImageContext}${promptWithDate}`;
  
  // CORRECTO: usar v1beta sin API key en URL, mover al header
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  console.log('=== GEMINI HTML GENERATION ===');
  console.log('Model:', model);
  console.log('Prompt length:', fullPrompt.length);
  console.log('=====================================');

  const response = await fetchNoSSL(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey  // API key en header
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

  console.log('HTTP:', response.status);

  if (!response.ok) {
    const error = await response.json();
    console.error('API Error:', JSON.stringify(error, null, 2));
    throw new Error(error.error?.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

  console.log('Output length:', generatedText?.length || 0);

  if (!generatedText) {
    throw new Error('Empty response from Gemini');
  }

  const html = cleanHtml(generatedText);
  const fixedHtml = fixTailwindBgGemini(html);
  const libHtml = injectMandatoryLibraries(fixedHtml);
  const metaHtml = injectEditorMetadata(libHtml, eventType, theme, primaryColor, secondaryColor);
  const finalHtml = fixInvalidImagePaths(metaHtml, imageFiles);
  return finalHtml;
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
  if (count > 0) console.log(`Fixed ${count} bg-[url('GEMINI_GENERATE:...')] → inline style`);
  return result;
};

const injectMandatoryLibraries = (html) => {
  if (!html || !html.includes('<!DOCTYPE')) return html;

  console.log('=== INJECTING MISSING CDN SCRIPTS (safety net) ===');

  let result = html;

  const hasThreeJsCdn = result.includes('three.min.js');
  const hasTsParticlesCdn = result.includes('tsparticles');
  const hasGSAPCdn = result.includes('gsap.min.js');
  const hasScrollTriggerCdn = result.includes('ScrollTrigger');
  const usesThreeJs = result.includes('THREE.');
  const usesTsParticles = result.includes('tsParticles.load') || result.includes('tsParticles.loadJSON');
  const usesGSAP = result.includes('gsap.') || result.includes('gsap.registerPlugin') || result.includes('ScrollTrigger');

  const missingScripts = [];
  if (usesThreeJs && !hasThreeJsCdn) {
    missingScripts.push('<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>');
    console.log('AI used Three.js but forgot CDN — injecting');
  }
  if (usesTsParticles && !hasTsParticlesCdn) {
    missingScripts.push('<script src="https://cdn.jsdelivr.net/npm/tsparticles-engine@2/tsparticles.engine.min.js"></script>');
    missingScripts.push('<script src="https://cdn.jsdelivr.net/npm/tsparticles@2/tsparticles.bundle.min.js"></script>');
    console.log('AI used tsParticles but forgot CDN — injecting');
  }
  if (usesGSAP && !hasGSAPCdn) {
    missingScripts.push('<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>');
  }
  if (usesGSAP && !hasScrollTriggerCdn && result.includes('ScrollTrigger')) {
    missingScripts.push('<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js"></script>');
  }

  if (missingScripts.length > 0) {
    const injection = '\n    <!-- SAFETY NET: Missing CDN injected -->\n    ' + missingScripts.join('\n    ') + '\n';
    result = result.replace('</head>', injection + '</head>');
    console.log('Injected missing CDN scripts:', missingScripts.length);
  } else {
    console.log('No missing CDN scripts — AI included all needed libraries');
  }

  console.log('=== INJECTION COMPLETE ===');
  return result;
};

const injectEditorMetadata = (html, eventType, theme, primaryColor, secondaryColor) => {
  if (!html || !html.includes('<!DOCTYPE')) return html;
  if (!eventType && !theme && !primaryColor && !secondaryColor) return html;

  const existingRegex = /<script type="application\/json" id="invitation-editor-metadata">[\s\S]*?<\/script>/g;
  const cleanHtml = html.replace(existingRegex, '');

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
  console.log('✅ Injected invitation-editor-metadata:', JSON.stringify({ eventType, theme, primaryColor, secondaryColor }));

  if (cleanHtml.includes('</body>')) {
    return cleanHtml.replace('</body>', `${scriptTag}\n</body>`);
  }
  return cleanHtml + '\n' + scriptTag;
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
    console.log(`🔧 Fixed invalid image: /img/${folder}/${filename} → /img/${folder}/${replacement}`);
    return `src="/img/${folder}/${replacement}"`;
  });

  if (fixCount > 0) console.log(`✅ Fixed ${fixCount} invalid image paths`);
  return result;
};

const cleanHtml = (text) => {
  if (!text) return '';
  
  let cleanedHtml = text;
  
  // Limpiar markdown
  cleanedHtml = cleanedHtml.replace(/```html\s*/g, '').replace(/```\s*/g, '').replace(/```/g, '');
  
  // Buscar bloque HTML completo
  const htmlMatch = cleanedHtml.match(/<!DOCTYPE html>[\s\S]*<\/html>/i);
  if (htmlMatch) {
    return htmlMatch[0];
  }
  
  return cleanedHtml;
};
