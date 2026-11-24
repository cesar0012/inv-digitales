// Prueba en navegador real (Chromium) de los cambios en tiempo real del editor:
// escribir letra por letra, tocar opciones, cambiar un color y ocultar o mostrar
// sin que la vista previa se recargue ni pierda la posición; y que lo escrito se
// guarde. Se usa una invitación REAL de varios MB (si está en esta máquina).
// Levanta sola un servidor de prueba con una copia temporal de la base de datos
// (ver _test-helpers/servidor-de-prueba.mjs). Requiere `npm run build` previo.
//
//   node scripts/_test-editor-tiempo-real.mjs
import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import { join } from 'path';
import { iniciarServidorDePrueba, IDS_PRUEBA } from './_test-helpers/servidor-de-prueba.mjs';

const servidor = await iniciarServidorDePrueba();
// Con un aviso abierto la página no responde: si algo falla, que la prueba se
// detenga con un error claro en vez de quedarse esperando.
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'], protocolTimeout: 60000 });
let fallos = 0;
const check = (ok, nombre) => { if (!ok) fallos++; console.log(`  ${ok ? '✓' : '✗ FALLO'} ${nombre}`); };

async function ejecutar() {
  const BASE = servidor.baseUrl;
  const page = await browser.newPage();
  const erroresJs = [];
  page.on('pageerror', (e) => erroresJs.push(String(e).slice(0, 300)));
  // "¿Salir del sitio?" al cambiar de página con cambios sin guardar: se acepta.
  // Cualquier otro aviso se cierra (con uno abierto, la página no responde).
  page.on('dialog', (d) => {
    if (d.type() !== 'beforeunload') avisos.push(`${d.type()}: ${d.message()}`);
    (d.type() === 'beforeunload' ? d.accept() : d.dismiss()).catch(() => {});
  });
  page.on('console', (m) => { if (m.type() === 'error') erroresDeConsola.push(m.text().slice(0, 200)); });
  await page.setCookie({ name: 'auth_token', value: servidor.token, domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' });
  // Se omite la guía de primera visita para poder usar el editor directamente.
  await page.evaluateOnNewDocument(() => { try { localStorage.setItem('im_editor_onboarded', '1'); } catch {} });
  await page.setViewport({ width: 1366, height: 900 });

  const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
  const VISTA = 'iframe[title="Vista previa de la invitación"]';
  const CAMPO = '.w-80 textarea';                 // el campo de texto del elemento desplegado

  /** Estado del documento que la persona está viendo. */
  const vista = () => page.evaluate((sel) => {
    const f = document.querySelector(sel);
    return { viva: f.contentWindow.__pruebaViva === true, scrollY: Math.round(f.contentWindow.scrollY), alto: f.contentDocument.documentElement.scrollHeight };
  }, VISTA);
  const marcarVista = () => page.evaluate((sel) => { document.querySelector(sel).contentWindow.__pruebaViva = true; }, VISTA);
  const textoEnVista = (id) => page.evaluate(({ sel, id }) => {
    const d = document.querySelector(sel).contentDocument;
    const el = d && d.querySelector(`[data-gemini-id="${id}"]`);
    return el ? el.textContent : null;
  }, { sel: VISTA, id });
  const irA = (y) => page.evaluate(({ sel, y }) => { document.querySelector(sel).contentWindow.scrollTo(0, y); }, { sel: VISTA, y });
  const tocarCarta = (texto) => page.evaluate((texto) => {
    const b = [...document.querySelectorAll('.w-80 button')].find((x) => x.innerText.includes(texto) && x.innerText.length < 80);
    if (!b) return false;
    b.click();
    return true;
  }, texto);
  /** Deja el campo de texto listo para escribir encima de lo que hay. */
  const prepararCampo = () => page.evaluate((sel) => { const t = document.querySelector(sel); t.focus(); t.select(); }, CAMPO);
  const valorDelCampo = () => page.evaluate((sel) => { const t = document.querySelector(sel); return t ? t.value : null; }, CAMPO);
  /** El valor del campo de texto, solo si además tiene el foco (si no, null). */
  const campoEsta = () => page.evaluate((sel) => {
    const t = document.querySelector(sel);
    return !!t && document.activeElement === t ? t.value : null;
  }, CAMPO);
  /** Lo que la página avisa (los avisos se cierran para no trabar la prueba). */
  const avisos = [];
  const erroresDeConsola = [];
  // Las peticiones de guardar, con su respuesta: para entender un fallo.
  const peticiones = [];
  page.on('request', (r) => { if (/\/api\/invitations\/999999\/[^/]+$/.test(r.url()) && r.method() === 'PUT') peticiones.push({ t: Date.now(), metodo: r.method(), ruta: r.url().replace(BASE, ''), estado: 'enviando' }); });
  page.on('requestfailed', (r) => { const p = peticiones.find((x) => x.ruta === r.url().replace(BASE, '') && x.estado === 'enviando'); if (p) p.estado = 'falló: ' + (r.failure() && r.failure().errorText); });
  page.on('requestfinished', (r) => {
    const p = peticiones.find((x) => x.ruta === r.url().replace(BASE, '') && x.estado === 'enviando');
    if (!p) return;
    const respuesta = r.response();
    p.ms = Date.now() - p.t;
    p.estado = 'respondió ' + (respuesta ? respuesta.status() : '?');
  });
  /** Cómo está la página al fallar (se usa solo para explicar un fallo). */
  async function estadoPagina() {
    return page.evaluate(() => `${location.pathname} · ${document.body.innerText.replace(/\s+/g, ' ').slice(0, 220)}`).catch((e) => 'la página no responde: ' + e.message);
  }
  async function guardar(archivo) {
    const avisosAntes = avisos.length;
    const peticionesAntes = peticiones.length;
    await page.evaluate(() => { document.querySelector('button[title="Guardar Invitación"]').click(); });
    // La confirmación es la respuesta del servidor a ese guardado. (El aviso de
    // "guardado" en pantalla desaparece a los 5 segundos: con dos guardados
    // seguidos no sirve para saber cuál se confirmó.)
    const t0 = Date.now();
    let hecha = null;
    while (Date.now() - t0 < 60000 && !hecha) {
      hecha = peticiones.slice(peticionesAntes).find((p) => /^respondió \d|falló/.test(p.estado)) || null;
      if (!hecha) await dormir(100);
    }
    const falla = async (detalle) => { throw new Error(`Guardar "${archivo}" no se confirmó (${detalle}).\n  Página: ${await estadoPagina()}\n  Peticiones: ${peticiones.slice(peticionesAntes).map((p) => `${p.metodo} ${p.ruta} → ${p.estado}${p.ms ? ' en ' + p.ms + ' ms' : ''}`).join('; ') || 'ninguna'}${avisos.slice(avisosAntes).length ? '\n  Aviso: ' + avisos.slice(avisosAntes).join(' / ') : ''}${erroresDeConsola.length ? '\n  Consola: ' + erroresDeConsola.slice(-2).join(' | ') : ''}${erroresJs.length ? '\n  Error: ' + erroresJs[erroresJs.length - 1] : ''}`); };
    if (!hecha) await falla('el servidor no respondió en 60 s');
    if (!/^respondió 2/.test(hecha.estado)) await falla(hecha.estado);
    await dormir(300);
    return readFileSync(join(servidor.dataDir, 'storage', 'users', servidor.usuarioId, archivo), 'utf-8');
  }
  async function abrirEditor(archivo) {
    const t0 = Date.now();
    await page.goto(`${BASE}/editor/${archivo}?purchaseId=${servidor.planId}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    // La vista previa está lista cuando su documento ya trae el bloque de prueba.
    await page.waitForFunction((sel) => {
      const f = document.querySelector(sel);
      const d = f && f.contentDocument;
      return !!(d && d.getElementById('bloque-prueba'));
    }, { timeout: 90000 }, VISTA);
    await dormir(500);
    return Date.now() - t0;
  }

  // ------------------------------------------------------------------ PESADA
  if (!servidor.archivoPesado) {
    console.log('\n(Se omite la invitación pesada: no está el archivo original en esta máquina.)');
  } else {
    const NOMBRE = 'padres-novia-1';               // "Roberto Mendoza" en la invitación real
    console.log('\nInvitación real de varios MB:');
    const tAbrio = await abrirEditor(servidor.archivoPesado);
    const tamano = (readFileSync(join(servidor.dataDir, 'storage', 'users', servidor.usuarioId, servidor.archivoPesado), 'utf-8').length / 1048576).toFixed(1);
    console.log(`  (información: ${tamano} MB · el editor tarda ${tAbrio} ms en abrirla y mostrarla)`);

    await irA(1500);
    await dormir(300);
    const punto = await vista();
    check(punto.alto > 2400 && punto.scrollY === 1500, `se baja la vista previa a la mitad (posición ${punto.scrollY} de ${punto.alto})`);
    await marcarVista();

    console.log('\nEscribir letra por letra en un nombre (sin salir del campo):');
    check(await tocarCarta('Roberto Mendoza'), 'se despliega el texto "Roberto Mendoza" en el panel');
    await dormir(700);
    check((await valorDelCampo()) === 'Roberto Mendoza', 'el campo de texto muestra el texto actual');
    await prepararCampo();
    let escrito = '';
    let msLetras = 0;                  // lo que tarda teclear (y aplicarse) cada letra
    let seRecargo = false;
    let seMovio = false;
    let campoVivo = true;
    let textoAlMomento = true;
    for (const letra of 'Julia') {
      const tLetra = Date.now();
      await page.keyboard.type(letra);
      msLetras += Date.now() - tLetra;
      escrito += letra;
      const visto = await textoEnVista(NOMBRE);
      const estado = await vista();
      textoAlMomento = textoAlMomento && visto === escrito;
      seRecargo = seRecargo || !estado.viva;
      seMovio = seMovio || estado.scrollY !== punto.scrollY;
      campoVivo = campoVivo && (await campoEsta()) !== null;
    }
    check(textoAlMomento, `cada letra aparece en la invitación al momento ("${escrito}")`);
    check(!seRecargo, 'la vista previa NO se recarga mientras se escribe');
    check(!seMovio, 'la vista previa no se mueve del lugar donde estaba la persona');
    check(campoVivo, 'el campo de texto no pierde el foco (el elemento no desaparece del panel aunque quede una sola letra)');
    console.log(`  (información: teclear una letra y que ya esté aplicada toma ${Math.round(msLetras / 5)} ms de promedio en esta máquina, incluida la prueba)`);
    // Lo que tarda el editor solo (sin la herramienta de prueba): 20 letras seguidas.
    const msEditor = await page.evaluate(async () => {
      const t = document.querySelector('.w-80 textarea');
      const poner = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
      const inicio = performance.now();
      for (const letra of 'MariaFernandaLopez12') { poner.call(t, t.value + letra); t.dispatchEvent(new Event('input', { bubbles: true })); }
      const fin = performance.now();
      // Se deja el campo como estaba.
      poner.call(t, 'Julia'); t.dispatchEvent(new Event('input', { bubbles: true }));
      return (fin - inicio) / 20;
    });
    console.log(`  (información: dentro del editor, cada letra tarda ${msEditor.toFixed(1)} ms con la invitación de 5.5 MB)`);
    check((await textoEnVista(NOMBRE)) === 'Julia', 'el nombre quedó "Julia"');

    const guardado = await guardar(servidor.archivoPesado);
    check(/data-gemini-id="padres-novia-1"[^>]*>Julia</.test(guardado) && !guardado.includes('Roberto Mendoza'), 'al guardar, el archivo tiene el nombre nuevo (lo que se ve es lo que se guarda)');

    console.log('\nTocar opciones del panel (tamaño, espaciado):');
    const elegir = (grupo, texto) => page.evaluate(({ grupo, texto }) => {
      const g = [...document.querySelectorAll('[role="group"][aria-label="' + grupo + '"]')].find((el) => el.offsetParent !== null);
      if (!g) return false;
      const b = [...g.querySelectorAll('button')].find((x) => x.textContent.trim() === texto);
      if (!b || b.disabled) return false;
      b.click();
      return true;
    }, { grupo, texto });
    const estiloEnVista = (propiedad) => page.evaluate(({ sel, id, propiedad }) => {
      const d = document.querySelector(sel).contentDocument;
      return d.querySelector(`[data-gemini-id="${id}"]`).style.getPropertyValue(propiedad);
    }, { sel: VISTA, id: NOMBRE, propiedad });
    await marcarVista();
    check(await elegir('Tamaño de la letra', 'Grande') && (await estiloEnVista('zoom')) === '1.15', '"Grande" se ve al instante en la invitación');
    check((await vista()).viva && (await vista()).scrollY === 1500, '…sin recargar la vista previa ni moverla');
    // Varios toques seguidos: solo importa el último.
    const tToques = Date.now();
    for (const texto of ['Muy suelto', 'Junto', 'Normal', 'Suelto', 'Muy suelto', 'Normal']) { await elegir('Espacio entre renglones', texto); await dormir(30); }
    const msToques = ((Date.now() - tToques) / 6).toFixed(0);
    check((await estiloEnVista('line-height')) === '' , `6 toques seguidos terminan en la última opción ("Normal") sin recargar (${msToques} ms por toque)`);
    const trasToques = await vista();
    check(trasToques.viva && trasToques.scrollY === 1500, '…y la vista previa sigue en el mismo lugar');
    const guardado2 = await guardar(servidor.archivoPesado);
    check(/data-gemini-id="padres-novia-1"[^>]*zoom:\s*1\.15/.test(guardado2), 'al guardar, el archivo tiene el tamaño elegido');

    console.log('\nCambiar un color de toda la invitación:');
    // La ventana de colores del sistema no se puede manejar desde aquí: se
    // reproduce lo que suelta al elegir (el valor nuevo y sus eventos).
    const elegirColor = (etiqueta, hex) => page.evaluate(({ etiqueta, hex }) => {
      const sw = document.querySelector(`button[aria-label="Color ${etiqueta}"]`);
      const inp = sw && sw.nextElementSibling;
      if (!inp) return null;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(inp, hex);
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      inp.dispatchEvent(new Event('change', { bubbles: true }));
      return inp.value;
    }, { etiqueta, hex });
    const cssEnVista = () => page.evaluate((sel) => (document.querySelector(sel).contentDocument.querySelector('style[data-editor-color-vars]') || {}).textContent || '', VISTA);
    const colorElegido = await elegirColor('principal', '#2a9d8f');
    await dormir(250);
    check(colorElegido === '#2a9d8f' && (await cssEnVista()).includes('--primary-color: #2a9d8f'), `el color se aplica en la invitación al elegirlo${colorElegido && colorElegido !== '#2a9d8f' ? ' (el control quedó en ' + colorElegido + ')' : ''}`);
    const controlColor = await page.evaluate(() => {
      const sw = document.querySelector('button[aria-label="Color principal"]');
      return { valor: sw.nextElementSibling.value, muestra: sw.style.backgroundColor };
    });
    check(controlColor.valor === '#2a9d8f' && controlColor.muestra !== '', 'y el control conserva el color elegido (no se pone negro)');
    check((await vista()).viva && (await vista()).scrollY === 1500, '…sin recargar la vista previa');
    const guardado3 = await guardar(servidor.archivoPesado);
    check(guardado3.includes('--primary-color: #2a9d8f'), 'al guardar, el archivo trae el color');

    console.log('\nRestablecer los colores originales:');
    await elegirColor('realce', '#e76f51');
    await dormir(250);
    const dosColores = await cssEnVista();
    check(dosColores.includes('--primary-color: #2a9d8f') && dosColores.includes('--accent-color: #e76f51'), 'se pueden cambiar varios colores a la vez');
    await page.evaluate(() => [...document.querySelectorAll('.w-80 button')].find((b) => b.textContent.trim() === 'Restablecer colores originales').click());
    await dormir(250);
    check(!/--[a-z]+-color:/.test(await cssEnVista()), '"Restablecer colores originales" quita TODOS los colores elegidos');
    check((await vista()).viva && (await vista()).scrollY === 1500, '…sin recargar la vista previa');

    console.log('\nOcultar y volver a mostrar un texto:');
    // El ojo de la tarjeta que está desplegada (cada tarjeta trae el suyo).
    const ojoElemento = () => page.evaluate(() => {
      const b = [...document.querySelectorAll('.w-80 button')].find((x) => /^(Ocultar|Mostrar) elemento$/.test(x.title) && x.closest('.border') && x.closest('.border').querySelector('textarea'));
      if (!b) return '';
      const titulo = b.title;
      b.click();
      return titulo;
    });
    const ocultoEnVista = (id) => page.evaluate(({ sel, id }) => {
      const f = document.querySelector(sel);
      const el = f.contentDocument.querySelector(`[data-gemini-id="${id}"]`);
      return { marca: el.getAttribute('data-gemini-hidden'), visible: f.contentWindow.getComputedStyle(el).display !== 'none' };
    }, { sel: VISTA, id: NOMBRE });
    const tOjo = await ojoElemento();
    await dormir(150);
    let o = await ocultoEnVista(NOMBRE);
    check(tOjo === 'Ocultar elemento' && o.marca === 'true' && !o.visible, 'al tocar "ocultar", el texto desaparece de la invitación');
    check((await vista()).viva && (await vista()).scrollY === 1500, '…sin recargar la vista previa');
    const guardado4 = await guardar(servidor.archivoPesado);
    check(/data-gemini-id="padres-novia-1"[^>]*data-gemini-hidden="true"|data-gemini-hidden="true"[^>]*data-gemini-id="padres-novia-1"/.test(guardado4), 'al guardar, el archivo dice que está oculto');
    check(!guardado4.includes('--primary-color: #2a9d8f') && !guardado4.includes('--accent-color: #e76f51'), 'y ya no trae los colores que se restablecieron');
    await ojoElemento();
    await dormir(150);
    o = await ocultoEnVista(NOMBRE);
    check(o.marca === null && o.visible, 'al tocar "mostrar", el texto vuelve');

    console.log('\nUn cambio de toda la invitación (la tipografía) sí recarga la vista previa:');
    // Lo que la persona veía arriba del todo antes del cambio.
    const verArriba = () => page.evaluate((sel) => {
      const f = document.querySelector(sel);
      let mejor = null;
      f.contentDocument.querySelectorAll('[data-gemini-id]').forEach((el) => {
        const top = Math.round(el.getBoundingClientRect().top);
        if (top >= -1 && (!mejor || top < mejor.top)) mejor = { id: el.getAttribute('data-gemini-id'), top };
      });
      return mejor;
    }, VISTA);
    const antesDelCambio = await verArriba();
    await page.evaluate(() => {
      const s = document.querySelectorAll('.w-80 select')[0];
      const otra = [...s.options].find((x) => x.value && x.value !== s.value);
      s.value = otra.value;
      s.dispatchEvent(new Event('change', { bubbles: true }));
    });
    // Se espera a que el documento nuevo esté (la marca de la prueba desaparece con la recarga).
    await page.waitForFunction((sel) => document.querySelector(sel).contentWindow.__pruebaViva !== true, { timeout: 90000 }, VISTA).catch(() => {});
    await page.waitForFunction((sel) => {
      const f = document.querySelector(sel);
      return !!(f.contentDocument && f.contentDocument.getElementById('bloque-prueba'));
    }, { timeout: 90000 }, VISTA).catch(() => {});
    await dormir(4000);
    const trasRecarga = await vista();
    const arribaDespues = await verArriba();
    // Mientras las fuentes nuevas cargan, lo de arriba puede cambiar de tamaño:
    // lo que importa es que el mismo texto siga viéndose en el mismo lugar de la pantalla.
    check(Math.abs(trasRecarga.scrollY - 1500) <= 120 || (arribaDespues && arribaDespues.id === antesDelCambio.id && Math.abs(arribaDespues.top - antesDelCambio.top) <= 150),
      `…y vuelve al mismo lugar (posición ${trasRecarga.scrollY}; arriba se veía "${antesDelCambio.id}" a ${antesDelCambio.top} px y ahora "${arribaDespues && arribaDespues.id}" a ${arribaDespues && arribaDespues.top} px)`);
  }

  // ------------------------------------------------------------------ PEQUEÑA
  console.log('\nUna parte de un texto sin identificador (un nombre dentro de una frase):');
  await abrirEditor('editor_test.html');
  await irA(0);
  await marcarVista();
  await page.evaluate(() => document.querySelector('button[aria-label="Activar modo edición de textos"]').click());
  await dormir(300);
  const marco = page.frames().find((f) => f !== page.mainFrame());
  await marco.evaluate(() => document.getElementById('parte-sin-id').scrollIntoView({ block: 'center' }));
  await dormir(200);
  await marco.click('#parte-sin-id');
  await dormir(800);
  check((await valorDelCampo()) === 'José Luis', 'al elegirla en la vista previa, aparece en el panel con su texto');
  await prepararCampo();
  await page.keyboard.type('Juan');
  const parte = await page.evaluate(() => {
    const d = document.querySelector('iframe[title="Vista previa de la invitación"]').contentDocument;
    const p = d.getElementById('bloque-prueba').querySelector('p');
    return { parte: d.getElementById('parte-sin-id').textContent, frase: p.textContent };
  });
  check(parte.parte === 'Juan', `lo escrito se ve al momento en esa parte ("${parte.parte}")`);
  check(parte.frase === 'Con todo nuestro amor, Juan y María', 'el resto de la frase no cambia');
  check((await vista()).viva, '…sin recargar la vista previa');
  const guardadoP = await guardar('editor_test.html');
  check(/<span id="parte-sin-id"[^>]*data-gemini-id="edit-[^"]+"[^>]*>Juan<\/span>/.test(guardadoP) && !guardadoP.includes('José Luis'), 'al guardar, el archivo tiene esa parte con su identificador y el nombre nuevo');

  console.log('\nEl enlace se aplica al dejar de escribir (no con cada letra):');
  check(await tocarCarta('Nuestro enlace'), 'se despliega el enlace');
  await dormir(600);
  const enlaceEnVista = () => page.evaluate((sel) => document.querySelector(sel).contentDocument.querySelector('[data-gemini-id="prueba-enlace"]').getAttribute('href'), VISTA);
  await page.evaluate(() => { const i = [...document.querySelectorAll('.w-80 input[type="text"]')].find((x) => x.offsetParent !== null); i.focus(); i.select(); });
  await page.keyboard.type('https://ejemplo.com/dos', { delay: 5 });
  check((await enlaceEnVista()) === 'https://ejemplo.com/uno', 'mientras se escribe, la invitación conserva el enlace anterior');
  await dormir(900);
  check((await enlaceEnVista()) === 'https://ejemplo.com/dos', 'al dejar de escribir, el enlace nuevo se aplica');

  console.log('\nOcultar y mostrar una sección completa:');
  await page.evaluate(() => {
    const titulo = [...document.querySelectorAll('.w-80 span')].find((x) => x.textContent.trim().toLowerCase() === 'prueba' && x.className.includes('tracking-widest'));
    titulo.parentElement.querySelector('button[title$="sección"]').click();
  });
  await dormir(200);
  // Todos los elementos que están dentro de la sección (son los del bloque de
  // prueba y, si se eligió antes, la parte sin identificador) deben quedar marcados.
  const seccion = await page.evaluate((sel) => {
    const f = document.querySelector(sel);
    const s = f.contentDocument.getElementById('bloque-prueba');
    return {
      visible: f.contentWindow.getComputedStyle(s).display !== 'none',
      viva: f.contentWindow.__pruebaViva === true,
      dentro: f.contentDocument.querySelectorAll('#bloque-prueba [data-gemini-id]').length,
      ojos: [...document.querySelectorAll('.w-80 button[title="Mostrar elemento"]')].length
    };
  }, VISTA);
  check(!seccion.visible && seccion.viva, 'la sección desaparece de la invitación sin recargar la vista previa');
  check(seccion.dentro >= 3 && seccion.ojos === seccion.dentro, `el panel marca como ocultos los ${seccion.dentro} elementos de la sección`);
  await page.evaluate(() => {
    const titulo = [...document.querySelectorAll('.w-80 span')].find((x) => x.textContent.trim().toLowerCase() === 'prueba' && x.className.includes('tracking-widest'));
    titulo.parentElement.querySelector('button[title$="sección"]').click();
  });
  await dormir(200);
  const seccion2 = await page.evaluate((sel) => document.querySelector(sel).contentWindow.getComputedStyle(document.querySelector(sel).contentDocument.getElementById('bloque-prueba')).display !== 'none', VISTA);
  check(seccion2, 'y vuelve a aparecer al mostrarla');

  check(erroresJs.length === 0, `sin errores de JavaScript en el editor${erroresJs.length ? ' → ' + erroresJs[0] : ''}`);
}

let codigo = 1;
try {
  await ejecutar();
  codigo = fallos === 0 ? 0 : 1;
} finally {
  // Pase o falle: se apaga el servidor y se borra la copia temporal.
  await browser.close();
  await servidor.detener();
}
console.log(codigo === 0 ? '\nTODO OK' : `\n${fallos} FALLOS`);
process.exit(codigo);
