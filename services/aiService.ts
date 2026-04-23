import { SYSTEM_INSTRUCTION } from '../constants';
import { Attachment, ImageSource } from '../types';
import { stabilizeImages } from './imageService';

const API_BASE = `${import.meta.env.VITE_PUBLIC_URL || window.location.origin}/api`;

const fetchConfig = async (): Promise<string> => {
  const url = `${import.meta.env.VITE_PUBLIC_URL || window.location.origin}/api/config/public`;
  console.log('Fetching config from:', url);
  const res = await fetch(url);
  const config = await res.json();
  console.log('Config fetched:', config);
  return config.login_page_url || '/admin-login';
};

const cleanCode = (text: string): string => {
  if (!text) return "";
  let cleaned = text.replace(/```html\s*/g, '').replace(/```\s*/g, '');
  const htmlMatch = cleaned.match(/<!DOCTYPE html>[\s\S]*?<\/html>|<html[\s\S]*?<\/html>/i);
  return htmlMatch ? htmlMatch[0] : cleaned;
};

const buildImageContent = (attachments: Attachment[]) => {
  return attachments
    .filter(att => att.type === 'image')
    .map(att => {
      const base64Data = att.content.split(',')[1] || att.content;
      return {
        type: 'image_url' as const,
        image_url: {
          url: `data:${att.mimeType || 'image/png'};base64,${base64Data}`
        }
      };
    });
};

export const generateWebProject = async (
  prompt: string,
  imageSource: ImageSource,
  attachments: Attachment[] = [],
  editorConfig?: { eventType: string; theme: string; primaryColor: string; secondaryColor: string },
  imageFiles?: { folder: string; filename: string }[],
  purchaseId?: string
): Promise<string> => {
  try {
    const currentDate = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const fullPrompt = `${prompt}\n\nSYSTEM_TIMESTAMP: ${currentDate}\n\nIDs: main-header, main-content, main-footer. Raw HTML only.`;
    const token = localStorage.getItem('auth_token');
    console.log('=== DEBUG TOKEN ===');
    console.log('Token from localStorage:', token ? 'EXISTS' : 'NOT FOUND');
    console.log('==================');
    
    const response = await fetch(`${API_BASE}/generate-html`, {
      method: 'POST',
      credentials: 'include', // Enviar cookies
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        prompt: fullPrompt,
        attachments: attachments,
        editorConfig: editorConfig,
        imageFiles: imageFiles,
        promptInstruction: imageSource?.promptInstruction || '',
        purchaseId: purchaseId || ''
      })
    });

    // ============================================================
    // MANEJO DE 401 - REDIRECCIONAR A LOGIN CONFIGURABLE
    // ============================================================
    if (!response.ok && response.status === 401) {
      console.log('=== 401 RECIBIDO - BUSCANDO LOGIN URL ===');
      try {
        const loginUrl = await fetchConfig();
        console.log('Redirecting to:', loginUrl);
        window.location.href = loginUrl;
      } catch (e) {
        console.error('Error getting config:', e);
        window.location.href = '/admin-login';
      }
      throw new Error('No autenticado');
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Error ${response.status}`);
    }

    const data = await response.json();
    let cleanedCode = cleanCode(data.html);
    cleanedCode = await stabilizeImages(cleanedCode);
    
    return cleanedCode;
  } catch (error) {
    console.error("Generation Error:", error);
    throw error;
  }
};

export const addModuleToProject = async (
  currentCode: string,
  insertAfterModule: string,
  moduleDescription: string,
  imageSource: ImageSource,
  purchaseId?: string
): Promise<string> => {
  try {
    const prompt = `
You are modifying an existing digital invitation HTML.
The user wants to add a new module described as: "${moduleDescription}".

CRITICAL VALIDATION:
First, evaluate if this module is appropriate for a digital invitation (e.g., wedding, sweet 15, baptism, party). 
If it is completely unrelated or inappropriate (e.g., 'add a car racing game', 'add a calculator', 'add a stock ticker'), you MUST return exactly the string: "ERROR: El módulo solicitado no es apropiado para una invitación." and nothing else.

If it is appropriate, generate the HTML for this new module and insert it into the provided HTML code.
- The new module MUST follow the same styling, color palette, and structure as the existing code.
- It MUST use Tailwind CSS.
- It MUST include \`data-gemini-id="[module-name]-[element-name]"\` attributes for all editable elements (text, images, iframes).
- Insert the new module specifically AFTER the module named "${insertAfterModule}". 
  - If "${insertAfterModule}" is "Al principio", insert it at the top of the main content container.
  - If "${insertAfterModule}" is "Al final", insert it at the bottom of the main content container.
  - Otherwise, find the section/div containing elements with \`data-gemini-id\` starting with "${insertAfterModule}-" and insert the new module after it.

Return the complete, updated HTML code. Raw HTML only, no markdown formatting.
`;

    const addModulePrompt = `Current HTML code:\n${currentCode}\n\n${prompt}`;

    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/generate-html`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        prompt: addModulePrompt,
        attachments: [],
        promptInstruction: imageSource?.promptInstruction || '',
        purchaseId: purchaseId || ''
      })
    });

    // 401 = Redirect to login configurable
    if (!response.ok && response.status === 401) {
      console.log('=== 401 EN addModuleToProject ===');
      try {
        const loginUrl = await fetchConfig();
        console.log('Redirecting to:', loginUrl);
        window.location.href = loginUrl;
      } catch {
        window.location.href = '/admin-login';
      }
      throw new Error('No autenticado');
    }

    if (!response.ok) {
      const errorData = await response.json();
      if (errorData.error?.includes('no es apropiado')) {
        throw new Error(errorData.error);
      }
      throw new Error(errorData.error || `Error ${response.status}`);
    }

    const data = await response.json();
    const rawResponse = data.html;
    
    if (rawResponse.trim().startsWith("ERROR:")) {
      throw new Error(rawResponse.trim().replace("ERROR: ", ""));
    }

    let cleanedCode = cleanCode(rawResponse);
    cleanedCode = await stabilizeImages(cleanedCode);
    
    return cleanedCode;
  } catch (error) {
    console.error("Add Module Error:", error);
    throw error;
  }
};

export const modifyProjectDesign = async (
  currentCode: string,
  designDescription: string,
  imageSource: ImageSource,
  purchaseId?: string
): Promise<string> => {
  try {
    const prompt = `
You are modifying the design of an existing digital invitation HTML.
The user wants to make the following design changes: "${designDescription}".

CRITICAL INSTRUCTIONS:
- You MUST apply these design changes to the existing HTML.
- You MUST keep ALL existing content, structure, and \`data-gemini-id\` attributes EXACTLY intact. Do not remove, rename, or alter the \`data-gemini-id\` attributes, as they are required for the editor to work.
- You can change Tailwind classes, inline styles, fonts, background colors, and layout structures to match the requested design.
- If the user asks for something completely unrelated to design (e.g., 'add a calculator'), ignore that part and only apply design changes.

Return the complete, updated HTML code. Raw HTML only, no markdown formatting.
`;

    const designPrompt = `Current HTML code:\n${currentCode}\n\n${prompt}`;

    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/generate-html`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        prompt: designPrompt,
        attachments: [],
        promptInstruction: imageSource?.promptInstruction || '',
        purchaseId: purchaseId || ''
      })
    });

    if (!response.ok) {
      // Si es 401 (No autenticado), obtener URL de login y redireccionar
      if (response.status === 401) {
        try {
          const configRes = await fetch(`${API_BASE}/config/public`);
          const config = await configRes.json();
          const loginUrl = config.login_page_url || '/admin-login';
          window.location.href = loginUrl;
        } catch {
          window.location.href = '/admin-login';
        }
      }
      const errorData = await response.json();
      throw new Error(errorData.error || `Error ${response.status}`);
    }

    const data = await response.json();
    let cleanedCode = cleanCode(data.html);
    cleanedCode = await stabilizeImages(cleanedCode);
    
    return cleanedCode;
  } catch (error) {
    console.error("Modify Design Error:", error);
    throw error;
  }
};