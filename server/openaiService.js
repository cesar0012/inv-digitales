import { createHash } from 'crypto';

export const generateWithOpenAI = async (prompt, apiKey, baseUrl, model, attachments = []) => {
  const url = `${baseUrl}/chat/completions`;
  
  // Construir el mensaje
  const systemInstruction = `You are an expert web developer specializing in creating beautiful digital invitations. 

CRITICAL INSTRUCTIONS:
- Use Tailwind CSS for all styling (embedded via <script src="https://cdn.tailwindcss.com"></script>)
- Return raw HTML code only, NO markdown formatting
- Use the IDs: main-header, main-content, main-footer for the main sections
- Create responsive, mobile-friendly designs
- Use beautiful color palettes appropriate for the event type

The user will provide:
1. Event type (wedding, birthday, baptism, etc.)
2. Theme/style preferences
3. Text content to include

Return ONLY the complete HTML code starting with <!DOCTYPE html>`;

  const userMessage = attachments.length > 0 
    ? `${prompt}\n\n(Note: ${attachments.length} image(s) attached for reference)`
    : prompt;

  const messages = [
    { role: 'system', content: systemInstruction },
    { role: 'user', content: userMessage }
  ];

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      temperature: 0.4,
      max_tokens: 8192
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  const generatedText = data.choices?.[0]?.message?.content;
  
  if (!generatedText) {
    throw new Error('No se pudo extraer el HTML de la respuesta');
  }
  
  // Limpiar el código HTML
  let cleanedHtml = generatedText
    .replace(/```html\s*/g, '')
    .replace(/```\s*/g, '')
    .replace(/```/g, '');
    
  // Buscar si hay HTML en la respuesta
  const htmlMatch = cleanedHtml.match(/<!DOCTYPE html>[\s\S]*<\/html>|<html[\s\S]*<\/html>/i);
  if (htmlMatch) {
    cleanedHtml = htmlMatch[0];
  }
  
  return cleanedHtml;
};