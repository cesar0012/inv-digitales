<?php

/**
 * Test de la Service API del Generador de Invitaciones
 * 
 * Uso:
 *   php test_service_api.php
 *   php test_service_api.php https://generador.invitacionesmodernas.com
 */

$baseUrl = $argv[1] ?? 'http://localhost:3001';
$serviceToken = 'inv_service_token_2026_secure';

echo "=== Service API Test ===\n";
echo "Base URL: {$baseUrl}\n";
echo "Token: {$serviceToken}\n\n";

function makeRequest($url, $token) {
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $token,
            'Accept: application/json',
        ],
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false,
        CURLOPT_TIMEOUT => 10,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    return [
        'status' => $httpCode,
        'body' => $response,
        'error' => $error,
    ];
}

function printResult($label, $result) {
    echo "--- {$label} ---\n";
    echo "Status: {$result['status']}\n";
    if ($result['error']) {
        echo "cURL Error: {$result['error']}\n";
    }
    $json = json_decode($result['body'], true);
    if ($json) {
        echo json_encode($json, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
    } else {
        echo "Body: {$result['body']}\n";
    }
    echo "\n";
}

// Test 1: Sin token (debe dar 401)
echo "Test 1: GET /api/service/users SIN token\n";
$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => "{$baseUrl}/api/service/users",
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'Accept: application/json',
    ],
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_SSL_VERIFYHOST => false,
    CURLOPT_TIMEOUT => 10,
]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
echo "Status: {$httpCode}\n";
echo "Body: {$response}\n\n";

// Test 2: Token incorrecto (debe dar 401)
echo "Test 2: GET /api/service/users con token INCORRECTO\n";
$result = makeRequest("{$baseUrl}/api/service/users", 'token-equivocado');
printResult('Token incorrecto', $result);

// Test 3: Token correcto - lista de usuarios
echo "Test 3: GET /api/service/users con token CORRECTO\n";
$result = makeRequest("{$baseUrl}/api/service/users", $serviceToken);
printResult('Lista de usuarios', $result);

// Test 4: Token correcto - detalle de un usuario especifico
echo "Test 4: GET /api/service/users/:userId con token CORRECTO\n";
echo "Usando userId = 135 (usuario de prueba)\n";
$result = makeRequest("{$baseUrl}/api/service/users/135", $serviceToken);
printResult('Detalle de usuario', $result);

// Test 5: Usuario que no existe
echo "Test 5: GET /api/service/users/:userId con userId inexistente\n";
$result = makeRequest("{$baseUrl}/api/service/users/999999", $serviceToken);
printResult('Usuario no encontrado', $result);

echo "=== Tests completados ===\n";