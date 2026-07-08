import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, '..', 'server', 'database.sqlite');
const db = new Database(dbPath);
const config = db.prepare('SELECT html_google_api_key, html_google_model FROM admin_config WHERE id = 1').get();
db.close();

const apiKey = config.html_google_api_key;
const model = config.html_google_model;

// Test simple call first
console.log('=== TEST 1: Simple API call ===');
const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
const body = {
  contents: [{ parts: [{ text: 'Respond with only the number 42' }] }],
  generationConfig: { temperature: 0.2, maxOutputTokens: 50 }
};

try {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(body)
  });
  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Response keys:', Object.keys(data));
  console.log('candidates exists:', !!data.candidates);
  if (data.candidates) {
    console.log('candidates[0] keys:', Object.keys(data.candidates[0]));
    console.log('content:', JSON.stringify(data.candidates[0].content, null, 2));
    console.log('finishReason:', data.candidates[0].finishReason);
  }
  if (data.error) console.log('Error:', JSON.stringify(data.error, null, 2));
  if (data.promptFeedback) console.log('promptFeedback:', JSON.stringify(data.promptFeedback, null, 2));
} catch (e) {
  console.error('Fetch error:', e.message);
}

// Test 2: actual selection prompt
console.log('\n=== TEST 2: Selection prompt ===');
const templates = db ? [] : [];
const db2 = new Database(dbPath);
const rows = db2.prepare(`
  SELECT id, style_name, description, category, theme_tags
  FROM knowledge_base WHERE is_active = 1 AND html_content IS NOT NULL AND html_content != ''
`).all();
db2.close();

const selectionContext = rows.map(t => `ID: ${t.id}\n  style_name: ${t.style_name}\n  description: ${(t.description || '').slice(0, 200)}\n  category: ${t.category}`).join('\n---\n');

const selectionPrompt = `You are a template selector for digital invitation designs. Given a user's event request and a list of available templates, select the SINGLE best-matching template to adapt.

Return ONLY the template ID as a number. No explanation, no markdown, no text — just the numeric ID.

User event type: boda
User theme/mood: bohemio elegante
User prompt: Crea una invitación de boda para María José y Carlos Alberto. Estilo: bohemio elegante, con tonos terracota, verde salvia y crema.

Available templates:
${selectionContext}

Respond with ONLY the ID number of the best template:`;

console.log('Selection prompt length:', selectionPrompt.length);

try {
  const res2 = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ parts: [{ text: selectionPrompt }] }],
      generationConfig: { temperature: 0.2, topP: 0.9, topK: 20, maxOutputTokens: 50 }
    })
  });
  console.log('Status:', res2.status);
  const data2 = await res2.json();
  console.log('Full response:', JSON.stringify(data2, null, 2).slice(0, 3000));
} catch (e) {
  console.error('Fetch error:', e.message);
}