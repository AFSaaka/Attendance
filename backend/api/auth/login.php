<?php
// backend/api/auth/login.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Adjust for production security
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../../config/db.php';

$pdo = getDB();
$data = json_decode(file_get_contents('php://input'), true);

if (empty($data['email']) || empty($data['password'])) {
    echo json_encode(["status" => "error", "message" => "Email and password required."]);
    exit;
}

try {
    // 1. Fetch user - MUST include device_fingerprint in SELECT
    $stmt = $pdo->prepare("SELECT id, email, password_hash, role, admin_level, uin, device_fingerprint FROM users WHERE email = ? AND is_active = TRUE");
    $stmt->execute([$data['email']]);
    $user = $stmt->fetch();

    if ($user && password_verify($data['password'], $user['password_hash'])) {

        // 2. Apply Strict Lock for Students only
        if ($user['role'] === 'student') {
            // Stability Tip: Use User Agent only. Avoid IP as it changes on mobile data.
            $current_fingerprint = md5($_SERVER['HTTP_USER_AGENT']);

            // PHASE A: Check if this device is already claimed by SOMEONE ELSE
            $deviceCheck = $pdo->prepare("SELECT email FROM users WHERE device_fingerprint = ? AND id != ?");
            $deviceCheck->execute([$current_fingerprint, $user['id']]);
            $otherOwner = $deviceCheck->fetch();

            if ($otherOwner) {
                http_response_code(403);
                echo json_encode([
                    "status" => "error",
                    "message" => "Device Violation: This phone is already linked to student: " . $otherOwner['email']
                ]);
                exit;
            }

            // PHASE B: Handle this specific student's lock
            if (empty($user['device_fingerprint'])) {
                // First time login - Claim the device
                $updateStmt = $pdo->prepare("
                    UPDATE users 
                    SET device_fingerprint = ?, 
                        device_locked_at = CURRENT_TIMESTAMP 
                    WHERE id = ?
                ");
                $updateStmt->execute([$current_fingerprint, $user['id']]);
                $user['device_fingerprint'] = $current_fingerprint;
            } else if ($user['device_fingerprint'] !== $current_fingerprint) {
                // Student trying to use a second, different device
                http_response_code(403);
                echo json_encode([
                    "status" => "error",
                    "message" => "Account Locked: You are registered to a different device. Contact Admin to reset."
                ]);
                exit;
            }
        }

        // 3. Success Response
        echo json_encode([
            "status" => "success",
            "user" => [
                "id" => $user['id'],
                "email" => $user['email'],
                "role" => $user['role'],
                "uin" => $user['uin'],
                "admin_level" => $user['admin_level']
            ]
        ]);
    } else {
        http_response_code(401);
        echo json_encode(["status" => "error", "message" => "Invalid credentials."]);
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Server error. Please try again later."]);
}