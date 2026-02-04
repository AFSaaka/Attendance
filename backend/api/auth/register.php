<?php
// backend/api/auth/register.php
header('Content-Type: application/json');
// Handle CORS for live environments
header("Access-Control-Allow-Origin: *"); 
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

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
$confirmPassword = $data['confirmPassword'] ?? '';

try {
    if (!$pdo) throw new Exception("Database connection failed.");

    // Validation
    if (empty($uin) || empty($indexNumber) || empty($email) || empty($password)) {
        throw new Exception("All fields are required.");
    }
    if ($password !== $confirmPassword) throw new Exception("Passwords do not match.");
    if (strlen($password) < 6) throw new Exception("Password too short.");

    // 1. Check Registry
    $stmt = $pdo->prepare("SELECT id, is_claimed FROM student_registry WHERE uin = ? AND index_number = ?");
    $stmt->execute([$uin, $indexNumber]);
    $student = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$student) throw new Exception("Student not found in registry.");

    $checkUser = $pdo->prepare("SELECT id, is_email_verified FROM users WHERE uin = ?");
    $checkUser->execute([$uin]);
    $existingUser = $checkUser->fetch(PDO::FETCH_ASSOC);

    if ($student['is_claimed'] && $existingUser && $existingUser['is_email_verified']) {
        http_response_code(403);
        throw new Exception("Account already claimed. Please login.");
    }

    $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $expires_at = date('Y-m-d H:i:s', strtotime('+1 hour'));
    $current_time = date('Y-m-d H:i:s');

    if ($existingUser && !$existingUser['is_email_verified']) {
        $updateOtp = $pdo->prepare("UPDATE users SET otp_code = ?, otp_expires_at = ?, otp_last_sent_at = ? WHERE id = ?");
        $updateOtp->execute([$otp, $expires_at, $current_time, $existingUser['id']]);
        $targetEmail = $email; 
    } else {
        $pdo->beginTransaction();
        
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        
        // REMOVED "RETURNING id" for MySQL compatibility
        $insertUser = $pdo->prepare("
            INSERT INTO users (email, password_hash, role, uin, student_id, is_active, is_email_verified, otp_code, otp_expires_at, otp_last_sent_at) 
            VALUES (?, ?, 'student', ?, ?, TRUE, FALSE, ?, ?, ?)
        ");
        $insertUser->execute([$email, $hashedPassword, $uin, $student['id'], $otp, $expires_at, $current_time]);
        
        // Compatible with both DB types
        $newUserId = $pdo->lastInsertId(); 

        $pdo->prepare("INSERT INTO students (user_id, registry_id) VALUES (?, ?)")->execute([$newUserId, $student['id']]);
        $pdo->prepare("UPDATE student_registry SET is_claimed = TRUE WHERE id = ?")->execute([$student['id']]);
        
        $pdo->commit();
        $targetEmail = $email;
    }

    if (sendOTPEmail($targetEmail, $otp)) {
        echo json_encode(["status" => "success", "message" => "OTP sent."]);
    } else {
        echo json_encode(["status" => "success", "message" => "Email failed. Click resend."]);
    }

} catch (Exception $e) {
    if ($pdo && $pdo->inTransaction()) $pdo->rollBack();
    if (http_response_code() === 200) http_response_code(400);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}