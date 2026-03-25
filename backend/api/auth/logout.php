<?php
// backend/api/auth/logout.php
header("Content-Type: application/json");

// Use common_auth to start session with correct production settings
// (SameSite=None, Secure=true for cross-origin Netlify -> Render)
require_once __DIR__ . '/../common_auth.php';

$_SESSION = [];

if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(
        session_name(),
        '',
        time() - 42000,
        $params["path"],
        $params["domain"],
        $params["secure"],
        $params["httponly"]
    );
}

session_destroy();

echo json_encode(["status" => "success", "message" => "Logged out."]);