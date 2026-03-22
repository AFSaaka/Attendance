<?php
header("Content-Type: application/json");
require_once __DIR__ . '/../common_auth.php';

// Just return the current session's CSRF token
// Session must already exist (user must be logged in)
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "Not authenticated."]);
    exit;
}

echo json_encode([
    "status" => "success",
    "csrf_token" => get_csrf_token()
]);