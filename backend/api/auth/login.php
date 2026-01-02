<?php
// backend/api/auth/login.php

require_once __DIR__ . '/../common_auth.php';

$data = json_decode(file_get_contents('php://input'), true);

if (empty($data['email']) || empty($data['password'])) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Email and password required."]);
    exit;
}

try {
    // UPDATED QUERY: Added must_reset_password
    $stmt = $pdo->prepare("
        SELECT id, user_name, email, password_hash, role, admin_level, uin, 
               device_fingerprint, is_email_verified, must_reset_password 
        FROM users 
        WHERE email = ? AND is_active = TRUE
    ");
    $stmt->execute([$data['email']]);
    $user = $stmt->fetch();

    if ($user && password_verify($data['password'], $user['password_hash'])) {

        // 2. ROLE DEPRECATION CHECK
        if ($user['role'] === 'coordinator') {
            http_response_code(403);
            echo json_encode(["status" => "error", "message" => "Access Denied: The Coordinator portal is no longer active."]);
            exit;
        }

        // 3. EMAIL VERIFICATION CHECK (Students only)
        if ($user['role'] === 'student' && $user['is_email_verified'] == false) {
            http_response_code(403);
            echo json_encode([
                "status" => "error",
                "requires_verification" => true,
                "email" => $user['email'],
                "message" => "Please verify your email before logging in."
            ]);
            exit;
        }

        // 4. DEVICE LOCK LOGIC (Strictly for Students)
        if ($user['role'] === 'student') {
            $current_fingerprint = md5($_SERVER['HTTP_USER_AGENT']);
            $deviceCheck = $pdo->prepare("SELECT email FROM users WHERE device_fingerprint = ? AND id != ?");
            $deviceCheck->execute([$current_fingerprint, $user['id']]);
            if ($deviceCheck->fetch()) {
                http_response_code(403);
                echo json_encode(["status" => "error", "message" => "Device Violation: Phone linked to another account."]);
                exit;
            }

            if (empty($user['device_fingerprint'])) {
                $update = $pdo->prepare("UPDATE users SET device_fingerprint = ?, device_locked_at = NOW() WHERE id = ?");
                $update->execute([$current_fingerprint, $user['id']]);
            } else if ($user['device_fingerprint'] !== $current_fingerprint) {
                http_response_code(403);
                echo json_encode(["status" => "error", "message" => "Account Locked: Different device detected."]);
                exit;
            }
        }

        // 5. SECURE SESSION ASSIGNMENT
        session_regenerate_id(true);
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['user_role'] = $user['role'];

        // UPDATED RESPONSE: Added must_reset_password flag
        echo json_encode([
            "status" => "success",
            "user" => [
                "email" => $user['email'],
                "user_name" => $user['user_name'],
                "role" => $user['role'],
                "uin" => $user['uin'],
                "admin_level" => $user['admin_level'],
                "must_reset_password" => (bool)$user['must_reset_password']
            ]
        ]);
    } else {
        http_response_code(401);
        echo json_encode(["status" => "error", "message" => "Invalid email or password."]);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Internal server error."]);
}