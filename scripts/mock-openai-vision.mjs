/* Mock proveedor OpenAI-compatible: fingerprint JSON + módulos reales válidos
 * (de la colección 04) según el tipo pedido. Para probar generateVisualInvitation. */
import express from 'express';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const COL = join(__dirname, '..', 'modulos-1', 'colecciones', '04-noir-oro');
const FILES = {
  portada: '01-portada.html', padres: '02-padres.html', ubicacion: '03-ubicacion.html',
  itinerario: '04-itinerario.html', confirmacion: '05-confirmacion.html', detalles: '06-detalles.html',
  countdown: '07-countdown.html', padrinos: '08-padrinos.html', corte: '09-corte.html',
  galeria: '10-galeria.html', regalos: '11-regalos.html', vestimenta: '12-vestimenta.html'
};

const app = express();
app.use(express.json({ limit: '20mb' }));
app.post('/v1/chat/completions', (req, res) => {
  const userMsg = req.body.messages?.find((m) => m.role === 'user');
  const text = Array.isArray(userMsg?.content)
    ? userMsg.content.filter((c) => c.type === 'text').map((c) => c.text).join('\n')
    : String(userMsg?.content || '');

  if (text.includes('Analiza esta invitación de referencia')) {
    return res.json({ choices: [{ message: { content: '{"paleta":["#12100c","#d4af5f","#f0e8d8"],"tipografia":{"titulos":"serif","cuerpo":"sans"},"mood":"lujo nocturno","ornamentos":["filos dobles"],"layout":"simétrico","formato":"tarjeta"}' } }] });
  }
  const m = /MÓDULO A GENERAR:\s*(\w+)/.exec(text);
  const tipo = m ? m[1] : '';
  if (tipo && FILES[tipo]) {
    const html = readFileSync(join(COL, FILES[tipo]), 'utf-8');
    console.log('[MOCK] módulo:', tipo, '→', html.length, 'bytes');
    return res.json({ choices: [{ message: { content: html } }] });
  }
  // test de visión u otros: responder rojo si hay imagen.
  const hasImage = Array.isArray(userMsg?.content) && userMsg.content.some((c) => c.type === 'image_url');
  res.json({ choices: [{ message: { content: hasImage ? 'rojo' : 'no veo imagen' } }] });
});
app.listen(3998, () => console.log('mock openai-gen en 3998'));
