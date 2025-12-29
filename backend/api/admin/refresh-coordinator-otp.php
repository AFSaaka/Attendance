<?php
// backend/api/admin/refresh-coordinator-otp.php
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../common_auth.php';

header("Content-Type: application/json");

$data = json_decode(file_get_contents("php://input"), true);
$userId = $data['user_id'] ?? null;

if (!$userId) {
    http_response_code(400);
    echo json_encode(["error" => "User ID required"]);
    exit;
}

try {
    // Generate new OTP security package
    $newOtp = (string)rand(100000, 999999);
    $hashedOtp = password_hash($newOtp, PASSWORD_DEFAULT);
    $expiresAt = date('Y-m-d H:i:s', strtotime('+24 hours'));

    $stmt = $pdo->prepare("
        UPDATE public.users 
        SET 
            otp_code = ?, 
            password_hash = ?, 
            otp_expires_at = ?, 
            otp_last_sent_at = NOW(),
            must_reset_password = true 
        WHERE id = ? AND role = 'coordinator'
    ");

    $stmt->execute([$newOtp, $hashedOtp, $expiresAt, $userId]);

    echo json_encode([
        "status" => "success", 
        "message" => "New OTP generated",
        "new_otp" => $newOtp // Return this so Admin can tell the user manually for now
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}