
import { ImageSource, AIModel } from './types';

export const SYSTEM_INSTRUCTION = `
You generate ONE complete HTML file for a digital invitation. Output raw HTML only — no markdown.

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

The user's theme/theme description is your PRIMARY design guide. Follow it closely. If no theme is specified, choose a distinctive style yourself — NEVER fall back to a generic "cinematic dark" default.

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

export const EVENT_IMAGE_FOLDERS: Record<string, string> = {
  'Boda Tradicional': 'boda-color',
  'Boda Americana': 'boda-americana',
  'Boda Gay (Hombres)': 'boda-gay-hombres',
  'Boda Gay (Mujeres)': 'boda-gay-mujeres',
  'XV Años': 'xv-años',
  'Bautizo': 'bautizo',
  'Primera Comunión': 'primera-comunión',
  'Confirmación': 'primera-comunión', // Usa misma carpeta que Primera Comunión
  'Cumpleaños Niño': 'cumpleaños-niño',
  'Cumpleaños Niña': 'cumpleaños-niña',
  'Baby Shower': 'baby-shower',
};

export const IMAGE_KEYWORD_MAPPING: Record<string, string[]> = {
  'hero': ['portrait', 'girl', 'boy', 'bride', 'groom', 'baby', 'quinceañera', 'smiling', 'sitting', 'standing', 'closeup', 'hugging', 'holding'],
  'parents': ['mother', 'father', 'parents', 'family', 'couple', 'holding', 'cradled', 'arms'],
  'ceremony': ['priest', 'church', 'altar', 'ceremony', 'vows', 'ring', 'blessing', 'anointing', 'host', 'chalice', 'cross', 'candle'],
  'reception': ['party', 'celebration', 'dancing', 'toast', 'champagne', 'cheering', 'laughing', 'fun', 'balloons', 'pinata'],
  'details': ['detail', 'closeup', 'ring', 'bouquet', 'dress', 'cake', 'gift', 'candles', 'shoes', 'feet', 'hands', 'flowers', 'crown', 'necklace']
};

export const EVENT_TYPES = [
  'Boda Tradicional',
  'Boda Americana',
  'Boda Gay (Hombres)',
  'Boda Gay (Mujeres)',
  'XV Años',
  'Bautizo',
  'Primera Comunión',
  'Confirmación',
  'Cumpleaños Niño',
  'Cumpleaños Niña',
  'Baby Shower',
  'Otro'
];

export const IMAGE_SOURCES: ImageSource[] = [
  {
    id: 'local',
    name: 'Imágenes del Evento',
    type: 'local',
    description: 'Imágenes específicas para cada tipo de evento.',
    promptInstruction: ''
  },
  {
    id: 'pollinations',
    name: 'Pollinations AI',
    type: 'ai',
    description: 'Genera imágenes de IA únicas basadas en el contexto.',
    warning: 'Alta calidad, pero las imágenes pueden tardar unos segundos en aparecer.',
    promptInstruction: `
      IMAGES (POLLINATIONS AI):
      - Use 'https://image.pollinations.ai/prompt/[description]?width=[width]&height=[height]&nologo=true' for images.
      - **CRITICAL**: The [description] MUST be extremely simple (1-3 words).
      - You MUST replace [width] and [height] with the actual pixel dimensions of the image container (e.g., 800 and 600).
      - Example: 'https://image.pollinations.ai/prompt/sunset?width=800&height=600&nologo=true'
      - Always URL-encode the description.
    `
  },
  {
    id: 'unsplash',
    name: 'Unsplash Source',
    type: 'stock',
    description: 'Fotos de archivo aleatorias de Unsplash.',
    warning: 'Nota: source.unsplash.com puede ser lento o inestable.',
    promptInstruction: `
      IMAGES (UNSPLASH):
      - Use 'https://source.unsplash.com/random/[width]x[height]/?([keyword])' for images.
      - Replace [width], [height] with pixels (e.g., 800x600).
      - Replace [keyword] with a context word (e.g., 'nature', 'office').
      - Example: 'https://source.unsplash.com/random/800x600/?office'
    `
  },
  {
    id: 'loremflickr',
    name: 'LoremFlickr',
    type: 'stock',
    description: 'Fotografía real combinada con palabras clave.',
    promptInstruction: `
      IMAGES (LOREMFLICKR):
      - Use 'https://loremflickr.com/[width]/[height]/[keyword]' for images.
      - Example: 'https://loremflickr.com/800/600/tech'
    `
  },
  {
    id: 'placehold',
    name: 'Wireframe / Sólido',
    type: 'wireframe',
    description: 'Marcadores de posición simples con etiquetas de texto.',
    promptInstruction: `
      IMAGES (WIREFRAME):
      - Use 'https://placehold.co/[width]x[height]?text=[Label]' for images.
      - Example: 'https://placehold.co/600x400?text=Hero'
    `
  }
];

export const generateLocalImagePrompt = (
  eventType: string, 
  imageFiles: { filename: string; section: string }[]
): string => {
  const folder = EVENT_IMAGE_FOLDERS[eventType] || '';
  
  if (!folder || imageFiles.length === 0) {
    return `
IMAGES (LOREMFLICKR - FALLBACK):
- Use 'https://loremflickr.com/[width]/[height]/[keyword]' for images.
- Keywords: wedding, baptism, birthday, party, celebration
- Example: 'https://loremflickr.com/800/600/wedding'
    `;
  }

  const imageList = imageFiles.map(img => 
    `  * ${img.filename} → Use for ${img.section.toUpperCase()} sections`
  ).join('\n');

  return `
IMAGES (LOCAL EVENT IMAGES - SMART SELECTION):
- Available images for ${eventType} in folder /img/${folder}/:
${imageList}

- URL format: '/img/${folder}/[filename]'
- Example: '<img src="/img/${folder}/${imageFiles[0]?.filename || 'image.jpg'}" data-gemini-id="portada-imagen" />'

- CRITICAL: Match image content to section purpose:
  * HERO/COVER sections → Use images with: portrait, girl, boy, bride, groom, baby, smiling, standing
  * PARENTS/FAMILY sections → Use images with: mother, father, parents, family, couple, holding
  * CEREMONY/CHURCH sections → Use images with: priest, church, altar, ceremony, blessing, cross
  * RECEPTION/PARTY sections → Use images with: party, celebration, dancing, toast, champagne
  * DETAILS/DECORATION sections → Use images with: detail, closeup, ring, bouquet, cake, flowers

- ALWAYS use local images from /img/${folder}/ for this event type.
- DO NOT use external image sources like loremflickr or unsplash.
  `;
};

export const AI_MODELS: AIModel[] = [
  { id: 'gemini-3.1-flash-image-preview', name: 'Gemini 3.1 Flash Image', provider: 'Google AI Platform' },
  { id: 'gemini-3-pro-image-preview', name: 'Gemini 3 Pro Image', provider: 'Google AI Platform' },
  { id: 'nano-banana-1', name: 'Nano Banana 1', provider: 'Google AI Platform' }
];
