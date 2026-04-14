<?php
/**
 * Obtener lista de modelos disponibles
 */

$API_KEY = 'AIzaSyBpcuQKGf5nEmK_K18W90pt-Yj11osBnXI';

// Probar todos los endpoints posibles
$URLS = [
    'https://generativelanguage.googleapis.com/v1/models',
    'https://generativelanguage.googleapis.com/v1beta/models',
    'https://generativelanguage.googleapis.com/v1/models?key=' . $API_KEY,
    'https://generativelanguage.googleapis.com/v1beta/models?key=' . $API_KEY
];

foreach ($URLS as $url) {
    echo "=== {$url} ===\n";
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    echo "HTTP: {$code}\n";
    
    if ($code === 200) {
        $data = json_decode($resp, true);
        
        if (isset($data['models'])) {
            echo "Modelos disponibles:\n";
            foreach ($data['models'] as $m) {
                $name = str_replace('models/', '', $m['name'] ?? '');
                $methods = implode(', ', $m['supportedGenerationMethods'] ?? []);
                echo "  {$name} -> {$methods}\n";
            }
        }
    } else {
        echo "{$resp}\n";
    }
    
    echo "\n";
}
