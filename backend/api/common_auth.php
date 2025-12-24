<?php
// backend/api/common_auth.php
ob_start(); // Prevent accidental whitespace from breaking headers

// 1. Centralized CORS Policy - MUST BE AT THE VERY TOP
$allowed_origin = "http://localhost:5173";

header("Access-Control-Allow-Origin: $allowed_origin");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// 2. Handle Preflight OPTIONS requests immediately
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// 3. Strict Session Security
ini_set('session.cookie_httponly', 1);
ini_set('session.use_only_cookies', 1);
ini_set('session.cookie_samesite', 'Lax'); // Change to Lax for better cross-origin local dev support

session_start([
    'cookie_lifetime' => 86400,
    'cookie_secure' => false, // Keep false for http://localhost
]);

// 4. Global Database Connection
require_once __DIR__ . '/../config/db.php';
$pdo = getDB();

function requireLogin()
{
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(["status" => "error", "message" => "Unauthorized access."]);
        exit;
    }
}