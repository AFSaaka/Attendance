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
$confirmPassword = $data['confirmPassword'] ?? '';

try {
    // --- STEP 1: GATHER ALL DATA (OUTSIDE TRANSACTION) ---
    // This is where the bulk script succeeds: it validates everything first.
    
    if (empty($uin) || empty($indexNumber) || empty($email) || empty($password)) {
        throw new Exception("All fields are required.");
    }

    // 1. Check Registry
    $stmt = $pdo->prepare("SELECT id, is_claimed FROM public.student_registry WHERE uin = ? AND index_number = ?");
    $stmt->execute([$uin, $indexNumber]);
    $student = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$student) throw new Exception("Student not found in registry.");

    // 2. Check for existing User (UIN or Email)
    $checkUser = $pdo->prepare("SELECT id, is_email_verified FROM public.users WHERE uin = ? OR email = ?");
    $checkUser->execute([$uin, $email]);
    $existingUser = $checkUser->fetch(PDO::FETCH_ASSOC);

    if ($existingUser && $existingUser['is_email_verified']) {
        http_response_code(403);
        throw new Exception("Account already verified. Please login.");
    }

    // 3. Prepare data for insertion
    $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $expires_at = date('Y-m-d H:i:s', strtotime('+1 hour'));
    $current_time = date('Y-m-d H:i:s');
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

    // --- STEP 2: START TRANSACTION (ONLY FOR WRITING) ---
    $pdo->beginTransaction();

    if ($existingUser) {
        // SCENARIO: Update existing unverified account
        $update = $pdo->prepare("UPDATE public.users SET otp_code = ?, otp_expires_at = ?, otp_last_sent_at = ?, password_hash = ?, email = ? WHERE id = ?");
        $update->execute([$otp, $expires_at, $current_time, $hashedPassword, $email, $existingUser['id']]);
        $targetUserId = $existingUser['id'];
    } else {
        // SCENARIO: Fresh Registration
        $insertUser = $pdo->prepare("
            INSERT INTO public.users 
            (email, password_hash, role, uin, student_id, is_active, is_email_verified, otp_code, otp_expires_at, otp_last_sent_at) 
            VALUES (?, ?, 'student', ?, ?, TRUE, FALSE, ?, ?, ?) 
            RETURNING id
        ");
        $insertUser->execute([$email, $hashedPassword, $uin, $student['id'], $otp, $expires_at, $current_time]);
        $targetUserId = $insertUser->fetchColumn();

        // If RETURNING id failed (Neon quirk), fetch it manually
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
    // --- STEP 3: TRANSACTION FINISHED ---

    // 4. Send Email
    sendOTPEmail($email, $otp);
    echo json_encode(["status" => "success", "message" => "OTP sent to $email."]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    
    // Explicitly handle the "Already exists" error code from Postgres
    if ($e->getCode() == '23505') {
        http_response_code(409);
        echo json_encode(["status" => "error", "message" => "Conflict: This Email or UIN is already associated with an account."]);
    } else {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
    }
} catch (Exception $e) {
    if ($pdo && $pdo->inTransaction()) $pdo->rollBack();
    http_response_code(http_response_code() === 200 ? 400 : http_response_code());
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}