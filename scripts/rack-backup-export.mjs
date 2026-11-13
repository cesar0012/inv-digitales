/**
 * Exporta el rack modular completo (knowledge_base_modules) al formato exacto
 * que usa POST /api/admin/rag-modules/backup — el mismo del archivo
 * rag-modules-backup-2026-08-13.json. Sirve como punto de restauración antes
 * de cualquier operación sobre el rack, y se puede subir desde el admin
 * (Admin → módulos RAG → importar backup) para restaurarlo completo.
 *
 * Uso:  node scripts/rack-backup-export.mjs [nombre-archivo.json]
 */
import { writeFileSync } from 'fs';
import db from '../server/database.js';

const out = process.argv[2] || `rag-modules-backup-${new Date().toISOString().slice(0, 10)}.json`;

const rows = db.prepare(`
  SELECT module_id, module_type, style_name, description,
         tags, descripcion_larga, theme_tags, color_palette,
         css_variables, has_memory_attributes, memory_sources,
         html_content, is_active, category, filename, html_size
  FROM knowledge_base_modules
  ORDER BY created_at ASC
`).all();

const backup = {
  version: '1.0',
  exported_at: new Date().toISOString(),
  data: { modules: rows }
};

writeFileSync(out, JSON.stringify(backup, null, 2));
const activos = rows.filter((r) => r.is_active).length;
console.log(`✅ Backup del rack: ${out}`);
console.log(`   ${rows.length} módulos (${activos} activos) — formato importable en POST /api/admin/rag-modules/backup`);
