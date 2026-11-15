// Test del sistema completo de perfiles + unicidad con las 3 invitaciones REALES
import db from '../server/database.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { extraerPerfilDiseno, construirSeoDesdePerfil, slugDesdePerfil } from '../server/ssr/designProfile.js';
import { renderProductPage } from '../server/ssr/product-page.js';
import { shingles, jaccard, textosDePagina } from '../server/ssr/uniqueness.js';

const filas = [
  { id: 40, filename: 'invitacion_1794629911401.html', title: 'XV Años - Elegante', slug: 'xv-anos/invitacion-digital-elegante-rosa-coral-mis-xv-i6fd' },
  { id: 41, filename: 'invitacion_1794634579508.html', title: 'Boda Elegante', slug: 'boda/invitacion-digital-boda-elegante-rosa-coral' },
  { id: 42, filename: 'invitacion_1794635032631.html', title: 'Cumpleaños Paris', slug: 'cumpleanos/invitacion-digital-luces-de-paris-elegante' }
];

const ins = db.prepare('INSERT OR REPLACE INTO catalogo (id, filename, title, event_type, theme, colors, slug, starred, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime(\'now\'))');
for (const f of filas) ins.run(f.id, f.filename, f.title, f.title.includes('Boda') ? 'Boda' : f.title.includes('Paris') ? 'Cumpleaños' : 'XV años', '', '[]', f.slug);

// build-profile para cada una (mismo código que el endpoint)
for (const f of filas) {
  const html = readFileSync(join('server', 'storage', 'historico', f.filename), 'utf-8');
  const item = db.prepare('SELECT * FROM catalogo WHERE id = ?').get(f.id);
  const perfil = extraerPerfilDiseno(html, item);
  const seo = construirSeoDesdePerfil(perfil);
  const nuevoSlug = slugDesdePerfil(perfil);
  db.prepare(`UPDATE catalogo SET design_profile = ?, seo_title = ?, meta_description = ?, h1 = ?, event_type = ?, theme = ?, colors = ?, slug = ?, old_slug = ? WHERE id = ?`).run(
    JSON.stringify(perfil), seo.title, seo.meta, seo.h1,
    perfil.event.label, perfil.theme.label || '',
    JSON.stringify((perfil.colors.main || []).map((c) => c.name).filter(Boolean)),
    nuevoSlug, item.slug, f.id
  );
  console.log(`id=${f.id}: evento=${perfil.event.key} tema=${perfil.theme.key || '-'} colores=${(perfil.colors.main || []).map((c) => c.name).join(',')} | slug: ${item.slug} → ${nuevoSlug}`);
  console.log(`   title: ${seo.title}`);
  console.log(`   H1: ${seo.h1}`);
}

// Renderizar las 3 y medir similitud
const items = db.prepare('SELECT * FROM catalogo WHERE starred = 1 AND id IN (40,41,42)').all();
const paginas = items.map((it) => {
  let h = '';
  try { h = readFileSync(join('server', 'storage', 'historico', it.filename), 'utf-8').slice(0, 300000); } catch {}
  const html = renderProductPage(it, { db, publicUrl: 'https://generador.invitacionesmodernas.com', requestPath: `/catalogo/${it.slug}`, invitationHtml: h });
  const t = textosDePagina(html);
  return { url: it.slug, main: shingles(t.mainText), zone: shingles(t.zoneText) };
});

console.log('\n=== SIMILITUD (meta: full ≤ 0.60, zona ≤ 0.25) ===');
let fallos = 0;
for (let i = 0; i < paginas.length; i++) {
  for (let j = i + 1; j < paginas.length; j++) {
    const full = jaccard(paginas[i].main, paginas[j].main);
    const zone = jaccard(paginas[i].zone, paginas[j].zone);
    const ok = full <= 0.60 && zone <= 0.25;
    if (!ok) fallos++;
    console.log(`  ${ok ? '✓' : '✗'} ${paginas[i].url.slice(0, 38)} ↔ ${paginas[j].url.slice(0, 38)} | full: ${full.toFixed(2)} | zona: ${zone.toFixed(2)}`);
  }
}
// títulos únicos
const titles = items.map((i) => i.seo_title);
console.log('títulos únicos:', new Set(titles).size === titles.length, JSON.stringify(titles.map((t) => t.slice(0, 40))));
console.log(fallos === 0 ? '\nTODO OK — páginas únicas' : `\n${fallos} pares exceden umbrales`);
process.exit(fallos === 0 ? 0 : 1);
