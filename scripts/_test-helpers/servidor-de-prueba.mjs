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
 */
import { spawn } from 'child_process';
import { mkdtempSync, rmSync, copyFileSync, mkdirSync, writeFileSync } from 'fs';
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
const PLAN_PRUEBA = 9001;

export async function iniciarServidorDePrueba() {
  const dataDir = mkdtempSync(join(tmpdir(), 'im-prueba-'));
  const dbFile = join(dataDir, 'database.sqlite');
  mkdirSync(join(dataDir, 'storage', 'historico'), { recursive: true });
  copyFileSync(join(RAIZ, 'server', 'database.sqlite'), dbFile);

  const db = new Database(dbFile);
  // Como estaba producción: el destino sin sesión guardado era "/admin-login".
  db.prepare("UPDATE admin_config SET login_page_url = '/admin-login' WHERE id = 1").run();
  db.prepare("INSERT OR REPLACE INTO admin_sessions (admin_id, token, expires_at) VALUES (1, ?, datetime('now', '+1 day'))").run(TOKEN_ADMIN);
  db.prepare("INSERT OR REPLACE INTO users (user_id, name, invitations_count, iteration_credits, max_invitations, max_iteration_credits, generation_credits, max_generation_credits) VALUES (?, 'Usuario de prueba', 0, 0, 0, 0, 0, 0)").run(USUARIO_PRUEBA);
  // Su plan: guardar una invitación nueva (como las que se personalizan desde
  // el catálogo) exige tener uno.
  db.prepare("INSERT OR REPLACE INTO user_plans (user_id, purchase_id, plan_slug, plan_name, invites_included, invites_used, generation_credits, generation_used, iteration_credits, iteration_used) VALUES (?, ?, 'prueba', 'Plan de prueba', 1, 0, 0, 0, 0, 0)").run(USUARIO_PRUEBA, PLAN_PRUEBA);
  // Invitación de prueba armada con módulos REALES del rack (set de mariposas).
  // La etiqueta <script> con moduleMetadata es información del rack: se retira
  // para no declararla dos veces en la misma página.
  const modulos = db.prepare("SELECT html_content FROM knowledge_base_modules WHERE module_id IN ('sf-metamorfosis-portada','sf-metamorfosis-padres')").all();
  if (modulos.length === 2) {
    const cuerpo = modulos.map((m) => m.html_content.replace(/<script>\s*const moduleMetadata\s*=[\s\S]*?<\/script>/g, '')).join('\n');
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Prueba del editor</title></head><body>${cuerpo}</body></html>`;
    // a) Invitación PROPIA del usuario de prueba: ya guardada, con su plan.
    mkdirSync(join(dataDir, 'storage', 'users', USUARIO_PRUEBA), { recursive: true });
    writeFileSync(join(dataDir, 'storage', 'users', USUARIO_PRUEBA, 'editor_test.html'), html);
    db.prepare("INSERT OR REPLACE INTO invitations (user_id, filename, slug, event_type, purchase_id, plan_slug) VALUES (?, 'editor_test.html', 'prueba-editor-777777', 'XV años', ?, 'prueba')").run(USUARIO_PRUEBA, PLAN_PRUEBA);
    // b) PLANTILLA del catálogo: solo en el histórico y en la tabla del catálogo,
    //    como las que se abren con "Personalizar esta invitación".
    writeFileSync(join(dataDir, 'storage', 'historico', 'plantilla_prueba.html'), html);
    db.prepare("INSERT OR REPLACE INTO catalogo (id, filename, title, event_type, created_at) VALUES (778, 'plantilla_prueba.html', 'Plantilla de prueba', 'XV años', datetime('now'))").run();
  }
  db.close();

  const hijo = spawn(process.execPath, [join(RAIZ, 'server', 'index.js')], {
    env: { ...process.env, DATA_DIR: dataDir, EDITOR_HMAC_SECRET: SECRETO, NODE_ENV: 'production', PORT: String(PUERTO) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let registro = '';
  hijo.stdout.on('data', (d) => { registro += d; });
  hijo.stderr.on('data', (d) => { registro += d; });

  const baseUrl = `http://localhost:${PUERTO}`;
  let listo = false;
  for (let i = 0; i < 80 && !listo; i++) {
    if (hijo.exitCode !== null) break;
    try { listo = (await fetch(`${baseUrl}/api/config/public`)).ok; } catch { /* aún arranca */ }
    if (!listo) await new Promise((r) => setTimeout(r, 250));
  }
  if (!listo) {
    hijo.kill();
    throw new Error(`El servidor de prueba no arrancó en el puerto ${PUERTO} (¿está ocupado?). Registro:\n${registro.slice(-600)}`);
  }

  const emitido = Math.floor(Date.now() / 1000);
  const firma = createHmac('sha256', SECRETO).update(`${USUARIO_PRUEBA}|${emitido}`).digest('hex');

  return {
    baseUrl,
    /** Sesión válida del usuario de prueba (para la cookie auth_token). */
    token: `${USUARIO_PRUEBA}|${emitido}|${firma}`,
    /** Sesión válida del administrador de prueba (header Authorization: Bearer). */
    tokenAdmin: TOKEN_ADMIN,
    // Invitaciones de prueba: "editor_test.html" es PROPIA del usuario de prueba
    // (guardada con su plan); "plantilla_prueba.html" es una PLANTILLA del catálogo.
    usuarioId: USUARIO_PRUEBA,
    planId: PLAN_PRUEBA,
    dbFile,
    /** Carpeta temporal completa (base de datos y archivos de las invitaciones). */
    dataDir,
    detener: async () => {
      if (hijo.exitCode === null) {
        hijo.kill();
        await new Promise((r) => {
          const aviso = setTimeout(r, 5000);
          hijo.once('exit', () => { clearTimeout(aviso); r(); });
        });
      }
      // La copia no se puede borrar si algo sigue usando sus archivos (en
      // Windows, una conexión abierta por la prueba): se reintenta y, si aún
      // así queda, se avisa en vez de dejar una copia de la base en silencio.
      for (let i = 0; i < 10; i++) {
        try { rmSync(dataDir, { recursive: true, force: true }); return; } catch { /* se reintenta */ }
        await new Promise((r) => setTimeout(r, 300));
      }
      console.warn(`⚠ No se pudo borrar la copia temporal de la base: ${dataDir}`);
    },
  };
}
