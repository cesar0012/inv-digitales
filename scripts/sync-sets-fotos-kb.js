/**
 * Sincroniza los 288 módulos de modulos-1/sets-fotos/ hacia la tabla
 * knowledge_base_modules (KB del flujo modular RAG).
 *
 * Los módulos viajan SIN colores (los asigna el cliente al generar): este
 * sync registra css_variables/color_palette vacíos a propósito.
 *
 * Uso:  node scripts/sync-sets-fotos-kb.js           (sync normal)
 * Idempotente: borra las filas module_id LIKE 'sf-%' y reinserta.
 */
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import db from '../server/database.js';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', 'modulos-1', 'sets-fotos');
const styles = require(join(__dirname, '..', 'modulos-1', 'sets-fotos', 'gen', 'styles.cjs'));

const TIPOS = ['portada', 'padres', 'ubicacion', 'itinerario', 'confirmacion', 'detalles',
  'countdown', 'padrinos', 'corte', 'galeria', 'regalos', 'vestimenta'];

const parseMeta = (html) => {
  const m = html.match(/var moduleMetadata = (\{[\s\S]*?\});/);
  if (!m) return {};
  try {
    const fn = new Function('return (' + m[1] + ');');
    return fn();
  } catch { return {}; }
};

const sets = readdirSync(ROOT).filter((d) => /^(set-\d+-|premium$)/.test(d)).sort();
const filas = [];
for (const setDir of sets) {
  const key = setDir.replace(/^set-\d+-/, '');
  const S = styles[key] || { name: key, theme: key, motif: key };
  const files = readdirSync(join(ROOT, setDir)).filter((f) => f.endsWith('.html'));
  for (const tipo of TIPOS) {
    const f = files.find((x) => x.endsWith('-' + tipo + '.html'));
    if (!f) { console.warn(`⚠ ${setDir}: falta ${tipo}`); continue; }
    const html = readFileSync(join(ROOT, setDir, f), 'utf-8');
    const meta = parseMeta(html);
    filas.push({
      module_id: `sf-${key}-${tipo}`,
      module_type: tipo,
      style_name: `${S.name} · ${tipo}`,
      description: (meta.descripcion || `Módulo ${tipo} del set ${S.name}`).slice(0, 240),
      tags: JSON.stringify(meta.tags || [tipo]),
      descripcion_larga: (meta.descripcion || '').slice(0, 900),
      theme_tags: JSON.stringify([S.theme, S.motif, 'sets-fotos']),
      color_palette: '',
      css_variables: '',
      has_memory_attributes: /memory_type=/.test(html) ? 1 : 0,
      memory_sources: html.includes('memory_source="library"') ? 'generated,library' : 'generated',
      html_content: html,
      filename: `sets-fotos/${setDir}/${f}`,
      html_size: Buffer.byteLength(html)
    });
  }
}

const borradas = db.prepare("DELETE FROM knowledge_base_modules WHERE module_id LIKE 'sf-%'").run().changes;
const stmt = db.prepare(`
  INSERT INTO knowledge_base_modules (
    module_id, module_type, style_name, description, tags, descripcion_larga,
    theme_tags, color_palette, css_variables, has_memory_attributes, memory_sources,
    html_content, category, is_active, filename, html_size
  ) VALUES (
    @module_id, @module_type, @style_name, @description, @tags, @descripcion_larga,
    @theme_tags, @color_palette, @css_variables, @has_memory_attributes, @memory_sources,
    @html_content, 'general', 1, @filename, @html_size
  )
`);
const tx = db.transaction(() => { for (const fila of filas) stmt.run(fila); });
tx();

const total = db.prepare('SELECT COUNT(*) c FROM knowledge_base_modules').get().c;
const conColor = db.prepare("SELECT COUNT(*) c FROM knowledge_base_modules WHERE module_id LIKE 'sf-%' AND (html_content LIKE '%rgba(%' OR html_content GLOB '*#[0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]*')").get().c;
console.log(`✅ Sincronizados ${filas.length} módulos de sets-fotos (borradas ${borradas} filas previas).`);
console.log(`   KB total: ${total} módulos | filas sf-* con posibles literales de color: ${conColor}`);
