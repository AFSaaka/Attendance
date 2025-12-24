<?php
// backend/api/auth/register.php
header('Content-Type: application/json');
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../utils/mailer.php';

$pdo = getDB();
$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    echo json_encode(["status" => "error", "message" => "No data received"]);
    exit;
}

$uin = $data['uin'] ?? '';
$indexNumber = $data['indexNumber'] ?? '';
$email = $data['email'] ?? '';
$password = $data['password'] ?? '';

try {
    $pdo->beginTransaction();

    // 1. Verify registry
    $stmt = $pdo->prepare("SELECT id, full_name, is_claimed FROM student_registry WHERE uin = ? AND index_number = ? FOR UPDATE");
    $stmt->execute([$uin, $indexNumber]);
    $student = $stmt->fetch();

    if (!$student)
        throw new Exception("Student not found in registry.");
    if ($student['is_claimed'])
        throw new Exception("Account already claimed.");

    // 2. Prepare Account
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
    $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $expires_at = date('Y-m-d H:i:s', strtotime('+15 minutes'));

    // 3. Unified Insert (Using is_email_verified)
    $insertUser = $pdo->prepare("
        INSERT INTO users (
            email, password_hash, role, uin, student_id, 
            is_active, is_email_verified, otp_code, otp_expires_at, otp_failed_attempts
        ) 
        VALUES (?, ?, 'student', ?, ?, TRUE, FALSE, ?, ?, 0)
    ");
    $insertUser->execute([$email, $hashedPassword, $uin, $student['id'], $otp, $expires_at]);

    // 4. Update Registry
    $updateRegistry = $pdo->prepare("UPDATE student_registry SET is_claimed = TRUE WHERE id = ?");
    $updateRegistry->execute([$student['id']]);

    // 5. Send Email and Commit
    if (sendOTPEmail($email, $otp)) {
        $pdo->commit();
        echo json_encode(["status" => "success", "message" => "OTP sent to $email."]);
    } else {
        throw new Exception("Email delivery failed. Transaction rolled back.");
    }

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    // LOG THE ERROR TO XAMPP LOGS
    error_log("Registration Error: " . $e->getMessage());

    http_response_code(400);
    echo json_encode([
        "status" => "error",
        "message" => $e->getMessage(),
        "debug_hint" => "Check your mailer.php settings" // Added for your current stage
    ]);
}