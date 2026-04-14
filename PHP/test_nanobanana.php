<?php
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NANO BANANA - Gemini Image Generation
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * USO CORRECTO (verificado funcionando):
 * - API: v1beta (NO v1)
 * - Modelo: gemini-3.1-flash-image-preview
 * - Endpoint: https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
 * - API Key: En header 'x-goog-api-key'
 * - Body: contents + generationConfig (NO instances/parameters)
 * 
 * Configura tu API Key abajo
 */

$API_KEY = 'AIzaSyBpcuQKGf5nEmK_K18W90pt-Yj11osBnXI';

// MODELO CORRECTO - ¡NO CAMBIAR! (gemini-3.1-flash-image-preview)
$MODEL = 'gemini-3.1-flash-image-preview';

$PROMPT = 'A beautiful underwater scene with pink coral and fish, highly detailed, digital art';

/**
 * Genera una imagen usando Google Gemini
 */
function generateImage($apiKey, $model, $prompt) {
    // Endpoint correcto: v1beta con :generateContent
    $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent";
    
    // Body correcto - multimodal generateContent
    $data = [
        'contents' => [
            [
                'role' => 'user',
                'parts' => [
                    ['text' => $prompt]
                ]
            ]
        ],
        'generationConfig' => [
            'temperature' => 0.9,
            'topP' => 0.95,
            'maxOutputTokens' => 4096
        ]
    ];
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'x-goog-api-key: ' . $apiKey
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 120);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode === 200) {
        $r = json_decode($response, true);
        
        // Buscar inlineData (imagen codificada en base64)
        $parts = $r['candidates'][0]['content']['parts'] ?? [];
        
        foreach ($parts as $part) {
            if (isset($part['inlineData']['data'])) {
                return [
                    'success' => true,
                    'image' => $part['inlineData']['data'],
                    'mimeType' => $part['inlineData']['mimeType'] ?? 'image/png'
                ];
            }
        }
        
        return ['success' => false, 'error' => 'No image in response'];
    }
    
    $err = json_decode($response, true);
    return ['success' => false, 'error' => $err['error']['message'] ?? $response];
}

// ═══════════════════════════════════════════════════════════════════════════════
// EJECUCIÓN
// ═══════════════════════════════════════════════���═══════════════════════════════

echo "=== NANO BANANA IMAGE GENERATOR ===\n";
echo "Modelo: {$MODEL}\n";
echo "Prompt: {$PROMPT}\n\n";

$result = generateImage($API_KEY, $MODEL, $PROMPT);

if ($result['success']) {
    echo "✓ IMAGEN GENERADA\n";
    echo "Tamaño: " . strlen($result['image']) . " bytes (base64)\n";
    
    // Guardar imagen
    $filename = __DIR__ . '/generated_' . time() . '.png';
    $saved = file_put_contents($filename, base64_decode($result['image']));
    
    if ($saved) {
        echo "Guardado: {$filename}\n";
        echo "Tamaño real: {$saved} bytes\n";
        exit(0);
    }
    
    echo "ERROR al guardar archivo\n";
    exit(1);
}

echo "✗ ERROR: " . $result['error'] . "\n";
exit(1);
