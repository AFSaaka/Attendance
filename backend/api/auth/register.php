<?php
// backend/api/auth/register.php

// 1. Force JSON headers immediately
header('Content-Type: application/json');

try {
    // 2. Load dependencies
    require_once __DIR__ . '/../common_auth.php';
    require_once __DIR__ . '/../../utils/validators.php';
    require_once __DIR__ . '/../../utils/mailer.php';

    // 3. Get and Decode JSON input
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);

    if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
        throw new Exception("Invalid JSON payload.");
    }

    // 4. Extract & Sanitize
    $uin             = trim($data['uin'] ?? '');
    $indexNumber      = trim($data['indexNumber'] ?? '');
    $email            = trim($data['email'] ?? '');
    $password         = $data['password'] ?? '';
    $confirmPassword  = $data['confirmPassword'] ?? '';
    
    // Validate email format
    if (empty($email) || !validate_email($email)) {
        throw new Exception("Invalid email format.");
    }

    // 5. Validation
    if (empty($uin) || empty($indexNumber) || empty($email) || empty($password)) {
        throw new Exception("All fields are required.");
    }

    if ($password !== $confirmPassword) {
        throw new Exception("Passwords do not match.");
    }

    // 6. Database Logic (Matching your Debug Flow)
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Check Registry
    $stmt = $pdo->prepare("SELECT id, is_claimed FROM student_registry WHERE uin = ? AND index_number = ?");
    $stmt->execute([$uin, $indexNumber]);
    $student = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$student) {
        throw new Exception("Student not found in registry.");
    }

    // Check if user already exists
    $checkUser = $pdo->prepare("SELECT id, email, is_email_verified FROM users WHERE uin = ?");
    $checkUser->execute([$uin]);
    $existingUser = $checkUser->fetch(PDO::FETCH_ASSOC);

    // OTP Generation
    $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $expires_at = date('Y-m-d H:i:s', strtotime('+1 hour'));
    $current_time = date('Y-m-d H:i:s');

    if ($existingUser && !$existingUser['is_email_verified']) {
        // SCENARIO: Existing unverified user - Use UUID CAST
        $updateOtp = $pdo->prepare("UPDATE users SET otp_code = ?, otp_expires_at = ?, otp_last_sent_at = ? WHERE id = CAST(? AS uuid)");
        $updateOtp->execute([$otp, $expires_at, $current_time, $existingUser['id']]);
        $targetEmail = $existingUser['email'];
    } else {
        // SCENARIO: Fresh Registration (Transaction)
        if ($student['is_claimed']) {
            http_response_code(403);
            throw new Exception("This UIN has already been claimed.");
        }

        $pdo->beginTransaction();
        
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        
        $insertUser = $pdo->prepare("
            INSERT INTO users (email, password_hash, role, uin, student_id, is_active, is_email_verified, otp_code, otp_expires_at, otp_last_sent_at) 
            VALUES (?, ?, 'student', ?, CAST(? AS uuid), TRUE, FALSE, ?, ?, ?)
            RETURNING id
        ");
        
        $insertUser->execute([$email, $hashedPassword, $uin, $student['id'], $otp, $expires_at, $current_time]);
        $result = $insertUser->fetch(PDO::FETCH_ASSOC);
        $newUserId = $result['id'] ?? null;

        if (!$newUserId) {
            throw new Exception("User insertion failed.");
        }

        // Link student (Explicit UUID cast from your debug fix)
        $insertStudent = $pdo->prepare("INSERT INTO students (user_id, registry_id) VALUES (CAST(? AS uuid), CAST(? AS uuid))");
        $insertStudent->execute([$newUserId, $student['id']]);

        // Mark registry as claimed
        $updateRegistry = $pdo->prepare("UPDATE student_registry SET is_claimed = TRUE WHERE id = CAST(? AS uuid)");
        $updateRegistry->execute([$student['id']]);

        $pdo->commit();
        $targetEmail = $email;
    }

    // 7. Email Dispatch
    $emailSent = sendOTPEmail($targetEmail, $otp);

    echo json_encode([
        "status" => "success",
        "message" => $emailSent ? "OTP sent to $targetEmail." : "Account created, but email failed. Please resend OTP."
    ]);

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    
    // Ensure we don't send 200 OK on error
    if (http_response_code() === 200) {
        http_response_code(400);
    }

    echo json_encode([
        "status" => "error",
        "message" => $e->getMessage()
    ]);
}