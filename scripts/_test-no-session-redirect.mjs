// Pruebas del destino sin sesión: ningún caso puede terminar en /admin
import { NO_SESSION_URL, esDestinoSinSesionProhibido, destinoSinSesionSeguro } from '../server/noSessionRedirect.js';

const ORIGEN = 'https://generador.invitacionesmodernas.com';
let fallos = 0;
const check = (ok, nombre) => { if (!ok) fallos++; console.log(`  ${ok ? '✓' : '✗ FALLO'} ${nombre}`); };

// Debe terminar en la página de planes (prohibido o vacío)
for (const [valor, nombre] of [
  ['/admin-login', "ruta vieja '/admin-login'"],
  ['/admin', "'/admin'"],
  ['/admin/', "'/admin/'"],
  ['/admin/usuarios', "'/admin/usuarios'"],
  ['/admin-login?x=1', "'/admin-login?x=1'"],
  [`${ORIGEN}/admin-login`, 'URL absoluta a /admin-login del generador'],
  [`${ORIGEN}/admin`, 'URL absoluta a /admin del generador'],
  ['', 'vacío'],
  [null, 'null'],
  [undefined, 'undefined'],
  ['   ', 'solo espacios'],
  ['/', "dashboard '/' (privado: haría bucle)"],
  ['/editor', "'/editor' (privado: haría bucle)"],
  ['/editor/invitacion_1.html', "'/editor/x' (privado)"],
  ['javascript:alert(1)', 'javascript: (no es ruta ni URL)'],
  ['planes', 'texto sin barra inicial'],
  ['//otro-sitio.com/admin', 'ruta relativa al protocolo'],
  ['ftp://x.com/a', 'otro protocolo'],
  // Escritas de otra forma, pero el navegador y la aplicación las interpretan igual
  ['/%61dmin-login', "codificada '/%61dmin-login' (es /admin-login)"],
  ['/admin%2Dlogin', "codificada '/admin%2Dlogin' (es /admin-login)"],
  ['/%61dmin', "codificada '/%61dmin' (es /admin)"],
  ['/admin%2Fusuarios', "codificada '/admin%2Fusuarios'"],
  [`${ORIGEN}/%61dmin-login`, 'URL absoluta codificada a /admin-login'],
  ['/x/../admin-login', "'/x/../admin-login' (se normaliza a /admin-login)"],
  ['/ADMIN-LOGIN', "'/ADMIN-LOGIN' (mayúsculas)"],
  ['/Editor/x.html', "'/Editor/x.html' (privado, mayúsculas)"],
  // La antigua página de acceso de prueba está retirada
  ['/test', "'/test' (antigua página de acceso, retirada)"],
  ['/test/', "'/test/'"],
  ['/%74est', "codificada '/%74est' (es /test)"],
  [`${ORIGEN}/test`, 'URL absoluta a /test'],
]) {
  check(destinoSinSesionSeguro(valor, ORIGEN) === NO_SESSION_URL, `${nombre} → planes`);
}

// Debe respetarse tal cual
for (const [valor, nombre] of [
  [NO_SESSION_URL, 'la página de planes'],
  ['https://app.invitacionesmodernas.com/app/planes', 'planes de la app (con https://)'],
  ['https://digital.invitacionesmodernas.com/es-us/', 'inicio del sitio digital'],
  ['/planes', 'ruta pública propia'],
  ['/testing', "ruta '/testing' (pública: solo empieza parecido a /test)"],
  ['/administracion', "ruta que empieza parecido pero no es admin"],
  ['https://otro-sitio.com/admin', '/admin de OTRO sitio (no es el generador)'],
  ['https://app.invitacionesmodernas.com/admin', '/admin de la app Laravel (no es el generador)'],
  ['/catalogo/xv%2Danos/invitacion-1', 'ruta pública del catálogo escrita codificada'],
  ['/administracion-de-eventos', 'ruta pública que solo empieza parecido'],
]) {
  check(destinoSinSesionSeguro(valor, ORIGEN) === valor.trim(), `${nombre} → se respeta`);
}

// Sin conocer el origen propio (base de datos al arrancar)
check(destinoSinSesionSeguro('/admin-login') === NO_SESSION_URL, "sin origen conocido: '/admin-login' → planes");
check(destinoSinSesionSeguro('/planes') === '/planes', 'sin origen conocido: /planes → se respeta');
// En local (otro origen): una ruta relativa sigue siendo "el propio sitio"
check(destinoSinSesionSeguro('/admin-login', 'http://localhost:3001') === NO_SESSION_URL, 'en local: /admin-login → planes');
check(destinoSinSesionSeguro('http://localhost:3001/admin', 'http://localhost:3001') === NO_SESSION_URL, 'en local: URL absoluta a /admin local → planes');

console.log(fallos === 0 ? '\nTODO OK — ningún caso termina en /admin' : `\n${fallos} FALLOS`);
process.exit(fallos === 0 ? 0 : 1);
