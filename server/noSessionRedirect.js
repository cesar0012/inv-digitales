/**
 * ============================================================================
 * DESTINO SIN SESIÓN — única fuente de verdad
 * ============================================================================
 * A dónde se manda a un visitante que no tiene sesión o cuyo token expiró.
 *
 * REGLA DE NEGOCIO: ninguna redirección puede terminar en las páginas de
 * administración del generador (/admin, /admin-login) ni en su antigua página
 * de acceso de prueba (/test). Esas páginas solo se alcanzan escribiendo la
 * dirección a mano. Si el destino configurado en el admin apunta ahí, se
 * sustituye por la página de planes de la app.
 *
 * Nadie inicia sesión desde el generador: la sesión la crea Laravel. Todo lo
 * que sea entrar, salir o contratar un plan lleva al sitio de Laravel.
 *
 * Este módulo se usa en el servidor y se empaqueta en el cliente, así que no
 * puede depender de APIs de Node ni del navegador: recibe el origen propio.
 * ============================================================================
 */

// El sitio de Laravel, donde están las cuentas y los planes.
export const SITIO_LARAVEL = 'https://app.invitacionesmodernas.com';
// A dónde se lleva a quien no tiene sesión (o la tiene vencida), y a quien
// tiene sesión pero ningún plan.
export const NO_SESSION_URL = `${SITIO_LARAVEL}/app/planes`;
// A dónde se lleva a quien cierra sesión en el generador.
export const LOGOUT_URL = `${SITIO_LARAVEL}/`;

// Hosts que son "el generador" aunque no se conozca el origen propio.
const OWN_HOSTNAMES = ['generador.invitacionesmodernas.com'];

const esRutaProhibida = (ruta) =>
  // Área de administración: prohibida siempre
  /^\/admin(?:$|[-/_])/i.test(ruta)
  // Antigua página de acceso de prueba: ya no existe
  || /^\/test(?:$|[/])/i.test(ruta)
  // Páginas privadas: sin sesión rebotarían de vuelta aquí (bucle infinito)
  || ruta === '/' || /^\/editor(?:$|[/])/i.test(ruta);

// Una dirección escrita con caracteres codificados ("/%61dmin-login") se
// interpreta igual que "/admin-login": se revisa ya decodificada.
const decodificarRuta = (ruta) => {
  let resultado = ruta;
  for (let i = 0; i < 3; i++) {
    let siguiente;
    try { siguiente = decodeURIComponent(resultado); } catch { break; }
    if (siguiente === resultado) break;
    resultado = siguiente;
  }
  return resultado;
};

/**
 * ¿El destino está prohibido para alguien sin sesión?
 * Devuelve true si está vacío, no es una ruta/URL válida, o apunta a la
 * administración o a una página privada del propio generador.
 *
 * @param {string} valor    destino configurado (ruta relativa o URL absoluta)
 * @param {string} [origenPropio]  p.ej. "https://generador.invitacionesmodernas.com"
 */
export function esDestinoSinSesionProhibido(valor, origenPropio) {
  const s = String(valor ?? '').trim();
  if (!s) return true;

  // Solo rutas del propio sitio ("/planes") o URL http(s) absolutas.
  const esRuta = /^\/(?!\/)/.test(s);
  const esAbsoluta = /^https?:\/\//i.test(s);
  if (!esRuta && !esAbsoluta) return true;

  let u;
  try { u = new URL(s, origenPropio || `https://${OWN_HOSTNAMES[0]}`); }
  catch { return true; }

  let esPropio = esRuta;
  if (!esPropio && origenPropio) {
    try { esPropio = new URL(origenPropio).hostname.toLowerCase() === u.hostname.toLowerCase(); } catch { esPropio = false; }
  }
  if (!esPropio) esPropio = OWN_HOSTNAMES.includes(u.hostname.toLowerCase());

  return esPropio && esRutaProhibida(decodificarRuta(u.pathname));
}

/**
 * Destino seguro para alguien sin sesión: el configurado, salvo que esté
 * prohibido, en cuyo caso la página de planes de la app. Nunca devuelve una
 * página de administración del generador.
 */
export function destinoSinSesionSeguro(valor, origenPropio) {
  return esDestinoSinSesionProhibido(valor, origenPropio) ? NO_SESSION_URL : String(valor ?? '').trim();
}
