/**
 * Pruebas del subsistema EVENT DATA:
 *  - resolveSchema: mapeo de tipos de evento
 *  - applyDeterministicData: inyección sin IA sobre una invitación sintética
 *    armada con los placeholders canónicos del 00-PROMPT-BASE
 *  - collectTextTargets / applyTextByIndex: índice compacto para el pase IA
 *  - missingRequired: gate del cliente
 * Corre 100% offline (usa linkedom, el mismo DOM del servidor).
 */
import { parseHTML } from 'linkedom';
import {
  resolveSchema,
  applyDeterministicData,
  collectTextTargets,
  applyTextByIndex,
  missingRequired,
  formatFechaEs
} from '../server/eventDataSchema.js';

let pass = 0, fail = 0;
const ok = (cond, label) => {
  if (cond) { pass++; console.log('  ✅', label); }
  else { fail++; console.error('  ✗', label); }
};

// ---------------------------------------------------------------------------
console.log('\n== resolveSchema ==');
ok(resolveSchema('Boda Tradicional') === resolveSchema('boda'), 'Boda Tradicional → boda');
ok(resolveSchema('Boda Gay (Hombres)') === resolveSchema('boda_gay_h'), 'Boda Gay (Hombres) → boda_gay_h');
ok(resolveSchema('Boda Gay (Mujeres)').fields[2].label.includes('novia 1'), 'Boda Gay (Mujeres) → etiquetas novia 1/2');
ok(resolveSchema('XV Años').fields.some((f) => f.key === 'chambelanes'), 'XV Años → esquema con chambelanes');
ok(resolveSchema('Bautizo').label === 'Bautizo', 'Bautizo → bautizo');
ok(resolveSchema('Baby Shower').label === 'Baby Shower', 'Baby Shower → baby_shower');
ok(resolveSchema('Algo Raro').label === 'Evento', 'Desconocido → genérico');
ok(resolveSchema('Cumpleaños Niño').fields.some((f) => f.key === 'edad'), 'Cumpleaños → campo edad');

// ---------------------------------------------------------------------------
console.log('\n== Invitación sintética (placeholders canónicos) ==');
const INVITACION = `<!DOCTYPE html><html><head><style>.x { color: red; }</style></head><body>
<section class="mod" data-gemini-id="portada-nombre" memory_type="background" memory_usage="protected" memory_source="generated" path="placeholder">
  <h1 memory_type="text" memory_usage="custom" memory_key="portada-nombres">Nombre de la Novia & Nombre del Novio</h1>
  <time datetime="YYYY-MM-DD" memory_key="portada-fecha">Fecha del evento</time>
</section>
<section class="mod" data-gemini-id="padres-padre" memory_type="text" memory_usage="custom">
  <h3 memory_key="padres-b1">Nombre Papá & Nombre Mamá</h3>
  <p>Padres de la novia</p>
  <h3 memory_key="padres-b2">Nombre Papá & Nombre Mamá</h3>
  <p>Padres del novio</p>
</section>
<section class="mod" data-gemini-id="padrinos-oro" memory_type="text" memory_usage="custom">
  <p>Padrinos de alianzas</p>
  <h3 memory_key="padrinos-n">Nombre Padrino & Nombre Madrina</h3>
</section>
<section class="mod" data-gemini-id="ubicacion-ceremonia">
  <address memory_key="ubicacion-dir">Nombre del lugar<br>Calle Principal 123, Ciudad</address>
  <div memory_key="ubicacion-mapa-url"><iframe src="https://www.google.com/maps?q=X&output=embed"></iframe></div>
</section>
<section class="mod" data-gemini-id="countdown-oro" data-countdown-target="YYYY-MM-DDTHH:MM:SS">
  <time datetime="YYYY-MM-DDTHH:MM:SS">Fecha del evento</time>
  <span data-countdown-unit="days">--</span>
</section>
<section class="mod" data-gemini-id="confirmacion-texto">
  <p>Confirma antes del <time datetime="YYYY-MM-DD">DD de mes</time></p>
</section>
</body></html>
`;

const DATA = {
  fecha: '2027-06-12',
  hora: '17:30',
  nombres_novia: 'Ana Gómez',
  nombres_novio: 'Luis Ruiz',
  padres_novia: 'Ricardo Gómez & Elena Sosa',
  padres_novio: 'Mario Ruiz & Carla Díaz',
  padrinos: 'Tía Rosa & Tío Pedro',
  lugar_ceremonia: 'Jardín Los Laureles',
  direccion_ceremonia: 'Camino Real 45, Querétaro',
  fecha_limite: '2027-05-01',
  codigo_vestimenta: 'Formal jardinero'
};

const schema = resolveSchema('Boda Tradicional');
const parsed = parseHTML(INVITACION);
const doc = parsed.document || parsed;
const applied = applyDeterministicData(doc, schema, DATA);
const out = doc.toString ? doc.toString() : doc.documentElement.outerHTML;

console.log('\n== applyDeterministicData ==');
ok(applied.includes('nombres_novia'), 'aplica nombres_novia');
ok(applied.includes('nombres_novio'), 'aplica nombres_novio');
ok(applied.includes('padres_novia') && applied.includes('padres_novio'), 'aplica ambos padres (cola en orden)');
ok(applied.includes('padrinos'), 'aplica padrinos');
ok(applied.includes('lugar_ceremonia'), 'aplica lugar_ceremonia');
ok(applied.includes('direccion_ceremonia'), 'aplica direccion_ceremonia');
ok(applied.includes('fecha_limite'), 'aplica fecha_limite');
ok(applied.includes('fecha') && applied.includes('hora'), 'aplica fecha y hora');

ok(out.includes('Ana Gómez') && out.includes('Luis Ruiz'), 'portada: nombres colocados');
ok(out.includes('Ricardo Gómez') && out.includes('Elena Sosa'), 'padres: primer bloque = padres de la novia');
ok(out.includes('Mario Ruiz') && out.includes('Carla Díaz'), 'padres: segundo bloque = padres del novio');
ok(out.includes('Tía Rosa') && out.includes('Tío Pedro'), 'padrinos: colocados');
ok(out.includes('Jardín Los Laureles'), 'ubicación: nombre del lugar');
ok(out.includes('Camino Real 45, Querétaro'), 'ubicación: dirección');
ok(out.includes('data-countdown-target="2027-06-12T17:30:00"'), 'countdown: target actualizado');
ok(!out.includes('Nombre de la Novia'), 'placeholder de nombres desapareció');
ok(!out.includes('Calle Principal 123'), 'placeholder de dirección desapareció');
ok(out.includes('12 de junio de 2027'), 'fecha formateada en español');
ok(out.includes('>1 de mayo de 2027<'), 'fecha límite en confirmación');
ok(!out.includes('[BASE64') && !out.includes('data:image'), 'sin tocar imágenes');
ok(out.includes('https://www.google.com/maps?q=X&output=embed'), 'iframe de Google Maps intacto');

// ---------------------------------------------------------------------------
console.log('\n== collectTextTargets / applyTextByIndex ==');
const parsed2 = parseHTML(INVITACION);
const doc2 = parsed2.document || parsed2;
const targets = collectTextTargets(doc2);
ok(targets.length >= 5, `indexa nodos editables (${targets.length})`);
ok(!targets.some((t) => t.t.includes('.x {')), 'excluye <style>');
ok(targets.every((t) => t.t.length <= 160), 'textos truncados a 160');

// aplicar por índice sobre el primer target
const first = targets[0];
const changed = applyTextByIndex(doc2, { i: first.i, t: 'TEXTO NUEVO' });
ok(changed, 'applyTextByIndex válido');
ok((doc2.toString ? doc2.toString() : doc2.documentElement.outerHTML).includes('TEXTO NUEVO'), 'texto reemplazado por índice');
ok(applyTextByIndex(doc2, { i: 9999, t: 'X' }) === false, 'índice inválido → false (no lanza)');

// ---------------------------------------------------------------------------
console.log('\n== missingRequired (gate del cliente) ==');
const missingVacios = missingRequired(schema, {});
ok(missingVacios.includes('nombres_novia') && missingVacios.includes('fecha'), 'requeridos vacíos detectados');
const missingPrefill = missingRequired(schema, { fecha: '2027-06-12', hora: '17:00' });
ok(!missingPrefill.includes('fecha') && !missingPrefill.includes('hora'), 'prefill fecha/hora cuentan como dados');
ok(!missingRequired(schema, { nombres_novia: 'Ana', nombres_novio: 'Luis', lugar_ceremonia: 'X', fecha: '1', hora: '1' }).length, 'todo completo → sin faltantes');

// ---------------------------------------------------------------------------
console.log('\n== formatFechaEs ==');
ok(formatFechaEs('2027-06-12') === '12 de junio de 2027', 'formato es-MX');
ok(formatFechaEs('malo') === 'malo', 'entrada inválida no lanza');

// ---------------------------------------------------------------------------
console.log('\n========================================');
console.log(`RESULTADO: ${pass} pasan / ${fail} fallan`);
process.exit(fail > 0 ? 1 : 0);
