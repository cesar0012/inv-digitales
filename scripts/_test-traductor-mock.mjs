// Test del traductor con Gemini SIMULADO: valida extracción, reemplazo y caché
import { readFileSync } from 'fs';
import { traducirInvitacionAIngles } from '../server/invitationTranslator.js';

// Diccionario simulado — el fetch real de Gemini se intercepta
const DICC = {
  'Mis padres': 'My Parents', 'Mis padrinos': 'My Godparents', 'Cuenta regresiva': 'Countdown',
  'Itinerario': 'Itinerary', 'Nombre del lugar': 'Venue name', 'Falta muy poco': 'Almost there',
  'Nombre Apellido': 'Nombre Apellido', 'Nombre': 'Name', 'Detalles': 'Details', 'Detalles': 'Details'
};
const realFetch = global.fetch;
let llamadas = 0;
global.fetch = async (url, opts) => {
  if (String(url).includes('generativelanguage')) {
    llamadas++;
    const body = JSON.parse(opts.body);
    const strs = JSON.parse(body.contents[0].parts[0].text.match(/\[[\s\S]*\]/)[0]);
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(strs.map((s) => DICC[s] ?? s)) }] } }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  return realFetch(url, opts);
};

const html = readFileSync('server/storage/historico/invitacion_1794629911401.html', 'utf-8');
const r1 = await traducirInvitacionAIngles(html, { geminiKey: 'fake-key-f.Valida_123', geminiModel: 'gemini-flash-latest' });
const visible1 = r1.html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]*>/g, ' ');

let fallos = 0;
const check = (b, n) => { if (!b) fallos++; console.log(`  ${b ? '✓' : '✗'} ${n}`); };
check(r1.traducidos > 0, `nodos traducidos: ${r1.traducidos}`);
check(/My Parents/.test(visible1), '"Mis padres" → "My Parents"');
check(/My Godparents/.test(visible1), '"Mis padrinos" → "My Godparents"');
check(/Almost there/.test(visible1), '"Falta muy poco" → "Almost there"');
check(!/Mis padres|Mis padrinos|Falta muy poco/.test(visible1), 'sin español residual en títulos');
check(/Nombre Apellido/.test(visible1), 'nombre del usuario intacto');
check((r1.html.match(/data:image/g) || []).length === (html.match(/data:image/g) || []).length, 'imágenes base64: misma cantidad que el original');
check((r1.html.match(/src="\/img\//g) || []).length === (html.match(/src="\/img\//g) || []).length, 'rutas /img/ intactas');
check(/data-gemini-id="portada/.test(r1.html), 'identificadores intactos');

// 2ª pasada: todo desde caché (0 llamadas nuevas)
const llamadasAntes = llamadas;
const r2 = await traducirInvitacionAIngles(html, { geminiKey: 'fake-key-f.Valida_123', geminiModel: 'gemini-flash-latest' });
check(llamadas === llamadasAntes, `caché: 2ª pasada sin llamadas (${llamadas - llamadasAntes} nuevas)`);
check(r2.html === r1.html, 'resultado idéntico con caché');

console.log(fallos === 0 ? '\nTRADUCTOR OK (mock)' : `\n${fallos} fallos`);
global.fetch = realFetch;
process.exit(fallos === 0 ? 0 : 1);
