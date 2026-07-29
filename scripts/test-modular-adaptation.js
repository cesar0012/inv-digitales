/**
 * Test E2E de personalización textual en orquestación modular (RAG).
 *
 * Valida que runModularOrchestration:
 *   1. Construya userData parseando el prompt libre (lo valida vía log en stdout).
 *   2. Produzca HTML estructurado (data-gemini-id, body) ensamblando los módulos.
 *   3. Cuando la API Gemini funcione y el adaptador tenga éxito, los textos del
 *      wireframe (p. ej. "Nombre de los Novios", "Save the date") se reemplazan
 *      con los datos del usuario extraídos del prompt.
 *   4. Cuando la API Gemini NO funcione (key inválida / 403 / RECITATION), el
 *      fallback applyDynamicContent aplica reemplazos básicos conservadores
 *      (cabecera "Nuestros Padres", CTA "Confirmar Asistencia") y el resto de
 *      placeholders se preservan para edición posterior en el editor visual.
 *
 * MODO ADAPTATIVO:
 *   - Si la API falla (todo ERROR en adaptadores), el test SKIPea las assertions
 *     de contenido textual intensivas y emite un WARNING en lugar de FAIL.
 *   - Si la API OK, valida también assertions estrictas.
 *
 * Requiere:
 *   - server/database.sqlite con admin_config (html_google_api_key y html_google_model)
 *   - Módulos cargados en knowledge_base_modules (ver scripts/seed-modulos-universales.js)
 *
 * Uso: node scripts/test-modular-adaptation.js
 */
import { runModularOrchestration } from '../server/agentOrchestrator.js';
import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, '..', 'server', 'database.sqlite');
const db = new Database(dbPath);

const config = db.prepare('SELECT html_google_api_key, html_google_model FROM admin_config WHERE id = 1').get();
db.close();

if (!config || !config.html_google_api_key) {
  console.error('❌ No hay html_google_api_key en admin_config. Abortando.');
  process.exit(2);
}

const apiKey = config.html_google_api_key;
const model = config.html_google_model || 'gemini-3.1-pro-preview';

const prompt = `SYSTEM_TIMESTAMP: 2026-07-17T03:00:00Z

Crea una invitación de Boda Tradicional con tema Floral, palacio blanco, para María José y Carlos Alberto.

Fecha: 15 de septiembre de 2026
Hora: 6:00 PM
Lugar: Palacio Blanco, Hacienda San Antonio, San Miguel de Allende, Guanajuato

Estilo: floral elegante, ambiente romántico clásico al aire libre.
Colores: blanco, terracota y verde salvia.

Los padres de la novia: José Martínez y Laura Fernández
Los padres del novio: Alberto García y Carmen Ruiz

Itinerario:
- 6:00 PM Ceremonia
- 7:00 PM Cóctel de bienvenida
- 8:30 PM Cena
- 10:00 PM Baile

Vestimenta: garden formal, tonos tierra.

Confirmar asistencia antes del 1 de septiembre de 2026.`;

const options = {
  eventType: 'Boda Tradicional',
  theme: 'Floral - palacio blanco',
  primaryColor: '#ffffff',
  secondaryColor: '#b5a280',
  visualStyle: 'floral',
  mood: 'romántico clásico',
  imageFiles: [],
  promptInstruction: '',
  userId: 'test-modular-adaptation',
  imageApiKey: '',
  imageModel: 'gemini-3.1-flash-image-preview',
  hasRsvp: true
};

console.log('=== TEST MODULAR ADAPTATION (E2E) ===');
console.log('Model:', model);
console.log('Prompt length:', prompt.length);
console.log('Event:', options.eventType, '| Theme:', options.theme);
console.log('');

// Capturar stdout y stderr para inspeccionar logs del orquestador.
// El adaptador usa console.error para los [ADAPTER-MODULE] Error, por eso hay
// que interceptar ambos canales para detectar caídas del adaptador Gemini.
const originalStdoutWrite = process.stdout.write.bind(process.stdout);
const originalStderrWrite = process.stderr.write.bind(process.stderr);
let stdoutBuffer = '';
let stderrBuffer = '';
process.stdout.write = (chunk, ...args) => {
  if (typeof chunk === 'string') stdoutBuffer += chunk;
  return originalStdoutWrite(chunk, ...args);
};
process.stderr.write = (chunk, ...args) => {
  if (typeof chunk === 'string') stderrBuffer += chunk;
  return originalStderrWrite(chunk, ...args);
};

const startTime = Date.now();
let apiOk = true;
try {
  const html = await runModularOrchestration(prompt, apiKey, model, options, []);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  process.stdout.write = originalStdoutWrite;
  process.stderr.write = originalStderrWrite;

  console.log('');
  console.log('=== RESULT ===');
  console.log('Elapsed:', elapsed, 's');
  console.log('HTML length:', html.length);

  const hasDoctype = /<!DOCTYPE/i.test(html);
  const hasBodyTag = /<body/i.test(html);
  const geminiIdCount = (html.match(/data-gemini-id="/g) || []).length;
  console.log('Has <!DOCTYPE>:', hasDoctype);
  console.log('Has <body>:', hasBodyTag);
  console.log('data-gemini-id count:', geminiIdCount);

  // ===== Pipeline. =====
  const failures = [];

  // (A) Validar el parser capturando el log "userData parsed: {...}"
  const userDataLogMatch = stdoutBuffer.match(/userData parsed:\s*(\{.*?\})/);
  if (!userDataLogMatch) {
    failures.push('parser: no se encontró "userData parsed:" en logs del orquestador');
  } else {
    const rawJson = userDataLogMatch[1];
    try {
      // El log del orquestador ya produce JSON válido (campos "<set>" entre comillas).
      const userData = JSON.parse(rawJson);
      const expectedFromParser = {
        nombres: 'María José y Carlos Alberto',
        fecha: '15/09/2026',
        hora: '6:00 PM',
        lugar: 'Palacio Blanco'
      };
      let parserOk = true;
      for (const [k, v] of Object.entries(expectedFromParser)) {
        if (userData[k] !== v) {
          failures.push(`parser: userData.${k} esperado=${JSON.stringify(v)} obtenido=${JSON.stringify(userData[k])}`);
          parserOk = false;
        }
      }
      for (const k of ['padresNovia', 'padresNovio', 'vestimenta', 'fechaLimiteRSVP']) {
        if (!userData[k]) {
          failures.push(`parser: userData.${k} debería estar poblado y está vacío`);
          parserOk = false;
        }
      }
      if (userData.itinerario !== 4) {
        failures.push(`parser: userData.itinerario esperado=4 obtenido=${JSON.stringify(userData.itinerario)}`);
        parserOk = false;
      }
      if (parserOk) console.log('✅ parser: userData extraído correctamente del prompt libre');
    } catch (e) {
      failures.push('parser: no se pudo parsear userData logJSON: ' + e.message + ' | raw=' + rawJson.slice(0, 200));
    }
  }

  // (B) Detectar si la API Gemini respondió correctamente en el adaptador.
  // El adaptador va a fallback en 3 situaciones:
  //   - HTTP error (catch en callGeminiAPI) -> log "[ADAPTER-MODULE] Error:" (va a STDERR)
  //   - finishReason != STOP -> log "[ADAPTER-MODULE] Gemini filtró" (va a STDOUT)
  //   - HTML inválido -> log "[ADAPTER-MODULE] Output no es HTML válido" (va a STDOUT)
  // Si TODOS los módulos cayeron a fallback, asumimos API down: SKIP estrictas assertions.
  const combinedBuffer = stdoutBuffer + '\n' + stderrBuffer;
  const totalAdaptErrors = (combinedBuffer.match(/\[ADAPTER-MODULE\]/g) || []).length;
  const totalModules = 8; // 'portada', 'padres', 'countdown', 'itinerario', 'ubicacion', 'padrinos', 'confirmacion', 'detalles'
  if (totalAdaptErrors >= totalModules) {
    apiOk = false;
    console.warn(`⚠️  API Gemini falló en ${totalAdaptErrors} intento(s) de adaptación. Modo API-down: skip de assertions estrictas de contenido textual.`);
  }

  // (C) Estructura mínima del HTML (debe tener body y al menos 5 data-gemini-id).
  if (!hasBodyTag) failures.push('HTML sin <body>');
  if (geminiIdCount < 5) failures.push(`insuficientes data-gemini-id (${geminiIdCount} < 5)`);

  // (D) Comportamiento mínimo del fallback (debe aplicarse aún sin API):
  //     - No debe quedar HTML corrupto.
  //     - El parser debe haberse invocado (log userData parsed)
  if (stdoutBuffer.indexOf('[Módular] Adaptando:') < 0) {
    failures.push('orquestador: no se ejecutó el paso de adaptación (sin log "Adaptando:")');
  }
  if (stdoutBuffer.indexOf('[ASSEMBLER]') < 0) {
    failures.push('orquestador: no se ejecutó el ensamblado (sin log "[ASSEMBLER]")');
  }

  // (E) Solo si apiOk=true validamos que placeholders del wireframe se reemplazaron.
  //     En modo API-fail recomendamos SKIP en vez de fail porque los placeholders
  //     de nombres (ej "Nombre del Padre") no se tocan a propósito en el fallback.
  if (apiOk) {
    if (html.includes('Nombre de los Novios')) failures.push('placeholder persistente: "Nombre de los Novios"');
    if (html.includes('Save the date')) failures.push('placeholder persistente: "Save the date"');
    if (!html.includes('María José y Carlos Alberto')) failures.push('falta dato esperado: "María José y Carlos Alberto"');
    if (!html.includes('15 de septiembre')) failures.push('falta dato esperado: "15 de septiembre"');
    if (!html.includes('Palacio Blanco')) failures.push('falta dato esperado: "Palacio Blanco"');
  }

  // (F) Verificar que los módulos mandatorios padres y padrinos estén presentes.
  //     padres: debe venir de la KB (data-gemini-id contiene "padres")
  //     padrinos: no está en la KB → se genera desde cero (data-gemini-id contiene "padrinos" o "generated-padrinos")
  const hasPadres = /data-gemini-id="[^"]*padres[^"]*"/i.test(html);
  const hasPadrinos = /data-gemini-id="[^"]*padrinos[^"]*"/i.test(html);
  console.log('Módulo padres presente:', hasPadres);
  console.log('Módulo padrinos presente:', hasPadrinos);
  if (!hasPadres) failures.push('módulo mandatorio "padres" NO presente en el HTML final');
  if (!hasPadrinos) failures.push('módulo mandatorio "padrinos" NO presente en el HTML final');

  console.log('');
  console.log('=== VERIFICATIONS ===');
  if (failures.length === 0) {
    if (apiOk) {
      console.log('✅ TEST PASSED: parser + orquestación + personalización textual validados');
    } else {
      console.log('✅ TEST PASSED (modo API-down): parser + orquestación + ensamblado validados; assertions de contenido textual saltadas por API Gemini no disponible');
    }
  } else {
    console.log('❌ TEST FAILED con ' + failures.length + ' verificación(es) fallida(s):');
    for (const f of failures) console.log('   • ' + f);
  }

  const outPath = join(__dirname, 'test-modular-adaptation-output.html');
  writeFileSync(outPath, html, 'utf-8');
  console.log('');
  console.log('Output saved to:', outPath);

  if (failures.length > 0) process.exit(1);
} catch (error) {
  process.stdout.write = originalStdoutWrite;
  process.stderr.write = originalStderrWrite;
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.error('');
  console.error('=== TEST FAILED (excepción) ===');
  console.error('Elapsed:', elapsed, 's');
  console.error('Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
