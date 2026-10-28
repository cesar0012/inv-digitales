// Offline check of the event-first composer (no AI, no network).
// Run: node test/compose.test.mjs
import { composeInvitation } from '../server/composer/compose.js';
import { designsForEvent } from '../server/composer/library.js';

const quince = {
  nombre: 'Sofía Hernández Ruiz', fecha: '2027-03-20', hora: '18:30',
  padres: [
    { nombre: 'María Ruiz', rol: 'Mamá' }, { nombre: 'Jorge Hernández', rol: 'Papá', en_memoria: true },
    { nombre: 'Laura Gómez', rol: 'Madrastra' }, { nombre: 'Pedro Salas', rol: 'Padrastro' }
  ],
  padrinos: [
    { rol: 'Velación', nombres: 'Ana y Luis Torres' }, { rol: 'Corona', nombres: 'Rosa y Juan Díaz' },
    { rol: 'Anillo', nombres: 'Elena Castro' }, { rol: 'Medalla', nombres: 'Tomás y Lucía Vega' },
    { rol: 'Última muñeca', nombres: 'Carmen Ortiz' }, { rol: 'Brindis', nombres: 'Raúl y Pilar Méndez' }
  ],
  damas: ['Valeria', 'Camila', 'Renata', 'Ximena', 'Paula', 'Regina'].map((n, i) => ({ nombre: n, de_honor: i === 0 })),
  chambelanes: ['Diego', 'Mateo', 'Emiliano', 'Santiago', 'Leonardo', 'Sebastián', 'Iker', 'Bruno'].map((n, i) => ({ nombre: n, de_honor: i === 1 })),
  ubicaciones: [
    { tipo: 'Misa de acción de gracias', lugar: 'Parroquia San José', direccion: 'Av. Central 100, Phoenix, AZ', hora: '17:00' },
    { tipo: 'Recepción', lugar: 'Salón Los Arcos', direccion: 'Calle 5 #200, Phoenix, AZ', hora: '19:00', mapa: 'https://maps.app.goo.gl/abc' }
  ],
  itinerario: [
    { hora: '19:00', actividad: 'Recepción' }, { hora: '20:00', actividad: 'Entrada y vals', descripcion: 'Con mi papá' },
    { hora: '21:00', actividad: 'Cena' }, { hora: '22:00', actividad: 'Brindis' }, { hora: '22:30', actividad: 'Baile sorpresa' },
    { hora: '23:00', actividad: 'Fiesta' }
  ],
  codigo_vestimenta: 'Formal', vestimenta_nota: 'El color rosa está reservado para la quinceañera',
  regalos: [{ tipo: 'Mesa de regalos', detalle: 'Liverpool #51234567', enlace: 'https://mesaderegalos.liverpool.com.mx/milistaderegalos/51234567' }, { tipo: 'Lluvia de sobres' }],
  fecha_limite: '2027-03-01', incluir_galeria: true
};

const boda = {
  persona1: 'Ana López', persona2: 'Luis Pérez', fecha: '2027-06-12', hora: '17:00',
  padres: [
    { nombre: 'Rosa Martínez', rol: 'Mamá', lado: 'p1' }, { nombre: 'Héctor López', rol: 'Papá', lado: 'p1' },
    { nombre: 'Elsa Pérez', rol: 'Mamá', lado: 'p2' }, { nombre: 'Mario Pérez', rol: 'Papá', lado: 'p2', en_memoria: true }, { nombre: 'Julia Ramos', rol: 'Madrastra', lado: 'p2' }
  ],
  padrinos: [{ rol: 'Velación', nombres: 'Carlos y Marta Ruiz' }, { rol: 'Anillos', nombres: 'Pablo Soto' }, { rol: 'Lazo', nombres: 'Irma y José Paz' }],
  ubicaciones: [{ tipo: 'Ceremonia religiosa', lugar: 'Catedral', direccion: 'Centro', hora: '17:00' }, { tipo: 'Recepción', lugar: 'Hacienda Real', hora: '19:30' }],
  codigo_vestimenta: 'Etiqueta / Black tie', solo_adultos: true, fecha_limite: '2027-05-20',
  damas: [{ nombre: 'Lucía' }, { nombre: 'Marina' }, { nombre: 'Sara' }], chambelanes: [{ nombre: 'Andrés' }, { nombre: 'Iván' }],
  itinerario: [{ hora: '17:00', actividad: 'Ceremonia' }, { hora: '19:30', actividad: 'Cóctel' }, { hora: '21:00', actividad: 'Cena' }],
  regalos: [{ tipo: 'Mesa de regalos', detalle: 'Amazon', enlace: 'https://www.amazon.com.mx/wedding/abc' }], incluir_galeria: true
};

let failures = 0;
const check = (cond, msg) => { if (!cond) { failures++; console.log('   ✗', msg); } };

for (const [eventType, data, people] of [['quinceanera', quince, ['Valeria', 'Bruno', 'Pedro Salas', 'Raúl y Pilar Méndez']], ['boda', boda, ['Julia Ramos', 'Pablo Soto', 'Irma y José Paz', 'Marina', 'Iván']]]) {
  const designs = designsForEvent(eventType);
  console.log(`\n== ${eventType}: ${designs.length} diseños`);
  for (const d of designs) {
    const r = composeInvitation({ eventType, designId: d.id, data, hasRsvp: true, preferences: {} });
    const text = r.html.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/g, ' ');
    const missingPeople = people.filter((p) => !text.includes(p));
    const types = r.report.modules.map((m) => m.type);
    const ubic = types.filter((t) => t === 'ubicacion').length;
    const line = `${d.id.padEnd(24)} módulos=${String(r.report.modules.length).padStart(2)} omitidos=${r.report.skipped.map((s) => s.type).join(',') || '-'} avisos=${r.report.warnings.length}`;
    console.log(line + (missingPeople.length ? `  faltan: ${missingPeople.join(', ')}` : ''));
    for (const w of r.report.warnings.slice(0, 3)) console.log(`     · ${w.type}: ${w.kind} «${w.sample}»`);
    check(ubic === data.ubicaciones.length || !d.modules.has('ubicacion'), `${d.id}: ubicaciones ${ubic}`);
    check(!/Nombre\s*(&|y)\s*Nombre/i.test(text), `${d.id}: quedó "Nombre & Nombre"`);
    const keys = [...r.html.matchAll(/memory_key="([^"]+)"/g)].map((m) => m[1]);
    const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
    check(!dupes.length, `${d.id}: memory_key duplicados ${[...new Set(dupes)].slice(0, 5).join(', ')}`);
    check(r.missing.length === 0, `${d.id}: faltantes ${JSON.stringify(r.missing)}`);
  }
}
console.log(failures ? `\n${failures} verificaciones fallaron` : '\nTodas las verificaciones pasaron');
process.exit(failures ? 1 : 0);
