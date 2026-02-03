<?php
// backend/api/auth/register.php
header('Content-Type: application/json');
require_once __DIR__ . '/../../config/db.php'; 
require_once __DIR__ . '/../../utils/mailer.php';

$pdo = getDB();
// Standardize error mode
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$data = json_decode(file_get_contents('php://input'), true);
$uin = trim($data['uin'] ?? '');
$indexNumber = trim($data['indexNumber'] ?? '');
$email = trim($data['email'] ?? '');
$password = $data['password'] ?? '';

try {
    if (empty($uin) || empty($indexNumber) || empty($email) || empty($password)) {
        throw new Exception("All fields are required.");
    }

    // 1. Check Registry
    $stmt = $pdo->prepare("SELECT id, is_claimed FROM public.student_registry WHERE uin = ? AND index_number = ?");
    $stmt->execute([$uin, $indexNumber]);
    $student = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$student) throw new Exception("Student not found in registry.");

    // 2. Check for existing User
    $checkUser = $pdo->prepare("SELECT id, is_email_verified FROM public.users WHERE uin = ? OR email = ?");
    $checkUser->execute([$uin, $email]);
    $existingUser = $checkUser->fetch(PDO::FETCH_ASSOC);

    if ($existingUser && $existingUser['is_email_verified']) {
        http_response_code(403);
        throw new Exception("Account already verified. Please login.");
    }

    $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $expires_at = date('Y-m-d H:i:s', strtotime('+1 hour'));
    $current_time = date('Y-m-d H:i:s');
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

    // --- START TRANSACTION ---
    $pdo->beginTransaction();

    if ($existingUser) {
        $update = $pdo->prepare("UPDATE public.users SET otp_code = ?, otp_expires_at = ?, password_hash = ?, email = ? WHERE id = ?");
        $update->execute([$otp, $expires_at, $hashedPassword, $email, $existingUser['id']]);
        $targetUserId = $existingUser['id'];
    } else {
        // IMPORTANT: Ensure columns email, password_hash, role, uin, student_id, is_active, is_email_verified, otp_code, otp_expires_at exist
        $insertUser = $pdo->prepare("
            INSERT INTO public.users 
            (email, password_hash, role, uin, student_id, is_active, is_email_verified, otp_code, otp_expires_at) 
            VALUES (?, ?, 'student', ?, ?, TRUE, FALSE, ?, ?) 
            RETURNING id
        ");
        $insertUser->execute([$email, $hashedPassword, $uin, $student['id'], $otp, $expires_at]);
        $targetUserId = $insertUser->fetchColumn();

        if (!$targetUserId) throw new Exception("Failed to retrieve new user ID.");

        $pdo->prepare("INSERT INTO public.students (user_id, registry_id) VALUES (?, ?)")
            ->execute([$targetUserId, $student['id']]);
        
        $pdo->prepare("UPDATE public.student_registry SET is_claimed = TRUE WHERE id = ?")
            ->execute([$student['id']]);
    }

    $pdo->commit();
    // --- TRANSACTION END ---

    // Send Mail (outside transaction to prevent timeouts)
    sendOTPEmail($email, $otp);
    
    echo json_encode(["status" => "success", "message" => "OTP sent to $email."]);

} catch (Throwable $e) {
    // Catching Throwable handles both Exception and Error (like PDOErrors)
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    $code = $e->getCode();
    if ($code == '23505') {
        http_response_code(409);
        $msg = "A user with this Email or UIN already exists.";
    } else {
        // This will now show the REAL error (e.g. "Column 'otp_last_sent_at' does not exist")
        $msg = $e->getMessage();
        http_response_code(400);
    }

    echo json_encode(["status" => "error", "message" => $msg]);
}