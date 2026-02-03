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

    // 1. PRE-TRANSACTION CHECKS (Do not poison the transaction here)
    $stmt = $pdo->prepare("SELECT id, is_claimed FROM public.student_registry WHERE uin = ? AND index_number = ?");
    $stmt->execute([$uin, $indexNumber]);
    $student = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$student) throw new Exception("Student not found in registry.");

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

    // 2. START TRANSACTION
    $pdo->beginTransaction();

    // Create a Savepoint to prevent 25P02 "Transaction Aborted" errors
    $pdo->exec("SAVEPOINT registration_attempt");

    try {
        if ($existingUser) {
            // Update existing unverified user
            $updateOtp = $pdo->prepare("
                UPDATE public.users 
                SET otp_code = ?, otp_expires_at = ?, otp_last_sent_at = ?, password_hash = ?, email = ? 
                WHERE id = ?
            ");
            $updateOtp->execute([$otp, $expires_at, $current_time, $hashedPassword, $email, $existingUser['id']]);
            $targetUserId = $existingUser['id'];
        } else {
            // Insert new user
            $insertUser = $pdo->prepare("
                INSERT INTO public.users 
                (email, password_hash, role, uin, student_id, is_active, is_email_verified, otp_code, otp_expires_at, otp_last_sent_at) 
                VALUES (?, ?, 'student', ?, ?, TRUE, FALSE, ?, ?, ?) 
                RETURNING id
            ");
            $insertUser->execute([$email, $hashedPassword, $uin, $student['id'], $otp, $expires_at, $current_time]);
            $targetUserId = $insertUser->fetchColumn();

            if (!$targetUserId) {
                $targetUserId = $pdo->query("SELECT lastval()")->fetchColumn();
            }

            // Link to Students table
            // NOTE: This is often where the hidden "Unique Violation" occurs on Live
            $pdo->prepare("INSERT INTO public.students (user_id, registry_id) VALUES (?, ?)")
                ->execute([$targetUserId, $student['id']]);
            
            // Mark Registry as claimed
            $pdo->prepare("UPDATE public.student_registry SET is_claimed = TRUE WHERE id = ?")
                ->execute([$student['id']]);
        }

        $pdo->exec("RELEASE SAVEPOINT registration_attempt");
        $pdo->commit();

    } catch (PDOException $e) {
        // If anything inside the transaction fails, we rollback to the savepoint
        // This keeps the transaction "alive" so we can finish properly
        $pdo->exec("ROLLBACK TO SAVEPOINT registration_attempt");
        $pdo->rollBack();

        if ($e->getCode() == '23505') {
            throw new Exception("This UIN, Email, or Student ID is already registered in our system.");
        }
        throw new Exception("Database error during registration: " . $e->getMessage());
    }

    // 3. SEND EMAIL
    if (sendOTPEmail($email, $otp)) {
        echo json_encode(["status" => "success", "message" => "OTP sent to $email."]);
    } else {
        echo json_encode(["status" => "success", "message" => "Account secured, but email failed. Click Resend."]);
    }

} catch (Exception $e) {
    if ($pdo && $pdo->inTransaction()) $pdo->rollBack();
    if (http_response_code() === 200) http_response_code(400);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}