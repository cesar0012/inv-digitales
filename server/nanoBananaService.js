/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NANO BANANA - Gemini Image Generation Service
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * USO CORRECTO (verificado funcionando):
 * - API: v1beta (NO v1)
 * - Modelo: gemini-3.1-flash-image-preview
 * - Endpoint: v1beta/models/{model}:generateContent
 * - API Key: En header 'x-goog-api-key'
 * - Body: contents + generationConfig
 */

export const generateImageWithNanoBanana = async (prompt, apiKey, model = 'gemini-3.1-flash-image-preview') => {
  try {
    // Endpoint correcto: v1beta con :generateContent
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    console.log('=== NANO BANANA IMAGE GENERATION ===');
    console.log('Model:', model);
    console.log('Prompt:', prompt.substring(0, 60) + '...');
    console.log('=====================================');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey  // API key en el header
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.9,
          topP: 0.95,
          maxOutputTokens: 4096
        }
      })
    });

    const httpCode = response.status;
    console.log('HTTP:', httpCode);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('API Error:', JSON.stringify(errorData, null, 2));
      return {
        image: '',
        success: false,
        error: errorData.error?.message || `HTTP ${httpCode}`
      };
    }

    const data = await response.json();
    
    // Extraer imagen de inlineData
    let base64Image = '';
    let mimeType = 'image/png';
    
    const parts = data.candidates?.[0]?.content?.parts || [];
    
    for (const part of parts) {
      if (part.inlineData?.data) {
        base64Image = part.inlineData.data;
        mimeType = part.inlineData.mimeType || 'image/png';
        break;
      }
    }
    
    if (!base64Image) {
      console.error('No image in response:', JSON.stringify(data, null, 2));
      return {
        image: '',
        success: false,
        error: 'No se pudo extraer la imagen de la respuesta'
      };
    }

    console.log('=== IMAGEN GENERADA ===');
    console.log('Tipo:', mimeType);
    console.log('Tamaño:', base64Image.length, 'bytes (base64)');
    console.log('=======================');

    return {
      image: base64Image,
      success: true
    };
  } catch (error) {
    console.error('Error en generateImageWithNanoBanana:', error);
    return {
      image: '',
      success: false,
      error: error.message || 'Error desconocido'
    };
  }
};
