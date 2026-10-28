import { AIModel } from '../types';

const GOOGLE_AI_BASE_URL = 'https://aiplatform.googleapis.com/v1';

interface GenerateImageResponse {
  image: string; // base64
  success: boolean;
  error?: string;
}

export const generateImageWithNanoBanana = async (
  prompt: string,
  apiKey: string,
  model: AIModel['id'] = 'gemini-3.1-flash-image-preview'
): Promise<GenerateImageResponse> => {
  try {
    const url = `${GOOGLE_AI_BASE_URL}/publishers/google/models/${model}:streamGenerateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.4,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 1500000,
          responseModalities: ['image']
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        image: '',
        success: false,
        error: errorData.error?.message || `HTTP ${response.status}`
      };
    }

    const data = await response.json();
    
    // Extraer la imagen de la respuesta
    // La estructura varía según el modelo
    let base64Image = '';
    
    if (data.candidates?.[0]?.content?.parts) {
      for (const part of data.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          base64Image = part.inlineData.data;
          break;
        }
      }
    }
    
    // Calcular tokens consumidos (aproximado: 1 token ≈ 4 caracteres)
    const inputTokens = Math.ceil(prompt.length / 4);
    // Las imágenes tienen un tamaño aproximado en tokens
    const estimatedImageTokens = base64Image ? Math.ceil(base64Image.length / 4) : 0;
    const outputTokens = 2048 + estimatedImageTokens; // Estimación
    const totalTokens = inputTokens + outputTokens;
    
    console.log('=== RESUMEN DE TOKENS - GENERACIÓN IMAGEN ===');
    console.log('Modelo utilizado:', model);
    console.log('Tokens de entrada (prompt):', inputTokens);
    console.log('Tokens de salida (imagen estimada):', estimatedImageTokens);
    console.log('Tokens totales consumidos:', totalTokens);
    console.log('==============================================');
    
    if (!base64Image) {
      return {
        image: '',
        success: false,
        error: 'No se pudo extraer la imagen de la respuesta'
      };
    }

    return {
      image: base64Image,
      success: true
    };
  } catch (error: any) {
    return {
      image: '',
      success: false,
      error: error.message || 'Error desconocido'
    };
  }
};

// Prompts copyright-safe predefinidos por tema
export const THEME_PROMPTS: Record<string, {
  hero: string;
  background: string;
  decoration: string;
}> = {
  'sirenita': {
    hero: 'A beautiful red-haired mermaid seen from behind, sitting on ocean rocks at sunset, green and blue tail visible, watercolor illustration style, no copyrighted characters',
    background: 'Underwater ocean scene with soft blue and teal gradients, gentle waves, distant sun rays through water, peaceful atmosphere, illustration style',
    decoration: 'Elegant decorative border with seashells, pearls, starfish, and flowing seaweed, gold and coral accents, vintage illustration style'
  },
  'harry potter': {
    hero: 'A magical castle on a hill at night, stars in the sky, moonlight, wizard school aesthetic, fantasy illustration style, no copyrighted characters',
    background: 'Mystical forest with tall trees, floating candles effect, soft golden light, magical atmosphere, dark green and gold tones, illustration',
    decoration: 'Decorative frame with magical symbols, stars, moons, Hogwarts-style crest elements, gold and deep purple accents, elegant border'
  },
  'spiderman': {
    hero: 'City skyline at night with webs, red and blue color accents, superhero silhouette, comic book style background, dynamic pose',
    background: 'Urban cityscape with buildings, dramatic sky with red-blue gradient, comic art style, action feel',
    decoration: 'Web pattern border with geometric shapes, red and blue accents, comic book style decorative elements, dynamic lines'
  },
  'frozen': {
    hero: 'Ice castle on a mountain, snow and ice crystals, winter wonderland, soft blue and white tones, magical frozen aesthetic, illustration style',
    background: 'Frozen landscape with snowflakes, aurora borealis effect, icy mountains, soft blue and white gradient, peaceful winter scene',
    decoration: 'Snowflake patterns, ice crystal borders, snow white and blue decorative elements, elegant frozen aesthetic'
  },
  'princesa': {
    hero: 'Elegant young woman with long flowing hair, royal dress, castle background, soft pastel colors, fairy tale illustration style',
    background: 'Magical kingdom with castle, gardens, soft pink and gold sky, whimsical atmosphere, fantasy illustration',
    decoration: 'Ornate golden frame with flowers, crowns, sparkles, elegant royal decorative border, pastel colors'
  },
  'superhéroe': {
    hero: 'Heroic figure in costume, dynamic pose, city background, bold colors, comic book style, action illustration',
    background: 'City skyline with dramatic lighting, action scene background, comic art style with bold colors',
    decoration: 'Bold comic-style decorative elements, lightning bolts, shield shapes, dynamic borders'
  },
  'espacial': {
    hero: 'Astronaut in space, planet visible, stars and galaxies background, cosmic aesthetic, sci-fi illustration style',
    background: 'Galaxy with nebula, stars, planets, deep space with purple and blue gradients, cosmic illustration',
    decoration: 'Planet rings, stars, rocket ships, cosmic decorative elements, purple and gold accents'
  },
  'dinosaurio': {
    hero: 'Friendly dinosaur in prehistoric landscape, green and brown tones, cute illustration style, nature background',
    background: 'Prehistoric forest with ferns, volcanoes in distance, warm earth tones, jungle atmosphere',
    decoration: 'Prehistoric leaf patterns, fossil shapes, dinosaur silhouettes, earthy decorative border'
  },
  'minnie': {
    hero: 'Cute mouse character with bow, pastel colors, polka dots, cheerful illustration style, cartoon aesthetic',
    background: 'Pastel colored background with polka dots, stars, soft pink and red tones, playful atmosphere',
    decoration: 'Polka dot patterns, bows, stars, playful decorative elements, pastel colors'
  },
  'mickey': {
    hero: 'Cute cartoon mouse character, big ears, cheerful expression, colorful background, classic cartoon style',
    background: 'Colorful cartoon background with geometric shapes, bright primary colors, playful atmosphere',
    decoration: 'Circle patterns, star shapes, colorful decorative elements, playful cartoon style'
  },
  'pokemon': {
    hero: 'Cute fictional creature, round shape, big eyes, colorful, soft illustration style, no specific copyrighted pokemon',
    background: 'Nature scene with grass, flowers, trees, soft colors, peaceful landscape',
    decoration: 'Nature-themed decorative border, leaves, flowers, cute creature silhouettes'
  },
  'marvel': {
    hero: 'Superhero silhouette with cape, dynamic pose, comic book style, bold colors, action illustration',
    background: 'City at night with dramatic lighting, comic art style, bold red and dark tones',
    decoration: 'Bold geometric shapes, shield patterns, dynamic comic-style decorative elements'
  },
  'dc': {
    hero: 'Heroic figure with mask, cape, comic style, bold colors, iconic silhouette, superhero aesthetic',
    background: 'Gothic cityscape at night, dramatic shadows, comic book art style, dark blue and black',
    decoration: 'Winged symbols, geometric patterns, comic-style decorative elements, bold colors'
  },
  'star wars': {
    hero: 'Character in robes with lightsaber, space background, sci-fi aesthetic, illustration style',
    background: 'Galaxy with stars, planets, nebula, deep space, sci-fi illustration',
    decoration: 'Sci-fi geometric patterns, planet shapes, stars, futuristic decorative elements'
  },
  'transformers': {
    hero: 'Robot character, mechanical design, metallic colors, powerful pose, sci-fi illustration',
    background: 'Industrial cityscape, mechanical elements, metallic and orange tones, sci-fi landscape',
    decoration: 'Gear patterns, mechanical shapes, metallic decorative elements, industrial aesthetic'
  },
  'pj masks': {
    hero: 'Child in costume with mask, superhero pose, colorful, nighttime city background, cartoon style',
    background: 'City at night with buildings, moon, stars, cartoon aesthetic, bright colors',
    decoration: 'Mask shapes, lightning bolts, moon and stars, colorful cartoon decorative elements'
  },
  'toy story': {
    hero: 'Toy character with western or space theme, friendly expression, nostalgic feel, illustration style',
    background: 'Playroom or space setting, warm colors, nostalgic toy aesthetic',
    decoration: 'Star shapes, cowboy hat patterns, playful decorative elements, warm colors'
  }
};

// Función para obtener prompts según tema
export const getThemePrompts = (theme: string): { hero: string; background: string; decoration: string } => {
  const lowerTheme = theme.toLowerCase();
  
  // Buscar coincidencia exacta o parcial
  for (const [key, prompts] of Object.entries(THEME_PROMPTS)) {
    if (lowerTheme.includes(key)) {
      return prompts;
    }
  }
  
  // Prompts genéricos copyright-safe
  return {
    hero: 'A beautiful illustrative portrait, soft colors, elegant composition, watercolor style, no copyrighted characters',
    background: 'Beautiful background with soft gradients, elegant pattern, harmonious colors, decorative illustration style',
    decoration: 'Decorative border with elegant patterns, harmonious colors, illustration style'
  };
};