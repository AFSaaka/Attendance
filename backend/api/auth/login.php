<?php
// backend/api/auth/login.php
require_once __DIR__ . '/../common_auth.php';

$data = json_decode(file_get_contents('php://input'), true);
$ip = $_SERVER['REMOTE_ADDR'];
$email = $data['email'] ?? '';
$password = $data['password'] ?? '';
$current_device_id = $data['device_id'] ?? null; // Moved up for clarity

if (empty($email) || empty($password)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Email and password required."]);
    exit;
}

try {
    // 1. RATE LIMITING CHECK
   $limitStmt = $pdo->prepare(
    "SELECT attempts, last_attempt FROM public.login_attempts 
     WHERE ip_address::text = ? AND email = ?"
);
    $limitStmt->execute([$ip, $email]);
    $throttle = $limitStmt->fetch();

    if ($throttle) {
        $lastAttempt = strtotime($throttle['last_attempt']);
        if ($throttle['attempts'] >= 5 && (time() - $lastAttempt) < 900) {
            http_response_code(429);
            echo json_encode(["status" => "error", "message" => "Too many attempts. Try again in 15 minutes."]);
            exit;
        }
    }

    // 2. FETCH USER
    $stmt = $pdo->prepare("
        SELECT id, user_name, email, password_hash, role, admin_level, 
               uin, device_fingerprint, is_email_verified, must_reset_password, is_active
        FROM public.users WHERE email = ?
    ");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    // 3. AUTHENTICATION
    if ($user && $user['is_active'] && password_verify($password, $user['password_hash'])) {
        
        // Handle Device Locking for Students
        if ($user['role'] === 'student') {
            if (!$current_device_id) {
                http_response_code(400);
                echo json_encode(["status" => "error", "message" => "Device identification missing."]);
                exit;
            }

            // Check if device is stolen/shared
            $deviceCheck = $pdo->prepare("SELECT email FROM public.users WHERE device_fingerprint = ? AND id != ?");
            $deviceCheck->execute([$current_device_id, $user['id']]);
            if ($deviceCheck->fetch()) {
                http_response_code(403);
                echo json_encode(["status" => "error", "message" => "Device Violation: Linked to another account."]);
                exit;
            }

            // Lock device or verify
            if (empty($user['device_fingerprint'])) {
                $update = $pdo->prepare("UPDATE public.users SET device_fingerprint = ?, device_locked_at = NOW() WHERE id = ?");
                $update->execute([$current_device_id, $user['id']]);
            } elseif ($user['device_fingerprint'] !== $current_device_id) {
                http_response_code(403);
                echo json_encode(["status" => "error", "message" => "Account Locked: New device detected. Contact Coordinator."]);
                exit;
            }
        }

        // Email Verification Check
        if ($user['role'] === 'student' && !$user['is_email_verified']) {
            http_response_code(403);
            echo json_encode(["status" => "error", "requires_verification" => true, "email" => $user['email'], "message" => "Please verify your email."]);
            exit;
        }

        // Cleanup attempts on success
        $clearStmt = $pdo->prepare("DELETE FROM public.login_attempts WHERE ip_address = ?::inet AND email = ?");
        $clearStmt->execute([$ip, $email]);

        session_regenerate_id(true);
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['user_role'] = $user['role'];

        echo json_encode([
            "status" => "success",
            "user" => [
                "email" => $user['email'],
                "user_name" => $user['user_name'],
                "role" => $user['role'],
                "uin" => $user['uin'],
                "admin_level" => $user['admin_level'],
                "must_reset_password" => (bool) $user['must_reset_password']
            ]
        ]);
    } else {
       // 4. FAILURE PATH (The Postgres Upsert)
    $upsertRetry = $pdo->prepare("
        INSERT INTO public.login_attempts (ip_address, email, attempts, last_attempt)
        VALUES (?::inet, ?, 1, NOW())
        ON CONFLICT (ip_address, email) 
        DO UPDATE SET 
            attempts = login_attempts.attempts + 1,
            last_attempt = NOW()
        RETURNING attempts
    ");
    $upsertRetry->execute([$ip, $email]);
    $newCount = $upsertRetry->fetchColumn();

    if ($newCount >= 5) {
        http_response_code(429);
        echo json_encode(["status" => "error", "message" => "Too many attempts. Locked for 15 mins."]);
    } else {
        http_response_code(401);
        echo json_encode(["status" => "error", "message" => "Invalid email or password."]);
    }
    }
} catch (PDOException $e) {
    error_log("Login Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Internal server error."]);
}