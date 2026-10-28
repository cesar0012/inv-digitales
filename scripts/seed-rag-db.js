/**
 * @deprecated Desde PR1 (mig modular RAG) este script está obsoleto.
 * El nuevo flujo modular no popula `knowledge_base` desde un seed JSON;
 * los módulos se suben individualmente vía el panel de administrador
 * (POST /api/admin/rag-modules/upload).
 *
 * Si se quiere poblar el nuevo RAG modular desde archivos sueltos,
 * usar el endpoint /api/admin/rag-modules/upload en un script separado.
 *
 * Para compatibilidad, este script se mantiene y sólo advierte al usuario.
 */

import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, '..', 'server', 'database.sqlite');

const seedPath = join(__dirname, '..', 'temp', 'rag-seed-v2.json');

if (!existsSync(seedPath)) {
  console.log('[SEED] Este script está deprecado y el archivo de seed no existe. No se hace nada.');
  console.log('       El nuevo flujo RAG modular se pobla vía panel admin con archivos HTML individuales.');
  process.exit(0);
}

console.log('\n⚠️  AVISO:Este script es legacy y popula knowledge_base (template completo).\n     El nuevo sistema RAG modular usa knowledge_base_modules que se debe llenar\n     vía el panel admin con módulos individuales como Hero-01.html.\n');

const db = new Database(dbPath);

try {
  const { readFileSync } = await import('fs');
  const seed = JSON.parse(readFileSync(seedPath, 'utf-8'));
  const templates = seed.data?.knowledge_base || [];

  if (templates.length === 0) {
    console.log('[SEED] Seed JSON vacío. No se inserta nada.');
    db.close();
    process.exit(0);
  }

  console.log(`[SEED] Encontradas ${templates.length} plantillas en seed JSON (legacy).`);

  const insert = db.prepare(`
    INSERT INTO knowledge_base (
      style_id, style_name, description, category, theme_tags,
      color_palette, typography_scale, layout_rules, modules_def,
      base_cdns, js_dependencies, animation_rules, variation_params,
      html_content, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  const update = db.prepare(`
    UPDATE knowledge_base SET
      style_name = ?, description = ?, category = ?, theme_tags = ?,
      color_palette = ?, typography_scale = ?, layout_rules = ?, modules_def = ?,
      base_cdns = ?, js_dependencies = ?, animation_rules = ?, variation_params = ?,
      html_content = ?, updated_at = datetime('now')
    WHERE style_id = ?
  `);

  const tx = db.transaction(() => {
    let inserted = 0;
    let updated = 0;

    for (const t of templates) {
      const existingRow = db.prepare('SELECT id FROM knowledge_base WHERE style_id = ?').get(t.style_id);

      const themeTags = JSON.stringify(t.theme_tags || []);
      const colorPalette = JSON.stringify(t.color_palette || {});
      const typographyScale = JSON.stringify(t.typography_scale || {});
      const layoutRules = JSON.stringify(t.layout_rules || {});
      const modulesDef = JSON.stringify(t.modules_def || {});
      const baseCdns = JSON.stringify(t.base_cdns || []);
      const jsDeps = JSON.stringify(t.js_dependencies || []);
      const animationRules = JSON.stringify(t.animation_rules || {});
      const variationParams = JSON.stringify(t.variation_params || {});

      if (existingRow) {
        update.run(
          t.style_name, t.description, t.category, themeTags,
          colorPalette, typographyScale, layoutRules, modulesDef,
          baseCdns, jsDeps, animationRules, variationParams,
          t.html_content || null,
          t.style_id
        );
        updated++;
      } else {
        insert.run(
          t.style_id, t.style_name, t.description, t.category, themeTags,
          colorPalette, typographyScale, layoutRules, modulesDef,
          baseCdns, jsDeps, animationRules, variationParams,
          t.html_content || null
        );
        inserted++;
      }
    }

    console.log(`[SEED] Insertadas: ${inserted} | Actualizadas: ${updated}`);
  });

  tx();
} catch (err) {
  console.error('[SEED] Error (legacy):', err.message);
}

db.close();
console.log('\n[SEED] Done (legacy).');