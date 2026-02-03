<?php
// backend/api/auth/register.php
header('Content-Type: application/json');
require_once __DIR__ . '/../../config/db.php'; 
require_once __DIR__ . '/../../utils/mailer.php';

$pdo = getDB();
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$data = json_decode(file_get_contents('php://input'), true);
$uin = trim($data['uin'] ?? '');
$indexNumber = trim($data['indexNumber'] ?? '');
$email = trim($data['email'] ?? '');
$password = $data['password'] ?? '';

try {
    // --- 1. DATA PREP (OUTSIDE TRANSACTION) ---
    if (empty($uin) || empty($indexNumber) || empty($email) || empty($password)) {
        throw new Exception("All fields are required.");
    }

    // Pre-fetch everything needed
    $stmt = $pdo->prepare("SELECT id FROM public.student_registry WHERE uin = ? AND index_number = ?");
    $stmt->execute([$uin, $indexNumber]);
    $regId = $stmt->fetchColumn();

    if (!$regId) throw new Exception("Student not found in registry.");

    $checkUser = $pdo->prepare("SELECT id, is_email_verified FROM public.users WHERE uin = ? OR email = ?");
    $checkUser->execute([$uin, $email]);
    $existingUser = $checkUser->fetch(PDO::FETCH_ASSOC);

    if ($existingUser && $existingUser['is_email_verified']) {
        http_response_code(403);
        throw new Exception("Account already verified.");
    }

    $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $expires_at = date('Y-m-d H:i:s', strtotime('+1 hour'));
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

    // --- 2. THE TRANSACTION (DB WRITES ONLY) ---
    $pdo->beginTransaction();

    if ($existingUser) {
        $pdo->prepare("UPDATE public.users SET otp_code = ?, otp_expires_at = ?, password_hash = ?, email = ? WHERE id = ?")
            ->execute([$otp, $expires_at, $hashedPassword, $email, $existingUser['id']]);
    } else {
        // We use RETURNING id and fetch it immediately
        $insert = $pdo->prepare("
            INSERT INTO public.users (email, password_hash, role, uin, student_id, is_active, is_email_verified, otp_code, otp_expires_at) 
            VALUES (?, ?, 'student', ?, ?, TRUE, FALSE, ?, ?) 
            RETURNING id
        ");
        $insert->execute([$email, $hashedPassword, $uin, $regId, $otp, $expires_at]);
        $newId = $insert->fetchColumn();

        $pdo->prepare("INSERT INTO public.students (user_id, registry_id) VALUES (?, ?)")
            ->execute([$newId, $regId]);
        
        $pdo->prepare("UPDATE public.student_registry SET is_claimed = TRUE WHERE id = ?")
            ->execute([$regId]);
    }

    $pdo->commit(); 
    // --- TRANSACTION CLOSED ---

    // --- 3. POST-PROCESS (MAILER) ---
    sendOTPEmail($email, $otp);
    
    echo json_encode(["status" => "success", "message" => "OTP sent to $email."]);

} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    
    error_log("Registration Failure: " . $e->getMessage());
    http_response_code(400);
    // Returning the actual message will help us see if it's a constraint or connection issue
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}