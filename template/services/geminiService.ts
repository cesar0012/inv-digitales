import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION } from '../constants';
import { Attachment, ImageSource } from '../types';
import { stabilizeImages } from './imageService';

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Models
const ARCHITECT_MODEL = 'gemini-3.1-pro-preview'; 
const IMAGE_MODEL = 'gemini-2.5-flash-image';

const cleanCode = (text: string) => {
  if (!text) return "";
  let cleaned = text.replace(/```html\s*/g, '').replace(/```\s*/g, '');
  const htmlMatch = cleaned.match(/<!DOCTYPE html>[\s\S]*?<\/html>|<html[\s\S]*?<\/html>/i);
  return htmlMatch ? htmlMatch[0] : cleaned;
};

const generateGeminiImages = async (html: string): Promise<string> => {
  const regex = /src=["']GEMINI_GENERATE:([^"']+)["']/g;
  const matches = [...html.matchAll(regex)];
  if (matches.length === 0) return html;
  const results = await Promise.all(matches.map(async (match) => {
    const fullMatch = match[0];
    const description = match[1];
    try {
      const response = await ai.models.generateContent({
        model: IMAGE_MODEL,
        contents: { parts: [{ text: description }] }
      });
      let base64 = null;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          base64 = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }
      return { fullMatch, base64 };
    } catch (e) {
      return { fullMatch, base64: null };
    }
  }));
  let newHtml = html;
  results.forEach(({ fullMatch, base64 }) => {
    if (base64) newHtml = newHtml.replace(fullMatch, `src="${base64}"`);
    else newHtml = newHtml.replace(fullMatch, `src="https://placehold.co/800x600?text=Gen+Failed"`);
  });
  return newHtml;
};

export const generateWebProject = async (
  prompt: string,
  imageSource: ImageSource,
  attachments: Attachment[] = []
): Promise<string> => {
  try {
    const fullPrompt = `${prompt}\n\nIDs: main-header, main-content, main-footer. Raw HTML only.`;
    const dynamicSystemInstruction = `${SYSTEM_INSTRUCTION}\n${imageSource.promptInstruction}`;

    const parts: any[] = [{ text: fullPrompt }];
    attachments.forEach(att => {
      if (att.type === 'image') {
        const base64Data = att.content.split(',')[1] || att.content;
        parts.push({ inlineData: { mimeType: att.mimeType || 'image/png', data: base64Data } });
      }
    });
    const response = await ai.models.generateContent({
      model: ARCHITECT_MODEL,
      contents: { parts },
      config: { systemInstruction: dynamicSystemInstruction, temperature: 0.4 }
    });
    const rawResponse = response.text || "";

    let cleanedCode = cleanCode(rawResponse);
    if (imageSource.id === 'gemini-nano') {
       cleanedCode = await generateGeminiImages(cleanedCode);
    } else {
       cleanedCode = await stabilizeImages(cleanedCode);
    }
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
  imageSource: ImageSource
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

    const dynamicSystemInstruction = `${SYSTEM_INSTRUCTION}\n${imageSource.promptInstruction}`;

    const response = await ai.models.generateContent({
      model: ARCHITECT_MODEL,
      contents: [
        { role: 'user', parts: [{ text: "Here is the current HTML code:\n\n" + currentCode }] },
        { role: 'user', parts: [{ text: prompt }] }
      ],
      config: { systemInstruction: dynamicSystemInstruction, temperature: 0.4 }
    });

    const rawResponse = response.text || "";
    if (rawResponse.trim().startsWith("ERROR:")) {
      throw new Error(rawResponse.trim().replace("ERROR: ", ""));
    }

    let cleanedCode = cleanCode(rawResponse);
    if (imageSource.id === 'gemini-nano') {
       cleanedCode = await generateGeminiImages(cleanedCode);
    } else {
       cleanedCode = await stabilizeImages(cleanedCode);
    }
    return cleanedCode;
  } catch (error) {
    console.error("Add Module Error:", error);
    throw error;
  }
};

export const modifyProjectDesign = async (
  currentCode: string,
  designDescription: string,
  imageSource: ImageSource
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

    const dynamicSystemInstruction = `${SYSTEM_INSTRUCTION}\n${imageSource.promptInstruction}`;

    const response = await ai.models.generateContent({
      model: ARCHITECT_MODEL,
      contents: [
        { role: 'user', parts: [{ text: "Here is the current HTML code:\n\n" + currentCode }] },
        { role: 'user', parts: [{ text: prompt }] }
      ],
      config: { systemInstruction: dynamicSystemInstruction, temperature: 0.4 }
    });

    const rawResponse = response.text || "";
    let cleanedCode = cleanCode(rawResponse);
    if (imageSource.id === 'gemini-nano') {
       cleanedCode = await generateGeminiImages(cleanedCode);
    } else {
       cleanedCode = await stabilizeImages(cleanedCode);
    }
    return cleanedCode;
  } catch (error) {
    console.error("Modify Design Error:", error);
    throw error;
  }
};
