/**
 * @deprecated Desde PR1 (mig modular RAG) este script está obsoleto.
 *
 * El nuevo sistema RAG se pobla con módulos individuales subidos vía
 * panel de administrador (POST /api/admin/rag-modules/upload), no con
 * plantillas completas ni seed JSON.
 *
 * Para partidar templates completos existentes en módulos reusables
 * se debe usar el flujo del panel admin.
 *
 * Este script seaitiene idle (early-return) para evitar ejecuciones accidentales.
 */

import fs from 'fs';
import path from 'path';
// parseHTML no se usa en este script legacy, se retira la importación

console.log('⚠️  Este script está deprecado y no ejecuta ninguna operación.');
console.log('    Use el panel admin para subir módulos individuales.');
process.exit(0);

const ADAPTED_DIR = 'invitaciones_generadas/adapted';

const TEMPLATE_META = [
  {
    file: 'Boda Teatro CGOT.html',
    style_id: 'boda-barroco-real',
    style_name: 'Boda Barroco Real',
    description: 'Estética barroca real con sellos ceremoniales, tipografía Cinzel y ornamentos dorados. Atmósfera de baile de corte.',
    category: 'boda',
    theme_tags: ['barroco', 'real', 'elegante', 'ceremonial', 'dorado'],
    color_palette: { bg_primary: '#0d0a08', bg_dark: '#1a1410', accent: '#c9a96e', text: '#f4ecd8', text_secondary: '#a89878' },
    typography_scale: { display: 'Cinzel', script: 'Great Vibes', ui: 'Playfair Display' },
    layout_rules: { grid: 'flexbox vertical', approach: 'ceremonial scroll', negative_space: 'py-20' },
    modules_def: { portada: { layout: 'fullscreen hero' }, ubicacion: { layout: 'actos' }, itinerario: { layout: 'banquete' }, vestimenta: { layout: 'etiqueta' }, confirmacion: { layout: 'form' } },
    base_cdns: ['tailwindcss'],
    js_dependencies: ['countdown', 'scroll-reveal'],
    animation_rules: { scroll_reveal: true, ornamental: true },
    variation_params: { layouts: ['fullscreen', 'actos'], animations: ['fade-in', 'ornament-reveal'] }
  },
  {
    file: 'Invitacion Boho Chic-CGPT.html',
    style_id: 'boda-boho-chic',
    style_name: 'Boda Boho Chic',
    description: 'Estética boho chic con tonos terracota, tipografía Cormorant Garamond y elementos botánicos. Atmósfera de desierto al atardecer.',
    category: 'boda',
    theme_tags: ['boho', 'chic', 'organico', 'terracota', 'botanico'],
    color_palette: { bg_primary: '#f5efe6', bg_accent: '#e8dcc8', accent: '#b5613a', text: '#3d2b1f', text_secondary: '#7a6a5a' },
    typography_scale: { display: 'Cormorant Garamond', script: 'Marcellus', ui: 'Inter' },
    layout_rules: { grid: 'panels', approach: 'ritual scroll', negative_space: 'gap-10' },
    modules_def: { portada: { layout: 'hero' }, padres: { layout: 'panel' }, itinerario: { layout: 'ritual' }, galeria: { layout: 'texturas' }, ubicacion: { layout: 'mapa' }, confirmacion: { layout: 'sello' } },
    base_cdns: ['tailwindcss'],
    js_dependencies: ['drag-seal', 'scroll-reveal'],
    animation_rules: { scroll_reveal: true, organic: true },
    variation_params: { layouts: ['panels', 'ritual'], animations: ['fade-in', 'drag-interaction'] }
  },
  {
    file: 'Invitacion hollywood.html',
    style_id: 'boda-art-deco-hollywood',
    style_name: 'Boda Art Déco Hollywood',
    description: 'Estética art déco hollywoodense con dorados, tipografía Poiret One y ornamentos geométricos. Atmósfera de gran velada.',
    category: 'boda',
    theme_tags: ['art-deco', 'hollywood', 'dorado', 'geometrico', 'elegante'],
    color_palette: { bg_primary: '#0a0a0a', bg_dark: '#141414', accent: '#d4af37', text: '#f0e6d2', text_secondary: '#a89878' },
    typography_scale: { display: 'Poiret One', script: 'Cormorant Garamond', ui: 'Inter' },
    layout_rules: { grid: 'tailwind', approach: 'cinematic scroll', negative_space: 'py-20' },
    modules_def: { portada: { layout: 'intro screen' }, detalles: { layout: 'date' }, itinerario: { layout: 'programa' }, confirmacion: { layout: 'seal' } },
    base_cdns: ['tailwindcss', 'font-awesome'],
    js_dependencies: ['unlock-progress', 'seal-animation'],
    animation_rules: { intro_screen: true, seal: true },
    variation_params: { layouts: ['fullscreen', 'cinematic'], animations: ['intro', 'seal-reveal'] }
  },
  {
    file: 'Invitacion Japandi.html',
    style_id: 'boda-japandi-minimalista',
    style_name: 'Boda Japandi Minimalista',
    description: 'Estética minimalismo japandi con tonos papel, tipografía Noto Serif JP y espacios en blanco. Atmósfera de kintsugi silencioso.',
    category: 'boda',
    theme_tags: ['japandi', 'minimalista', 'organico', 'papel', 'sereno'],
    color_palette: { bg_primary: '#f7f2ea', bg_dark: '#eee7dd', accent: '#bd7e65', text: '#242321', text_secondary: '#6b6560' },
    typography_scale: { display: 'Noto Serif JP', script: 'Inter', ui: 'Inter' },
    layout_rules: { grid: 'CSS grid', approach: 'SPA sections', negative_space: 'py-24' },
    modules_def: { portada: { layout: 'hero' }, padres: { layout: 'story' }, detalles: { layout: 'details' }, ubicacion: { layout: 'location' }, itinerario: { layout: 'timeline' }, vestimenta: { layout: 'dress' }, confirmacion: { layout: 'rsvp' } },
    base_cdns: [],
    js_dependencies: ['countdown', 'scroll-reveal', 'spa-nav'],
    animation_rules: { scroll_reveal: true, minimal: true },
    variation_params: { layouts: ['SPA', 'minimal'], animations: ['fade-in', 'slide'] }
  },
  {
    file: 'Invitacion Tropical.html',
    style_id: 'boda-tropical-playa',
    style_name: 'Boda Tropical Playa',
    description: 'Estética tropical playero con tonos lino, tipografía orgánica y elementos de marea. Atmósfera de destino playa.',
    category: 'boda',
    theme_tags: ['tropical', 'playa', 'verano', 'organico', 'lino'],
    color_palette: { bg_primary: '#f9f5ef', bg_accent: '#e8dcc8', accent: '#5b8c5a', text: '#2d3a2e', text_secondary: '#6b7a6c' },
    typography_scale: { display: 'Cormorant Garamond', script: 'Caveat', ui: 'Inter' },
    layout_rules: { grid: 'SPA stages', approach: 'tide scroll', negative_space: 'py-16' },
    modules_def: { portada: { layout: 'stage' }, detalles: { layout: 'orilla' }, itinerario: { layout: 'fibras' }, vestimenta: { layout: 'paleta' }, confirmacion: { layout: 'sun-seal' } },
    base_cdns: ['tailwindcss'],
    js_dependencies: ['spa-stages', 'sun-seal'],
    animation_rules: { stage_transition: true, organic: true },
    variation_params: { layouts: ['stages', 'tide'], animations: ['slide', 'sun-reveal'] }
  },
  {
    file: 'Invitacion-ToscanaCGPT.html',
    style_id: 'boda-toscana-olivos',
    style_name: 'Boda Toscana Olivos',
    description: 'Estética toscana con tonos olivo, tipografía serif y mosaicos. Atmósfera de tarde dorada entre olivos.',
    category: 'boda',
    theme_tags: ['toscana', 'olivos', 'mediterraneo', 'rustico', 'dorada'],
    color_palette: { bg_primary: '#f5f0e6', bg_accent: '#e8dcc8', accent: '#6b7a3a', text: '#3d3528', text_secondary: '#7a6e5a' },
    typography_scale: { display: 'Cormorant Garamond', script: 'Marcellus', ui: 'Inter' },
    layout_rules: { grid: 'mosaic', approach: 'branch scroll', negative_space: 'py-20' },
    modules_def: { portada: { layout: 'hero' }, ubicacion: { layout: 'mosaic' }, itinerario: { layout: 'branch' }, detalles: { layout: 'vestimenta' }, confirmacion: { layout: 'sello' } },
    base_cdns: ['tailwindcss'],
    js_dependencies: ['seal', 'scroll-reveal'],
    animation_rules: { scroll_reveal: true, mosaic: true },
    variation_params: { layouts: ['mosaic', 'branch'], animations: ['fade-in', 'seal'] }
  },
  {
    file: 'Vintage Clasico CGPT.html',
    style_id: 'boda-vintage-clasico-cgpt',
    style_name: 'Boda Vintage Clásico',
    description: 'Estética vintage clásica con tonos sepia, tipografía serif y sellos reales. Atmósfera de crónica real.',
    category: 'boda',
    theme_tags: ['vintage', 'clasico', 'sepia', 'real', 'cronica'],
    color_palette: { bg_primary: '#f5efe0', bg_dark: '#2a2418', accent: '#8b6f47', text: '#3d2f1f', text_secondary: '#7a6a5a' },
    typography_scale: { display: 'Playfair Display', script: 'Cormorant Garamond', ui: 'DM Sans' },
    layout_rules: { grid: 'panels', approach: 'chronicle scroll', negative_space: 'py-16' },
    modules_def: { portada: { layout: 'scroll-chronicle' }, detalles: { layout: 'panel-date' }, ubicacion: { layout: 'panel-place' }, padres: { layout: 'panel-story' }, confirmacion: { layout: 'panel-rsvp' } },
    base_cdns: ['tailwindcss'],
    js_dependencies: ['countdown', 'scroll-reveal', 'copy-address'],
    animation_rules: { scroll_reveal: true, chronicle: true },
    variation_params: { layouts: ['panels', 'chronicle'], animations: ['fade-in', 'reveal'] }
  },
  {
    file: 'Vintage Clasico.html',
    style_id: 'boda-vintage-clasico',
    style_name: 'Boda Vintage Clásico Tradicional',
    description: 'Estética vintage clásica tradicional con tonos sepia, tipografía serif y ornamentos. Atmósfera de decreto del amor.',
    category: 'boda',
    theme_tags: ['vintage', 'clasico', 'tradicional', 'sepia', 'ornamental'],
    color_palette: { bg_primary: '#f5efe0', bg_dark: '#2a2418', accent: '#8b6f47', text: '#3d2f1f', text_secondary: '#7a6a5a' },
    typography_scale: { display: 'Playfair Display', script: 'Cormorant Garamond', ui: 'DM Sans' },
    layout_rules: { grid: 'sections', approach: 'decree scroll', negative_space: 'py-20' },
    modules_def: { portada: { layout: 'hero' }, padres: { layout: 'reveal-zone' }, ubicacion: { layout: 'ceremony' }, confirmacion: { layout: 'rsvp' } },
    base_cdns: ['tailwindcss'],
    js_dependencies: ['countdown', 'scroll-reveal'],
    animation_rules: { scroll_reveal: true, ornamental: true },
    variation_params: { layouts: ['sections', 'decree'], animations: ['fade-in', 'reveal'] }
  }
];

const seeds = [];

for (const meta of TEMPLATE_META) {
  const filePath = path.join(ADAPTED_DIR, meta.file);
  if (!fs.existsSync(filePath)) {
    console.error(`✗ Missing: ${filePath}`);
    continue;
  }
  const html = fs.readFileSync(filePath, 'utf8');
  seeds.push({
    ...meta,
    html_content: html,
    theme_tags: meta.theme_tags,
    color_palette: meta.color_palette,
    typography_scale: meta.typography_scale,
    layout_rules: meta.layout_rules,
    modules_def: meta.modules_def,
    base_cdns: meta.base_cdns,
    js_dependencies: meta.js_dependencies,
    animation_rules: meta.animation_rules,
    variation_params: meta.variation_params
  });
  console.log(`✓ Prepared: ${meta.style_id} (${html.length} bytes)`);
}

const output = {
  version: 2,
  exported_at: new Date().toISOString(),
  data: { knowledge_base: seeds }
};

fs.writeFileSync('temp/rag-seed-v2.json', JSON.stringify(output, null, 2), 'utf8');
console.log(`\nSeed file written: temp/rag-seed-v2.json (${seeds.length} templates)`);