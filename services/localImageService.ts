import { EVENT_IMAGE_FOLDERS, IMAGE_KEYWORD_MAPPING, generateLocalImagePrompt } from '../constants';
import { LocalImageFile } from '../types';

const API_BASE = `${import.meta.env.VITE_PUBLIC_URL || window.location.origin}/api`;

export const getLocalImages = async (eventType: string): Promise<LocalImageFile[]> => {
  const folder = EVENT_IMAGE_FOLDERS[eventType];
  
  if (!folder) {
    return [];
  }

  try {
    const response = await fetch(`${API_BASE}/images/${encodeURIComponent(folder)}/list`);
    
    if (!response.ok) {
      console.warn(`No se pudieron obtener imágenes para ${eventType}`);
      return [];
    }
    
    const data = await response.json();
    const images: LocalImageFile[] = data.images.map((filename: string) => ({
      filename,
      section: detectSection(filename)
    }));
    
    return images;
  } catch (error) {
    console.error('Error al obtener imágenes locales:', error);
    return [];
  }
};

const detectSection = (filename: string): string => {
  const lowerName = filename.toLowerCase().replace(/\.jpg$|\.jpeg$|\.png$|\.webp$/gi, '');
  
  for (const [section, keywords] of Object.entries(IMAGE_KEYWORD_MAPPING)) {
    for (const keyword of keywords) {
      if (lowerName.includes(keyword)) {
        return section;
      }
    }
  }
  
  return 'general';
};

export const buildLocalImageContext = (
  eventType: string,
  localImages: LocalImageFile[]
): string => {
  return generateLocalImagePrompt(eventType, localImages);
};

export const hasLocalImages = (eventType: string): boolean => {
  return !!EVENT_IMAGE_FOLDERS[eventType];
};

export const getEventFolder = (eventType: string): string | null => {
  return EVENT_IMAGE_FOLDERS[eventType] || null;
};
