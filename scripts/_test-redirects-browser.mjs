// Prueba en navegador real (Chromium): a dónde llega alguien SIN sesión.
// Levanta sola un servidor de prueba con una copia temporal de la base de datos
// (ver _test-helpers/servidor-de-prueba.mjs). Requiere `npm run build` previo.
//
//   node scripts/_test-redirects-browser.mjs
import puppeteer from 'puppeteer';
import { iniciarServidorDePrueba } from './_test-helpers/servidor-de-prueba.mjs';

const PLANES = 'https://app.invitacionesmodernas.com/app/planes';

let fallos = 0;
const check = (ok, nombre) => { if (!ok) fallos++; console.log(`  ${ok ? '✓' : '✗ FALLO'} ${nombre}`); };

const servidor = await iniciarServidorDePrueba();
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();

  // La página de planes es externa: se intercepta para no salir a internet y
  // para saber con certeza que el navegador fue llevado ahí.
  let llegadasAPlanes = 0;
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (req.url().startsWith(PLANES)) {
      llegadasAPlanes++;
      req.respond({ status: 200, contentType: 'text/html', body: '<html><body><h1 id="planes">Planes</h1></body></html>' });
    } else {
      req.continue();
    }
  });

  const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
  // Las cookies se manejan siempre por la dirección del servidor de prueba:
  // al limpiar, la página puede estar en otro sitio (la de planes).
  const limpiarCookies = async () => page.deleteCookie(...(await page.cookies(servidor.baseUrl)));
  async function abrir(ruta, ms = 5000, borrarCookies = true) {
    llegadasAPlanes = 0;
    if (borrarCookies) await limpiarCookies();
    await page.goto(servidor.baseUrl + ruta, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await esperar(ms);
    return { url: page.url(), llegadas: llegadasAPlanes };
  }

  console.log('Sin sesión, entrando a páginas privadas:');
  for (const ruta of ['/', '/editor', '/editor/invitacion_1794635032631.html']) {
    const r = await abrir(ruta);
    const enPlanes = r.url.startsWith(PLANES);
    const enAdmin = /\/admin(-login)?(\?|$)/.test(r.url);
    check(enPlanes && r.llegadas >= 1 && !enAdmin, `${ruta} → ${enPlanes ? 'página de planes' : r.url}`);
  }

  console.log('Con una sesión vencida en el navegador (cookie que el servidor ya no reconoce):');
  {
    // Primero se limpia la cookie y LUEGO se coloca la vencida: la navegación
    // siguiente debe conservarla para que sea una prueba real.
    await limpiarCookies();
    await page.setCookie({ name: 'auth_token', value: '123|1700000000|firma-vencida', domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' });
    const conSesionVencida = (await page.cookies(servidor.baseUrl)).filter((c) => c.name === 'auth_token' && c.value.includes('firma-vencida'));
    check(conSesionVencida.length === 1, 'la prueba sí lleva una cookie auth_token vencida');
    const r = await abrir('/editor', 5000, false);
    check(r.url.startsWith(PLANES) && r.llegadas >= 1, `token vencido en /editor → ${r.url.startsWith(PLANES) ? 'página de planes' : r.url}`);
  }

  console.log('Acceso del administrador (escribiendo la dirección a mano):');
  {
    const r = await abrir('/admin', 3000);
    check(/\/admin-login$/.test(r.url), `/admin sin sesión de admin → ${r.url.replace(servidor.baseUrl, '')} (su propia pantalla de acceso)`);
    const titulo = await page.evaluate(() => document.body.innerText.includes('Panel de Administración'));
    check(titulo, 'muestra "Panel de Administración"');
  }
  console.log('Página pública de inicio de sesión de usuarios:');
  {
    const r = await abrir('/test', 3000);
    check(r.url.replace(servidor.baseUrl, '') === '/test' && r.llegadas === 0, `/test → sigue siendo accesible (${r.url.replace(servidor.baseUrl, '')})`);
  }
} finally {
  await browser.close();
  await servidor.detener();
}

console.log(fallos === 0 ? '\nTODO OK — nadie sin sesión cae en /admin' : `\n${fallos} FALLOS`);
process.exit(fallos === 0 ? 0 : 1);
