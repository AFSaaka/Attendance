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
$confirmPassword = $data['confirmPassword'] ?? ''; // Capture the confirmation

try {
    if (!$pdo) throw new Exception("Database connection failed.");

    // --- NEW VALIDATION BLOCK ---
    if (empty($uin) || empty($indexNumber) || empty($email) || empty($password)) {
        throw new Exception("All fields are required.");
    }

    if ($password !== $confirmPassword) {
        throw new Exception("Passwords do not match. Please re-enter.");
    }

    if (strlen($password) < 6) {
        throw new Exception("Password must be at least 6 characters long.");
    }
    // --- END VALIDATION BLOCK ---

    // 1. Check Registry and existing User status
    $stmt = $pdo->prepare("SELECT id, is_claimed FROM student_registry WHERE uin = ? AND index_number = ?");
    $stmt->execute([$uin, $indexNumber]);
    $student = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$student) throw new Exception("Student not found in registry.");

    // Check if a user record already exists for this UIN
    $checkUser = $pdo->prepare("SELECT id, is_email_verified FROM users WHERE uin = ?");
    $checkUser->execute([$uin]);
    $existingUser = $checkUser->fetch(PDO::FETCH_ASSOC);

    // If account is claimed AND verified, then it's a real duplicate
    if ($student['is_claimed'] && $existingUser && $existingUser['is_email_verified']) {
        // Return 403 to trigger your "Claimed but Verified" React logic
        http_response_code(403);
        throw new Exception("Account already claimed and verified. Please login.");
    }

    $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $expires_at = date('Y-m-d H:i:s', strtotime('+1 hour'));
    $current_time = date('Y-m-d H:i:s');

    if ($existingUser && !$existingUser['is_email_verified']) {
        // SCENARIO: User crashed last time. Update OTP and move to verify.
        $updateOtp = $pdo->prepare("UPDATE users SET otp_code = ?, otp_expires_at = ?, otp_last_sent_at = ? WHERE id = ?");
        $updateOtp->execute([$otp, $expires_at, $current_time, $existingUser['id']]);
        $targetEmail = $email; 
    } else {
        // SCENARIO: Fresh Registration
        $pdo->beginTransaction();
        
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        
        // Note: Using RETURNING id (PostgreSQL) - if using MySQL, use $pdo->lastInsertId()
        $insertUser = $pdo->prepare("
            INSERT INTO users (email, password_hash, role, uin, student_id, is_active, is_email_verified, otp_code, otp_expires_at, otp_last_sent_at) 
            VALUES (?, ?, 'student', ?, ?, TRUE, FALSE, ?, ?, ?) RETURNING id
        ");
        $insertUser->execute([$email, $hashedPassword, $uin, $student['id'], $otp, $expires_at, $current_time]);
        $newUserId = $insertUser->fetch(PDO::FETCH_ASSOC)['id'];

        $pdo->prepare("INSERT INTO students (user_id, registry_id) VALUES (?, ?)")->execute([$newUserId, $student['id']]);
        $pdo->prepare("UPDATE student_registry SET is_claimed = TRUE WHERE id = ?")->execute([$student['id']]);
        
        $pdo->commit();
        $targetEmail = $email;
    }

    // 2. Attempt Email AFTER Transaction
    if (sendOTPEmail($targetEmail, $otp)) {
        echo json_encode(["status" => "success", "message" => "OTP sent to $targetEmail."]);
    } else {
        echo json_encode([
            "status" => "success", 
            "message" => "Account secured, but email failed. Please click 'Resend' on the next screen."
        ]);
    }

} catch (Exception $e) {
    if ($pdo && $pdo->inTransaction()) $pdo->rollBack();
    
    // Maintain 400 status unless it was already set to 403 above
    if (http_response_code() === 200) http_response_code(400);
    
    echo json_encode([
        "status" => "error", 
        "message" => $e->getMessage(),
        "requires_verification" => (isset($existingUser) && !$existingUser['is_email_verified'])
    ]);
}