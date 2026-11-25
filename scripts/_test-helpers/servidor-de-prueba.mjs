/**
 * Servidor de prueba para las pruebas de navegador.
 *
 * Levanta el servidor real en http://localhost:3001 con una COPIA TEMPORAL de
 * la base de datos (nunca la real), prepara lo que las pruebas necesitan y, al
 * terminar, apaga el servidor y borra la copia. Requiere `npm run build`
 * previo (el build local apunta a localhost:3001) y que el puerto esté libre.
 *
 *   import { iniciarServidorDePrueba } from './_test-helpers/servidor-de-prueba.mjs';
 *   const srv = await iniciarServidorDePrueba();
 *   try { … } finally { await srv.detener(); }
 *
 * La copia se borra aunque la prueba se interrumpa: además de detener(), la
 * limpieza queda registrada para el momento en que termina el proceso.
 */
import { spawn } from 'child_process';
import { mkdtempSync, rmSync, copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHmac } from 'crypto';
import Database from 'better-sqlite3';

const RAIZ = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const PUERTO = 3001;
const SECRETO = 'secreto-de-prueba';
const TOKEN_ADMIN = 'token-de-prueba-admin';
const USUARIO_PRUEBA = '999999';
const USUARIO_SIN_PLAN = '999998';
const PLAN_PRUEBA = 9001;

// Bloque de estructura conocida que llevan todas las invitaciones de prueba:
// una frase con una parte sin identificador (como un nombre dentro de una
// dedicatoria), una foto y un enlace.
const BLOQUE_PRUEBA = '<section id="bloque-prueba" style="padding:24px;font-family:sans-serif">'
  + '<p data-gemini-id="prueba-dedicatoria" style="font-size:18px">Con todo nuestro amor, <span id="parte-sin-id" style="font-weight:600">José Luis</span> y María</p>'
  + '<img data-gemini-id="prueba-foto" alt="Foto de prueba" style="width:120px;height:80px;object-fit:cover" src="data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%2280%22><rect width=%22120%22 height=%2280%22 fill=%22%23d16a8a%22/></svg>">'
  + '<a data-gemini-id="prueba-enlace" href="https://ejemplo.com/uno" style="display:block;margin-top:12px">Nuestro enlace</a>'
  + '</section>';

/** Identificadores del bloque de prueba (ver BLOQUE_PRUEBA). */
export const IDS_PRUEBA = { dedicatoria: 'prueba-dedicatoria', parte: 'parte-sin-id', foto: 'prueba-foto', enlace: 'prueba-enlace' };

/** Espera síncrona (para la limpieza al terminar el proceso, donde no hay "await"). */
const esperar = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

export async function iniciarServidorDePrueba() {
  const dataDir = mkdtempSync(join(tmpdir(), 'im-prueba-'));
  let hijo = null;
  let limpio = false;

  // Apaga el servidor y borra la copia. Una copia de la base de datos no debe
  // quedarse en la carpeta temporal sin que nadie lo sepa.
  const limpiar = () => {
    if (limpio) return;
    if (hijo && hijo.exitCode === null) {
      try { hijo.kill(); } catch { /* ya terminó */ }
      // El puerto y los archivos tardan un instante en quedar libres.
      esperar(500);
    }
    // En Windows la copia no se puede borrar si algo sigue usando sus archivos
    // (por ejemplo, una conexión abierta por la prueba): se reintenta.
    for (let i = 0; i < 10; i++) {
      try {
        rmSync(dataDir, { recursive: true, force: true });
        limpio = true;
        return;
      } catch { /* se reintenta */ }
      esperar(200);
    }
    console.warn(`⚠ No se pudo borrar la copia temporal de la base: ${dataDir}`);
  };
  // Aunque la prueba se interrumpa antes de llamar a detener().
  process.on('exit', limpiar);

  try {
    const dbFile = join(dataDir, 'database.sqlite');
    mkdirSync(join(dataDir, 'storage', 'historico'), { recursive: true });
    copyFileSync(join(RAIZ, 'server', 'database.sqlite'), dbFile);

    const db = new Database(dbFile);
    // Como estaba producción: el destino sin sesión guardado era "/admin-login".
    db.prepare("UPDATE admin_config SET login_page_url = '/admin-login' WHERE id = 1").run();
    db.prepare("INSERT OR REPLACE INTO admin_sessions (admin_id, token, expires_at) VALUES (1, ?, datetime('now', '+1 day'))").run(TOKEN_ADMIN);
    db.prepare("INSERT OR REPLACE INTO users (user_id, name, invitations_count, iteration_credits, max_invitations, max_iteration_credits, generation_credits, max_generation_credits) VALUES (?, 'Usuario de prueba', 0, 0, 0, 0, 0, 0)").run(USUARIO_PRUEBA);
    // Otro usuario con sesión pero SIN ningún plan (así llega quien aún no contrata).
    db.prepare("INSERT OR REPLACE INTO users (user_id, name, invitations_count, iteration_credits, max_invitations, max_iteration_credits, generation_credits, max_generation_credits) VALUES (?, 'Usuario sin plan', 0, 0, 0, 0, 0, 0)").run(USUARIO_SIN_PLAN);
    // Su plan: guardar una invitación nueva (como las que se personalizan desde
    // el catálogo) exige tener uno.
    db.prepare("INSERT OR REPLACE INTO user_plans (user_id, purchase_id, plan_slug, plan_name, invites_included, invites_used, generation_credits, generation_used, iteration_credits, iteration_used) VALUES (?, ?, 'prueba', 'Plan de prueba', 1, 0, 0, 0, 0, 0)").run(USUARIO_PRUEBA, PLAN_PRUEBA);

    const carpetaUsuario = join(dataDir, 'storage', 'users', USUARIO_PRUEBA);
    mkdirSync(carpetaUsuario, { recursive: true });
    // a) Invitación armada con módulos REALES del rack (set de mariposas). La
    //    etiqueta <script> con moduleMetadata es información del rack: se
    //    retira para no declararla dos veces en la misma página.
    const modulos = db.prepare("SELECT html_content FROM knowledge_base_modules WHERE module_id IN ('sf-metamorfosis-portada','sf-metamorfosis-padres')").all();
    if (modulos.length === 2) {
      const cuerpo = modulos.map((m) => m.html_content.replace(/<script>\s*const moduleMetadata\s*=[\s\S]*?<\/script>/g, '')).join('\n');
      const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Prueba del editor</title></head><body>${cuerpo}${BLOQUE_PRUEBA}</body></html>`;
      writeFileSync(join(carpetaUsuario, 'editor_test.html'), html);
      db.prepare("INSERT OR REPLACE INTO invitations (user_id, filename, slug, event_type, purchase_id, plan_slug) VALUES (?, 'editor_test.html', 'prueba-editor-777777', 'XV años', ?, 'prueba')").run(USUARIO_PRUEBA, PLAN_PRUEBA);
      // La misma, como PLANTILLA del catálogo: solo en el histórico y en la
      // tabla del catálogo, como las que se abren con "Personalizar esta invitación".
      writeFileSync(join(dataDir, 'storage', 'historico', 'plantilla_prueba.html'), html);
      db.prepare("INSERT OR REPLACE INTO catalogo (id, filename, title, event_type, created_at) VALUES (778, 'plantilla_prueba.html', 'Plantilla de prueba', 'XV años', datetime('now'))").run();
    }
    // b) Invitación PESADA real (varios MB, con las imágenes incrustadas): la
    //    que hace lento el editor. Solo si está el archivo en esta máquina; la
    //    copia es temporal y nunca se sube al repositorio.
    let archivoPesado = null;
    const origenPesado = join(RAIZ, 'server', 'storage', 'users', '15', 'invitation_1775958436367.html');
    if (existsSync(origenPesado)) {
      const pesada = readFileSync(origenPesado, 'utf-8').replace(/<\/body>/i, `${BLOQUE_PRUEBA}</body>`);
      writeFileSync(join(carpetaUsuario, 'pesada.html'), pesada);
      db.prepare("INSERT OR REPLACE INTO invitations (user_id, filename, slug, event_type, purchase_id, plan_slug) VALUES (?, 'pesada.html', 'prueba-pesada-999999', 'Boda', ?, 'prueba')").run(USUARIO_PRUEBA, PLAN_PRUEBA);
      archivoPesado = 'pesada.html';
    }
    db.close();

    hijo = spawn(process.execPath, [join(RAIZ, 'server', 'index.js')], {
      env: { ...process.env, DATA_DIR: dataDir, EDITOR_HMAC_SECRET: SECRETO, NODE_ENV: 'production', PORT: String(PUERTO) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let registro = '';
    hijo.stdout.on('data', (d) => { registro += d; });
    hijo.stderr.on('data', (d) => { registro += d; });
    // Si el servidor se cae a media prueba, que se sepa enseguida y por qué.
    let deteniendo = false;
    hijo.on('exit', (codigoSalida, senal) => {
      if (!limpio && !deteniendo) console.warn(`\n⚠ El servidor de prueba se detuvo antes de tiempo (código ${codigoSalida}${senal ? ', ' + senal : ''}). Últimas líneas:\n${registro.slice(-1200)}`);
    });

    const baseUrl = `http://localhost:${PUERTO}`;
    let listo = false;
    for (let i = 0; i < 80 && !listo && hijo.exitCode === null; i++) {
      try { listo = (await fetch(`${baseUrl}/api/config/public`)).ok; } catch { /* aún arranca */ }
      if (!listo) await new Promise((r) => setTimeout(r, 250));
    }
    if (!listo) {
      throw new Error(`El servidor de prueba no arrancó en el puerto ${PUERTO} (¿está ocupado?). Registro:\n${registro.slice(-600)}`);
    }

    const emitido = Math.floor(Date.now() / 1000);
    const sesionDe = (usuario) => `${usuario}|${emitido}|${createHmac('sha256', SECRETO).update(`${usuario}|${emitido}`).digest('hex')}`;

    return {
      baseUrl,
      /** Sesión válida del usuario de prueba (para la cookie auth_token). */
      token: sesionDe(USUARIO_PRUEBA),
      /** Sesión válida de un usuario SIN ningún plan (para la cookie auth_token). */
      tokenSinPlan: sesionDe(USUARIO_SIN_PLAN),
      /** Sesión válida del administrador de prueba (header Authorization: Bearer). */
      tokenAdmin: TOKEN_ADMIN,
      usuarioId: USUARIO_PRUEBA,
      planId: PLAN_PRUEBA,
      dbFile,
      /** Carpeta temporal completa (base de datos y archivos de las invitaciones). */
      dataDir,
      // Invitaciones de prueba: "editor_test.html" es PROPIA del usuario de
      // prueba (dos módulos reales del rack); "plantilla_prueba.html" es una
      // PLANTILLA del catálogo; "pesada.html" es una invitación real de varios
      // MB, solo si está el archivo original en esta máquina (si no, null).
      archivoPesado,
      /** Últimas líneas de lo que escribió el servidor (para entender un fallo). */
      registro: () => registro.slice(-1500),
      detener: async () => {
        if (hijo && hijo.exitCode === null) {
          deteniendo = true;
          hijo.kill();
          await new Promise((r) => {
            const aviso = setTimeout(r, 5000);
            hijo.once('exit', () => { clearTimeout(aviso); r(); });
          });
        }
        limpiar();
        if (limpio) process.off('exit', limpiar);   // si no, se reintenta al terminar el proceso
      },
    };
  } catch (error) {
    limpiar();
    process.off('exit', limpiar);
    throw error;
  }
}
