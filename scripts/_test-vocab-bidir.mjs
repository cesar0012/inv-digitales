// Test bidireccional del vocabulario con módulos reales del rack
import db from '../server/database.js';
import { parseHTML } from 'linkedom';
import { adaptarVocabularioEvento } from '../server/eventDataSchema.js';

const sinScript = (h) => String(h).replace(/<script[\s\S]*?<\/script>/gi, '');
const visibles = (doc) => {
  const out = sinScript(doc.documentElement.outerHTML);
  const tmp = parseHTML('<!DOCTYPE html><html><body>' + out + '</body></html>');
  const estaOculto = (el) => {
    let n = el;
    while (n && n !== tmp.document.body) {
      if (n.style && n.style.display === 'none') return true;
      n = n.parentElement;
    }
    return false;
  };
  return [...tmp.document.body.querySelectorAll('p,span,h2,h3,h4,li,b,em')]
    .filter((el) => !el.children.length && el.textContent.trim())
    .map((el) => ({ t: el.textContent.trim().slice(0, 50), oculto: estaOculto(el) }))
    .filter((x) => /padre|madre|papá|mamá|novio|novia|quinceañera|boda/i.test(x.t));
};

let fallos = 0;
const check = (cond, msg) => { if (!cond) { fallos++; console.log('  ✗ ' + msg); } else console.log('  ✓ ' + msg); };

// ---- 1) Módulo BODA (padres-universal: "Padre del Novio") en eventos de un festejado ----
const modBoda = db.prepare("SELECT html_content, module_id FROM knowledge_base_modules WHERE is_active=1 AND module_type='padres' AND html_content LIKE '%Padre del Novio%' LIMIT 1").get();
console.log('módulo boda:', modBoda.module_id);

for (const [evt, esperadoRol] of [['XV Años', 'de la quinceañera'], ['Bautizo', 'Papá']]) {
  const { document } = parseHTML('<!DOCTYPE html><html><body>' + modBoda.html_content + '</body></html>');
  const c = adaptarVocabularioEvento(document, evt);
  const rols = visibles(document);
  const noOcultos = rols.filter((r) => !r.oculto).map((r) => r.t);
  console.log(`\n=== ${evt} — ${c.length} cambios ===`);
  console.log('  cambios:', c.slice(0, 4).join(' | '));
  console.log('  roles visibles:', JSON.stringify(noOcultos));
  check(noOcultos.some((t) => t.includes(esperadoRol)), `aparece "${esperadoRol}"`);
  check(!noOcultos.some((t) => /novio/i.test(t)), 'no queda ningún "Novio" visible');
}

// Boda: intacto
{
  const { document } = parseHTML('<!DOCTYPE html><html><body>' + modBoda.html_content + '</body></html>');
  const c = adaptarVocabularioEvento(document, 'Boda');
  check(c.length === 0, 'Boda: 0 cambios (el módulo es de boda)');
}

// ---- 2) Módulo con texto XV VISIBLE en XV: intacto; en boda: forward ----
const sinScriptQ = (h) => String(h || '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
const modXV = (db.prepare("SELECT html_content, module_id FROM knowledge_base_modules WHERE is_active=1 AND module_type='padres'").all() || [])
  .find((r) => /quinceañera|mis quince|mis xv/i.test(sinScriptQ(r.html_content)));
console.log('\nmódulo XV (texto visible):', modXV ? modXV.module_id : '(ninguno — se usa synth)');
const htmlXV = modXV ? modXV.html_content : '<section data-gemini-id="padres-01"><h3>Nuestros padres</h3><p>Con su bendición te invito a celebrar mis quince años.</p><p>Un deseo para la quinceañera</p></section>';
{
  const { document } = parseHTML('<!DOCTYPE html><html><body>' + htmlXV + '</body></html>');
  const c = adaptarVocabularioEvento(document, 'XV Años');
  check(c.length === 0, 'XV + módulo XV: 0 cambios');
}
{
  const { document } = parseHTML('<!DOCTYPE html><html><body>' + htmlXV + '</body></html>');
  const c = adaptarVocabularioEvento(document, 'Boda');
  const out = sinScript(document.documentElement.outerHTML);
  check(/novia|papás|nuestra boda/i.test(out), 'módulo XV en Boda: reescrito a vocabulario de boda (' + c.length + ' cambios)');
  check(!/quinceañera/i.test(out), 'módulo XV en Boda: sin rastro de quinceañera');
}

// ---- 3) Regresión del pase directo anterior (Mis XV años → Nuestra boda) ----
{
  const { document } = parseHTML('<!DOCTYPE html><html><body><section data-gemini-id="portada-01"><p memory_key="portada-kicker">Mis XV años</p><p>Un deseo para la quinceañera</p></section></body></html>');
  adaptarVocabularioEvento(document, 'Boda');
  const t = document.body.textContent;
  check(t.includes('Nuestra boda'), 'forward: Mis XV años → Nuestra boda');
  check(t.includes('novia') && !t.includes('quinceañera'), 'forward: quinceañera → novia');
}

console.log(fallos === 0 ? '\nTODO OK' : `\n${fallos} FALLOS`);
process.exit(fallos === 0 ? 0 : 1);
