// Pruebas del lado cliente: a dónde manda el navegador cuando no hay sesión.
// Compila services/noSessionRedirect.ts y lo ejecuta con un "window" y un
// "fetch" simulados para reproducir cada situación.
import { build } from 'esbuild';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { pathToFileURL } from 'url';

const dir = mkdtempSync(join(tmpdir(), 'im-nosession-'));
const salida = join(dir, 'noSessionRedirect.mjs');
await build({
  entryPoints: ['services/noSessionRedirect.ts'],
  bundle: true, format: 'esm', platform: 'neutral',
  define: { 'import.meta.env.VITE_PUBLIC_URL': 'undefined' },
  outfile: salida,
});

let fallos = 0;
const check = (ok, nombre) => { if (!ok) fallos++; console.log(`  ${ok ? '✓' : '✗ FALLO'} ${nombre}`); };

/**
 * Monta un entorno limpio y devuelve { modulo, navegado, peticiones }.
 * `fetchSimulado` recibe (url, init) y devuelve una Response.
 */
async function escenario(fetchSimulado) {
  const navegado = [];
  const peticiones = [];
  globalThis.window = {
    location: {
      origin: 'https://generador.invitacionesmodernas.com',
      href: 'https://generador.invitacionesmodernas.com/editor',
      assign: (url) => navegado.push(url),
    },
  };
  globalThis.fetch = (url, init) => { peticiones.push(String(url)); return fetchSimulado(url, init); };
  // Módulo nuevo en cada escenario (no comparte la promesa resuelta).
  const modulo = await import(pathToFileURL(salida).href + `?t=${Math.random()}`);
  return { modulo, navegado, peticiones };
}

const json = (cuerpo, estado = 200) => new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } });
const PLANES = 'https://app.invitacionesmodernas.com/app/planes';

console.log('Redirección en el navegador:');

{
  const { modulo, navegado } = await escenario(() => json({ login_page_url: PLANES }));
  await modulo.redirectToNoSession();
  check(navegado.length === 1 && navegado[0] === PLANES, `servidor responde la página de planes → va a planes (${navegado})`);
}
{
  // El servidor (o una caché) todavía responde el valor viejo: la regla se
  // aplica otra vez en el cliente.
  const { modulo, navegado } = await escenario(() => json({ login_page_url: '/admin-login' }));
  await modulo.redirectToNoSession();
  check(navegado[0] === PLANES, 'servidor responde "/admin-login" (valor viejo) → va a planes');
}
{
  const { modulo, navegado } = await escenario(() => json({ login_page_url: `${'https://generador.invitacionesmodernas.com'}/admin` }));
  await modulo.redirectToNoSession();
  check(navegado[0] === PLANES, 'servidor responde la URL absoluta de /admin → va a planes');
}
{
  const { modulo, navegado } = await escenario(() => { throw new TypeError('Failed to fetch'); });
  await modulo.redirectToNoSession();
  check(navegado[0] === PLANES, 'sin conexión (fetch falla) → va a planes, nunca se queda atascado');
}
{
  const { modulo, navegado } = await escenario(() => json({ error: 'x' }, 500));
  await modulo.redirectToNoSession();
  check(navegado[0] === PLANES, 'servidor responde error 500 → va a planes');
}
{
  const { modulo, navegado } = await escenario(() => json({}));
  await modulo.redirectToNoSession();
  check(navegado[0] === PLANES, 'servidor responde sin el campo → va a planes');
}
{
  const { modulo, navegado } = await escenario(() => new Response('no es json', { status: 200 }));
  await modulo.redirectToNoSession();
  check(navegado[0] === PLANES, 'servidor responde algo que no es JSON → va a planes');
}
{
  // El servidor no responde: a los 3.5 s se abandona la espera.
  const { modulo, navegado } = await escenario((url, init) => new Promise((_, rechazar) => {
    init.signal.addEventListener('abort', () => rechazar(new DOMException('Aborted', 'AbortError')));
  }));
  const t0 = Date.now();
  await modulo.redirectToNoSession();
  const ms = Date.now() - t0;
  check(navegado[0] === PLANES && ms < 6000, `servidor no responde → a los ${ms} ms va a planes`);
}
{
  const { modulo, navegado } = await escenario(() => json({ login_page_url: '/test' }));
  await modulo.redirectToNoSession();
  check(navegado[0] === '/test', 'destino configurado válido ("/test") → se respeta');
}
{
  // Ya estamos en el destino: no se recarga la página (evita bucle infinito).
  const { modulo, navegado } = await escenario(() => json({ login_page_url: PLANES }));
  window.location.href = PLANES;
  await modulo.redirectToNoSession();
  check(navegado.length === 0, 'ya está en el destino → no recarga (sin bucle)');
}
{
  // Varias peticiones fallan con 401 a la vez: una sola consulta al servidor,
  // un solo salto.
  const { modulo, navegado, peticiones } = await escenario(() => json({ login_page_url: PLANES }));
  await Promise.all([modulo.redirectToNoSession(), modulo.redirectToNoSession(), modulo.redirectToNoSession()]);
  check(peticiones.length === 1 && navegado.length === 1, `3 fallos de sesión a la vez → 1 consulta y 1 salto (${peticiones.length}, ${navegado.length})`);
}
{
  const { modulo, peticiones } = await escenario(() => json({ login_page_url: PLANES }));
  await modulo.redirectToNoSession();
  check(peticiones[0] === 'https://generador.invitacionesmodernas.com/api/config/public', `consulta la configuración en el propio sitio (${peticiones[0]})`);
}

delete globalThis.window;
delete globalThis.fetch;
rmSync(dir, { recursive: true, force: true });
console.log(fallos === 0 ? '\nTODO OK — el navegador nunca queda atascado ni va a /admin' : `\n${fallos} FALLOS`);
process.exit(fallos === 0 ? 0 : 1);
