<?php
// backend/public/index.php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS')
    exit;

// Extract the URL from the query string
$url = isset($_GET['url']) ? rtrim($_GET['url'], '/') : '';

// Professional Routing
$routes = [
    'auth/register' => '../api/auth/register.php',
    'auth/login' => '../api/auth/login.php',
    'attendance/sync' => '../api/attendance/sync.php',

];

if (array_key_exists($url, $routes)) {
    require_once $routes[$url];
} else {
    http_response_code(404);
    echo json_encode(["status" => "error", "message" => "Endpoint not found"]);
}