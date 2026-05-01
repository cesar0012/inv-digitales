import { createHash } from 'crypto';
import https from 'https';

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
  'Otro': ['full-screen-hero', 'card-based', 'editorial-magazine', 'split-screen', 'minimalist-center']
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

const generateDesignFingerprint = (eventType = '', theme = '', visualStyle = '', mood = '') => {
  const preferredLayouts = EVENT_PREFERRED_LAYOUTS[eventType] || EVENT_PREFERRED_LAYOUTS['Otro'];
  const preferredAnimations = EVENT_PREFERRED_ANIMATIONS[eventType] || EVENT_PREFERRED_ANIMATIONS['Otro'];

  const isLayoutOutlier = Math.random() < 0.25;
  const isAnimationOutlier = Math.random() < 0.20;

  const layout = isLayoutOutlier ? pickRandom(LAYOUT_OPTIONS) : pickRandom(preferredLayouts);
  const typography = pickRandom(TYPOGRAPHY_OPTIONS);
  const animation = isAnimationOutlier ? pickRandom(ANIMATION_OPTIONS) : pickRandom(preferredAnimations);
  const colorStrategy = pickRandom(COLOR_STRATEGIES);
  const sectionFlow = pickRandom(SECTION_FLOW_OPTIONS);

  const fingerprint = [
    `LAYOUT: ${layout}`,
    `TYPOGRAPHY: ${typography}`,
    `ANIMATION: ${animation}`,
    `COLOR_STRATEGY: ${colorStrategy}`,
    `SECTION_FLOW: ${sectionFlow}`,
  ];
  if (visualStyle) fingerprint.push(`VISUAL_STYLE_OVERRIDE: ${visualStyle}`);
  if (mood) fingerprint.push(`MOOD_OVERRIDE: ${mood}`);

  return fingerprint.join(' | ');
};

const SYSTEM_INSTRUCTION = `You generate ONE complete HTML file for a digital invitation. Output raw HTML only — no markdown.

===== DESIGN FINGERPRINT (MANDATORY) =====
A design fingerprint will be injected before your prompt. It contains MANDATORY creative direction:
- LAYOUT: You MUST use this layout structure. Do not substitute a different layout.
- TYPOGRAPHY: You MUST choose fonts from this pairing. Use Google Fonts that match.
- ANIMATION: You MUST use this as your primary animation/transition style.
- COLOR STRATEGY: You MUST apply colors using this strategy (gradient, duotone, monochrome+accent, etc.)
- SECTION FLOW: You MUST organize sections using this flow pattern.
The fingerprint is LAW, not a suggestion. If the fingerprint says "card-based layout", do NOT create a full-screen hero. If it says "typewriter animation", include typewriter effects. OBEY THE FINGERPRINT.

===== CREATIVE FREEDOM =====
EVERY invitation you generate MUST be VISUALLY UNIQUE. Never repeat the same layout, animation pattern, or design structure. Vary:
- Layout: full-screen hero, split-screen, card-based, editorial, asymmetrical, overlapping sections, parallax layers, horizontal scroll segments, masonry grids, centered timeline, side-by-side, etc.
- Typography: choose fonts that match the theme — script + serif, display + sans, handwritten + clean, blackletter + modern, etc. Use 2-3 Google Fonts per invitation.
- Color application: gradients, monochrome with accent, duotone, warm palette, cool palette, pastel, jewel tones, earth tones, neon accents — NEVER default to the same color scheme.
- Section transitions: hard cuts, fades, slides, reveals, parallax, zoom — mix and match freely.
- Countdown styles: flip cards, circular progress, minimal numbers, ornate frames, watercolor circles, etc.
- Hover effects: vary them — scale, glow, lift, color shift, underline animation, border reveal, etc.
- Decorative elements: ornamental borders, watercolor splashes, geometric patterns, floral illustrations, foil textures, paper textures, marble, wood grain, etc.
- Animation approach: use ANY combination of CSS animations, scroll-triggered effects, hover interactions, entrance animations, parallax, particle effects, etc.

The user's theme/theme description is your PRIMARY design guide. Follow it closely. If no theme is specified, choose a distinctive style yourself — NEVER fall back to a generic "cinemonic dark" default.

===== AVAILABLE <head> CDN SCRIPTS (include ONLY what you use) =====
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script> <!-- ONLY if using Three.js particles -->
<script src="https://cdn.jsdelivr.net/npm/tsparticles-engine@2/tsparticles.engine.min.js"></script> <!-- ONLY if using tsParticles -->
<script src="https://cdn.jsdelivr.net/npm/tsparticles@2/tsparticles.bundle.min.js"></script> <!-- ONLY if using tsParticles -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script> <!-- ONLY if using GSAP -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js"></script> <!-- ONLY if using ScrollTrigger -->
<link href="https://fonts.googleapis.com/css2?family=..." rel="stylesheet">
No other libraries.

===== EFFECTS (OPTIONAL — use what fits the design) =====
You MAY use Three.js particles, tsParticles, GSAP/ScrollTrigger, or purely CSS animations — choose based on what matches the theme. Examples:
- Elegant/formal: subtle fade-ins, parallax, gold particle shimmer
- Rustic/vintage: paper texture transitions, stamp-like reveals, handwritten feel
- Modern/minimal: clean slide-ins, geometric animations, monochrome accents
- Bohemian/floral: floating elements, watercolor effects, organic shapes
- Tropical/beach: wave animations, sun glow, palm silhouettes
- Art deco: geometric patterns, gold lines, symmetrical reveals
You are NOT required to use all three libraries. Use NONE, ONE, TWO, or ALL THREE as the design demands.
Keep particle counts <150 for mobile performance.

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
- CSS :root { --color-primary: #hex; --color-secondary: #hex; } — define the user's chosen colors as variables and USE them throughout.
- 2-3 Google Fonts that match the theme (decorative headings + elegant body, or any combination that fits).
- ITINERARY: vertical timeline with flexbox ONLY. NEVER <table>. Left=time badge, center=dot+line, right=card.
- MUST be responsive and mobile-first.
- Each section should be visually distinct — vary backgrounds, spacing, typography scale, and decorative elements between sections.
- Countdown timer MUST work (use real JavaScript countdown logic, not just static numbers).

===== METADATA (after </html>) =====
<!-- INVITATION_DATA:
{"title":"[Spanish title]","eventType":"[XV Años|Boda Tradicional|etc]","theme":"[Design theme]","colors":["Color (#hex)","Color (#hex)"],"tags":["kw1","kw2","kw3","kw4","kw5"],"generatedAt":"YYYY-MM-DD HH:mm:ss"}
-->

Now generate the complete HTML invitation: `;

export const generateWithGemini = async (prompt, apiKey, model = 'gemini-3.1-pro', options = {}) => {
  const { eventType, theme, primaryColor, secondaryColor, imageFiles, promptInstruction, visualStyle, mood } = options;
  const currentDate = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const promptWithDate = prompt.replace(/SYSTEM_TIMESTAMP:\s*\S+/, `SYSTEM_TIMESTAMP: ${currentDate}`);
  
  const fingerprint = generateDesignFingerprint(eventType, theme, visualStyle, mood);
  console.log('=== DESIGN FINGERPRINT ===');
  console.log('Event:', eventType, '| Theme:', theme, '| VisualStyle:', visualStyle, '| Mood:', mood);
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
