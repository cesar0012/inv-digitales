// Prueba en navegador real (Chromium) de los controles en palabras del editor.
// Abre el editor con una invitación de prueba (módulos reales del rack),
// despliega un texto y hace clic en cada opción, comprobando el efecto REAL
// dentro de la invitación. Levanta sola un servidor de prueba con una copia
// temporal de la base de datos (ver _test-helpers/servidor-de-prueba.mjs).
// Requiere `npm run build` previo.
//
//   node scripts/_test-editor-browser.mjs
import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import { join } from 'path';
import { iniciarServidorDePrueba } from './_test-helpers/servidor-de-prueba.mjs';

// A dónde debe llegar quien no tiene sesión (la página de planes de la app) y
// lo que se le explica: en palabras, sin términos técnicos.
const PLANES = 'https://app.invitacionesmodernas.com/app/planes';
const AVISO_SESION = 'Tu sesión venció. Inicia sesión de nuevo para continuar. Si tienes cambios sin guardar: deja esta pestaña abierta, inicia sesión en otra pestaña y vuelve a guardar aquí.';

const servidor = await iniciarServidorDePrueba();
// Con un aviso abierto la página no responde: si algo falla, que la prueba se
// detenga con un error claro en vez de quedarse esperando 3 minutos.
const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'], protocolTimeout: 60000 });
let fallos = 0;
const check = (ok, nombre) => { if (!ok) fallos++; console.log(`  ${ok ? '✓' : '✗ FALLO'} ${nombre}`); };

async function ejecutar() {
  const BASE = servidor.baseUrl;
  const token = servidor.token;
  const page = await browser.newPage();
  const erroresJs = [];
  page.on('pageerror', (e) => erroresJs.push(String(e).slice(0, 200)));
  await page.setCookie({ name: 'auth_token', value: token, domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' });
  // Se omite la guía de primera visita para poder usar el editor directamente.
  await page.evaluateOnNewDocument(() => { try { localStorage.setItem('im_editor_onboarded', '1'); } catch {} });
  await page.setViewport({ width: 1366, height: 900 });

  const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
  // Los archivos de las invitaciones del usuario de prueba, según el servidor.
  const listarInvitaciones = async () => {
    const r = await fetch(`${BASE}/api/invitations/${servidor.usuarioId}`, { headers: { Authorization: `Bearer ${servidor.token}` } });
    return ((await r.json()).invitations || []).map((i) => i.filename);
  };

  /** Estado del texto "Mis XV años" dentro de la invitación (iframe). */
  const medir = () => page.evaluate(() => {
    const f = document.querySelector('iframe[title="Vista previa de la invitación"]');
    const doc = f && f.contentDocument;
    if (!doc || !f.contentWindow) return null;
    const el = [...doc.querySelectorAll('[data-gemini-id]')].find((e) => e.children.length === 0 && /Mis XV años/.test(e.textContent));
    if (!el) return null;
    const cs = f.contentWindow.getComputedStyle(el);
    const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
    return {
      estilo: el.getAttribute('style') || '',
      zoom: el.style.zoom || '', lh: el.style.lineHeight || '', ls: el.style.letterSpacing || '', pad: el.style.padding || '',
      grosor: el.style.fontWeight || '', color: el.style.color || '',
      // Este texto es de una sola línea y sin espacio alrededor: su alto ES el
      // espacio entre renglones con que se ve en el diseño.
      alto: el.getBoundingClientRect().height,
      fuente: parseFloat(cs.fontSize), entreLineas: num(cs.lineHeight), entreLetras: num(cs.letterSpacing),
      padCalculado: [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map(num),
      registro: el.getAttribute('data-editor-styles') || '',
    };
  });
  async function esperarCarga() {
    for (let i = 0; i < 60; i++) { const m = await medir(); if (m) { await dormir(250); return m; } await dormir(250); }
    return null;
  }
  /** Toca una opción (por el nombre del control y la palabra). */
  const elegir = (grupo, texto) => page.evaluate(({ grupo, texto }) => {
    const g = [...document.querySelectorAll('[role="group"][aria-label="' + grupo + '"]')].find((el) => el.offsetParent !== null);
    if (!g) return 'no existe el control "' + grupo + '"';
    const b = [...g.querySelectorAll('button')].find((x) => x.textContent.trim() === texto);
    if (!b) return 'no existe la opción "' + texto + '"';
    if (b.disabled) return 'la opción "' + texto + '" está desactivada';
    b.click();
    return 'ok';
  }, { grupo, texto });
  const activa = (grupo) => page.evaluate((grupo) => {
    const g = [...document.querySelectorAll('[role="group"][aria-label="' + grupo + '"]')].find((el) => el.offsetParent !== null);
    return g ? [...g.querySelectorAll('button')].filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.textContent.trim()) : null;
  }, grupo);
  async function tocar(grupo, texto, esperado) {
    const r = await elegir(grupo, texto);
    if (r !== 'ok') { check(false, `${grupo} → ${texto}: ${r}`); return null; }
    return esperarCarga();
  }
  const cerca = (a, b, tol = 0.02) => Math.abs(a - b) <= tol;

  console.log('Abriendo el editor con la invitación de prueba…');
  // El plan va en la dirección, como cuando se llega desde el asistente: sin él
  // el editor no guarda (abajo se prueba guardar con la sesión vencida).
  await page.goto(`${BASE}/editor/editor_test.html?purchaseId=${servidor.planId}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => b.innerText.includes('Mis XV años')), { timeout: 60000 }).catch(() => {});
  await esperarCarga();
  // Desplegar el texto "Mis XV años" (su tarjeta en la barra lateral).
  await page.evaluate(() => { [...document.querySelectorAll('button')].find((b) => b.innerText.includes('Mis XV años')).click(); });
  await dormir(500);
  const base = await medir();
  check(!!base, 'el editor abre la invitación y lista sus textos');
  // Un fallo aquí se lanza como error para que el finally de abajo apague el
  // servidor y borre la copia temporal.
  if (!base) throw new Error('El editor no abrió la invitación de prueba. Texto visible: ' + (await page.evaluate(() => document.body.innerText)).slice(0, 300));
  // Cómo es este texto EN EL DISEÑO (referencia independiente del editor):
  // una sola línea sin espacio alrededor, así que su alto es su espacio entre
  // renglones. Todo se mide en proporción a su propia letra.
  const ratio = base.alto / base.fuente;
  const letrasDiseno = base.entreLetras / base.fuente;
  const alrededorDiseno = base.padCalculado.map((p) => p / base.fuente);
  check(Math.abs(ratio - 1.22) < 0.04 && Math.abs(base.alto - base.fuente) > 1, `referencia del diseño: renglones a ${ratio.toFixed(2)} veces la letra, letras a ${letrasDiseno.toFixed(2)}, sin espacio alrededor`);
  const expandir = (css) => { const v = String(css).split(/\s+/).map(parseFloat); return v.length === 1 ? [v[0], v[0], v[0], v[0]] : v.length === 2 ? [v[0], v[1], v[0], v[1]] : v.length === 3 ? [v[0], v[1], v[2], v[1]] : v; };

  console.log('\nLo que ve la persona en el panel del texto:');
  const controles = await page.evaluate(() => [...document.querySelectorAll('[role="group"][aria-label]')].filter((el) => el.offsetParent !== null).map((el) => el.getAttribute('aria-label')));
  check(JSON.stringify(controles.slice(0, 4)) === JSON.stringify(['Tamaño de la letra', 'Espacio entre renglones', 'Espacio entre letras', 'Espacio alrededor']), `controles en palabras: ${controles.join(' · ')}`);
  {
    const texto = await page.evaluate(() => {
      const barra = document.querySelector('.w-80');
      return [...document.querySelectorAll('h4, span, label, p, button, option')]
        .filter((el) => barra && barra.contains(el) && el.offsetParent !== null)
        .map((el) => el.textContent.trim()).concat([...document.querySelectorAll('.w-80 option')].map((o) => o.textContent.trim()))
        .join(' | ');
    });
    const tecnico = texto.match(/\d+(\.\d+)?\s*(px|rem|em|%)\b|\bhex\b|var\(|\(src\)|ej\. /gi);
    check(!tecnico, `sin medidas ni códigos visibles${tecnico ? ' → encontró: ' + tecnico.join(', ') : ''}`);
    check(/Grosor de la letra/.test(texto) && /Como en el diseño/.test(texto), 'grosor con palabras ("Como en el diseño", "Gruesa"…)');
    check(/Sin animación|Aparece suavemente/.test(texto) && !/Fade In|Bold|Semibold/.test(texto), 'animación y grosor sin términos en inglés');
    check(/Como en el diseño/.test(texto), 'los colores dicen "Como en el diseño"');
  }
  {
    // Cada opción se ve completa: altura mínima y sin desbordes en la barra.
    const forma = await page.evaluate(() => {
      const visibles = [...document.querySelectorAll('[role="group"] button')].filter((b) => b.offsetParent !== null);
      const barra = document.querySelector('.w-80');
      return { botones: visibles.length, bajos: visibles.filter((b) => b.getBoundingClientRect().height < 36).length, desborde: barra.scrollWidth > barra.clientWidth + 1 };
    });
    check(forma.botones >= 15 && forma.bajos === 0, `${forma.botones} opciones con altura cómoda para el dedo (${forma.bajos} demasiado bajas)`);
    check(!forma.desborde, 'la barra lateral no se desborda a lo ancho');
  }

  console.log('\nTamaño de la letra (respecto al diseño):');
  check((await activa('Tamaño de la letra'))[0] === 'Normal', 'al abrir está en "Normal"');
  let m = await tocar('Tamaño de la letra', 'Grande');
  check(m && m.zoom === '1.15' && cerca(m.alto / base.alto, 1.15, 0.03), `"Grande" → el texto se ve un 15% más grande que el diseño (alto ${base.alto.toFixed(1)} → ${m?.alto.toFixed(1)})`);
  check((await activa('Tamaño de la letra'))[0] === 'Grande', 'queda marcada "Grande"');
  m = await tocar('Tamaño de la letra', 'Pequeña');
  check(m && m.zoom === '0.9' && cerca(m.alto / base.alto, 0.9, 0.03), `"Pequeña" → 10% más pequeño que el DISEÑO (no del valor anterior) (alto ${m?.alto.toFixed(1)})`);
  m = await tocar('Tamaño de la letra', 'Normal');
  check(m && m.zoom === '' && cerca(m.alto / base.alto, 1, 0.02), `"Normal" → vuelve exactamente al diseño (alto ${m?.alto.toFixed(1)})`);

  console.log('\nEspacio entre renglones (el diseño usa espaciado "normal", sin número):');
  m = await tocar('Espacio entre renglones', 'Suelto');
  check(m && cerca(parseFloat(m.lh), ratio + 0.22, 0.011), `"Suelto" = un paso más que el diseño (${ratio.toFixed(2)} → ${m?.lh})`);
  check(m && m.entreLineas > base.alto, `"Suelto" se ve MÁS abierto que el diseño (línea de ${base.alto.toFixed(1)} → ${m?.entreLineas.toFixed(1)})`);
  m = await tocar('Espacio entre renglones', 'Muy suelto');
  check(m && cerca(parseFloat(m.lh), ratio + 0.44, 0.011), `"Muy suelto" = dos pasos más que el diseño → ${m?.lh}`);
  m = await tocar('Espacio entre renglones', 'Junto');
  check(m && cerca(parseFloat(m.lh), Math.max(0.8, ratio - 0.22), 0.011), `"Junto" = un paso menos que el diseño → ${m?.lh}`);
  check(m && m.entreLineas < base.alto, `"Junto" se ve MÁS apretado que el diseño (línea de ${base.alto.toFixed(1)} → ${m?.entreLineas.toFixed(1)})`);
  m = await tocar('Espacio entre renglones', 'Normal');
  check(m && m.lh === '' && cerca(m.alto, base.alto, 0.6), '"Normal" vuelve al diseño');

  console.log('\nEspacio entre letras y espacio alrededor (desde lo que el diseño ya trae):');
  m = await tocar('Espacio entre letras', 'Separadas');
  check(m && cerca(parseFloat(m.ls), letrasDiseno + 0.05, 0.011), `"Separadas" = un paso más de lo que el diseño trae (${letrasDiseno.toFixed(2)} → ${m?.ls})`);
  check(m && m.entreLetras > base.entreLetras, 'las letras se ven más separadas que en el diseño');
  m = await tocar('Espacio entre letras', 'Normal');
  m = await tocar('Espacio alrededor', 'Amplio');
  const padM = m ? expandir(m.pad) : [];
  check(m && padM.length === 4 && padM.every((p, i) => cerca(p, alrededorDiseno[i] + 0.35, 0.011)), `"Amplio" = un paso más de espacio en las 4 direcciones (${m?.pad})`);
  m = await tocar('Espacio alrededor', 'Normal');
  check(m && m.pad === '', '"Normal" quita el espacio agregado');

  console.log('\nRegistro guardado en el elemento (para conservar el diseño como referencia):');
  m = await medir();
  const baseGuardada = m.registro ? (JSON.parse(m.registro).base || {}) : {};
  check(Number.isFinite(baseGuardada.lineHeight), `la referencia del diseño se guarda junto al texto (${m.registro.slice(0, 72)}…)`);
  check(Number.isFinite(baseGuardada.lineHeight) && Math.abs(baseGuardada.lineHeight - ratio) < 0.03, `…y la referencia es la MEDIDA REAL del diseño (${baseGuardada.lineHeight}), no un valor supuesto (1.5)`);

  console.log('\nGrosor y color:');
  await page.evaluate(() => {
    const sel = [...document.querySelectorAll('.w-80 select')].find((s) => [...s.options].some((o) => o.textContent.trim() === 'Gruesa'));
    if (sel) { sel.value = '600'; sel.dispatchEvent(new Event('change', { bubbles: true })); }
  });
  m = await esperarCarga();
  check(m && m.grosor === '600', '"Gruesa" en grosor de la letra');
  await page.evaluate(() => {
    const sel = [...document.querySelectorAll('.w-80 select')].find((s) => [...s.options].some((o) => o.textContent.trim() === 'Gruesa'));
    if (sel) { sel.value = ''; sel.dispatchEvent(new Event('change', { bubbles: true })); }
  });
  m = await esperarCarga();
  check(m && m.grosor === '', '"Como en el diseño" en grosor');
  {
    // La ventana de colores del sistema no se puede manejar desde aquí: se
    // reproduce lo que suelta al elegir (el valor nuevo y sus eventos).
    const hubo = await page.evaluate(() => {
      const sw = document.querySelector('button[aria-label="Elegir color: color del texto"]');
      const inp = sw && sw.nextElementSibling;
      if (!inp) return false;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(inp, '#b8324f');
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      inp.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    });
    check(hubo, 'existe el selector de color del texto');
    m = await esperarCarga();
    check(m && /^rgb\(184, 50, 79\)$/.test(m.color), `elegir un color → se aplica al texto (${m?.color})`);
    const textoColor = await page.evaluate(() => { const b = [...document.querySelectorAll('.w-80 button')].find((x) => x.textContent.trim() === 'Del diseño' && x.offsetParent !== null); return b ? b.parentElement.innerText.replace(/\s+/g, ' ') : ''; });
    check(/Del diseño/.test(textoColor) && !/#[0-9a-f]{6}|rgb\(/i.test(textoColor), `aparece "Del diseño" para volver y no se muestra ningún código de color ("${textoColor}")`);
    if (/Del diseño/.test(textoColor)) {
      await page.evaluate(() => { [...document.querySelectorAll('.w-80 button')].find((x) => x.textContent.trim() === 'Del diseño' && x.offsetParent !== null).click(); });
      m = await esperarCarga();
      check(m && m.color === '', '"Del diseño" → vuelve el color original');
    }
    const sinCodigos = await page.evaluate(() => document.querySelector('.w-80').innerText);
    check(!/\b#[0-9a-fA-F]{3,8}\b|\brgb\(|var\(--/.test(sinCodigos), 'en toda la barra lateral no se muestra ningún código de color');
  }

  check(erroresJs.length === 0, `sin errores de JavaScript en el editor${erroresJs.length ? ' → ' + erroresJs[0] : ''}`);

  // Capturas para revisar cómo se ve el panel del texto (escritorio y celular).
  async function capturarPanel(ruta, ancho) {
    await page.setViewport({ width: ancho, height: 1500 });
    await dormir(600);
    const caja = await page.evaluate(() => {
      const g = [...document.querySelectorAll('[role="group"][aria-label="Tamaño de la letra"]')].find((el) => el.offsetParent !== null);
      let card = g;
      while (card && !(card.classList.contains('rounded-xl') && card.classList.contains('border'))) card = card.parentElement;
      if (!card) return null;
      card.scrollIntoView({ block: 'start' });
      const b = card.getBoundingClientRect();
      return { x: Math.max(0, b.x), y: Math.max(0, b.y), width: b.width, height: Math.min(b.height, window.innerHeight) };
    });
    await dormir(400);
    if (caja) await page.screenshot({ path: ruta, clip: caja });
    return !!caja;
  }
  check(await capturarPanel('shots-review/editor-apariencia-escritorio.png', 1366), 'captura del panel en escritorio');
  check(await capturarPanel('shots-review/editor-apariencia-celular.png', 390), 'captura del panel en celular');
  await page.setViewport({ width: 1366, height: 900 });

  console.log('\nLa sesión vence mientras la persona trabaja en el editor:');
  {
    // La página de planes es de otro sitio: se intercepta para saber con certeza
    // a dónde llevó el navegador y descartar cualquier página de administración.
    let llegadasAPlanes = 0;
    const navegaciones = [];
    // Con un aviso abierto la página deja de responder: todo aviso que la prueba
    // no vaya a contestar se cierra solo (y queda anotado en "avisos").
    const avisos = [];
    let avisoDeLaPrueba = null;
    let avisosVistos = 0;
    page.on('dialog', (d) => {
      d.orden = ++avisosVistos;
      avisos.push(d);
      d.deLaPrueba = d.type() === avisoDeLaPrueba;
      if (!d.deLaPrueba) d.dismiss().catch(() => {});
    });
    page.on('request', (req) => {
      if (req.url().startsWith(PLANES)) {
        llegadasAPlanes++;
        req.respond({ status: 200, contentType: 'text/html', body: '<html><body><h1>Planes</h1></body></html>' });
      } else {
        if (req.isNavigationRequest()) navegaciones.push(req.url());
        req.continue();
      }
    });
    await page.setRequestInterception(true);
    // Espera (hasta 10 s) un aviso del tipo indicado, que queda sin contestar
    // para que la prueba decida qué responderle. Solo cuentan los avisos que
    // aparezcan a partir de ahora (se llama siempre antes de la acción que lo provoca).
    const esperarAviso = (tipo) => {
      avisoDeLaPrueba = tipo;
      const desde = avisosVistos;
      let activo = true;
      const promesa = (async () => {
        try {
          for (let i = 0; i < 40 && activo; i++) {
            const d = avisos.find((x) => x.orden > desde && x.type() === tipo && x.deLaPrueba);
            if (d) return d;
            await dormir(250);
          }
          return null;
        } finally { if (activo) avisoDeLaPrueba = null; }
      })();
      promesa.cancelar = () => { activo = false; avisoDeLaPrueba = null; };
      return promesa;
    };
    const conSesion = () => page.setCookie({ name: 'auth_token', value: token, domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' });
    // El servidor deja de reconocer la sesión (venció)…
    const vencerSesion = async () => {
      await page.deleteCookie(...(await page.cookies(BASE)));
      await page.setCookie({ name: 'auth_token', value: '123|1700000000|firma-vencida', domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' });
    };
    const guardar = () => page.evaluate(() => document.querySelector('button[title="Guardar Invitación"]').click());
    const guardarYEsperar = async (tipo) => { const aviso = esperarAviso(tipo); await guardar(); return aviso; };
    const esperarPlanes = async () => {
      for (let i = 0; i < 80; i++) { if (page.url().startsWith(PLANES)) return true; await dormir(250); }
      return false;
    };
    // Abre el editor de nuevo. Si la página anterior tenía cambios sin guardar,
    // el navegador pregunta antes de salir: se le dice que sí.
    const abrirEditor = async (archivo = 'editor_test.html') => {
      const pregunta = esperarAviso('beforeunload');
      const navegando = page.goto(`${BASE}/editor/${archivo}?purchaseId=${servidor.planId}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      const d = await Promise.race([pregunta, navegando.then(() => null)]);
      if (d) await d.accept().catch(() => {}); else pregunta.cancelar();
      await navegando;
      await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => b.innerText.includes('Mis XV años')), { timeout: 60000 }).catch(() => {});
      await esperarCarga();
      await dormir(500);
    };
    // Deja un cambio sin guardar en el editor.
    const dejarCambio = async () => {
      await page.evaluate(() => { [...document.querySelectorAll('button')].find((b) => b.innerText.includes('Mis XV años')).click(); });
      await dormir(500);
      await tocar('Tamaño de la letra', 'Grande');
    };

    // a) Sin cambios sin guardar: la salida no depende de que la persona cierre nada.
    await conSesion();
    await abrirEditor();
    await vencerSesion();
    const avisoA = await guardarYEsperar('alert');
    // Se espera SIN aceptar el aviso.
    const salioSola = await esperarPlanes();
    await dormir(500);
    check(salioSola && llegadasAPlanes === 1, `guardar sin cambios pendientes → llega sola a la página de planes (${llegadasAPlanes} vez)`);
    check(!!avisoA && avisoA.message() === AVISO_SESION, `el aviso va en palabras: "${avisoA ? avisoA.message() : 'no apareció'}"`);
    if (avisoA) await avisoA.dismiss().catch(() => {});

    // b) Con cambios sin guardar: el navegador pregunta antes de tirar el trabajo…
    await conSesion();
    await abrirEditor();
    await dejarCambio();
    await vencerSesion();
    const preguntaB = await guardarYEsperar('beforeunload');
    check(!!preguntaB && llegadasAPlanes === 1, 'con cambios sin guardar, el navegador pregunta antes de salir (no se pierden sin aviso)');
    // …y si la persona elige "Cancelar", se queda con su trabajo y se le dice qué hacer.
    const avisoB = esperarAviso('alert');
    if (preguntaB) await preguntaB.dismiss().catch(() => {});
    const b = await avisoB;
    check(page.url().includes('/editor/') && llegadasAPlanes === 1, 'al elegir "Cancelar" se queda en el editor con su trabajo');
    check(!!b && b.message() === AVISO_SESION, `y recibe el aviso en palabras que le dice qué hacer ("${b ? b.message() : 'no apareció'}")`);
    if (b) await b.dismiss().catch(() => {});
    check((await medir())?.zoom === '1.15', 'su cambio sigue en la invitación');
    // Inicia sesión en otra pestaña (llega una cookie nueva) y vuelve a guardar.
    await conSesion();
    const antes = avisos.length;
    await guardar();
    let guardo = false;
    for (let i = 0; i < 40 && !guardo; i++) { await dormir(250); guardo = await page.evaluate(() => document.body.innerText.includes('Invitación actualizada correctamente')); }
    const inesperados = avisos.slice(antes).map((d) => d.message()).join(' / ');
    check(guardo && !inesperados, `después de iniciar sesión en otra pestaña, guardar desde esta funciona (no pierde su trabajo)${inesperados ? ' → aviso: ' + inesperados : ''}`);

    // c) Con cambios sin guardar y la persona elige "Salir": llega a los planes, una sola vez.
    await conSesion();
    await abrirEditor();
    await dejarCambio();
    await vencerSesion();
    const preguntaC = await guardarYEsperar('beforeunload');
    check(!!preguntaC, 'el navegador vuelve a preguntar antes de salir');
    if (preguntaC) {
      await preguntaC.accept().catch(() => {});
      const salio = await esperarPlanes();
      await dormir(1500);
      check(salio && llegadasAPlanes === 2, `al elegir "Salir" llega a la página de planes (una sola vez; pedida ${llegadasAPlanes} veces)`);
    }
    check(avisos.every((d) => d.type() === 'beforeunload' || d.message() === AVISO_SESION), `ningún aviso técnico en el camino ("${avisos.map((d) => d.type() + ': ' + d.message()).join(' | ')}")`);
    check(!navegaciones.some((u) => /\/admin/.test(u)), 'ninguna navegación hacia una página de administración');

    // d) "Personalizar esta invitación" desde el catálogo: la plantilla todavía
    //    no es del usuario, así que se guarda como nueva (con su plan).
    await conSesion();
    await abrirEditor('plantilla_prueba.html');
    await dejarCambio();
    const antesD = avisos.length;
    await guardar();
    let enElPanel = false;
    for (let i = 0; i < 80 && !enElPanel; i++) { await dormir(250); enElPanel = page.url() === BASE + '/'; }
    await dormir(1500);
    const archivos = await listarInvitaciones();
    const nueva = archivos.find((f) => f !== 'editor_test.html');
    check(enElPanel && !!nueva, `guardar la plantilla → se convierte en tu invitación y se llega al panel (${archivos.join(', ') || 'ninguna'})`);
    const inesperadosD = avisos.slice(antesD).map((d) => d.message()).join(' / ');
    check(!inesperadosD, `sin avisos de error${inesperadosD ? ' → ' + inesperadosD : ''}`);
    if (nueva) {
      const creada = readFileSync(join(servidor.dataDir, 'storage', 'users', servidor.usuarioId, nueva), 'utf-8');
      check(/zoom:\s*1\.15/.test(creada), 'su cambio quedó en su invitación');
    }
    const plantilla = readFileSync(join(servidor.dataDir, 'storage', 'historico', 'plantilla_prueba.html'), 'utf-8');
    check(!/zoom:\s*1\.15/.test(plantilla), 'la plantilla del catálogo sigue intacta');
  }

  console.log('\nReglas del servidor al guardar (directas, sin navegador):');
  {
    const llamar = (metodo, ruta, cuerpo) => fetch(BASE + ruta, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${servidor.token}` },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
    const U = servidor.usuarioId;
    let r = await llamar('PUT', `/api/invitations/${U}/editor_test.html`, { htmlContent: '<html><body>prueba</body></html>' });
    check(r.ok, 'actualizar una invitación PROPIA → se actualiza');
    r = await llamar('PUT', `/api/invitations/${U}/plantilla_prueba.html`, { htmlContent: '<html><body>prueba</body></html>' });
    const cuerpo = await r.json();
    check(r.status === 409 && cuerpo.code === 'PLANTILLA_CATALOGO', `actualizar una PLANTILLA del catálogo → el servidor indica que se guarda como nueva (${r.status} ${cuerpo.code || ''})`);
    const plantilla = readFileSync(join(servidor.dataDir, 'storage', 'historico', 'plantilla_prueba.html'), 'utf-8');
    check(!/<body>prueba<\/body>/.test(plantilla), 'y la plantilla del catálogo no se toca');
    r = await llamar('PUT', `/api/invitations/${U}/no_existe.html`, { htmlContent: 'x' });
    check(r.status === 404 && (await r.json()).error === 'Archivo no encontrado', 'una invitación que no existe → "Archivo no encontrado"');
    r = await llamar('POST', '/api/invitations', { htmlContent: '<html></html>', eventType: 'XV años', purchaseId: 424242 });
    check(r.status === 404 && /Plan no encontrado/.test((await r.json()).error), 'crear una invitación con un plan que el usuario NO tiene → rechazado (las reglas de planes siguen intactas)');
  }

  console.log('\nPantalla de inicio del editor (crear una invitación):');
  {
    await page.setCookie({ name: 'auth_token', value: servidor.token, domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' });
    await page.goto(`${BASE}/editor?modo=clasico`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await dormir(2500);
    const texto = await page.evaluate(() => document.body.innerText);
    const tecnicos = texto.match(/#[0-9a-fA-F]{3,8}\b|\b\d+(?:\.\d+)?\s?(?:px|rem)\b/gi) || [];
    check(/paleta de colores/i.test(texto), 'se muestra la paleta de colores');
    check(/Toca el cuadro para elegir el color/.test(texto), 'los colores se explican con palabras');
    check(tecnicos.length === 0, `sin códigos de color ni medidas visibles${tecnicos.length ? ' → encontró: ' + tecnicos.join(', ') : ''}`);
  }
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
