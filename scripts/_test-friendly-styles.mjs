// Pruebas de la lógica de los controles en palabras (components/editor/friendlyStyles.ts)
// Se ejecuta con: node --experimental-strip-types scripts/_test-friendly-styles.mjs
import {
  elegirNivel, nivelActual, nivelDisponible, nivelNormal, etiquetasDe, esDelDiseno,
  fijarEstilo, restaurarDiseno, baseDesdeMetricas, parsearRegistro, serializarRegistro,
} from '../components/editor/friendlyStyles.ts';

let fallos = 0;
const check = (ok, nombre) => { if (!ok) fallos++; console.log(`  ${ok ? '✓' : '✗ FALLO'} ${nombre}`); };
const cerca = (a, b, tol = 0.0001) => Math.abs(a - b) <= tol;

// Diseño medido en la vista previa: letra 16px, renglones a 26.4px (1.65),
// sin espacio entre letras, 24px alrededor (1.5 veces la letra).
const METRICAS = { fontSize: 16, lineHeight: 26.4, letterSpacing: NaN, padding: [24, 24, 24, 24] };
const BASE = baseDesdeMetricas(METRICAS);
check(cerca(BASE.lineHeight, 1.65) && BASE.letterSpacing === 0 && BASE.padding.every((p) => cerca(p, 1.5)), 'medidas del diseño convertidas a proporción de la letra (16px → renglón 1.65, alrededor 1.5)');

console.log('\nTamaño de la letra (relativo al diseño):');
check(JSON.stringify(etiquetasDe('fontSize')) === JSON.stringify(['Muy pequeña', 'Pequeña', 'Normal', 'Grande', 'Muy grande']), 'opciones en palabras');
{
  let r = { inline: '', reg: {} };
  check(nivelActual('fontSize', r) === 2, 'al abrir: "Normal" activa');
  let e = elegirNivel('fontSize', 3, { ...r, metricas: METRICAS });
  check(e.css === '1.15', '"Grande" = 15% más grande que el diseño (no un tamaño fijo)');
  check(nivelActual('fontSize', { inline: e.css, reg: e.reg }) === 3, 'queda marcada "Grande"');
  e = elegirNivel('fontSize', 1, { inline: e.css, reg: e.reg });
  check(e.css === '0.9', '"Pequeña" = 10% más pequeña que el DISEÑO, no del valor anterior');
  e = elegirNivel('fontSize', 2, { inline: e.css, reg: e.reg });
  check(e.css === '' && esDelDiseno('fontSize', e.reg), '"Normal" devuelve el texto al diseño (sin nada escrito)');
}

console.log('\nEspacio entre renglones:');
{
  let e = elegirNivel('lineHeight', 3, { inline: '', reg: {}, metricas: METRICAS });
  check(cerca(parseFloat(e.css), 1.87), `"Suelto" = diseño (1.65) + un paso → ${e.css}`);
  e = elegirNivel('lineHeight', 4, { inline: e.css, reg: e.reg });
  check(cerca(parseFloat(e.css), 2.09), `"Muy suelto" = diseño + dos pasos → ${e.css}`);
  check(nivelActual('lineHeight', { inline: e.css, reg: e.reg }) === 4, 'quedan marcadas las palabras elegidas');
  // Aunque la vista previa ya muestre el cambio, las opciones siguen
  // calculándose desde el diseño original.
  e = elegirNivel('lineHeight', 0, { inline: e.css, reg: e.reg, metricas: { ...METRICAS, lineHeight: 33.44 } });
  check(cerca(parseFloat(e.css), 1.21), `"Muy junto" sigue siendo diseño − dos pasos → ${e.css}`);
  e = elegirNivel('lineHeight', 2, { inline: e.css, reg: e.reg });
  check(e.css === '' && esDelDiseno('lineHeight', e.reg), '"Normal" vuelve al diseño');
}
{
  // El diseño ya traía el espacio escrito en el propio elemento.
  let e = elegirNivel('lineHeight', 3, { inline: '1.2', reg: {}, metricas: { ...METRICAS, lineHeight: 19.2 } });
  check(cerca(parseFloat(e.css), 1.42), `diseño con "1.2" escrito: "Suelto" = 1.2 + paso → ${e.css}`);
  e = elegirNivel('lineHeight', 2, { inline: e.css, reg: e.reg });
  check(e.css === '1.2', '"Normal" devuelve EXACTAMENTE el valor que traía el diseño ("1.2")');
  check(elegirNivel('lineHeight', 2, { inline: '1.2', reg: e.reg }).css === '1.2', 'tocar "Normal" sin haber cambiado nada no borra el valor del diseño');
}

console.log('\nEspacio entre letras y espacio alrededor:');
{
  let e = elegirNivel('letterSpacing', 3, { inline: '', reg: {}, metricas: METRICAS });
  check(e.css === '0.1em', `"Muy separadas" → ${e.css}`);
  e = elegirNivel('letterSpacing', 0, { inline: e.css, reg: e.reg });
  check(e.css === '-0.04em', `"Juntas" → ${e.css} (nunca se pisan las letras)`);
  check(nivelActual('letterSpacing', { inline: e.css, reg: e.reg }) === 0, 'queda marcada "Juntas"');
}
{
  let e = elegirNivel('padding', 4, { inline: '', reg: {}, metricas: METRICAS });
  check(e.css === '2.2em 2.2em 2.2em 2.2em', `"Muy amplio" = 1.5 + dos pasos → ${e.css}`);
  e = elegirNivel('padding', 0, { inline: e.css, reg: e.reg });
  check(e.css === '0.8em 0.8em 0.8em 0.8em', `"Muy reducido" = 1.5 − dos pasos → ${e.css}`);
  check(nivelActual('padding', { inline: e.css, reg: e.reg }) === 0, 'queda marcado "Muy reducido"');
  e = elegirNivel('padding', 2, { inline: e.css, reg: e.reg });
  check(e.css === '' && esDelDiseno('padding', e.reg), '"Normal" vuelve al diseño');
}
{
  // Cada lado distinto (un botón con más espacio a los lados).
  let e = elegirNivel('padding', 3, { inline: '', reg: {}, metricas: { ...METRICAS, padding: [16, 48, 16, 48] } });
  check(e.css === '1.35em 3.35em 1.35em 3.35em', `conserva la forma: cada lado crece desde el suyo → ${e.css}`);
}

console.log('\nSin medidas de la vista previa (vista no lista):');
{
  const e = elegirNivel('lineHeight', 3, { inline: '', reg: {}, metricas: null });
  check(cerca(parseFloat(e.css), 1.72), `usa un punto de partida razonable y funciona igual → ${e.css}`);
  const n = baseDesdeMetricas({ fontSize: 16, lineHeight: NaN, letterSpacing: NaN, padding: [NaN, 0, 0, 0] });
  check(n.lineHeight === 1.5 && n.letterSpacing === 0 && n.padding[0] === 0, 'valores imposibles ("normal", elemento oculto) no rompen nada');
  const z = baseDesdeMetricas(null);
  check(z.lineHeight === 1.5 && z.padding.length === 4, 'sin medidas → valores por defecto');
}

console.log('\nOpciones que no cambiarían nada se desactivan:');
{
  const sinEspacio = { inline: '', reg: {}, metricas: { ...METRICAS, padding: [0, 0, 0, 0] } };
  check(!nivelDisponible('padding', 0, {}) && !nivelDisponible('padding', 1, {}) || (!nivelDisponible('padding', 0, { base: baseDesdeMetricas(sinEspacio.metricas) }) && !nivelDisponible('padding', 1, { base: baseDesdeMetricas(sinEspacio.metricas) })), 'texto sin espacio alrededor: "Reducido" y "Muy reducido" no se ofrecen');
  const b = baseDesdeMetricas(sinEspacio.metricas);
  check(nivelDisponible('padding', 3, { base: b }) && nivelDisponible('padding', 4, { base: b }), '…pero "Amplio" y "Muy amplio" sí');
  const bt = baseDesdeMetricas({ ...METRICAS, lineHeight: 14.4 });
  check(nivelDisponible('lineHeight', 0, { base: bt }) && !nivelDisponible('lineHeight', 1, { base: bt }), 'renglones ya muy juntos (0.9): solo se ofrece una opción para juntar (la otra daría lo mismo)');
  check(nivelDisponible('lineHeight', 3, { base: bt }) && nivelDisponible('lineHeight', 4, { base: bt }), '…y las de aflojar siguen disponibles');
  check(nivelActual('lineHeight', { inline: '0.8', reg: { base: bt, orig: { lineHeight: '' } } }) === 0, 'y lo elegido queda marcado en la opción que sí está disponible');
  check(nivelDisponible('fontSize', 0, {}) && nivelDisponible('width', 0, {}), 'controles sin límites: todas disponibles');
}

console.log('\nImagen y mapa (tamaño):');
{
  check(nivelActual('width', { inline: '', reg: {} }) === null, 'imagen sin tamaño escrito: ninguna opción marcada');
  let e = elegirNivel('width', 1, { inline: '', reg: {} });
  check(e.css === '60%' && nivelActual('width', { inline: e.css, reg: e.reg }) === 1, '"Mediana" queda marcada');
  e = restaurarDiseno('width', { inline: e.css, reg: e.reg });
  check(e.css === '' && serializarRegistro(e.reg) === '', 'volver al diseño limpia el registro');
  e = elegirNivel('width', 1, { inline: '320px', reg: {} });
  e = restaurarDiseno('width', { inline: e.css, reg: e.reg });
  check(e.css === '320px', 'si el diseño traía "320px", vuelve a "320px"');
  e = elegirNivel('height', 2, { inline: '', reg: {} });
  check(e.css === '480px', 'alto del mapa "Alto"');
}

console.log('\nColor y grosor (controles de valor concreto):');
{
  let e = fijarEstilo('color', '#ff0000', { inline: '', reg: {} });
  check(!esDelDiseno('color', e.reg), 'al elegir un color queda marcado como cambiado');
  e = restaurarDiseno('color', { inline: e.css, reg: e.reg });
  check(e.css === '' && esDelDiseno('color', e.reg), 'volver al color del diseño');
  e = fijarEstilo('color', '#ff0000', { inline: 'var(--t-a)', reg: {} });
  e = restaurarDiseno('color', { inline: e.css, reg: e.reg });
  check(e.css === 'var(--t-a)', 'si el diseño usaba un color variable, se restaura tal cual');
  e = fijarEstilo('fontWeight', 'bold', { inline: '', reg: { orig: { color: '#111' } } });
  check(e.reg.orig.color === '#111' && e.reg.orig.fontWeight === '', 'cambiar una propiedad no pierde las demás');
  e = fijarEstilo('fontWeight', '', { inline: 'bold', reg: e.reg });
  check(esDelDiseno('fontWeight', e.reg) && !esDelDiseno('color', e.reg), 'dejar el grosor como en el diseño no afecta el color');
  e = restaurarDiseno('backgroundColor', { inline: '#fff', reg: {} });
  check(e.css === '#fff', 'restaurar algo que no se cambió no borra el color del diseño');
}

console.log('\nEl registro se guarda y se recupera (cerrar y volver a abrir el editor):');
{
  let e = elegirNivel('lineHeight', 4, { inline: '', reg: {}, metricas: METRICAS });
  e = elegirNivel('fontSize', 3, { inline: '', reg: e.reg, metricas: METRICAS });
  e = fijarEstilo('color', '#123456', { inline: '', reg: e.reg });
  const guardado = serializarRegistro(e.reg);
  const recuperado = parsearRegistro(guardado);
  // El registro guarda las medidas del diseño y cómo estaba CADA cosa antes de
  // cambiarse (el color original era vacío: el diseño lo define por su clase).
  check(recuperado.base.lineHeight === 1.65 && recuperado.orig.lineHeight === '' && recuperado.orig.fontSize === '' && recuperado.orig.color === '', `se guarda completo (medidas del diseño + cómo estaba cada cosa) → ${guardado}`);
  check(JSON.stringify(recuperado) === JSON.stringify(JSON.parse(guardado)), 'se recupera idéntico');
  // Reabierto: la vista previa ya muestra los cambios del usuario, pero las
  // opciones siguen calculándose desde el diseño original.
  const reabierto = { inline: '2.09', reg: recuperado };
  check(nivelActual('lineHeight', reabierto) === 4, 'sigue marcado "Muy suelto"');
  const aNormal = elegirNivel('lineHeight', 2, { ...reabierto, metricas: { ...METRICAS, lineHeight: 33.44 } });
  check(aNormal.css === '', 'y "Normal" sigue volviendo al diseño');
  check(parsearRegistro('no es json').orig === undefined && parsearRegistro(null).base === undefined && parsearRegistro('{"base":{"lineHeight":"x","padding":[1,2]}}').base === undefined, 'un registro dañado no rompe el editor');
  check(serializarRegistro({}) === '' && serializarRegistro({ base: {}, orig: {} }) === '', 'registro vacío = sin atributo');
  check(nivelNormal('width') === -1 && nivelActual('color', { inline: '', reg: {} }) === null, 'controles sin palabras no marcan nada');
  check(elegirNivel('fontSize', 99, { inline: 'x', reg: { orig: { a: '1' } } }).css === 'x', 'una opción inexistente no cambia nada');
}

console.log(fallos === 0 ? '\nTODO OK' : `\n${fallos} FALLOS`);
process.exit(fallos === 0 ? 0 : 1);
