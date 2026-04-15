
const IMAGE_CACHE = new Map<string, string>();

// Acumular tokens de imágenes
let imageGenerationTokens = 0;

/**
 * Resetear contador de tokens de imágenes
 */
export const resetImageTokens = () => {
  imageGenerationTokens = 0;
};

/**
 * Obtener total de tokens consumidos por imágenes
 */
export const getImageTokens = () => {
  return imageGenerationTokens;
};

/**
 * Fetches an image from a URL and converts it to a Base64 Data URI.
 * Includes a timeout and caching mechanism.
 */
export const fetchImageAsBase64 = async (url: string): Promise<string | null> => {
  // Return cached version if available to save bandwidth/time
  if (IMAGE_CACHE.has(url)) return IMAGE_CACHE.get(url)!;

  try {
    // 8 second timeout for image generation/download
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, { 
      signal: controller.signal,
      headers: {
        'Accept': 'image/*'
      }
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
    
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        IMAGE_CACHE.set(url, base64);
        resolve(base64);
      };
      reader.onerror = () => {
        console.warn('Failed to convert blob to base64');
        resolve(null);
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn(`Failed to download image from ${url}:`, error);
    return null; // Return null to keep the original URL as fallback
  }
};

import { generateImageWithNanoBanana } from './nanoBananaService';

interface ImageConfig {
  apiKey?: string;
  model?: string;
}

/**
 * Scans HTML for Pollinations AI, Unsplash and Gemini Nano images, downloads/generates them, and embeds them as Base64.
 * This solves the "slow loading" or "broken link" issues by freezing the asset state.
 */
export const stabilizeImages = async (html: string, imageConfig?: ImageConfig): Promise<string> => {
  // Regex to find image src attributes.
  // Supports:
  // 1. Pollinations: https://image.pollinations.ai/...
  // 2. Unsplash Source: https://source.unsplash.com/...
  // 3. Gemini Nano: GEMINI_GENERATE:description
  const regex = /src=["']((?:https:\/\/image\.pollinations\.ai\/|https:\/\/source\.unsplash\.com\/|GEMINI_GENERATE:)[^"']+)["']/g;
  
  const matches = [...html.matchAll(regex)];
  if (matches.length === 0) return html;

  // Deduplicate URLs to fetch efficiently
  const urls = Array.from(new Set(matches.map(m => m[1])));
  
  console.log(`Stabilizing ${urls.length} external images...`);

  // Get API key from config or use provided config
  let apiKey = imageConfig?.apiKey || '';
  let model = imageConfig?.model || 'gemini-3.1-flash-image-preview';
  
  // If no API key provided, try to get it from admin config
  if (!apiKey) {
    try {
      const adminToken = localStorage.getItem('admin_token');
      if (adminToken) {
        const configRes = await fetch(`${window.location.origin.replace(':3000', ':3001')}/api/admin/config`, {
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          }
        });
        if (configRes.ok) {
          const config = await configRes.json();
          apiKey = config.image_api_key || '';
          model = config.image_model || model;
        }
      }
    } catch (err) {
      console.warn('Could not get admin config for images:', err);
    }
  }
  
  console.log('Using image config - API Key:', apiKey ? 'configured' : 'NOT configured', 'Model:', model);

  // Fetch all images in parallel
  const results = await Promise.all(urls.map(async (url: string) => {
    let base64: string | null = null;
    
    // Check if it's a Gemini Nano generation request
    if (url.startsWith('GEMINI_GENERATE:')) {
      const prompt = url.replace('GEMINI_GENERATE:', '').trim();
      console.log('Generating image with NanoBanana:', prompt.substring(0, 50) + '...');
      
      if (!apiKey) {
        console.error('No API key available for image generation');
        return { url, base64: null };
      }
      
      try {
        const result = await generateImageWithNanoBanana(prompt, apiKey, model as any);
        
        if (result.success && result.image) {
          base64 = `data:image/png;base64,${result.image}`;
          console.log('Image generated successfully');
        } else {
          console.error('Failed to generate image:', result.error);
        }
      } catch (err) {
        console.error('Error generating Gemini image:', err);
      }
    } else {
      // Decode HTML entities in URL (e.g. &amp; -> &) before fetching
      const cleanUrl = url.replace(/&amp;/g, '&');
      base64 = await fetchImageAsBase64(cleanUrl);
    }
    
    return { url, base64 };
  }));

  let newHtml = html;
  
  // Replace URLs with Base64 data
  results.forEach(({ url, base64 }) => {
    if (base64) {
      // Use split/join for global replacement without regex special char issues
      newHtml = newHtml.split(url).join(base64);
    }
  });

  return newHtml;
};
