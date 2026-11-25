// Pruebas del SERVIDOR para el destino sin sesión (lo que antes se probó a mano):
// corrección al arrancar, guardado desde el admin y valor viejo restaurado.
// Levanta sola un servidor de prueba con una copia temporal de la base de datos.
//
//   node scripts/_test-no-session-server.mjs
import Database from 'better-sqlite3';
import { iniciarServidorDePrueba } from './_test-helpers/servidor-de-prueba.mjs';
import { NO_SESSION_URL } from '../server/noSessionRedirect.js';

let fallos = 0;
const check = (ok, nombre) => { if (!ok) fallos++; console.log(`  ${ok ? '✓' : '✗ FALLO'} ${nombre}`); };

const servidor = await iniciarServidorDePrueba();
try {
  const guardarDestino = (valor) => fetch(`${servidor.baseUrl}/api/admin/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${servidor.tokenAdmin}` },
    body: JSON.stringify({ login_page_url: valor }),
  });
  const configuracionAdmin = async () => {
    const r = await fetch(`${servidor.baseUrl}/api/admin/config`, { headers: { Authorization: `Bearer ${servidor.tokenAdmin}` } });
    return (await r.json()).login_page_url;
  };
  const publico = async () => (await (await fetch(`${servidor.baseUrl}/api/config/public`)).json()).login_page_url;
  const leerBase = (sql) => {
    const bd = new Database(servidor.dbFile, { readonly: true });
    try { return bd.prepare(sql).get(); } finally { bd.close(); }
  };
  const guardado = () => leerBase('SELECT login_page_url FROM admin_config WHERE id = 1').login_page_url;

  console.log('Al arrancar (la base traía "/admin-login", como producción):');
  check((await publico()) === NO_SESSION_URL, `/api/config/public responde la página de planes (${await publico()})`);
  check(guardado() === NO_SESSION_URL, 'el valor viejo "/admin-login" se corrigió solo en la base de datos');

  console.log('\nEl administrador intenta guardar un destino prohibido:');
  for (const valor of ['/admin-login', '/admin', 'https://generador.invitacionesmodernas.com/admin-login', '/', '/editor', '/test', '']) {
    const r = await guardarDestino(valor);
    check(r.ok && guardado() === NO_SESSION_URL, `"${valor}" → se guarda la página de planes`);
  }

  console.log('\nEl administrador guarda un destino válido:');
  check((await guardarDestino('/planes')).ok && guardado() === '/planes', '"/planes" se guarda tal cual');
  check((await publico()) === '/planes', 'y el público lo recibe tal cual');
  check((await guardarDestino('https://digital.invitacionesmodernas.com/es-us/')).ok, 'también una dirección de otro sitio');
  await guardarDestino('/planes');

  console.log('\nUn respaldo viejo vuelve a meter "/admin-login" directo en la base de datos:');
  const bdVieja = new Database(servidor.dbFile);
  bdVieja.prepare("UPDATE admin_config SET login_page_url = '/admin-login' WHERE id = 1").run();
  bdVieja.close();
  check((await publico()) === NO_SESSION_URL, '/api/config/public sigue respondiendo la página de planes');
  check((await configuracionAdmin()) === NO_SESSION_URL, 'y la configuración del admin también');
} finally {
  await servidor.detener();
}

console.log(fallos === 0 ? '\nTODO OK — el servidor nunca entrega /admin como destino' : `\n${fallos} FALLOS`);
process.exit(fallos === 0 ? 0 : 1);
