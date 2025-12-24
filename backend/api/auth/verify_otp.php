<?php
// backend/api/auth/verify_otp.php
header('Content-Type: application/json');
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../utils/mailer.php';

$pdo = getDB();
$data = json_decode(file_get_contents('php://input'), true);

$email = $data['email'] ?? '';
$submitted_otp = $data['otp'] ?? '';

if (empty($email) || empty($submitted_otp)) {
    echo json_encode(["status" => "error", "message" => "Email and OTP are required."]);
    exit;
}

try {
    $pdo->beginTransaction();

    // Fetch user and lock row for update to prevent race conditions
    $stmt = $pdo->prepare("SELECT id, otp_code, otp_expires_at, otp_failed_attempts FROM users WHERE email = ? FOR UPDATE");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || empty($user['otp_code'])) {
        throw new Exception("No active verification session found. Please request a new code.");
    }

    // 1. Check if expired
    if (strtotime($user['otp_expires_at']) < time()) {
        // Security: Wipe the expired code so it can't be guessed later
        $pdo->prepare("UPDATE users SET otp_code = NULL WHERE id = ?")->execute([$user['id']]);
        $pdo->commit();
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "OTP expired. Please request a new one."]);
        exit;
    }

    // 2. Verify Code
    if ($user['otp_code'] === $submitted_otp) {
        // SUCCESS: Use the correct column 'is_email_verified'
        $update = $pdo->prepare("
            UPDATE users 
            SET is_email_verified = TRUE, 
                otp_code = NULL, 
                otp_failed_attempts = 0 
            WHERE id = ?
        ");
        $update->execute([$user['id']]);
        $pdo->commit();
        echo json_encode(["status" => "success", "message" => "Email verified successfully!"]);
    } else {
        // FAILURE: Increment attempts
        $new_attempts = $user['otp_failed_attempts'] + 1;

        if ($new_attempts >= 3) {
            // Brute force protection: Wipe the OTP entirely
            $wipe = $pdo->prepare("UPDATE users SET otp_code = NULL, otp_failed_attempts = 0 WHERE id = ?");
            $wipe->execute([$user['id']]);
            $pdo->commit();
            http_response_code(403);
            echo json_encode(["status" => "error", "message" => "Too many failed attempts. Your code has been invalidated."]);
        } else {
            $update = $pdo->prepare("UPDATE users SET otp_failed_attempts = ? WHERE id = ?");
            $update->execute([$new_attempts, $user['id']]);
            $pdo->commit();
            http_response_code(401);
            echo json_encode(["status" => "error", "message" => "Invalid code. " . (3 - $new_attempts) . " attempts remaining."]);
        }
    }
} catch (Exception $e) {
    if ($pdo->inTransaction())
        $pdo->rollBack();
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}