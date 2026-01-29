<?php
// backend/api/auth/verify.php
require_once __DIR__ . '/../common_auth.php'; // This should have session_start()

// Check if the session variable we set in login.php exists
if (!isset($_SESSION['user_id'])) {
    http_response_code(401); // This tells React "Log out now"
    echo json_encode([
        "status" => "error", 
        "message" => "Session expired"
    ]);
    exit;
}

// Optional: You can return fresh user data here if needed
echo json_encode([
    "status" => "success",
    "user_id" => $_SESSION['user_id'],
    "role" => $_SESSION['user_role']
]);