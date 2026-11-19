// Test: prioridad de evento del usuario + títulos adaptados (paris real)
import { extraerPerfilDiseno } from '../server/ssr/designProfile.js';
import { readFileSync } from 'fs';

const html = readFileSync('server/storage/historico/paris.html', 'utf-8');

let fallos = 0;
const check = (b, n) => { if (!b) fallos++; console.log(`  ${b ? '✓' : '✗'} ${n}`); };

const p1 = extraerPerfilDiseno(html, { filename: 'paris.html', title: 'Luces de París', event_type: 'Cumpleaños', slug: 'cumpleanos/x' });
console.log('— usuario eligió Cumpleaños:');
check(p1.event.key === 'cumpleanos', `evento: ${p1.event.key} (esperado cumpleanos)`);
check(!!p1.sections_actual[0]?.own_title && p1.sections_actual[0].own_title !== 'Portada', `portada con título real: "${p1.sections_actual[0]?.own_title}"`);
check(!/Mis XV años|quinceañera/i.test(JSON.stringify(p1.sections_actual)), 'sin "Mis XV años" en secciones');
check(!/Mis XV años/.test(JSON.stringify(p1.signature_lines)), 'sin "Mis XV años" en taglines');
check(p1.event.label.toLowerCase().includes('cumple'), `label del evento: ${p1.event.label}`);

const p2 = extraerPerfilDiseno(html, { filename: 'paris.html', title: 'Luces de París', event_type: '', slug: 'xv-anos/x' });
console.log('— sin elección (respaldo por contenido):');
check(p2.event.key === 'xv-anos', `evento: ${p2.event.key} (esperado xv-anos)`);

const p3 = extraerPerfilDiseno(html, { filename: 'paris.html', title: 'X', event_type: 'XV años', slug: 'xv-anos/x' });
console.log('— usuario eligió XV años:');
check(p3.event.key === 'xv-anos', `evento: ${p3.event.key}`);
check(!!p3.sections_actual[0]?.own_title && p3.sections_actual[0].own_title !== 'Portada', `portada con título: "${p3.sections_actual[0]?.own_title}"`);

console.log(fallos === 0 ? '\nTODO OK' : `\n${fallos} fallos`);
process.exit(fallos === 0 ? 0 : 1);
