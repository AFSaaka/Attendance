<?php
// backend/api/auth/login.php

require_once __DIR__ . '/../common_auth.php';

$data = json_decode(file_get_contents('php://input'), true);
$ip = $_SERVER['REMOTE_ADDR'];

if (empty($data['email']) || empty($data['password'])) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Email and password required."]);
    exit;
}

try {
    // 1. RATE LIMITING CHECK
    $limitStmt = $pdo->prepare("SELECT attempts, last_attempt FROM login_attempts WHERE ip_address = ?");
    $limitStmt->execute([$ip]);
    $throttle = $limitStmt->fetch();

    if ($throttle) {
        $lastAttempt = strtotime($throttle['last_attempt']);
        // Block if 5 failed attempts occurred within the last 15 minutes
        if ($throttle['attempts'] >= 5 && (time() - $lastAttempt) < 900) {
            http_response_code(429);
            echo json_encode(["status" => "error", "message" => "Too many failed attempts. Try again in 15 minutes."]);
            exit;
        }
    }

    // 2. FETCH USER
    $stmt = $pdo->prepare("
        SELECT id, user_name, email, password_hash, role, admin_level, uin, 
               device_fingerprint, is_email_verified, must_reset_password 
        FROM users 
        WHERE email = ? AND is_active = TRUE
    ");
    $stmt->execute([$data['email']]);
    $user = $stmt->fetch();
if ($user && password_verify($data['password'], $user['password_hash'])) {
        
        $clearStmt = $pdo->prepare("DELETE FROM login_attempts WHERE ip_address = ?");
        $clearStmt->execute([$ip]);

        // Fix: Better boolean check for Postgres
        if ($user['role'] === 'student' && !$user['is_email_verified']) {
            http_response_code(403);
            echo json_encode(["status" => "error", "message" => "Please verify your email."]);
            exit;
        }

        // ... (Device lock logic)

        // 5. SECURE SESSION ASSIGNMENT
        // session_regenerate_id(true); // COMMENT THIS OUT for cross-site stability
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['user_role'] = $user['role'];

        // FORCE PHP to save the session before sending JSON
        session_write_close(); 

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
        exit;
    } else {
        // FAILURE: Track attempt
        // Ensure 'ip_address' has a UNIQUE index in Neon for ON CONFLICT to work
        $upsertRetry = $pdo->prepare("
            INSERT INTO login_attempts (ip_address, attempts, last_attempt) 
            VALUES (:ip, 1, NOW())
            ON CONFLICT (ip_address) 
            DO UPDATE SET attempts = login_attempts.attempts + 1, last_attempt = NOW()
        ");
        $upsertRetry->execute(['ip' => $ip]);

        http_response_code(401);
        echo json_encode(["status" => "error", "message" => "Invalid email or password."]);
    }
} catch (PDOException $e) {
    error_log("Login Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Internal server error."]);
}