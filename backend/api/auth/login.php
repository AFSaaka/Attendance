<?php
// backend/api/auth/login.php
require_once __DIR__ . '/../../config/db.php';

$pdo = getDB();
$data = json_decode(file_get_contents('php://input'), true);

if (empty($data['email']) || empty($data['password'])) {
    echo json_encode(["status" => "error", "message" => "Email and password required."]);
    exit;
}

try {
    // 1. Fetch user by email
    $stmt = $pdo->prepare("SELECT id, email, password_hash, role, admin_level, uin FROM users WHERE email = ? AND is_active = TRUE");
    $stmt->execute([$data['email']]);
    $user = $stmt->fetch();

    if ($user && password_verify($data['password'], $user['password_hash'])) {
        unset($user['password_hash']); // Security first

        echo json_encode([
            "status" => "success",
            "user" => [
                "id" => $user['id'],
                "email" => $user['email'],
                "role" => $user['role'],
                "admin_level" => $user['admin_level'],
                "uin" => $user['uin']
            ]
        ]);
    } else {
        // Security Tip: Use a generic error message so hackers don't know if the email exists
        http_response_code(401);
        echo json_encode(["status" => "error", "message" => "Invalid email or password."]);
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error occurred."]);
}