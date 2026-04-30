import { createHash } from 'crypto';
import https from 'https';

// Función para fetch sin verificación SSL
const fetchNoSSL = async (url, options = {}) => {
  return new Promise((resolve, reject) => {
    const agent = new https.Agent({ rejectUnauthorized: false });
    resolve(fetch(url, { ...options, agent }));
  });
};

const SYSTEM_INSTRUCTION = `You generate ONE complete HTML file for a digital invitation. Output raw HTML only — no markdown.

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

export const generateWithGemini = async (prompt, apiKey, model = 'gemini-3.1-pro', options = {}) => {
  const { eventType, theme, primaryColor, secondaryColor, imageFiles, promptInstruction } = options;
  const currentDate = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const promptWithDate = prompt.replace(/SYSTEM_TIMESTAMP:\s*\S+/, `SYSTEM_TIMESTAMP: ${currentDate}`);
  
  const promptImageContext = promptInstruction ? `\n\n${promptInstruction}` : '';
  const fullPrompt = `${SYSTEM_INSTRUCTION}${promptImageContext}${promptWithDate}`;
  
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
