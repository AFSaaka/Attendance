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

$uin = trim($data['uin'] ?? '');
$indexNumber = trim($data['indexNumber'] ?? '');
$email = trim($data['email'] ?? '');
$password = $data['password'] ?? '';
$confirmPassword = $data['confirmPassword'] ?? '';

try {
    if (!$pdo) throw new Exception("Database connection failed.");

    if (empty($uin) || empty($indexNumber) || empty($email) || empty($password)) {
        throw new Exception("All fields are required.");
    }

    if ($password !== $confirmPassword) {
        throw new Exception("Passwords do not match.");
    }

    // 1. Check Registry (Outside transaction to prevent poisoning)
    $stmt = $pdo->prepare("SELECT id, is_claimed FROM public.student_registry WHERE uin = ? AND index_number = ?");
    $stmt->execute([$uin, $indexNumber]);
    $student = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$student) throw new Exception("Student not found in registry.");

    // 2. Check if Email or UIN already exists in Users
    $checkUser = $pdo->prepare("SELECT id, is_email_verified, email FROM public.users WHERE uin = ? OR email = ?");
    $checkUser->execute([$uin, $email]);
    $existingUser = $checkUser->fetch(PDO::FETCH_ASSOC);

    if ($existingUser && $existingUser['is_email_verified']) {
        http_response_code(403);
        throw new Exception("This account (UIN or Email) is already verified. Please login.");
    }

    $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $expires_at = date('Y-m-d H:i:s', strtotime('+1 hour'));
    $current_time = date('Y-m-d H:i:s');

    // 3. START TRANSACTION
    $pdo->beginTransaction();

    if ($existingUser) {
        // SCENARIO: User exists but not verified. Update OTP and Password.
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        $updateOtp = $pdo->prepare("
            UPDATE public.users 
            SET otp_code = ?, otp_expires_at = ?, otp_last_sent_at = ?, password_hash = ?, email = ? 
            WHERE id = ?
        ");
        $updateOtp->execute([$otp, $expires_at, $current_time, $hashedPassword, $email, $existingUser['id']]);
        $targetUserId = $existingUser['id'];
    } else {
        // SCENARIO: Fresh Registration
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        
        $insertUser = $pdo->prepare("
            INSERT INTO public.users 
            (email, password_hash, role, uin, student_id, is_active, is_email_verified, otp_code, otp_expires_at, otp_last_sent_at) 
            VALUES (?, ?, 'student', ?, ?, TRUE, FALSE, ?, ?, ?) 
            RETURNING id
        ");
        $insertUser->execute([$email, $hashedPassword, $uin, $student['id'], $otp, $expires_at, $current_time]);
        $targetUserId = $insertUser->fetchColumn();

        // Secondary check for ID (The "Neon Fallback")
        if (!$targetUserId) {
            $targetUserId = $pdo->query("SELECT lastval()")->fetchColumn();
        }

        // Link to Students table
        $pdo->prepare("INSERT INTO public.students (user_id, registry_id) VALUES (?, ?)")
            ->execute([$targetUserId, $student['id']]);
        
        // Mark Registry as claimed
        $pdo->prepare("UPDATE public.student_registry SET is_claimed = TRUE WHERE id = ?")
            ->execute([$student['id']]);
    }

    $pdo->commit();

    // 4. Send Email
    if (sendOTPEmail($email, $otp)) {
        echo json_encode(["status" => "success", "message" => "OTP sent to $email."]);
    } else {
        echo json_encode([
            "status" => "success", 
            "message" => "Account secured, but email failed. Please click 'Resend'."
        ]);
    }

} catch (Exception $e) {
    if ($pdo && $pdo->inTransaction()) $pdo->rollBack();
    
    if (http_response_code() === 200) http_response_code(400);
    
    error_log("REGISTRATION ERROR: " . $e->getMessage());
    echo json_encode([
        "status" => "error", 
        "message" => $e->getMessage()
    ]);
}