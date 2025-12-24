<?php
// backend/api/auth/login.php

/**
 * 1. CENTRALIZED SECURITY & SESSION
 * This single line handles:
 * - session_start() with secure cookie params
 * - Access-Control-Allow-Origin: http://localhost:5173
 * - Access-Control-Allow-Credentials: true
 * - Database $pdo connection
 */
require_once __DIR__ . '/../common_auth.php';

// Logic begins
$data = json_decode(file_get_contents('php://input'), true);

if (empty($data['email']) || empty($data['password'])) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Email and password required."]);
    exit;
}

try {
    $stmt = $pdo->prepare("
        SELECT id, email, password_hash, role, admin_level, uin, device_fingerprint, is_email_verified 
        FROM users 
        WHERE email = ? AND is_active = TRUE
    ");
    $stmt->execute([$data['email']]);
    $user = $stmt->fetch();

    if ($user && password_verify($data['password'], $user['password_hash'])) {

        // 2. EMAIL VERIFICATION CHECK
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

        // 3. DEVICE LOCK LOGIC
        if ($user['role'] === 'student') {
            $current_fingerprint = md5($_SERVER['HTTP_USER_AGENT']);

            // Check if device is claimed by someone else
            $deviceCheck = $pdo->prepare("SELECT email FROM users WHERE device_fingerprint = ? AND id != ?");
            $deviceCheck->execute([$current_fingerprint, $user['id']]);
            if ($deviceCheck->fetch()) {
                http_response_code(403);
                echo json_encode(["status" => "error", "message" => "Device Violation: Phone linked to another account."]);
                exit;
            }

            // Lock device if new, or verify if existing
            if (empty($user['device_fingerprint'])) {
                $update = $pdo->prepare("UPDATE users SET device_fingerprint = ?, device_locked_at = NOW() WHERE id = ?");
                $update->execute([$current_fingerprint, $user['id']]);
            } else if ($user['device_fingerprint'] !== $current_fingerprint) {
                http_response_code(403);
                echo json_encode(["status" => "error", "message" => "Account Locked: Different device detected."]);
                exit;
            }
        }

        // 4. SECURE SESSION ASSIGNMENT
        // Protect against session fixation
        session_regenerate_id(true);
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['user_role'] = $user['role'];

        echo json_encode([
            "status" => "success",
            "user" => [
                "email" => $user['email'],
                "role" => $user['role'],
                "uin" => $user['uin'],
                "admin_level" => $user['admin_level']
            ]
        ]);
    } else {
        http_response_code(401);
        echo json_encode(["status" => "error", "message" => "Invalid email or password."]);
    }
} catch (PDOException $e) {
    // Note: In production, log $e->getMessage() to a file, don't show to user
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Internal server error."]);
}