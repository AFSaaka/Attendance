<?php
// backend/api/auth/register.php
header('Content-Type: application/json');

require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../utils/mailer.php';

try {
    $pdo = getDB();
    if (!$pdo) {
        throw new Exception("Database connection failed.");
    }

    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);

    $json = file_get_contents('php://input');
    $data = json_decode($json, true);
    
    // Debug incoming data to verify keys like 'indexNumber' match frontend
    file_put_contents('debug_log.txt', "Input: " . $json . PHP_EOL . "Parsed: " . print_r($data, true));

    if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
        throw new Exception("Invalid JSON data received");
    }

    $uin             = trim($data['uin']           ?? '');
    $indexNumber     = trim($data['indexNumber']   ?? '');
    $email           = trim($data['email']         ?? '');
    $password        = $data['password']           ?? '';
    $confirmPassword = $data['confirmPassword']    ?? '';

    if (empty($uin) || empty($indexNumber) || empty($email) || empty($password) || empty($confirmPassword)) {
        throw new Exception("All fields are required.");
    }

    if ($password !== $confirmPassword) {
        throw new Exception("Passwords do not match.");
    }

    if (strlen($password) < 6) {
        throw new Exception("Password must be at least 6 characters long.");
    }

    // 1. Check Student Registry
    $stmt = $pdo->prepare("SELECT id, is_claimed FROM student_registry WHERE uin = ? AND index_number = ?");
    $stmt->execute([$uin, $indexNumber]);
    $student = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$student) {
        throw new Exception("Student not found in registry. Please check your UIN/Index Number.");
    }

    // 2. Check Existing User
    $checkUser = $pdo->prepare("SELECT id, is_email_verified FROM users WHERE uin = ?");
    $checkUser->execute([$uin]);
    $existingUser = $checkUser->fetch(PDO::FETCH_ASSOC);

    if ($student['is_claimed'] && $existingUser && $existingUser['is_email_verified']) {
        http_response_code(403);
        throw new Exception("Account already claimed and verified. Please login.");
    }

    $otp          = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $expires_at   = date('Y-m-d H:i:s', strtotime('+1 hour'));
    $current_time = date('Y-m-d H:i:s');

    if ($existingUser && !$existingUser['is_email_verified']) {
        // Scenario: Update OTP for existing unverified account
        $updateOtp = $pdo->prepare("
            UPDATE users 
            SET otp_code = ?, otp_expires_at = ?, otp_last_sent_at = ? 
            WHERE id = CAST(? AS uuid)
        ");
        $updateOtp->execute([$otp, $expires_at, $current_time, $existingUser['id']]);
        $targetEmail = $email;
    } else {
        // Scenario: Fresh Registration
        $pdo->beginTransaction();

        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

        // FIX: Ensured columns (10) match values (3 literals + 7 placeholders = 10)
        $insertUser = $pdo->prepare("
            INSERT INTO users 
            (email, password_hash, role, uin, student_id, is_active, is_email_verified, otp_code, otp_expires_at, otp_last_sent_at) 
            VALUES (?, ?, 'student', ?, CAST(? AS uuid), TRUE, FALSE, ?, ?, ?)
            RETURNING id
        ");
        
        $insertUser->execute([
            $email,            // 1
            $hashedPassword,   // 2
            $uin,              // 3
            $student['id'],    // 4
            $otp,              // 5
            $expires_at,       // 6
            $current_time      // 7
        ]);

        $row = $insertUser->fetch(PDO::FETCH_ASSOC);
        $newUserId = $row['id'] ?? null;

        if (!$newUserId) {
            throw new Exception("Failed to retrieve new user ID.");
        }

        // Link student record (Crucial CAST for Postgres)
        $pdo->prepare("
            INSERT INTO students (user_id, registry_id) 
            VALUES (CAST(? AS uuid), CAST(? AS uuid))
        ")->execute([$newUserId, $student['id']]);

        // Mark registry as claimed
        $pdo->prepare("
            UPDATE student_registry 
            SET is_claimed = TRUE 
            WHERE id = CAST(? AS uuid)
        ")->execute([$student['id']]);

        $pdo->commit();
        $targetEmail = $email;
    }

    // 3. Send OTP
    if (sendOTPEmail($targetEmail, $otp)) {
        echo json_encode([
            "status"  => "success",
            "message" => "OTP sent to $targetEmail."
        ]);
    } else {
        echo json_encode([
            "status"  => "success",
            "message" => "Account secured, but email failed. You can use 'Resend' on the next screen."
        ]);
    }

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    if (http_response_code() === 200) {
        http_response_code(400);
    }

    $response = [
        "status"  => "error",
        "message" => $e->getMessage(),
    ];

    if (isset($existingUser) && !$existingUser['is_email_verified']) {
        $response["requires_verification"] = true;
    }

    echo json_encode($response);
}