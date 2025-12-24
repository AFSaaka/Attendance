<?php
// backend/api/auth/resend_otp.php
header('Content-Type: application/json');
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../utils/mailer.php';

$pdo = getDB();
$data = json_decode(file_get_contents('php://input'), true);
$email = $data['email'] ?? '';

if (empty($email)) {
    echo json_encode(["status" => "error", "message" => "Email is required."]);
    exit;
}

try {
    // 1. Fetch user and check cooldown
    $stmt = $pdo->prepare("SELECT id, otp_last_sent_at, is_email_verified FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user)
        throw new Exception("Account not found.");
    if ($user['is_email_verified'])
        throw new Exception("Account already verified.");

    // 2. Security: Rate Limit Check (60 seconds)
    if ($user['otp_last_sent_at']) {
        $lastSent = strtotime($user['otp_last_sent_at']);
        $secondsPassed = time() - $lastSent;
        if ($secondsPassed < 60) {
            $remaining = 60 - $secondsPassed;
            throw new Exception("Please wait {$remaining} seconds before requesting a new code.");
        }
    }

    // 3. Generate New OTP
    $newOtp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $expiry = date('Y-m-d H:i:s', strtotime('+15 minutes'));

    // 4. Update DB and Send Email
    $update = $pdo->prepare("
        UPDATE users 
        SET otp_code = ?, 
            otp_expires_at = ?, 
            otp_last_sent_at = CURRENT_TIMESTAMP, 
            otp_failed_attempts = 0 
        WHERE id = ?
    ");
    $update->execute([$newOtp, $expiry, $user['id']]);

    if (sendOTPEmail($email, $newOtp)) {
        echo json_encode(["status" => "success", "message" => "A new code has been sent to your email."]);
    } else {
        throw new Exception("Email service error. Please try again later.");
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}