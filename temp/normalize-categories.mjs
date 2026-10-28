// One-off script: normaliza todas las categorias en knowledge_base
// usando la misma logica que normalizeCategory() de geminiService.js
// Uso: node temp/normalize-categories.mjs

import db from '../server/database.js';

function normalizeCategory(eventType) {
  if (!eventType) return '';
  const normalized = eventType
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  if (normalized.includes('boda') || normalized.includes('wedding') || normalized.includes('matrimo')) return 'boda';
  if (normalized.includes('xv') || normalized.includes('quince') || normalized.includes('15')) return 'xv-anos';
  if (normalized.includes('cumple') || normalized.includes('birthday')) return 'cumpleanos';
  if (normalized.includes('bauti') || normalized.includes('bautism')) return 'bautizo';
  if (normalized.includes('comunion') || normalized.includes('comunio')) return 'primera-comunion';
  if (normalized.includes('confirmac')) return 'confirmacion';

  return normalized;
}

const rows = db.prepare('SELECT id, category FROM knowledge_base').all();
console.log(`Total registros: ${rows.length}`);

let updated = 0;
for (const row of rows) {
  const normalized = normalizeCategory(row.category);
  if (normalized !== row.category) {
    console.log(`  id=${row.id}: "${row.category}" -> "${normalized}"`);
    db.prepare('UPDATE knowledge_base SET category = ? WHERE id = ?').run(normalized, row.id);
    updated++;
  }
}

console.log(`\nMigracion completa. ${updated} registro(s) actualizado(s) de ${rows.length} total.`);

const finalRows = db.prepare('SELECT category, COUNT(*) as count FROM knowledge_base GROUP BY category').all();
console.log('\nEstado final:');
for (const r of finalRows) {
  console.log(`  ${r.category}: ${r.count} template(s)`);
}

db.close();