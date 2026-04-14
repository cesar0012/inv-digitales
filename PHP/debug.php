<?php
$apiKey = 'AIzaSyBpcuQKGf5nEmK_K18W90pt-Yj11osBnXI';
$url = 'https://generativelanguage.googleapis.com/v1/models?key=' . $apiKey;

echo "URL: {$url}\n\n";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_VERBOSE, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);

echo "HTTP: {$httpCode}\n";
echo "Error: {$error}\n\n";

if ($response) {
    echo "Response:\n";
    $data = json_decode($response, true);
    print_r($data);
}
