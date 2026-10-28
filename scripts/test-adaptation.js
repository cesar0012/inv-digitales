import { runOrchestration } from '../server/agentOrchestrator.js';
import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, '..', 'server', 'database.sqlite');
const db = new Database(dbPath);

const config = db.prepare('SELECT html_google_api_key, html_google_model FROM admin_config WHERE id = 1').get();
db.close();

const apiKey = config.html_google_api_key;
const model = config.html_google_model || 'gemini-3.1-pro-preview';

const prompt = `SYSTEM_TIMESTAMP: 2026-06-19T03:00:00Z

Crea una invitación de boda para María José y Carlos Alberto.

Fecha: 15 de septiembre de 2026
Hora: 6:00 PM
Lugar: Hacienda San Antonio, San Miguel de Allende, Guanajuato

Estilo: bohemio elegante, con tonos terracota, verde salvia y crema.
Ambiente: íntimo, romántico, al aire libre.

Los padres del novio: Alberto García y Carmen Ruiz
Los padres de la novia: José Martínez y Laura Fernández

Itinerario:
- 6:00 PM Ceremonia
- 7:00 PM Cóctel de bienvenida
- 8:30 PM Cena
- 10:00 PM Baile

Vestimenta: garden formal, tonos tierra.

Confirmar asistencia antes del 1 de septiembre.`;

const options = {
  eventType: 'boda',
  theme: 'bohemio elegante',
  primaryColor: '#a0826d',
  secondaryColor: '#b5a280',
  visualStyle: 'boho',
  mood: 'romántico íntimo',
  imageFiles: [],
  promptInstruction: '',
  userId: 'test-user'
};

console.log('=== TEST END-TO-END ADAPTATION FLOW ===');
console.log('Model:', model);
console.log('Prompt length:', prompt.length);
console.log('Event:', options.eventType, '| Theme:', options.theme);
console.log('');

const startTime = Date.now();

try {
  const html = await runOrchestration(prompt, apiKey, model, options, []);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('');
  console.log('=== RESULT ===');
  console.log('Elapsed:', elapsed, 's');
  console.log('HTML length:', html.length);

  // Verificaciones
  const hasGeminiIds = /data-gemini-id=/.test(html);
  const geminiIdCount = (html.match(/data-gemini-id="/g) || []).length;
  const hasHtmlTag = /<html/i.test(html);
  const hasBodyTag = /<body/i.test(html);
  const hasDoctype = /<!DOCTYPE/i.test(html);

  console.log('');
  console.log('=== VERIFICATIONS ===');
  console.log('Has <!DOCTYPE>:', hasDoctype);
  console.log('Has <html>:', hasHtmlTag);
  console.log('Has <body>:', hasBodyTag);
  console.log('Has data-gemini-id attrs:', hasGeminiIds);
  console.log('data-gemini-id count:', geminiIdCount);

  // Extraer algunos data-gemini-id de muestra
  const idMatches = html.match(/data-gemini-id="([^"]+)"/g) || [];
  const sampleIds = idMatches.slice(0, 10).map(m => m.replace(/data-gemini-id="|"/g, ''));
  console.log('Sample IDs:', sampleIds);

  // Guardar resultado
  const outPath = join(__dirname, 'test-adaptation-output.html');
  writeFileSync(outPath, html, 'utf-8');
  console.log('');
  console.log('Output saved to:', outPath);

  if (hasGeminiIds && geminiIdCount > 5 && hasDoctype) {
    console.log('');
    console.log('✅ TEST PASSED: Adaptation flow produced valid HTML with data-gemini-id attributes');
  } else {
    console.log('');
    console.log('⚠️  WARNING: Output may not have been through adaptation flow (few/no data-gemini-id attrs)');
  }
} catch (error) {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.error('');
  console.error('=== TEST FAILED ===');
  console.error('Elapsed:', elapsed, 's');
  console.error('Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}