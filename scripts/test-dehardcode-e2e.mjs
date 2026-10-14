/* Test end-to-end del de-hardcodeo: toma módulos reales de sets-fotos,
 * los tematiza con paletas de cliente (pastel claro y oscuro) vía el
 * subsistema Post-RAG y verifica:
 *  1. :root override con los colores del cliente.
 *  2. Cero restos de la paleta original del set (morados/dorados etc.).
 *  3. Regla de contraste: fondo claro → texto oscuro; fondo oscuro → claro.
 *  4. surface/border definidos siempre (módulos sin definiciones locales). */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { applyPostRagTheme } from '../theming/apply-theme.js';
import { resolveContrastAwarePalette, contrastRatio, relativeLuminance, parseHexColor } from '../server/contrastService.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', 'modulos-1', 'sets-fotos');

const pastel = { primary: '#e8b4d8', text: '', accent: '#f5d0e5', background: '#fdf6fa' };   // cliente pastel
const oscuro = { primary: '#3a2f6b', text: '', accent: '#8f7bd8', background: '#14102a' };   // cliente oscuro

const hexLum = (hex) => { const rgb = parseHexColor(hex); return rgb ? relativeLuminance(...rgb) : null; };

let fallos = 0;
const assert = (cond, msg) => { if (!cond) { console.error('✗ ' + msg); fallos++; } else console.log('✅ ' + msg); };

// --- Unidad: resolveContrastAwarePalette ---
const rClaro = resolveContrastAwarePalette(pastel);
assert(hexLum(rClaro.palette.text) < 0.25, `paleta clara → texto oscuro (${rClaro.palette.text})`);
const ratioClaro = contrastRatio(hexLum(rClaro.palette.text), hexLum(pastel.background));
assert(ratioClaro >= 4, `contraste texto/fondo claro = ${ratioClaro.toFixed(1)}:1`);
const rOscuro = resolveContrastAwarePalette(oscuro);
assert(hexLum(rOscuro.palette.text) > 0.75, `paleta oscura → texto claro (${rOscuro.palette.text})`);
const ratioOscuro = contrastRatio(hexLum(rOscuro.palette.text), hexLum(oscuro.background));
assert(ratioOscuro >= 4, `contraste texto/fondo oscuro = ${ratioOscuro.toFixed(1)}:1`);
console.log('   ajustes claros:', rClaro.adjustments.join(' | ') || '(ninguno)');
console.log('   ajustes oscuros:', rOscuro.adjustments.join(' | ') || '(ninguno)');

// --- E2E: tematizar un módulo de cada set con la paleta pastel ---
const sets = ['set-01-imperial', 'set-10-navylaser', 'set-23-negooro60'];
const tipos = ['01-portada', '07-countdown', '10-galeria'];
const paletaVieja = ['#e8c15a', '#b98fd4', '#241436', '#d4af5f', '#12100c', '#101a2e', '#d24db8', '#e8b341', 'rgba(185', 'rgba(232', 'rgba(212'];

for (const set of sets) {
  for (const tipo of tipos) {
    const html = readFileSync(join(ROOT, set, tipo + '.html'), 'utf-8');
    const doc = '<!DOCTYPE html><html><head></head><body>' + html + '</body></html>';
    const themed = await applyPostRagTheme(doc, { colors: rClaro.palette, font: { base: 'Playfair Display' } }, { push: () => {} });
    const t = themed.html;
    const sinPaletaVieja = paletaVieja.every((c) => !t.includes(c));
    assert(sinPaletaVieja, `${set}/${tipo}: sin restos de la paleta original del set`);
    assert(t.includes('--text-color: #111111') || /--text-color:\s*#1[0-9a-f]$/im.test(t) || t.includes('--text-color:#111111') || /:root[^}]*--text-color:\s*#111/.test(t), `${set}/${tipo}: :root con texto auto (#111111) por fondo claro`);
    assert(/--surface-color/.test(t) && /--surface-border-color|--border-color/.test(t), `${set}/${tipo}: surface/border definidos en el override`);
  }
}

console.log('\n' + (fallos ? `❌ ${fallos} fallo(s)` : '🎉 TODO OK'));
process.exit(fallos ? 1 : 0);
