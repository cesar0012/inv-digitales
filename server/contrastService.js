/**
 * ============================================================================
 * CONTRAST SERVICE — ajuste de color de texto sobre fondos generados por IA
 * ============================================================================
 * Problema: el cliente define su paleta (p. ej. texto azul) y Nano Banana
 * genera un fondo de foto con tonalidades parecidas (azules) → el texto se
 * pierde sobre el fondo. Este servicio analiza cada imagen de fondo GENERADA
 * (base64 PNG incrustado por resolvePlaceholders) y, si el contraste del
 * texto con la zona central de la imagen (donde vive el contenido de los
 * módulos) no alcanza el umbral WCAG, inyecta un override de variables
 * SCOPED al módulo:
 *
 *   <style data-contrast-fix>
 *     [data-gemini-id="countdown-x"] { --text-color: #ffffff; ... }
 *   </style>
 *
 * La paleta de fallback respeta la intención del usuario:
 *   1. El OTRO color del cliente (accent) si alcanza contraste cómodo (≥4.5).
 *   2. Si no, blanco o negro — el de mayor ratio contra el fondo.
 *
 * Guardas para evitar falsos positivos:
 *  - Solo se analizan imágenes PNG base64 generadas por Nano Banana (las de
 *    librería /img/*.jpg quedan fuera: sin decoder JPEG no se muestrea).
 *  - Módulos que ponen su contenido sobre una tarjeta opaca
 *    (background con var(--surface-color)) se saltan: su texto no está
 *    directamente sobre la foto.
 *  - Imagen corrupta/formato inesperado → se omite el fix sin romper el flujo.
 *
 * El paso corre DESPUÉS del theming post-RAG: el re-theming (rebind) elimina
 * estos overrides y el análisis los recrea si siguen aplicando (idempotente).
 */
import { parseHTML } from 'linkedom';
import { PNG } from 'pngjs';

/** Umbral WCAG para disparar el fix (texto display de invitaciones ≈ 3:1; margen). */
const CONTRAST_THRESHOLD = 3.5;
/** Ratio "cómodo" que prefiere el color del cliente sobre blanco/negro. */
const CLIENT_COLOR_COMFORT = 4.5;

// ----------------------------------------------------------------------------
// Colorimetría WCAG
// ----------------------------------------------------------------------------
const srgbChannel = (c) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};

export const relativeLuminance = (r, g, b) =>
  0.2126 * srgbChannel(r) + 0.7152 * srgbChannel(g) + 0.0722 * srgbChannel(b);

export const contrastRatio = (lum1, lum2) => {
  const hi = Math.max(lum1, lum2);
  const lo = Math.min(lum1, lum2);
  return (hi + 0.05) / (lo + 0.05);
};

export function parseHexColor(hex) {
  const m = String(hex || '').trim().match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

const rgbCss = (rgb) => `rgb(${Math.round(rgb[0])}, ${Math.round(rgb[1])}, ${Math.round(rgb[2])})`;

// ----------------------------------------------------------------------------
// Análisis de la imagen de fondo
// ----------------------------------------------------------------------------
/**
 * Decodifica un PNG base64 y muestrea la ZONA CENTRAL (donde los módulos
 * centran su contenido) en grilla. Devuelve luminancia mediana, cuartiles y
 * el RGB mediano aproximado del área, o null si no se puede analizar.
 */
export function analyzeBackground(base64Png) {
  try {
    const b64 = String(base64Png).replace(/^data:image\/[a-z+]+;base64,/, '');
    const buffer = Buffer.from(b64, 'base64');
    // Firma PNG: 89 50 4E 47 ("‰PNG") en los primeros 4 bytes
    if (buffer.length < 8 || buffer.readUInt32BE(0) !== 0x89504e47) return null;
    const png = PNG.sync.read(buffer);
    const { width, height, data } = png;

    // Rect central: 60% del ancho, 60% del alto (texto centrado de portadas/countdown)
    const x0 = Math.floor(width * 0.20), x1 = Math.ceil(width * 0.80);
    const y0 = Math.floor(height * 0.20), y1 = Math.ceil(height * 0.80);
    const step = Math.max(1, Math.floor(Math.min(x1 - x0, y1 - y0) / 24));

    const lums = [];
    const rgbs = [];
    for (let y = y0; y < y1; y += step) {
      for (let x = x0; x < x1; x += step) {
        const i = (y * width + x) * 4;
        const a = data[i + 3] / 255;
        if (a < 0.1) continue; // transparente
        // Componer sobre blanco (fondo de página típico) si hay alfa parcial
        const r = data[i] * a + 255 * (1 - a);
        const g = data[i + 1] * a + 255 * (1 - a);
        const b = data[i + 2] * a + 255 * (1 - a);
        lums.push(relativeLuminance(r, g, b));
        rgbs.push([r, g, b]);
      }
    }
    if (lums.length < 20) return null;
    lums.sort((a, b) => a - b);
    const median = lums[Math.floor(lums.length / 2)];
    const p25 = lums[Math.floor(lums.length * 0.25)];
    const p75 = lums[Math.floor(lums.length * 0.75)];
    const medianRgb = rgbs[Math.floor(rgbs.length / 2)];
    return { median, p25, p75, medianRgb, samples: lums.length };
  } catch {
    return null;
  }
}

// ----------------------------------------------------------------------------
// Elección del color de reemplazo
// ----------------------------------------------------------------------------
/**
 * Elige el color de texto para un fondo de luminancia dada. Preferencia:
 * color del cliente con contraste cómodo > blanco/negro (el de mayor ratio).
 * @returns {{hex: string, source: 'client'|'white'|'black', ratio: number}}
 */
export function pickTextColorForLuminance(bgLuminance, clientColor, clientLabel = 'accent') {
  const candidates = [];
  const clientRgb = clientColor ? parseHexColor(clientColor) : null;
  if (clientRgb) {
    candidates.push({ hex: clientColor.toLowerCase(), lum: relativeLuminance(...clientRgb), source: 'client', label: clientLabel });
  }
  candidates.push({ hex: '#ffffff', lum: 1.0, source: 'white', label: 'blanco' });
  candidates.push({ hex: '#111111', lum: relativeLuminance(17, 17, 17), source: 'black', label: 'negro' });

  const scored = candidates.map((c) => ({ ...c, ratio: contrastRatio(c.lum, bgLuminance) }));
  // Preferencia categórica: si el color del cliente alcanza contraste cómodo,
  // gana aunque blanco/negro tengan más ratio (respeta la paleta del usuario).
  const comfortableClient = scored.filter((c) => c.source === 'client' && c.ratio >= CLIENT_COLOR_COMFORT);
  const pool = comfortableClient.length > 0 ? comfortableClient : scored;
  const best = pool.reduce((a, b) => (b.ratio > a.ratio ? b : a));
  return { hex: best.hex, source: best.source, ratio: best.ratio };
}

// ----------------------------------------------------------------------------
// Paso principal sobre el documento tematizado
// ----------------------------------------------------------------------------
/**
 * Recorre las secciones con fondo generado (base64 PNG en su <style>) y ajusta
 * --text-color / --primary-color del módulo si no contrastan con la imagen.
 *
 * @param {string} html documento ensamblado YA tematizado (post applyPostRagTheme)
 * @param {{primary,text,accent,background}} colors paleta del cliente
 * @returns {Promise<{html: string, fixes: Array}>}
 */
export async function applyTextContrast(html, colors = {}) {
  const { document } = parseHTML(html);
  const fixes = [];

  const textColor = parseHexColor(colors.text || '#2f2f2f');
  const primaryColor = parseHexColor(colors.primary || '#1f1f1f');
  const textLum = textColor ? relativeLuminance(...textColor) : null;
  const primaryLum = primaryColor ? relativeLuminance(...primaryColor) : null;

  for (const section of document.querySelectorAll('section[data-gemini-id]')) {
    const geminiId = section.getAttribute('data-gemini-id');
    const styleTexts = [...section.querySelectorAll('style')].map((s) => s.textContent || '');

    // Guarda: contenido sobre tarjeta opaca → el texto no está sobre la foto
    if (styleTexts.some((css) => /background(?:-color)?\s*:\s*var\(--surface-color\)/.test(css))) continue;

    // Buscar la imagen generada (PNG base64) en los <style> del módulo
    let analysis = null;
    for (const css of styleTexts) {
      const m = css.match(/url\(['"]?data:image\/png;base64,([A-Za-z0-9+/=]{100,})['"]?\)/);
      if (m) {
        analysis = analyzeBackground(m[1]);
        if (analysis) break;
      }
    }
    if (!analysis) continue;

    // ¿Los colores de texto del cliente contrastan con la foto generada?
    const overrides = {};
    const reasons = {};
    if (textLum !== null && contrastRatio(textLum, analysis.median) < CONTRAST_THRESHOLD) {
      const pick = pickTextColorForLuminance(analysis.median, colors.accent, 'accent');
      overrides['--text-color'] = pick.hex;
      reasons['--text-color'] = pick;
    }
    if (primaryLum !== null && contrastRatio(primaryLum, analysis.median) < CONTRAST_THRESHOLD) {
      // Para títulos preferimos también el accent; si se usó ya para texto, blanco/negro mejor ratio
      const pick = pickTextColorForLuminance(analysis.median, colors.accent, 'accent');
      overrides['--primary-color'] = pick.hex;
      reasons['--primary-color'] = pick;
    }
    if (Object.keys(overrides).length === 0) continue;

    // Texto secundario derivado del nuevo color de texto contra el tono real de la foto
    if (overrides['--text-color']) {
      overrides['--secondary-color'] =
        `color-mix(in srgb, ${overrides['--text-color']} 72%, ${rgbCss(analysis.medianRgb)})`;
    }

    const decls = Object.entries(overrides).map(([k, v]) => `${k}: ${v};`).join(' ');
    const fixStyle = document.createElement('style');
    fixStyle.setAttribute('data-contrast-fix', geminiId);
    fixStyle.textContent = `\n    /* Ajuste automático de contraste: el fondo generado (${rgbCss(analysis.medianRgb)}, luminancia ${analysis.median.toFixed(2)}) no contrastaba con la paleta del cliente. Fallback: ${Object.values(reasons).map((r) => `${r.label} (${r.source}, ratio ${r.ratio.toFixed(1)})`).join(', ')}. */\n    [data-gemini-id="${geminiId}"] { ${decls} }\n  `;
    section.appendChild(fixStyle);

    fixes.push({
      geminiId,
      background: { medianRgb: analysis.medianRgb.map(Math.round), luminance: Number(analysis.median.toFixed(3)) },
      overrides,
      sources: Object.fromEntries(Object.entries(reasons).map(([k, r]) => [k, { source: r.source, ratio: Number(r.ratio.toFixed(2)) }]))
    });
    console.log(`[CONTRAST] ${geminiId}: fondo ${rgbCss(analysis.medianRgb.map(Math.round))} → ${Object.entries(overrides).map(([k, v]) => `${k}=${v}`).join(', ')}`);
  }

  if (fixes.length === 0) return { html, fixes };
  return { html: document.toString(), fixes };
}
