import { createHash } from 'crypto';
import https from 'https';
import db from './database.js';
import { analyzeTemplate } from './ragValidator.js';
import { ADAPTER_SYSTEM_PROMPT } from './agents-prompt.js';


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
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, shuffled.length));
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
- AESTHETIC FAMILY: If present, you MUST apply the aesthetic direction described.
- MODULE SENSATIONS: If present, you MUST vary the "sensación" per module as specified.
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

// === RAG FUNCTIONS FOR GEMINI SERVICE (fallback when not using orchestrator) ===
const queryRAGTemplateGemini = async (eventType, theme) => {
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

    if (!template) return null;

    return {
      ...template,
      theme_tags: JSON.parse(template.theme_tags || '[]'),
      color_palette: JSON.parse(template.color_palette || '{}'),
      typography_scale: JSON.parse(template.typography_scale || '{}'),
      animation_rules: JSON.parse(template.animation_rules || '{}'),
      variation_params: JSON.parse(template.variation_params || '{}')
    };
  } catch (error) {
    console.error('[RAG] Error:', error);
    return null;
  }
};

const buildRAGPromptGemini = (ragTemplate) => {
  if (!ragTemplate) return '';
  
  const parts = [];
  parts.push(`===== RAG TEMPLATE: ${ragTemplate.style_name} =====`);
  parts.push(`Description: ${ragTemplate.description}`);
  parts.push(`Category: ${ragTemplate.category}`);
  parts.push(`Theme Tags: ${ragTemplate.theme_tags.join(', ')}`);

  if (ragTemplate.color_palette && Object.keys(ragTemplate.color_palette).length > 0) {
    parts.push(`\nColor Palette:`);
    Object.entries(ragTemplate.color_palette).forEach(([key, value]) => {
      parts.push(`  ${key}: ${value}`);
    });
  }

  if (ragTemplate.typography_scale) {
    parts.push(`\nTypography:`);
    if (ragTemplate.typography_scale.display) parts.push(`  Display: ${ragTemplate.typography_scale.display}`);
    if (ragTemplate.typography_scale.ui) parts.push(`  UI: ${ragTemplate.typography_scale.ui}`);
  }

  if (ragTemplate.animation_rules) {
    parts.push(`\nAnimation Rules:`);
    Object.entries(ragTemplate.animation_rules).forEach(([key, value]) => {
      parts.push(`  ${key}: ${value}`);
    });
  }

  parts.push(`===== END RAG TEMPLATE =====\n`);
  return parts.join('\n');
};

// === RAG TEMPLATE SELECTION (html_content-based) ===
// Busca en knowledge_base el mejor template con html_content basado en
// coincidencia de category con eventType + keywords del userPrompt en
// description, theme_tags, visual_styles, mood, style_name.
// Retorna el template completo (con html_content) o null si no encuentra.
export const selectRagTemplate = (dbInstance, eventType, userPrompt, config = {}) => {
  try {
    let query = 'SELECT * FROM knowledge_base WHERE is_active = 1 AND html_content IS NOT NULL';
    const params = [];

    if (eventType) {
      query += ' AND category = ?';
      params.push(eventType);
    }

    const candidates = dbInstance.prepare(query).all(...params);

    if (candidates.length === 0) {
      console.log('[RAG-SELECT] No hay templates con html_content para eventType:', eventType);
      return null;
    }

    console.log(`[RAG-SELECT] ${candidates.length} candidato(s) con html_content para eventType="${eventType}"`);

    // Extraer keywords del userPrompt (palabras >3 chars, normalizadas)
    const promptLower = (userPrompt || '').toLowerCase();
    const stopWords = new Set(['para', 'con', 'una', 'este', 'esta', 'pero', 'por', 'los', 'las', 'del', 'desde', 'hasta', 'que', 'tiene', 'tienen', 'ser', 'son', 'como', 'mas', 'menos', 'the', 'and', 'for', 'with', 'this', 'that', 'from']);
    const keywords = promptLower
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !stopWords.has(w));

    console.log(`[RAG-SELECT] Keywords extraidas del prompt: ${keywords.slice(0, 15).join(', ')}${keywords.length > 15 ? '...' : ''}`);

    let bestTemplate = null;
    let bestScore = -1;

    for (const t of candidates) {
      let score = 0;
      const haystack = [
        t.style_name || '',
        t.description || '',
        t.theme_tags || '',
        t.visual_styles || '',
        t.mood || '',
        t.filename || ''
      ].join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      for (const kw of keywords) {
        if (haystack.includes(kw)) {
          score += 1;
        }
      }

      // Bonus por coincidencia exacta de category
      if (eventType && t.category === eventType) {
        score += 5;
      }

      // Bonus por tamano de html_content (preferir templates mas ricos)
      const htmlSize = t.html_content ? t.html_content.length : 0;
      if (htmlSize > 50000) score += 2;
      else if (htmlSize > 30000) score += 1;

      console.log(`[RAG-SELECT] Template id=${t.id} "${t.style_name}" → score=${score} (htmlSize=${htmlSize})`);

      if (score > bestScore) {
        bestScore = score;
        bestTemplate = t;
      }
    }

    if (!bestTemplate || bestScore < 0) {
      console.log('[RAG-SELECT] Ningun template supero el umbral de score');
      return null;
    }

    console.log(`[RAG-SELECT] ✅ Seleccionado: id=${bestTemplate.id} "${bestTemplate.style_name}" (score=${bestScore})`);

    // Analizar el template seleccionado para log
    try {
      const analysis = analyzeTemplate(bestTemplate.html_content, eventType);
      console.log(`[RAG-SELECT] Análisis: ${analysis.foundCount}/${analysis.totalRequired} modulos requeridos, ${analysis.found_tags.length} data-gemini-id tags, ${Object.keys(analysis.colors).length} colores, ui_elements=[${analysis.ui_elements.join(',')}]`);
      if (analysis.missing.length > 0) {
        console.log(`[RAG-SELECT] ⚠️ Modulos faltantes: ${analysis.missing.join(', ')}`);
      }
    } catch (e) {
      console.warn('[RAG-SELECT] No se pudo analizar el template:', e.message);
    }

    return bestTemplate;
  } catch (error) {
    console.error('[RAG-SELECT] Error:', error);
    return null;
  }
};

// === ADAPT TEMPLATE WITH AI ===
// Toma el HTML base del template + datos del usuario y le pide a Gemini que
// ADAPTE el contenido (texto, colores, imagenes) y AMPLIFIQUE el drama visual
// (scroll animations, decorative elements, cinematic effects) usando el
// ADAPTER_SYSTEM_PROMPT. Retorna el HTML modificado.
export const adaptTemplateWithAI = async (baseHtml, userData, modifications, apiKey, model = 'gemini-3.1-pro') => {
  const userPrompt = userData || '';
  const mods = modifications || {};

  // Construir bloque de preferencias del usuario extraidas de options
  const userPrefs = [];
  if (mods.primaryColor) userPrefs.push(`USER_PRIMARY_COLOR: ${mods.primaryColor}`);
  if (mods.secondaryColor) userPrefs.push(`USER_SECONDARY_COLOR: ${mods.secondaryColor}`);
  if (mods.theme) userPrefs.push(`USER_THEME: ${mods.theme}`);
  if (mods.visualStyle) userPrefs.push(`VISUAL_STYLE: ${mods.visualStyle}`);
  if (mods.mood) userPrefs.push(`MOOD: ${mods.mood}`);
  if (mods.eventType) userPrefs.push(`EVENT_TYPE: ${mods.eventType}`);

  // Lista de imagenes locales disponibles (si las hay)
  let imagesBlock = '';
  if (mods.imageFiles && Array.isArray(mods.imageFiles) && mods.imageFiles.length > 0) {
    const imgList = mods.imageFiles.map(f => `/img/${f.folder}/${f.filename}`).join('\n');
    imagesBlock = `\n===== AVAILABLE IMAGES =====\nThe user has these local images available. Use them in the appropriate modules (portada, padres, ubicacion). NEVER invent filenames — only use these:\n${imgList}\n===== END AVAILABLE IMAGES =====\n`;
  }

  // Instruccion de imagenes (promptInstruction)
  let promptInstructionBlock = '';
  if (mods.promptInstruction) {
    promptInstructionBlock = `\n===== IMAGE INSTRUCTIONS =====\n${mods.promptInstruction}\n===== END IMAGE INSTRUCTIONS =====\n`;
  }

  const fullPrompt = `===== USER REQUEST =====
${userPrompt}
===== END USER REQUEST =====

${userPrefs.length > 0 ? `===== USER DESIGN PREFERENCES =====\n${userPrefs.join('\n')}\n===== END USER DESIGN PREFERENCES =====\n` : ''}${imagesBlock}${promptInstructionBlock}
===== BASE TEMPLATE HTML (ADAPT AND AMPLIFY THIS — DO NOT GENERATE FROM SCRATCH) =====
${baseHtml}
===== END BASE TEMPLATE HTML =====

Now adapt and amplify the template above. Output the COMPLETE HTML file from <!DOCTYPE html> to </html> with the metadata comment after.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  console.log('=== ADAPT TEMPLATE WITH AI ===');
  console.log('Model:', model);
  console.log('Base HTML length:', baseHtml.length);
  console.log('User prompt length:', userPrompt.length);
  console.log('User prefs:', userPrefs.join(', ') || '(none)');
  console.log('================================');

  const response = await fetchNoSSL(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: ADAPTER_SYSTEM_PROMPT }]
      },
      contents: [{
        parts: [{ text: fullPrompt }]
      }],
      generationConfig: {
        temperature: 0.9,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 1500000
      }
    })
  });

  console.log('ADAPT API HTTP:', response.status);

  if (!response.ok) {
    const error = await response.json();
    console.error('ADAPT API Error:', JSON.stringify(error, null, 2));
    throw new Error(error.error?.message || `ADAPT API HTTP ${response.status}`);
  }

  const data = await response.json();
  const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

  console.log('ADAPT Output length:', generatedText?.length || 0);

  if (!generatedText) {
    throw new Error('Empty response from Gemini in adaptTemplateWithAI');
  }

  return generatedText;
};

export const generateWithGemini = async (prompt, apiKey, model = 'gemini-3.1-pro', options = {}, attachments = []) => {
  const { eventType, theme, primaryColor, secondaryColor, imageFiles, promptInstruction, visualStyle, mood, userId } = options;

  // ===== RAG TEMPLATE ADAPTATION (html_content-based) =====
  // Intentar encontrar un template con html_content y adaptarlo+amplificarlo
  // en lugar de generar desde cero. Si falla, cae al flujo de generación tradicional.
  try {
    const ragTemplateWithHtml = selectRagTemplate(db, eventType, prompt, options);

    if (ragTemplateWithHtml && ragTemplateWithHtml.html_content) {
      console.log('[RAG-ADAPT] Template con html_content encontrado:', ragTemplateWithHtml.style_name, '(id=' + ragTemplateWithHtml.id + ')');

      if (userId) {
        try {
          db.prepare(`INSERT INTO knowledge_base_usage (template_id, user_id, event_type) VALUES (?, ?, ?)`)
            .run(ragTemplateWithHtml.id, userId, eventType);
        } catch (e) {}
      }

      const modifications = {
        primaryColor,
        secondaryColor,
        theme,
        visualStyle,
        mood,
        eventType,
        imageFiles,
        promptInstruction
      };

      const adaptedHtml = await adaptTemplateWithAI(
        ragTemplateWithHtml.html_content,
        prompt,
        modifications,
        apiKey,
        model
      );

      if (adaptedHtml && adaptedHtml.length > 100) {
        console.log('[RAG-ADAPT] ✅ Adaptación exitosa, length:', adaptedHtml.length);
        const html = cleanHtml(adaptedHtml);
        const fixedHtml = fixTailwindBgGemini(html);
        const libHtml = injectMandatoryLibraries(fixedHtml);
        const metaHtml = injectEditorMetadata(libHtml, eventType, theme, primaryColor, secondaryColor);
        const finalHtml = fixInvalidImagePaths(metaHtml, imageFiles);
        return finalHtml;
      } else {
        console.log('[RAG-ADAPT] ⚠️ Adaptación devolvió HTML muy corto, fallback a generación desde cero');
      }
    } else {
      console.log('[RAG-ADAPT] No hay templates con html_content, usando generación desde cero');
    }
  } catch (adaptError) {
    console.error('[RAG-ADAPT] ❌ Error en adaptación, fallback a generación desde cero:', adaptError.message);
  }

  // ===== FALLBACK: GENERACIÓN DESDE CERO =====
  // ===== CONSULTAR RAG PRIMERO =====
  let ragContext = '';
  const ragTemplate = await queryRAGTemplateGemini(eventType, theme);
  
  if (ragTemplate) {
    ragContext = buildRAGPromptGemini(ragTemplate);
    console.log('[RAG] Usando plantilla:', ragTemplate.style_name);
    
    // Track usage
    if (userId) {
      try {
        db.prepare(`INSERT INTO knowledge_base_usage (template_id, user_id, event_type) VALUES (?, ?, ?)`)
          .run(ragTemplate.id, userId, eventType);
      } catch (e) {}
    }
  } else {
    console.log('[RAG] Sin plantilla específica, usando fingerprint tradicional');
  }
  const currentDate = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const promptWithDate = prompt.replace(/SYSTEM_TIMESTAMP:\s*\S+/, `SYSTEM_TIMESTAMP: ${currentDate}`);
  
  const fingerprint = generateDesignFingerprint(eventType, theme, visualStyle, mood, primaryColor, secondaryColor, ragTemplate);
  console.log('=== DESIGN FINGERPRINT ===');
  console.log('Event:', eventType, '| Theme:', theme, '| VisualStyle:', visualStyle, '| Mood:', mood, '| Primary:', primaryColor, '| Secondary:', secondaryColor);
  console.log('Fingerprint:', fingerprint);
  console.log('=========================');
  
  const fingerprintBlock = `\n\n===== DESIGN FINGERPRINT (FOLLOW EXACTLY) =====\n${fingerprint}\n===== END FINGERPRINT =====\n\n`;
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
    console.log(`📎 Including ${parts.length} reference image(s) in Gemini request`);
  }

  // SI hay RAG disponible, añadirlo después del fingerprint para dar guía de estilo
  const ragContextBlock = ragContext ? `\n\n${ragContext}\n\n` : '';
  const fullPrompt = ragContext
    ? `${SYSTEM_INSTRUCTION}${fingerprintBlock}${ragContextBlock}${promptImageContext}${referenceInstruction}${promptWithDate}`
    : `${SYSTEM_INSTRUCTION}${fingerprintBlock}${promptImageContext}${referenceInstruction}${promptWithDate}`;
  parts.unshift({ text: fullPrompt });
  
  // CORRECTO: usar v1beta sin API key en URL, mover al header
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  console.log('=== GEMINI HTML GENERATION ===');
  console.log('Model:', model);
  console.log('Prompt length:', fullPrompt.length);
  console.log('Attachments:', attachments?.length || 0);
  console.log('=====================================');

  const response = await fetchNoSSL(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey  // API key en header
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

const SEO_SYSTEM_PROMPT = `You are an expert SEO copywriter specializing in digital invitation landing pages. You generate structured JSON content optimized for search engines and user conversion.

You will receive metadata about a digital invitation design. You must produce a single JSON object with EXACTLY the following top-level keys:
- "slug" (string)
- "seo_title" (string)
- "meta_description" (string)
- "h1" (string)
- "sections" (object with keys section_1 through section_12)
- "structured_data" (object)

===== SLUG RULES =====
Format: [event-type]/[theme]-[color-or-style]-digital-invitation
- The slug MUST contain exactly one forward slash "/" separating the event type segment from the rest
- All lowercase, words separated by hyphens (the only "/" is the one between event-type and the theme segment)
- No leading or trailing slashes or hyphens
- Example: boda/tradicional-rustico-rosa-digital-invitation
- Example: xv-anos/fiesta-tropical-azul-digital-invitation
- Example: baby-shower/floral-rosa-digital-invitation
- Example: bautizo/elegante-blanco-digital-invitation
- The event type goes BEFORE the slash, then the theme + color/style after the slash, always ending with "digital-invitation"
- Remove accents and special characters (á→a, é→e, í→i, ó→o, ú→u, ñ→n)
- If the event type has multiple words, join with hyphens (e.g., "Boda Tradicional" → "boda-tradicional")
- If the theme has multiple words, join with hyphens
- Use only ONE color or style descriptor, not both

===== PAGE TITLE RULES =====
- MUST be under 60 characters
- Format: "[Theme/Color] [Event Type] Digital Invitation" OR "[Event Type] Digital Invitation with [Theme/Style] Design"
- Example: "Rustic Vintage Boda Digital Invitation"
- Example: "XV Años Digital Invitation with Tropical Design"
- Must include the words "Digital Invitation"
- Must include the event type
- Must include theme or color
- Write in English

===== META DESCRIPTION RULES =====
- MUST be under 160 characters
- Must be persuasive and natural
- Must mention the event type
- Must mention the theme
- Must mention the color palette
- Must mention at least 2 key modules (RSVP, countdown, map, photo gallery, itinerary, dress code, etc.)
- Must end with a clear call to action to customize
- Write in English
- Example: "Create a stunning rustic boda digital invitation with countdown, RSVP, and map. Customize colors, music, and every detail. Try it now!"

===== SECTION 1: HERO SUMMARY =====
Key: "section_1"
Type: string
Write a comprehensive summary paragraph (80-150 words) of the digital invitation design. Describe the visual style, color palette, and explain that the invitation includes interactive sections. Vary the mentioned modules based on the plan tier:
- For "catalogo" or basic plans: mention RSVP, countdown, event details, and map
- For "creativa" plans: also mention photo gallery, itinerary, and dress code
- For "premium" plans: mention all modules including music, gift registry, custom message, and advanced customization
Always mention that it is mobile-friendly, shareable via link, and fully customizable. Write in English.

===== SECTION 2: QUICK DETAILS =====
Key: "section_2"
Type: object with these EXACT keys:
{
  "event_type": "string — the event type from the input",
  "theme": "string — the theme from the input",
  "style": "string — the visual style inferred from the design (e.g., Rustic Vintage, Modern Minimalist, Bohemian Floral, etc.)",
  "main_colors": "string — comma-separated list of the primary and secondary colors with hex codes",
  "design_elements": "string — 3-5 descriptive design elements present (e.g., watercolor textures, gold foil accents, botanical illustrations, geometric patterns, elegant typography)",
  "included_modules": "array of strings — list of module names included in this design",
  "optional_modules": "array of strings — list of optional modules that can be toggled on",
  "format": "Mobile-friendly digital invitation",
  "delivery": "Shareable link",
  "compatibility": "All modern browsers and mobile devices"
}

===== SECTION 3: ABOUT DESCRIPTION =====
Key: "section_3"
Type: string
You MUST follow this EXACT template, filling in the bracketed placeholders with the appropriate values from the input metadata. Do NOT deviate from this structure:
"This digital invitation was created for a [event type] with a [theme] theme and a [style] visual direction. The design uses [main colors] with [design elements] to create a polished and memorable invitation experience. Guests can view the event details, confirm attendance through RSVP, open the location map, see the countdown, browse photos, and access important celebration information from one mobile-friendly link. This design is ideal for users who want a [style/tone] digital invitation that feels personal, organized, easy to share, and visually aligned with their event."
Replace every bracketed placeholder with real values derived from the input. Write in English.

===== SECTION 4: DEMO COPY =====
Key: "section_4"
Type: string
Write inviting copy (60-100 words) that encourages the user to open the interactive demo preview. Must include the phrase "Open the demo" or similar CTA. Describe what they will preview: design, layout, modules, and guest experience. Write in English.

===== SECTION 5: INCLUDED MODULES =====
Key: "section_5"
Type: string
Write a detailed explanation (100-150 words) of the modules included in this invitation design. Explain that the design comes with pre-built interactive sections and that each module can be toggled on or off. List the specific modules included based on the input metadata. Mention that modules like RSVP collect real guest responses, countdown creates urgency, map provides directions, and photo gallery showcases memories. Write in English.

===== SECTION 6: CUSTOMIZE =====
Key: "section_6"
Type: string
Write detailed copy (100-150 words) explaining that every field is customizable. You MUST explicitly mention ALL of these fields: Name, Event date, Event time, Venue name, Address, Photos, Text, Colors, RSVP settings, Music, Itinerary, Dress code, Gift information, Language, Special message. Explain that changes are reflected in real-time and the invitation can be personalized to match the exact vision of the event. Write in English.

===== SECTION 7: MODULE ITERATION =====
Key: "section_7"
Type: object with these EXACT keys:
{
  "text": "string — 80-120 words explaining that individual sections can be redesigned iteratively using AI. Describe how the user can refine specific modules while keeping the rest intact. Mention that each iteration preserves the overall design coherence while improving the targeted section.",
  "example_prompts": [
    "Add a music module that matches this design.",
    "Redesign the RSVP section with a more elegant layout.",
    "Add a dress code module using the same color palette.",
    "Create a luxury countdown section.",
    "Add an itinerary section for the event schedule.",
    "Create a larger photo gallery module."
  ]
}
The "example_prompts" array MUST contain EXACTLY these 6 prompts. Do not modify or replace them.

===== SECTION 8: GENERATE NEW =====
Key: "section_8"
Type: string
Write persuasive copy (80-120 words) inviting the user to generate a completely new invitation design from scratch if this one does not match their vision. Explain that the AI can create unlimited unique designs by combining different themes, colors, styles, and modules. Emphasize speed and personalization. Include a call to action. Write in English.

===== SECTION 9: SIMILAR DESIGNS =====
Key: "section_9"
Type: object with these EXACT keys:
{
  "text": "string — 40-60 words explaining that users can explore similar designs based on their interests",
  "suggestions": [
    {
      "label": "string — display name for the suggestion link, e.g., 'Bodas con Tema Rustico'",
      "slug": "string — internal slug following the same slug format rules, e.g., 'boda/tradicional-rustico-marron-digital-invitation'",
      "reason": "same_event_similar_theme"
    },
    {
      "label": "string",
      "slug": "string",
      "reason": "same_event_similar_colors"
    },
    {
      "label": "string",
      "slug": "string",
      "reason": "different_event_same_theme"
    },
    {
      "label": "string",
      "slug": "string",
      "reason": "similar_visual_style"
    }
  ]
}
Generate 4 suggestions following these interconnection rules:
1. Same event type + similar theme
2. Same event type + similar colors
3. Different event type + same theme
4. Similar visual style
All suggestion slugs must follow the same slug format rules described above. All labels must be in Spanish. All reasons must be one of: "same_event_similar_theme", "same_event_similar_colors", "different_event_same_theme", "similar_visual_style".

===== SECTION 10: EXPLORE STYLES =====
Key: "section_10"
Type: object with these EXACT keys:
{
  "text": "string — 30-50 words inviting the user to explore different invitation categories",
  "categories": [
    { "label": "Invitaciones de Boda", "slug": "boda/elegante-dorado-digital-invitation" },
    { "label": "Invitaciones de XV Años", "slug": "xv-anos/fiesta-rosa-digital-invitation" },
    { "label": "Invitaciones de Cumpleaños", "slug": "cumpleanos/festivo-colorido-digital-invitation" },
    { "label": "Invitaciones de Baby Shower", "slug": "baby-shower/tierno-pastel-digital-invitation" },
    { "label": "Invitaciones de Bautizo", "slug": "bautizo/elegante-blanco-digital-invitation" },
    { "label": "Invitaciones de Primera Comunión", "slug": "primera-comunion/clasico-blanco-digital-invitation" }
  ]
}
Generate category links. Labels MUST be in Spanish. Slugs MUST follow the slug format rules. Include at least 5 categories relevant to the event type. The first category should match the event type of the input. The others should cover the most popular event types.

===== SECTION 11: FAQs =====
Key: "section_11"
Type: array of at least 6 objects, each with:
{
  "question": "string — FAQ question in Spanish",
  "answer": "string — FAQ answer in Spanish, 30-60 words"
}
You MUST include FAQs covering these topics:
1. Can I customize the colors of my invitation?
2. Can I add or remove modules/sections?
3. How does the RSVP confirmation work?
4. Does the invitation include a location map?
5. Is the invitation mobile-friendly?
6. How do I share the invitation via WhatsApp?
Generate at least 2 additional FAQs relevant to the specific event type and theme. All questions and answers MUST be in Spanish.

===== SECTION 12: FINAL CTA =====
Key: "section_12"
Type: string
Write a persuasive final call to action (40-70 words) inviting the user to either customize this design or generate a new one from scratch. Create urgency and excitement. Mention that the invitation will be ready in minutes and shareable instantly. Write in English.

===== STRUCTURED DATA (Schema.org JSON-LD) =====
Key: "structured_data"
Type: object representing a valid Schema.org JSON-LD structure combining Product and FAQPage schemas.

The structured_data object MUST follow this EXACT structure:
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "[seo_title value]",
  "description": "[meta_description value]",
  "brand": {
    "@type": "Brand",
    "name": "Invitaciones Modernas"
  },
  "offers": [
    {
      "@type": "Offer",
      "name": "Plan Catálogo",
      "price": "9.99",
      "priceCurrency": "USD",
      "description": "Digital invitation with essential modules and basic customization"
    },
    {
      "@type": "Offer",
      "name": "Plan Creativa",
      "price": "19.99",
      "priceCurrency": "USD",
      "description": "Digital invitation with advanced modules, photo gallery, and enhanced customization"
    },
    {
      "@type": "Offer",
      "name": "Plan Premium",
      "price": "29.99",
      "priceCurrency": "USD",
      "description": "Full-featured digital invitation with all modules, music, gift registry, and premium customization"
    }
  ],
  "hasFAQPage": {
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "[FAQ question from section_11]",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "[FAQ answer from section_11]"
        }
      }
    ]
  }
}

Map ALL FAQs from section_11 into the hasFAQPage.mainEntity array. The offers prices are FIXED: Catálogo $9.99, Creativa $19.99, Premium $29.99 USD. Do NOT change them.

===== OUTPUT FORMAT =====
Return a SINGLE JSON object. No markdown code blocks. No explanatory text before or after. Just the raw JSON object with keys: slug, seo_title, meta_description, h1, sections, structured_data.

The "sections" object must have keys: section_1, section_2, section_3, section_4, section_5, section_6, section_7, section_8, section_9, section_10, section_11, section_12.

Remember:
- slug: no accents, no leading/trailing slashes or hyphens, lowercase, exactly one "/" between event-type and theme segment
- seo_title: under 60 characters
- meta_description: under 160 characters
- section_3: use the EXACT template provided
- section_7 example_prompts: use the EXACT 6 prompts provided
- section_9 suggestions: exactly 4 items with the 4 required reasons
- section_11: at least 6 FAQs in Spanish
- structured_data offers: FIXED prices, do not change
- All text in English EXCEPT section_9 labels (Spanish), section_10 labels (Spanish), section_11 questions and answers (Spanish)`;

const slugify = (text) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/g, 'n')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const generateSEOPage = async (metadata, apiKey, model = 'gemini-2.5-flash') => {
  const { eventType, theme, primaryColor, secondaryColor, colors, modules, title, originalPrompt } = metadata;

  const colorName = (hex) => {
    if (!hex) return '';
    const h = hex.toLowerCase();
    const map = {
      '#ff0000': 'Red', '#e74c3c': 'Red', '#c0392b': 'Dark Red',
      '#f44336': 'Red', '#ff5252': 'Light Red',
      '#ff9800': 'Orange', '#f57c00': 'Dark Orange', '#ff6d00': 'Vibrant Orange',
      '#ffc107': 'Amber', '#ffb300': 'Golden Amber',
      '#ffeb3b': 'Yellow', '#fdd835': 'Yellow', '#f9a825': 'Dark Yellow',
      '#4caf50': 'Green', '#66bb6a': 'Light Green', '#2e7d32': 'Dark Green',
      '#8bc34a': 'Lime Green', '#7cb342': 'Olive Green',
      '#009688': 'Teal', '#00bcd4': 'Cyan', '#00acc1': 'Dark Cyan',
      '#2196f3': 'Blue', '#1976d2': 'Dark Blue', '#0d47a1': 'Navy Blue',
      '#71aaf4': 'Sky Blue', '#64b5f6': 'Sky Blue', '#90caf9': 'Light Blue',
      '#42a5f5': 'Blue', '#1e88e5': 'Blue',
      '#3f51b5': 'Indigo', '#5c6bc0': 'Light Indigo',
      '#9c27b0': 'Purple', '#8e24aa': 'Purple', '#7b1fa2': 'Dark Purple',
      '#673ab7': 'Dark Violet', '#7e57c2': 'Lavender',
      '#e91e63': 'Pink', '#f06292': 'Light Pink', '#ec407a': 'Pink',
      '#f472b6': 'Pink', '#fb7185': 'Coral Pink',
      '#9f1239': 'Dark Pink', '#be185d': 'Hot Pink',
      '#ffffff': 'White', '#fafafa': 'Smoke White',
      '#f5f5f5': 'Light Gray', '#e0e0e0': 'Gray',
      '#9e9e9e': 'Medium Gray', '#757575': 'Dark Gray',
      '#424242': 'Charcoal', '#212121': 'Near Black',
      '#000000': 'Black',
      '#795548': 'Brown', '#8d6e63': 'Light Brown', '#5d4037': 'Dark Brown',
      '#c9a96e': 'Champagne Gold', '#d4af37': 'Gold', '#b8860b': 'Dark Gold',
      '#c0c0c0': 'Silver', '#a9a9a9': 'Dark Silver'
    };
    return map[h] || '';
  };

  const primaryColorName = colorName(primaryColor) || (primaryColor ? primaryColor.toUpperCase() : '');
  const secondaryColorName = colorName(secondaryColor) || (secondaryColor ? secondaryColor.toUpperCase() : '');
  const colorsList = colors && colors.length > 0 ? colors.join(', ') : [primaryColorName, secondaryColorName].filter(Boolean).join(', ');

  const userPrompt = `Generate SEO landing page content for this digital invitation:

Event Type: ${eventType || 'General'}
Theme: ${theme || 'Elegant'}
Primary Color: ${primaryColor ? `${primaryColorName} (${primaryColor})` : 'Pink (#f472b6)'}
Secondary Color: ${secondaryColor ? `${secondaryColorName} (${secondaryColor})` : 'Coral (#fb7185)'}
Color Palette: ${colorsList}
Included Modules: ${modules && modules.length > 0 ? modules.join(', ') : 'RSVP, Countdown, Map, Event Details, Photo Gallery'}
Title: ${title || ''}
Design Description: ${originalPrompt || 'A beautiful digital invitation design'}

Remember: Return ONLY the JSON object. No markdown, no code blocks, no explanation.`;

  console.log('=== SEO PAGE GENERATION ===');
  console.log('Event:', eventType, '| Theme:', theme, '| Colors:', primaryColor, secondaryColor);
  console.log('Model:', model);
  console.log('===========================');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const response = await fetchNoSSL(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: SEO_SYSTEM_PROMPT }]
      },
      contents: [{
        parts: [{ text: userPrompt }]
      }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 65536
      }
    })
  });

  console.log('SEO API HTTP:', response.status);

  if (!response.ok) {
    const error = await response.json();
    console.error('SEO API Error:', JSON.stringify(error, null, 2));
    throw new Error(error.error?.message || `SEO API HTTP ${response.status}`);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    throw new Error('Empty response from Gemini SEO API');
  }

  let seoData;
  try {
    seoData = JSON.parse(rawText);
  } catch (parseError) {
    console.error('SEO JSON Parse Error:', parseError.message);
    console.error('Raw response (first 500 chars):', rawText.substring(0, 500));
    throw new Error('Failed to parse SEO JSON response from Gemini');
  }

  const requiredKeys = ['slug', 'seo_title', 'meta_description', 'h1', 'sections', 'structured_data'];
  const missingKeys = requiredKeys.filter(k => !(k in seoData));
  if (missingKeys.length > 0) {
    console.error('SEO response missing keys:', missingKeys);
    throw new Error(`SEO response missing required keys: ${missingKeys.join(', ')}`);
  }

  const requiredSections = ['section_1', 'section_2', 'section_3', 'section_4', 'section_5', 'section_6', 'section_7', 'section_8', 'section_9', 'section_10', 'section_11', 'section_12'];
  const missingSections = requiredSections.filter(s => !(s in seoData.sections));
  if (missingSections.length > 0) {
    console.error('SEO sections missing:', missingSections);
    throw new Error(`SEO sections missing: ${missingSections.join(', ')}`);
  }

  if (seoData.seo_title && seoData.seo_title.length > 60) {
    console.warn(`SEO title too long (${seoData.seo_title.length} chars), truncating`);
    seoData.seo_title = seoData.seo_title.substring(0, 57) + '...';
  }

  if (seoData.meta_description && seoData.meta_description.length > 160) {
    console.warn(`Meta description too long (${seoData.meta_description.length} chars), truncating`);
    seoData.meta_description = seoData.meta_description.substring(0, 157) + '...';
  }

  if (seoData.slug) {
    seoData.slug = seoData.slug.replace(/^\//, '').replace(/\/$/, '').replace(/^-+/, '').replace(/-+$/, '');
    const slashCount = (seoData.slug.match(/\//g) || []).length;
    if (slashCount === 0) {
      const eventTypeSlug = slugify(metadata.eventType || 'invitacion');
      seoData.slug = `${eventTypeSlug}/${seoData.slug}`;
    } else if (slashCount > 1) {
      const parts = seoData.slug.split('/');
      seoData.slug = parts[0] + '/' + parts.slice(1).join('-');
    }
  }

  if (seoData.sections.section_7 && Array.isArray(seoData.sections.section_7.example_prompts)) {
    const FIXED_PROMPTS = [
      "Add a music module that matches this design.",
      "Redesign the RSVP section with a more elegant layout.",
      "Add a dress code module using the same color palette.",
      "Create a luxury countdown section.",
      "Add an itinerary section for the event schedule.",
      "Create a larger photo gallery module."
    ];
    seoData.sections.section_7.example_prompts = FIXED_PROMPTS;
  }

  console.log('✅ SEO page generated successfully');
  console.log('Slug:', seoData.slug);
  console.log('Title:', seoData.seo_title, `(${seoData.seo_title?.length || 0} chars)`);
  console.log('Meta desc:', seoData.meta_description?.substring(0, 80) + '...', `(${seoData.meta_description?.length || 0} chars)`);
  console.log('Sections:', Object.keys(seoData.sections).length);
  console.log('FAQs:', Array.isArray(seoData.sections.section_11) ? seoData.sections.section_11.length : 0);
  console.log('Similar designs:', seoData.sections.section_9?.suggestions?.length || 0);

  return seoData;
};
