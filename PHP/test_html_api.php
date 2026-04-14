<?php
/**
 * Test directo del API de generación HTML
 */

$API_KEY = 'AIzaSyBpcuQKGf5nEmK_K18W90pt-Yj11osBnXI';
$PROMPT = 'Genera una invitación para XV Años, theme elegante en rosa y dorado, la festejada se llama María';

$url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

$system_instruction = 'Eres un experto en diseño de invitaciones digitales. Genera HTML con Tailwind CSS. Añade data-gemini-id a todos los elementos editables.';

$data = [
    'contents' => [
        [
            'role' => 'user',
            'parts' => [
                ['text' => $system_instruction . "\n\n" . $PROMPT]
            ]
        ]
    ],
    'generationConfig' => [
        'temperature' => 0.1,
        'maxOutputTokens' => 8192
    ]
];

echo "=== TEST HTML GENERATION ===\n";
echo "Prompt: {$PROMPT}\n\n";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'x-goog-api-key: ' . $API_KEY
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 120);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP: {$httpCode}\n\n";

if ($httpCode === 200) {
    $r = json_decode($response, true);
    $html = $r['candidates'][0]['content']['parts'][0]['text'] ?? '';
    
    if ($html) {
        echo "HTML generado: " . strlen($html) . " bytes\n";
        
        // Guardar
        $filename = __DIR__ . '/test_invitation.html';
        file_put_contents($filename, $html);
        
        echo "Guardado: {$filename}\n";
        exit(0);
    }
    
    echo "Sin HTML en respuesta\n";
    print_r($r);
}

echo "Error: {$response}\n";
