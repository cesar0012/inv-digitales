// Test del pase de vocabulario por evento con módulos REALES del rack
import db from '../server/database.js';
import { parseHTML } from 'linkedom';
import { adaptarVocabularioEvento, eventoKeyDe } from '../server/eventDataSchema.js';
import { fillProvidedHtml } from '../server/composer/compose.js';
import { readFileSync } from 'fs';

// 1) Módulos reales con texto XV VISIBLE (fuera de <script>)
const sinScript = (h) => String(h || '').replace(/<script[\s\S]*?<\/script>/gi, '');
const pick = (type, re) => (db.prepare("SELECT html_content, filename FROM knowledge_base_modules WHERE is_active=1 AND module_type=?").all(type) || [])
  .find((r) => re.test(sinScript(r.html_content)));
const portada = pick('portada', /mis\s+(xv|quince|15)\s+a[nñ]os/i);
const corte = pick('corte', /chambelanes/i);
const confirm = pick('confirmacion', /quincea[nñ]era/i);
console.log('módulos de prueba:', portada?.filename, '|', corte?.filename, '|', confirm?.filename);

const pagina = `<!DOCTYPE html><html><body>${portada.html_content}${corte.html_content}${confirm.html_content}</body></html>`;

const casos = [
  ['Boda', ['Nuestra boda', 'la novia', 'Caballeros', 'quinceañera', 'Mis XV años', 'Chambelanes']],
  ['Baby Shower', ['Mi baby shower', 'la mamá', 'Amigas', 'baile', 'quinceañera', 'vals']],
  ['Bautizo', ['Mi bautizo', 'el bebé', 'baile', 'quinceañera']],
  ['Cumpleaños', ['Mi cumpleaños', 'el cumpleañero', 'Amigos', 'quinceañera']],
  ['XV años', ['Mis XV años', 'quinceañera', 'Nuestra boda']] // debe quedar IGUAL
];

let fallos = 0;
for (const [evt] of casos) {
  const { document } = parseHTML(pagina);
  const cambios = adaptarVocabularioEvento(document, evt);
  // assert sobre texto VISIBLE (sin <script>/<style>: la metada del módulo
  // no se muestra al usuario y el pase la ignora a propósito)
  const out = String(document.documentElement.outerHTML).replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
  const key = eventoKeyDe(evt);
  console.log(`\n=== ${evt} (key: ${key}) — ${cambios.length} cambios ===`);
  // assertions explícitas por caso
  const aserciones = {
    'Boda':        [['Nuestra boda', true], ['la novia', true], ['Caballeros', true], ['quinceañera', false], ['Mis XV años', false], ['Chambelanes', false]],
    'Baby Shower': [['Mi baby shower', true], ['la mamá', true], ['Amigas', true], ['quinceañera', false], ['Mis XV años', false], ['Vals', false], ['El vals', false]],
    'Bautizo':     [['Mi bautizo', true], ['el bebé', true], ['quinceañera', false], ['Mis XV años', false]],
    'Cumpleaños':  [['Mi cumpleaños', true], ['el cumpleañero', true], ['quinceañera', false], ['Mis XV años', false]],
    'XV años':     [['Mis XV años', true], ['quinceañera', true], ['Nuestra boda', false]]
  }[evt] || [];
  for (const [txt, esperado] of aserciones) {
    const esta = out.includes(txt);
    const ok = esta === esperado;
    if (!ok) fallos++;
    console.log(`  ${ok ? '✓' : '✗ FALLO'} ${JSON.stringify(txt)} ${esperado ? 'presente' : 'AUSENTE esperado'} → ${esta ? 'presente' : 'ausente'}`);
  }
}

// 2) fillProvidedHtml end-to-end con datos de boda
const resultado = fillProvidedHtml({
  html: pagina,
  eventType: 'Boda',
  data: { nombres_novia: 'Ana', nombres_novio: 'Luis', fecha: '2026-12-12', hora: '19:00', lugar_recepcion: 'Hacienda Las Palmas' },
  preferences: {}
});
const rc = String(resultado.html).replace(/<script[\s\S]*?<\/script>/gi, '');
console.log('\n=== fillProvidedHtml(Boda) ===');
console.log('  "Nuestra boda":', rc.includes('Nuestra boda'));
console.log('  "quinceañera" visible:', /quinceañera/i.test(rc));
console.log('  "Chambelanes" visible:', /chambelanes/i.test(rc));

// 3) "vals" se conserva en boda/XV y cambia a "baile" en los demás
for (const [evtV, esperado] of [['Boda', 'El vals'], ['XV años', 'El vals'], ['Baby Shower', 'El baile'], ['Bautizo', 'El baile']]) {
  const { document: dv } = parseHTML('<!DOCTYPE html><html><body><p>El vals de esta noche</p></body></html>');
  adaptarVocabularioEvento(dv, evtV);
  const tv = dv.body.textContent.trim();
  const okV = tv.includes(esperado);
  if (!okV) fallos++;
  console.log(`  ${okV ? '✓' : '✗ FALLO'} vals ${evtV}: "${tv}" (esperado "${esperado}")`);
}

console.log(fallos === 0 ? '\nTODO OK' : `\n${fallos} FALLOS`);
process.exit(fallos === 0 ? 0 : 1);
