<?php
// backend/api/auth/reset-password.php
require_once __DIR__ . '/../common_auth.php';

header("Content-Type: application/json");

// Ensure user is logged in
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "Authentication required."]);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$newPassword = $data['password'] ?? '';

if (strlen($newPassword) < 8) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Password must be at least 8 characters long."]);
    exit;
}

try {
    $pdo->beginTransaction();

    $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
    
    // Update password, clear OTP and the reset flag
    $stmt = $pdo->prepare("
        UPDATE users 
        SET password_hash = ?, 
            must_reset_password = FALSE, 
            otp_code = NULL, 
            otp_expires_at = NULL,
            updated_at = NOW() 
        WHERE id = ?
    ");
    $stmt->execute([$hashedPassword, $_SESSION['user_id']]);

    // Audit Log the event
    $log = $pdo->prepare("INSERT INTO audit_logs (user_id, action_type, details, ip_address) VALUES (?, 'PASSWORD_RESET_ON_FIRST_LOGIN', '{}', ?)");
    $log->execute([$_SESSION['user_id'], $_SERVER['REMOTE_ADDR']]);

    // IMPORTANT: Logout the user so they must re-login with the new password
    session_unset();
    session_destroy();

    $pdo->commit();
    echo json_encode(["status" => "success", "message" => "Password updated successfully. Please log in again."]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Failed to update password."]);
}