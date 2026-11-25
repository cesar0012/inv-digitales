/**
 * A dónde se manda a quien no tiene sesión (o su sesión expiró), a quien la
 * cierra y a quien tiene sesión pero ningún plan: siempre al sitio de Laravel.
 *
 * La regla vive en server/noSessionRedirect.js, compartida con el servidor:
 * nunca una página de administración del generador ni su antigua página de
 * prueba (/test). TODAS esas redirecciones pasan por aquí.
 */
import { NO_SESSION_URL, destinoSinSesionSeguro } from '../server/noSessionRedirect.js';

export { NO_SESSION_URL, LOGOUT_URL, SITIO_LARAVEL, esDestinoSinSesionProhibido, destinoSinSesionSeguro } from '../server/noSessionRedirect.js';

// Lo que se explica a la persona cuando una petición falla porque ya no tiene
// sesión: las pantallas muestran el mensaje del error en un aviso. El servidor
// atiende primero la cookie de sesión, así que iniciar sesión en otra pestaña
// basta para poder guardar desde la que se quedó abierta.
export const MENSAJE_SIN_SESION = 'Tu sesión venció. Inicia sesión de nuevo para continuar. Si tienes cambios sin guardar: deja esta pestaña abierta, inicia sesión en otra pestaña y vuelve a guardar aquí.';

const apiBase = import.meta.env.VITE_PUBLIC_URL || window.location.origin.replace(':3000', ':3001');

// Varias peticiones pueden fallar con 401 a la vez: se resuelve una sola vez.
let promesaDestino: Promise<string> | null = null;

const resolverDestino = async (): Promise<string> => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 3500);
  try {
    const res = await fetch(`${apiBase}/api/config/public`, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const config = await res.json();
    // El servidor ya sanea el valor; se aplica la regla otra vez por si la
    // respuesta viniera de una caché o de una versión anterior.
    return destinoSinSesionSeguro(config?.login_page_url, window.location.origin);
  } finally {
    clearTimeout(timer);
  }
};

/** Destino para alguien sin sesión. Nunca falla: ante cualquier error usa los planes de la app. */
export const getNoSessionUrl = (): Promise<string> => {
  if (!promesaDestino) promesaDestino = resolverDestino().catch(() => NO_SESSION_URL);
  return promesaDestino;
};

// Varios servicios pueden detectar la falta de sesión a la vez: el salto se
// pide una sola vez.
let saltoIniciado = false;

/**
 * Sale del generador hacia una dirección de Laravel (por ejemplo, al cerrar
 * sesión). Manda sobre cualquier otra salida: al cerrar la sesión, la
 * protección de las páginas privadas también intenta llevar a la persona a
 * los planes, y pisaría este destino.
 */
export const salirDelGenerador = (url: string): void => {
  saltoIniciado = true;
  window.location.assign(url);
};

/** Lleva a quien no tiene sesión a su destino. Sin bucles: si ya está ahí, no recarga. */
export const redirectToNoSession = async (): Promise<void> => {
  if (saltoIniciado) return;
  const url = await getNoSessionUrl();
  // Otro llamado pudo iniciar el salto mientras esperábamos la respuesta.
  if (saltoIniciado) return;
  saltoIniciado = true;
  if (url === window.location.href) return;
  window.location.assign(url);
};
