/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * IMAGE TO BASE64 SERVICE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Compiles ALL images to base64:
 * - Local images from /img/FOLDER/*.jpg
 * - AI-generated images via NanoBanana
 * 
 * This ensures the invitation HTML is fully self-contained with no external
 * dependencies for images.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Base path for images
const IMG_BASE_PATH = join(process.cwd(), 'img');

// Simple base64 encoding for local images
const encodeToBase64 = (filePath) => {
  try {
    if (!existsSync(filePath)) {
      return null;
    }
    const buffer = readFileSync(filePath);
    const ext = filePath.toLowerCase();
    let mimeType = 'image/jpeg';
    if (ext.endsWith('.png')) mimeType = 'image/png';
    else if (ext.endsWith('.webp')) mimeType = 'image/webp';
    else if (ext.endsWith('.gif')) mimeType = 'image/gif';
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  } catch (error) {
    console.error(`[IMAGE_TO_BASE64] Error encoding ${filePath}:`, error.message);
    return null;
  }
};

// Process local images in HTML and convert to base64
export const compileLocalImagesToBase64 = async (html) => {
  if (!html || !html.includes('<!DOCTYPE')) {
    return html;
  }

  const imgRegex = /src="\/img\/([^/]+)\/([^"]+)"/g;
  let result = html;
  let processedCount = 0;
  let match;

  const processedImages = new Map();
  
  while ((match = imgRegex.exec(html)) !== null) {
    const folder = match[1];
    const filename = match[2];
    const fullPath = join(IMG_BASE_PATH, folder, filename);
    
    // Skip if already processed
    if (processedImages.has(fullPath)) {
      continue;
    }
    
    const base64Data = encodeToBase64(fullPath);
    if (base64Data) {
      processedImages.set(fullPath, base64Data);
      // Replace the /img/ path with base64 data URL
      result = result.split(match[0]).join(`src="${base64Data}"`);
      processedCount++;
      console.log(`[IMAGE_TO_BASE64] Encoded: /img/${folder}/${filename} (${base64Data.substring(0, 50)}...)`);
    }
  }

  if (processedCount > 0) {
    console.log(`[IMAGE_TO_BASE64] Total local images processed: ${processedCount}`);
  }

  return result;
};

// Compile ALL images (local + AI-generated) to base64
export const compileAllImagesToBase64 = async (html, imageApiKey, imageModel) => {
  if (!html || !html.includes('<!DOCTYPE')) {
    return html;
  }

  console.log('=== COMPILING ALL IMAGES TO BASE64 ===');
  
  let result = html;
  
  // Step 1: Compile local images to base64
  console.log('[IMAGE_TO_BASE64] Step 1: Processing local images from /img/...');
  result = await compileLocalImagesToBase64(result);
  
  // Step 2: Process AI-generated images (GEMINI_GENERATE placeholders)
  if (imageApiKey && imageApiKey.trim() !== '') {
    console.log('[IMAGE_TO_BASE64] Step 2: Processing AI-generated images...');
    result = await processAIImages(result, imageApiKey, imageModel);
  } else {
    console.log('[IMAGE_TO_BASE64] Step 2: No AI image API key - skipping AI images');
  }
  
  console.log('=== IMAGE COMPILATION COMPLETE ===');
  return result;
};

// Process AI-generated images
const processAIImages = async (html, imageApiKey, imageModel) => {
  const srcRegex = /src=["'](GEMINI_GENERATE:([^"']+))["']/g;
  const bgRegex = /url\(["']?(GEMINI_GENERATE:([^"')]+))["']?\)/g;
  
  const srcMatches = [...html.matchAll(srcRegex)];
  const bgMatches = [...html.matchAll(bgRegex)];
  
  const allMatches = [
    ...srcMatches.map(m => m[1]),
    ...bgMatches.map(m => m[1])
  ];
  
  if (allMatches.length === 0) {
    return html;
  }
  
  const urls = Array.from(new Set(allMatches));
  console.log(`[IMAGE_TO_BASE64] Processing ${urls.length} AI images...`);
  
  const { generateImageWithNanoBanana } = await import('./nanoBananaService.js');
  
  const results = await Promise.all(urls.map(async (url) => {
    const promptText = url.replace('GEMINI_GENERATE:', '').trim();
    
    const prompt = `IMPORTANT: Create a beautiful photograph with a COMPLETE BACKGROUND (no transparent backgrounds, no floating elements, no stickers, no isolated objects). The image must have a full scene that can be used as-is. Description: ${promptText}`;
    
    const effectiveModel = imageModel && imageModel.includes('flash') ? imageModel : 'gemini-3.1-flash-image-preview';
    const result = await generateImageWithNanoBanana(
      prompt,
      imageApiKey,
      effectiveModel
    );
    
    if (result.success && result.image) {
      return { url, base64: `data:image/png;base64,${result.image}` };
    }
    console.error('[IMAGE_TO_BASE64] AI image error:', result.error);
    return { url, base64: null };
  }));
  
  let newHtml = html;
  results.forEach(({ url, base64 }) => {
    if (base64) {
      newHtml = newHtml.split(url).join(base64);
    }
  });
  
  const successCount = results.filter(r => r.base64).length;
  console.log(`[IMAGE_TO_BASE64] AI images compiled: ${successCount}/${urls.length}`);
  
  return newHtml;
};

export const resolveModuleImages = async (html, eventType, theme, imageApiKey, imageModel) => {
  if (!html || !imageApiKey || imageApiKey.trim() === '') {
    console.log('[RESOLVE-MODULE-IMAGES] Skip: No HTML o no API key');
    return html;
  }

  console.log('=== RESOLVING MODULE IMAGES ===');
  console.log('Event:', eventType, '| Theme:', theme);

  try {
    const { parseHTML } = await import('linkedom');
    const { generateImageWithNanoBanana } = await import('./nanoBananaService.js');
    
    const { document } = parseHTML(html);
    let modified = false;

    // Buscar todos los [path="placeholder"]
    const placeholders = document.querySelectorAll('[path="placeholder"]');
    console.log(`[RESOLVE-MODULE] ${placeholders.length} placeholder(s) encontrado(s)`);

    for (const placeholder of placeholders) {
      // Determinar memory_source (puede estar en el elemento o en el ancestro)
      let memorySource = placeholder.getAttribute('memory_source');
      let ancestor = placeholder.parentElement;
      while (!memorySource && ancestor) {
        memorySource = ancestor.getAttribute('memory_source');
        ancestor = ancestor.parentElement;
      }

      if (!memorySource) {
        console.log('[RESOLVE-MODULE] \u26a0\ufe0f Placeholder sin memory_source, saltando');
        continue;
      }

      if (memorySource === 'generated') {
        // Nano Banana: prompt basado SOLO en theme (no eventType) + tipo de módulo
        // (derivado de data-gemini-id). El módulo aporta estructura, no temática visual;
        // los tags se filtran para excluir términos que inducen a generar personas/parejas
        // (novios, retrato, foto de pareja) o marcadores estructurales (portada, hero,
        // boda, western, sombrero...) sin valor visual. El theme elegido por el usuario
        // captura la temática visual (Floral, Elegante, Rustico...).
        const EXCLUDE_TAGS = /^(novios|pareja|retrato|retrato de pareja|foto de pareja|fotos inclinadas|familias|portada|hero|boda|quinceanera|cumpleanos|baby shower|graduacion|despedida|aniversario|evento|modulo universal|responsive|slider|3 slides|background slider|tarjeta|tarjeta central|tarjeta editorial|tarjetas|overlay|overlay oscuro|moderno|minimalista|editorial|ubicacion|ceremonia|recepcion|mapa|mapa integrado|asistencia|rsvp|confirmacion|itinerario|agenda|western|vaquera|charra|sombrero|caballo|monograma|boton|cuenta regresiva|countdown|padres|festejados|historia|organizacion|personas|personas importantes|galeria|galeria grid|galeria fotos|mesa|mesa regalos|regalos|dress code|vestimenta)$/i;

        // Plantillas de prompt por tipo de módulo formal (definidos en
        // components/admin/RAGModuleModal.tsx y AdminRAGModules.tsx).
        // {theme} se reemplaza por el theme elegido por el usuario.
        const PROMPT_TEMPLATES = {
          portada: 'Fondo ambiental amplio y solemne para portada de invitación, sin personas, sin novios, sin retratos, sin parejas, sin texto. Estilo: {theme}. Ambiente decorativo, fotografía profesional, alta resolución, fondo completo.',
          padres: 'Fondo decorativo elegante y sobrio para sección de familias, sin personas, sin retratos, sin nombres, sin texto. Estilo: {theme}. Decoración floral o geométrica discreta, fotografía profesional, alta resolución, fondo uniforme.',
          ubicacion: 'Vista panorámica de entorno natural o urbano apropiado para ceremonia, sin personas, sin novios, sin edificios prominentes, sin señales, sin texto. Estilo: {theme}. Ambiente amplio, fotografía profesional, alta resolución.',
          itinerario: 'Fondo decorativo sutil y minimalista para itinerario, sin personas, sin texto, sin relojes, sin iconos. Estilo: {theme}. Elementos decorativos discretos, fotografía profesional, alta resolución, fondo uniforme.',
          confirmacion: 'Fondo elegante y limpio para sección de confirmación, sin personas, sin texto visible, sin formularios, sin botones. Estilo: {theme}. Decoración abstracta sutil, fotografía profesional, alta resolución, fondo uniforme.',
          detalles: 'Fondo decorativo con elementos discretos para sección de detalles, sin personas, sin texto, sin iconos, sin listas. Estilo: {theme}. Decoración sutil de fondo, fotografía profesional, alta resolución, fondo uniforme.',
          countdown: 'Fondo decorativo atmosférico para cuenta regresiva, sin personas, sin números, sin texto, sin relojes. Estilo: {theme}. Ambiente festivo elegante, fotografía profesional, alta resolución, fondo uniforme.',
          general: 'Fondo decorativo profesional, sin personas, sin texto. Estilo: {theme}. Fotografía profesional, alta resolución, fondo completo.'
        };

        const tagsEl = placeholder.querySelector('script');
        let tags = [];
        if (tagsEl && tagsEl.textContent) {
          const metaMatch = tagsEl.textContent.match(/moduleMetadata\s*=\s*(\{[\s\S]*?\});/);
          if (metaMatch) {
            try {
              const fn = new Function(`return (${metaMatch[1]});`);
              const meta = fn();
              tags = meta.tags || [];
            } catch (e) {
              console.log('[RESOLVE-MODULE] No se pudo parsear moduleMetadata');
            }
          }
        }

        const memoryType = placeholder.getAttribute('memory_type');
        const dataGeminiId = placeholder.getAttribute('data-gemini-id') || '';
        const moduleType = dataGeminiId.split('-')[0];
        const cleanTags = tags.filter((t) => !EXCLUDE_TAGS.test(t.trim()));

        let prompt;
        if (memoryType === 'background') {
          const template = PROMPT_TEMPLATES[moduleType] || PROMPT_TEMPLATES.general;
          prompt = template.replace(/\{theme\}/g, theme || 'elegante');
        } else {
          // memory_type="image" (IMG dentro de un módulo): se conservan los tags limpios
          // como pista de elementos visuales a ilustrar.
          prompt = `Imagen decorativa profesional, ${theme || 'elegante'}.${cleanTags.length ? ` Elementos: ${cleanTags.join(', ')}.` : ''} Fotografía profesional, sin personas, sin retratos.`;
        }
        console.log(`[RESOLVE-MODULE] \ud83c\udfa8 Nano Banana [${memoryType || '?'}/${moduleType || '?'}]: "${prompt.slice(0, 80)}..."`);

        const imageData = await generateImageWithNanoBanana(prompt, imageApiKey, imageModel);
        if (imageData && imageData.image) {
          const base64 = `data:image/png;base64,${imageData.image}`;

          // Reemplazar en background-image o src
          if (placeholder.tagName === 'SECTION' || placeholder.tagName === 'DIV') {
            // Buscar en <style> del módulo
            const style = placeholder.querySelector('style');
            if (style) {
              const loremMatch = style.textContent.match(/url\(['"]?(https?:\/\/loremflickr\.com\/[^'")\s]+)['"]?\)/i);
              if (loremMatch) {
                style.textContent = style.textContent.replace(loremMatch[0], `url('${base64}')`);
                modified = true;
                console.log('[RESOLVE-MODULE] \u2705 Background reemplazado');
              }
            }
          } else if (placeholder.tagName === 'IMG') {
            const loremMatch = placeholder.getAttribute('src');
            if (loremMatch && loremMatch.includes('loremflickr.com')) {
              placeholder.setAttribute('src', base64);
              modified = true;
              console.log('[RESOLVE-MODULE] \u2705 IMG src reemplazado');
            }
          }
        } else {
          console.log('[RESOLVE-MODULE] \u26a0\ufe0f Nano Banana falló:', imageData?.error);
        }
      } else if (memorySource === 'library') {
        // Library: mantener Lorem Flickr como placeholder visual
        // La selección final resolverá con el asset real de /img/
        const assetType = placeholder.getAttribute('data-asset-type') || 'general';
        console.log(`[RESOLVE-MODULE] \ud83d\udcda Library: ${assetType} (placeholder mantenido)`);
      }
    }

    const result = modified ? document.documentElement.outerHTML : html;
    console.log('=== MODULE IMAGE RESOLUTION COMPLETE ===');
    return result;
  } catch (error) {
    console.error('[RESOLVE-MODULE] Error:', error);
    return html;
  }
};

export default {
  compileLocalImagesToBase64,
  compileAllImagesToBase64,
  resolveModuleImages
};
