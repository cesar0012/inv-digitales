
import { ImageSource, AIModel } from './types';

export const LAYOUT_OPTIONS = [
  'full-screen-hero', 'split-screen', 'card-based', 'editorial-magazine', 'asymmetrical',
  'overlapping-sections', 'parallax-layers', 'horizontal-scroll-segments', 'masonry-grid',
  'centered-timeline', 'side-by-side-columns', 'cinematic-panes', 'scrapbook', 'minimalist-center',
  'diagonal-sections', 'layered-cards', 'wave-sections', 'storybook', 'poster-style', 'collage',
  'chaotic-collage', 'overlap-photos', 'asymmetric-bleed', 'scattered-polaroids',
  'broken-grid', 'diagonal-clash', 'mosaic-chaos', 'layered-z-messy'
];

export const TYPOGRAPHY_OPTIONS = [
  'script-serif', 'display-sans', 'handwritten-clean', 'blackletter-modern', 'elegant-serif-pair',
  'condensed-sans-expanded', 'mono-display', 'vintage-serif', 'modern-geometric', 'calligraphic-body',
  'art-deco-display', 'boho-handwritten', 'retro-slab', 'luxury-thin', 'playful-rounded',
  'brutalist-mix', 'collage-typography', 'extreme-contrast'
];

export const ANIMATION_OPTIONS = [
  'fade-in-stagger', 'slide-up-reveal', 'parallax-scroll', 'zoom-on-enter', 'flip-cards',
  'typewriter-text', 'floating-elements', 'particle-shimmer', 'wave-motion', 'rotate-reveal',
  'curtain-open', 'bounce-in', 'elastic-scale', 'glitch-entrance', 'watercolor-bleed',
  'stamp-reveal', 'ripple-effect', 'morph-shapes', 'cinematic-wipe', 'soft-drift',
  'chaotic-entrance', 'collage-assemble', 'photo-scatter', 'grunge-reveal'
];

export const COLOR_STRATEGIES = [
  'gradient-flow', 'monochrome-accent', 'duotone', 'warm-palette', 'cool-palette',
  'pastel-spectrum', 'jewel-tones', 'earth-tones', 'neon-accents', 'muted-elegant',
  'high-contrast', 'tonal-layering', 'complementary-pop', 'analogous-harmony', 'triadic-vibrant',
  'user-palette-gradient', 'user-palette-duotone', 'user-palette-accent', 'user-palette-layered'
];

export const SECTION_FLOW_OPTIONS = [
  'linear-classic', 'alternating-bg', 'overlay-sections', 'card-stack', 'accordion-reveal',
  'timeline-horizontal', 'mosaic-grid', 'scroll-snap-sections', 'fullbleed-interleaved', 'wave-divider',
  'chaotic-overlap', 'collage-flow', 'asymmetric-breaks'
];

export const EVENT_PREFERRED_LAYOUTS: Record<string, string[]> = {
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

export const EVENT_PREFERRED_ANIMATIONS: Record<string, string[]> = {
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

export const EVENT_DEFAULT_COLORS: Record<string, { primary: string; secondary: string }> = {
  'Boda Tradicional': { primary: '#c9a84c', secondary: '#f5f0e1' },
  'Boda Americana': { primary: '#1a1a2e', secondary: '#c9a84c' },
  'Boda Gay (Hombres)': { primary: '#2d2d2d', secondary: '#7b68ee' },
  'Boda Gay (Mujeres)': { primary: '#d4739a', secondary: '#f0c6d0' },
  'XV Años': { primary: '#d4739a', secondary: '#c9a84c' },
  'Bautizo': { primary: '#87ceeb', secondary: '#f0f8ff' },
  'Primera Comunión': { primary: '#f5f5dc', secondary: '#c9a84c' },
  'Confirmación': { primary: '#4a5568', secondary: '#c9a84c' },
  'Cumpleaños Niño': { primary: '#3b82f6', secondary: '#10b981' },
  'Cumpleaños Niña': { primary: '#ec4899', secondary: '#a855f7' },
  'Baby Shower': { primary: '#f9a8d4', secondary: '#93c5fd' },
  'Otro': { primary: '#6366f1', secondary: '#f472b6' }
};

export const VISUAL_STYLES = [
  '', 'Elegante Clásico', 'Moderno Minimalista', 'Rústico Vintage', 'Bohemio Floral',
  'Tropical Playa', 'Art Deco', 'Romántico Suave', 'Divertido Colorido', 'Glamuroso',
  'Industrial Urbano', 'Campestre Natural', 'Nocturno Lujoso', 'Acuarela Artístico', 'Geométrico Contemporáneo',
  'Brutalista Etéreo', 'Cyberpunk Neon', 'Neon Oscuro', 'Bioluminiscente Abisal'
];

export const MOODS = [
  '', 'Romántico', 'Festivo', 'Solemne', 'Divertido', 'Íntimo',
  'Grandioso', 'Tranquilo', 'Enérgico', 'Nostálgico', 'Místico'
];

export const VISUAL_STYLE_PREFERENCES: Record<string, { layouts: string[]; typographies: string[]; colorStrategies: string[]; sflows: string[] }> = {
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

export const MOOD_PREFERENCES: Record<string, { animations: string[]; sflows: string[] }> = {
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

// DEPRECATED: SYSTEM_INSTRUCTION is no longer used client-side.
// The server-side prompts in server/geminiService.js and server/agents-prompt.js
// are the authoritative prompts for generation.
// Keeping export to avoid breaking aiService.ts import.
export const SYSTEM_INSTRUCTION = '';

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

export const EVENT_STYLE_SUGGESTIONS: Record<string, { styles: string[]; moods: string[] }> = {
  'Boda Tradicional': { styles: ['Elegante Clásico', 'Glamuroso', 'Nocturno Lujoso', 'Romántico Suave', 'Art Deco'], moods: ['Romántico', 'Solemne', 'Grandioso', 'Íntimo'] },
  'Boda Americana': { styles: ['Elegante Clásico', 'Moderno Minimalista', 'Glamuroso', 'Geométrico Contemporáneo', 'Nocturno Lujoso'], moods: ['Romántico', 'Grandioso', 'Solemne', 'Elegante'] },
  'Boda Gay (Hombres)': { styles: ['Neon Oscuro', 'Industrial Urbano', 'Moderno Minimalista', 'Geométrico Contemporáneo', 'Cyberpunk Neon'], moods: ['Festivo', 'Enérgico', 'Grandioso', 'Divertido'] },
  'Boda Gay (Mujeres)': { styles: ['Romántico Suave', 'Bohemio Floral', 'Acuarela Artístico', 'Bioluminiscente Abisal', 'Elegante Clásico'], moods: ['Romántico', 'Íntimo', 'Festivo', 'Tranquilo'] },
  'XV Años': { styles: ['Glamuroso', 'Nocturno Lujoso', 'Cyberpunk Neon', 'Romántico Suave', 'Bioluminiscente Abisal'], moods: ['Festivo', 'Grandioso', 'Enérgico', 'Divertido'] },
  'Bautizo': { styles: ['Elegante Clásico', 'Bohemio Floral', 'Campestre Natural', 'Acuarela Artístico', 'Romántico Suave'], moods: ['Solemne', 'Tranquilo', 'Íntimo', 'Romántico'] },
  'Primera Comunión': { styles: ['Elegante Clásico', 'Bohemio Floral', 'Campestre Natural', 'Acuarela Artístico', 'Rústico Vintage'], moods: ['Solemne', 'Tranquilo', 'Íntimo', 'Nostálgico'] },
  'Confirmación': { styles: ['Elegante Clásico', 'Moderno Minimalista', 'Geométrico Contemporáneo', 'Industrial Urbano'], moods: ['Solemne', 'Tranquilo', 'Íntimo'] },
  'Cumpleaños Niño': { styles: ['Divertido Colorido', 'Tropical Playa', 'Brutalista Etéreo', 'Cyberpunk Neon', 'Industrial Urbano'], moods: ['Festivo', 'Divertido', 'Enérgico'] },
  'Cumpleaños Niña': { styles: ['Divertido Colorido', 'Bohemio Floral', 'Acuarela Artístico', 'Bioluminiscente Abisal', 'Romántico Suave'], moods: ['Festivo', 'Divertido', 'Romántico', 'Enérgico'] },
  'Baby Shower': { styles: ['Bohemio Floral', 'Acuarela Artístico', 'Romántico Suave', 'Campestre Natural', 'Divertido Colorido'], moods: ['Íntimo', 'Tranquilo', 'Festivo', 'Romántico'] },
  'Otro': { styles: ['Elegante Clásico', 'Moderno Minimalista', 'Divertido Colorido', 'Geométrico Contemporáneo', 'Brutalista Etéreo'], moods: ['Festivo', 'Enérgico', 'Íntimo', 'Grandioso'] }
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
