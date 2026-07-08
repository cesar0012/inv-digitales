// Test integral del ragModuleValidator con Hero-01.html
import { extractModuleMetadata, validateModule, analyzeModule, generateModuleIdFromFilename, generateStyleName } from '../server/ragModuleValidator.js';
import { readFileSync } from 'fs';

const html = readFileSync('./Hero-01.html', 'utf8');

console.log('===== TEST EXTRACT MODULE METADATA =====');
const meta = extractModuleMetadata(html);

const assert = (cond, msg) => {
  if (cond) console.log('✅', msg);
  else { console.log('❌', msg); process.exitCode = 1; }
};

assert(meta.data_gemini_id === 'portada-nombre', 'data_gemini_id = portada-nombre');
assert(meta.module_type === 'portada', 'module_type = portada');
assert(meta.memory_type === 'background', 'memory_type = background (root)');
assert(meta.memory_usage === 'protected', 'memory_usage = protected (root)');
assert(meta.memory_source === 'generated', 'memory_source = generated (root)');
assert(meta.has_path_placeholder === true, 'has_path_placeholder = true');
assert(Array.isArray(meta.all_gemini_ids) && meta.all_gemini_ids.length === 1, 'Solo 1 data-gemini-id en el módulo');
assert(meta.all_gemini_ids[0] === 'portada-nombre', 'Único data-gemini-id = portada-nombre');

// Module metadata
assert(meta.module_metadata.tags.length === 10, 'tags.length === 10');
assert(meta.module_metadata.tags.includes('portada'), 'tags incluye portada');
assert(meta.module_metadata.tags.includes('hero'), 'tags incluye hero');
assert(meta.module_metadata.tags.includes('romantico'), 'tags incluye romantico');
assert(meta.module_metadata.descripcion.length > 0, 'descripcion presente');
assert(meta.module_metadata.descripcion.length <= 250, 'descripcion <= 250 chars');

// Memory counts
assert(meta.memory_counts.text === 4, 'memory_counts.text === 4');
assert(meta.memory_counts.background === 1, 'memory_counts.background === 1');
assert(meta.memory_counts.image === 2, 'memory_counts.image === 2');

// Memory usages
assert(meta.memory_usages.custom === 5, 'memory_usages.custom === 5');
assert(meta.memory_usages.protected === 2, 'memory_usages.protected === 2');

// Memory sources
assert(meta.memory_sources.generated === 1, 'memory_sources.generated === 1');
assert(meta.memory_sources.library === 2, 'memory_sources.library === 2');

// Placeholders
assert(meta.placeholder_count.generated === 1, 'placeholder_count.generated === 1 (el fondo)');
assert(meta.placeholder_count.library === 2, 'placeholder_count.library === 2 (las 2 fotos)');

// CSS variables
assert(Object.keys(meta.css_variables).length >= 7, '>= 7 variables CSS');
assert(meta.css_variables['--primary-color'] === '#1f1f1f', '--primary-color = #1f1f1f');
assert(meta.css_variables['--accent-color'] === '#b89a63', '--accent-color = #b89a63');

// Color palette canónica
assert(meta.color_palette.bg_primary === '#1f1f1f', 'color_palette.bg_primary');
assert(meta.color_palette.accent === '#b89a63', 'color_palette.accent');
assert(meta.color_palette.text === '#2f2f2f', 'color_palette.text');

// Theme tags (heurísticas)
assert(meta.theme_tags.includes('glassmorphism'), 'theme_tags incluye glassmorphism');
assert(meta.theme_tags.includes('gradientes'), 'theme_tags incluye gradientes');
assert(meta.theme_tags.includes('animado'), 'theme_tags incluye animado');

// Asset types (library hints)
assert(meta.asset_types.includes('foto-personal'), 'asset_types incluye foto-personal');

// memory_keys (opcional, para mapeo de datos)
assert(meta.memory_keys.includes('bride-name'), 'memory_keys incluye bride-name');
assert(meta.memory_keys.includes('groom-name'), 'memory_keys incluye groom-name');
assert(meta.memory_keys.includes('decorative-ampersand'), 'memory_keys incluye decorative-ampersand');

console.log('\n===== TEST VALIDATE =====');
const validation = validateModule(html);
assert(validation.isValid === true, 'isValid === true (sin errores)');
assert(validation.errors.length === 0, 'Sin errores de validación');
assert(validation.warnings.length === 0, 'Sin warnings (Hero-01 es conforme)');

console.log('\n===== TEST ANALYZE =====');
const analysis = analyzeModule(html, 'portada');
assert(analysis.module_type === 'portada', 'analysis.module_type = portada');
assert(analysis.has_memory_attributes === 1, 'has_memory_attributes = 1');
assert(typeof analysis.html_size === 'number' && analysis.html_size > 1000, 'html_size > 1000 bytes');
assert(Array.isArray(JSON.parse(analysis.tags)), 'analysis.tags es JSON array');
assert(typeof JSON.parse(analysis.descripcion_larga) === 'string', 'analysis.descripcion_larga es JSON string');
assert(typeof JSON.parse(analysis.color_palette) === 'object', 'analysis.color_palette es JSON object');
assert(JSON.parse(analysis.memory_sources).library === 2, 'analysis.memory_sources.library = 2');

console.log('\n===== TEST HELPERS =====');
assert(generateModuleIdFromFilename('Hero-01.html') === 'hero-01', 'generateModuleIdFromFilename Hero-01.html → hero-01');
assert(generateModuleIdFromFilename('Portada Castillo.html') === 'portada-castillo', 'generateModuleIdFromFilename Portada Castillo.html → portada-castillo');
assert(typeof generateStyleName(meta) === 'string' && generateStyleName(meta).length > 0, 'generateStyleName genera un nombre');

console.log('\n===== RESULTADO FINAL =====');
console.log('Tests pasados.' + (process.exitCode ? ' Hubo fallos.' : ' Todo OK.'));
