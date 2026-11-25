// Prueba en navegador real (Chromium): a dónde llega la gente cuando no tiene
// sesión, cuando la cierra o cuando no tiene ningún plan. Nadie debe caer en
// las páginas de administración ni en la antigua página de acceso "/test":
// todo lleva al sitio de Laravel.
// Levanta sola un servidor de prueba con una copia temporal de la base de datos
// (ver _test-helpers/servidor-de-prueba.mjs). Requiere `npm run build` previo.
//
//   node scripts/_test-redirects-browser.mjs
import puppeteer from 'puppeteer';
import { iniciarServidorDePrueba } from './_test-helpers/servidor-de-prueba.mjs';

// Lo que se espera, escrito aquí a propósito (no tomado del código): el sitio
// de Laravel, donde están las cuentas y los planes.
const LARAVEL = 'https://app.invitacionesmodernas.com';
const PLANES = `${LARAVEL}/app/planes`;

let fallos = 0;
const check = (ok, nombre) => { if (!ok) fallos++; console.log(`  ${ok ? '✓' : '✗ FALLO'} ${nombre}`); };

const servidor = await iniciarServidorDePrueba();
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'], protocolTimeout: 60000 });
try {
  const page = await browser.newPage();
  page.on('dialog', (d) => d.dismiss().catch(() => {}));

  // El sitio de Laravel es externo: se intercepta para no salir a internet y
  // para saber con certeza que el navegador fue llevado ahí.
  const llegadas = { planes: 0, laravel: 0 };
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (req.url().startsWith(LARAVEL)) {
      if (req.url().startsWith(PLANES)) llegadas.planes++; else llegadas.laravel++;
      req.respond({ status: 200, contentType: 'text/html', body: '<html><body><h1>Sitio de Laravel</h1></body></html>' });
    } else {
      req.continue();
    }
  });
  // Lo que responde el servidor de prueba cuando se pide algo retirado.
  const respuestas = [];
  page.on('response', (res) => {
    const u = res.url();
    if (/\/api\/auth\/login$/.test(u) || /\/test(\?|$)/.test(u)) respuestas.push({ ruta: u.replace(servidor.baseUrl, ''), estado: res.status(), ubicacion: res.headers()['location'] || '' });
  });

  const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
  // Las cookies se manejan siempre por la dirección del servidor de prueba:
  // al limpiar, la página puede estar en otro sitio (el de Laravel).
  const limpiarCookies = async () => page.deleteCookie(...(await page.cookies(servidor.baseUrl)));
  const conSesion = (valor) => page.setCookie({ name: 'auth_token', value: valor, domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' });
  async function abrir(ruta, ms = 5000) {
    llegadas.planes = 0; llegadas.laravel = 0;
    await limpiarCookies();
    await page.goto(servidor.baseUrl + ruta, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await esperar(ms);
    return { url: page.url(), ...llegadas };
  }
  const enLaravel = (url) => url.startsWith(LARAVEL);
  const enAdmin = (url) => /generador\.invitacionesmodernas\.com\/admin|localhost:3001\/admin/.test(url);

  console.log('Sin sesión, entrando a páginas privadas:');
  for (const ruta of ['/', '/editor', '/editor/invitacion_1794635032631.html']) {
    const r = await abrir(ruta);
    const aPlanes = r.url.startsWith(PLANES);
    check(aPlanes && r.planes >= 1 && !enAdmin(r.url), `${ruta} → ${aPlanes ? 'planes de Laravel' : r.url}`);
  }

  console.log('Con una sesión vencida en el navegador (cookie que el servidor ya no reconoce):');
  {
    // Primero se limpia la cookie y LUEGO se coloca la vencida: la navegación
    // siguiente debe conservarla para que sea una prueba real.
    await limpiarCookies();
    await conSesion('123|1700000000|firma-vencida');
    const vencida = (await page.cookies(servidor.baseUrl)).filter((c) => c.name === 'auth_token' && c.value.includes('firma-vencida'));
    check(vencida.length === 1, 'la prueba sí lleva una cookie auth_token vencida');
    llegadas.planes = 0;
    await page.goto(servidor.baseUrl + '/editor', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await esperar(5000);
    const aPlanes = page.url().startsWith(PLANES);
    check(aPlanes && llegadas.planes >= 1, `token vencido en /editor → ${aPlanes ? 'planes de Laravel' : page.url()}`);
  }

  console.log('La antigua página de acceso de prueba está retirada:');
  {
    // Con sesión: antes mostraba el acceso de prueba y el token del usuario.
    await limpiarCookies();
    await conSesion(servidor.token);
    respuestas.length = 0;
    llegadas.laravel = 0;
    await page.goto(servidor.baseUrl + '/test', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await esperar(2000);
    const texto = await page.evaluate(() => document.body.innerText).catch(() => '');
    check(enLaravel(page.url()) && llegadas.laravel >= 1, `/test lleva al sitio de Laravel (${page.url()})`);
    check(!/Sesión Activa|Generar código SSO|Token \(solo para pruebas\)/.test(texto), 'y ya no muestra el acceso de prueba ni el token');
    const r = respuestas[0];
    check(!!r && r.estado === 302 && r.ubicacion === `${LARAVEL}/`, `el servidor la redirige (302 → ${LARAVEL}/)`);
  }

  console.log('El acceso con correo y contraseña está retirado (solo existe el del administrador):');
  {
    const r = await fetch(`${servidor.baseUrl}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'test@invitacionesmodernas.com', password: 'lo-quiera' }) });
    const cuerpo = await r.json().catch(() => ({}));
    const cookie = r.headers.get('set-cookie') || '';
    check(r.status === 410 && !/auth_token=/.test(cookie), `/api/auth/login responde ${r.status} y no crea sesión`);
    check(cuerpo.url === `${LARAVEL}/`, 'y dice a dónde ir a iniciar sesión');
    // El acceso del administrador sigue existiendo.
    const a = await fetch(`${servidor.baseUrl}/api/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'no-existe@x.com', password: 'x' }) });
    check(a.status !== 410 && a.status !== 404, `/api/admin/login sigue activo (responde ${a.status})`);
  }

  console.log('Cerrar sesión en el generador:');
  {
    await limpiarCookies();
    await conSesion(servidor.token);
    llegadas.laravel = 0; llegadas.planes = 0;
    await page.goto(servidor.baseUrl + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Salir'), { timeout: 30000 }).catch(() => {});
    const tapoSalir = await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Salir'); if (!b) return false; b.click(); return true; });
    await esperar(3000);
    const cookies = (await page.cookies(servidor.baseUrl)).filter((c) => c.name === 'auth_token');
    check(tapoSalir && enLaravel(page.url()) && llegadas.laravel >= 1 && !page.url().startsWith(PLANES), `"Salir" lleva al sitio de Laravel (${page.url()})`);
    check(cookies.length === 0, 'y la sesión del generador queda cerrada (sin cookie)');
    check(!/\/test\b/.test(page.url()) && !enAdmin(page.url()), 'no pasa por /test ni por /admin');
  }

  console.log('Con sesión pero sin ningún plan:');
  {
    await limpiarCookies();
    await conSesion(servidor.tokenSinPlan);
    llegadas.planes = 0;
    await page.goto(servidor.baseUrl + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await esperar(5000);
    const aPlanes = page.url().startsWith(PLANES);
    const sigueConSesion = (await page.cookies(servidor.baseUrl)).some((c) => c.name === 'auth_token');
    check(aPlanes && llegadas.planes >= 1, `el panel lleva a los planes de Laravel (${page.url()})`);
    check(sigueConSesion, 'sin cerrarle la sesión (podrá volver cuando tenga un plan)');
  }

  console.log('Si la entrada desde Laravel falla, tampoco se ofrece la página de prueba:');
  {
    // Fallo dentro de la aplicación (se llega desde el propio generador).
    await limpiarCookies();
    await conSesion(servidor.token);
    await page.goto(servidor.baseUrl + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.evaluate(() => {
      window.history.pushState({}, '', '/sso/consume?code=codigo-que-no-sirve');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await page.waitForFunction(() => /Error de autenticación/.test(document.body.innerText), { timeout: 45000 }).catch(() => {});
    const texto = await page.evaluate(() => document.body.innerText).catch(() => '');
    check(!/página de prueba/i.test(texto), 'no aparece "Ir a página de prueba"');
    const enlace = await page.evaluate(() => { const a = [...document.querySelectorAll('a')].find((x) => /invitacionesmodernas\.com/.test(x.textContent)); return a ? a.href : ''; });
    check(enlace === `${LARAVEL}/`, `y el camino de vuelta es el sitio de Laravel (${enlace})`);
    // Fallo antes de entrar (dirección sin código): el servidor manda al panel,
    // y si no hubiera sesión, a los planes. Nunca a /test.
    respuestas.length = 0;
    await page.goto(servidor.baseUrl + '/sso/consume', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await esperar(2500);
    const alPanel = new URL(page.url()).pathname === '/' && !enLaravel(page.url());
    check(alPanel && !respuestas.some((r) => /\/test/.test(r.ubicacion)), `/sso/consume sin código con sesión → vuelve al panel (${page.url().replace(servidor.baseUrl, '')})`);
    await limpiarCookies();
    llegadas.planes = 0;
    await page.goto(servidor.baseUrl + '/sso/consume', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await esperar(5000);
    check(page.url().startsWith(PLANES) && llegadas.planes >= 1, `/sso/consume sin código sin sesión → planes de Laravel (${page.url()})`);
  }

  console.log('Acceso del administrador (escribiendo la dirección a mano):');
  {
    const r = await abrir('/admin', 3000);
    check(/\/admin-login$/.test(r.url), `/admin sin sesión de admin → ${r.url.replace(servidor.baseUrl, '')} (su propia pantalla de acceso)`);
    const titulo = await page.evaluate(() => document.body.innerText.includes('Panel de Administración'));
    check(titulo, 'muestra "Panel de Administración"');
  }
} finally {
  await browser.close();
  await servidor.detener();
}

console.log(fallos === 0 ? '\nTODO OK — entrar, salir y contratar siempre pasan por Laravel; nadie cae en /admin ni en /test' : `\n${fallos} FALLOS`);
process.exit(fallos === 0 ? 0 : 1);
