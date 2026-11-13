// Test: slots con rol de módulo + selección por rol de la biblioteca img/
import db from '../server/database.js';
import { extractImageSlots, heuristicPrompt } from '../server/freeImageService.js';

// 1) Módulos reales del rack: portada, padres, padrinos, corte
const html = db.prepare("SELECT html_content FROM knowledge_base_modules WHERE is_active=1 AND module_type IN ('portada','padres','padrinos','corte') ORDER BY module_type LIMIT 8").all()
  .map((r) => r.html_content).join('\n');

const slots = extractImageSlots(`<!DOCTYPE html><html><body>${html}</body></html>`);
const porRol = {};
slots.forEach((s) => { porRol[s.role] = (porRol[s.role] || 0) + 1; });
console.log('slots extraídos:', slots.length, JSON.stringify(porRol));

let fallos = 0;
for (const s of slots.slice(0, 12)) {
  console.log(`  [${s.role}] ${s.url.slice(0, 60)}`);
}

// 2) fetchLocalStock por rol (privado → lo ejercemos vía processHtml… no:
// lo probamos indirectamente comprobando que el pool por rol existe)
import { readdirSync } from 'fs';
const ROLE_FILE_RE = {
  padrinos: /padrino|godparent|godmother|godfather|madrina/,
  corte: /bridesmaid|chambelan|court|flower.?girl|damas?|friends|selfie/,
  parents: /parent|mother|father|family|newlywed|madre|padres/,
  details: /closeup|bouquet|corsage|dress|flower|cake|ring|hands|crown|detail/
};
const fileRole = (n) => {
  if (ROLE_FILE_RE.padrinos.test(n)) return 'padrinos';
  if (ROLE_FILE_RE.corte.test(n)) return 'corte';
  if (ROLE_FILE_RE.parents.test(n)) return 'parents';
  if (ROLE_FILE_RE.details.test(n)) return 'details';
  return 'hero';
};
for (const carpeta of ['xv-años', 'boda-color', 'boda-americana', 'boda-gay-mujeres']) {
  const conteo = {};
  for (const f of readdirSync('img/' + carpeta)) {
    const r = fileRole(f.toLowerCase());
    conteo[r] = (conteo[r] || 0) + 1;
  }
  console.log(`pool ${carpeta}:`, JSON.stringify(conteo));
  for (const rol of ['padrinos', 'corte', 'parents']) {
    if (!conteo[rol]) { fallos++; console.log(`  ✗ ${carpeta} SIN fotos de rol ${rol}`); }
  }
}

// 3) heuristicPrompt incorpora el rol
const p = heuristicPrompt({ keywords: ['celebration'], role: 'padrinos' });
console.log('heuristicPrompt(padrinos):', p.slice(0, 80));
if (!/godparents/i.test(p)) { fallos++; console.log('✗ el prompt no describe al padrino'); }
const p2 = heuristicPrompt({ keywords: ['party'], role: 'corte' });
if (!/court of honor/i.test(p2)) { fallos++; console.log('✗ el prompt no describe al corte'); }

// 4) aserciones de rol por módulo sobre el HTML real
const modulos = db.prepare("SELECT module_type, html_content FROM knowledge_base_modules WHERE is_active=1 AND module_type IN ('padres','padrinos','corte','portada') LIMIT 12").all();
for (const m of modulos) {
  const ss = extractImageSlots(`<!DOCTYPE html><html><body>${m.html_content}</body></html>`);
  const esperado = { padres: 'parents', padrinos: 'padrinos', corte: 'corte', portada: 'hero' }[m.module_type];
  for (const s of ss) {
    if (s.role !== esperado) { fallos++; console.log(`✗ ${m.module_type}: slot clasificado '${s.role}' (esperado '${esperado}')`); }
  }
}

console.log(fallos === 0 ? '\nTODO OK' : `\n${fallos} FALLOS`);
process.exit(fallos === 0 ? 0 : 1);
