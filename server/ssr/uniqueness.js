/**
 * ============================================================================
 * COMPUERTA DE UNICIDAD (F3 del fix-list)
 * ============================================================================
 * Una página de producto NO se publica si contra cualquier otra página
 * publicada supera: similitud de página completa > 0.60 o de la zona de
 * diseño > 0.25 (shingles de 5 palabras, Jaccard). También exige título,
 * meta, H1, alt y query primaria únicos.
 * ============================================================================
 */

export function shingles(text, n = 5) {
  const w = String(text || '').toLowerCase().normalize('NFC')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
  const s = new Set();
  for (let i = 0; i + n <= w.length; i++) s.add(w.slice(i, i + n).join(' '));
  return s;
}

export function jaccard(a, b) {
  let shared = 0;
  for (const x of a) if (b.has(x)) shared++;
  return shared / (a.size + b.size - shared || 1);
}

/**
 * Extrae el texto de <main> y el de la "zona de diseño" de una página
 * renderizada (la zona: hero, chips, detalles Tema/Colores, about, por qué,
 * descripciones de secciones, ejemplos, CTA final).
 */
export function textosDePagina(html) {
  const main = (String(html).match(/<main[\s\S]*?<\/main>/) || [String(html)])[0];
  const sinScript = main.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
  const mainText = sinScript.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  // Zona de diseño: bloques delimitados con <!--dz-->…<!--/dz--> que el
  // renderer coloca alrededor del copy construido desde el perfil (hero,
  // about, por qué, secciones propias, ejemplos). Solo texto único por diseño.
  const bloques = [...sinScript.matchAll(/<!--dz-->([\s\S]*?)<!--\/dz-->/g)].map((m) => m[1]);
  const zoneText = (bloques.length ? bloques.join(' ') : mainText)
    .replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return { mainText, zoneText };
}

/**
 * Compara una página candidata contra todas las publicadas.
 * @param {{url:string, html:string, title:string, metaDescription:string, h1:string, imageAlt:string, primaryQuery:string}} candidate
 * @param {{url:string, html:string, title:string, metaDescription:string, h1:string, imageAlt:string, primaryQuery:string}[]} published
 * @returns {Array} fallos (vacío = publicar)
 */
export function uniquenessGate(candidate, published) {
  const fails = [];
  const c = textosDePagina(candidate.html);
  const cSh = { main: shingles(c.mainText), zone: shingles(c.zoneText) };
  for (const p of published) {
    if (p.url === candidate.url) continue;
    const t = textosDePagina(p.html);
    const full = jaccard(cSh.main, shingles(t.mainText));
    const zone = jaccard(cSh.zone, shingles(t.zoneText));
    if (full > 0.60) fails.push({ against: p.url, check: 'full', score: full.toFixed(2) });
    if (zone > 0.25) fails.push({ against: p.url, check: 'design-zone', score: zone.toFixed(2) });
    for (const f of ['title', 'metaDescription', 'h1', 'imageAlt', 'primaryQuery']) {
      if (candidate[f] && p[f] && candidate[f].trim().toLowerCase() === p[f].trim().toLowerCase()) {
        fails.push({ against: p.url, check: f });
      }
    }
  }
  return fails;
}
