<?php
// backend/api/auth/register.php

// 1. Wrap EVERYTHING in a try-catch to ensure JSON is always returned
try {
    require_once __DIR__ . '/../common_auth.php';
    
    // Check if the file actually exists before requiring to prevent Fatal Errors
    $mailerPath = __DIR__ . '/../../utils/mailer.php';
    if (!file_exists($mailerPath)) {
        throw new Exception("Server configuration error: Mailer utility missing.");
    }
    require_once $mailerPath;

    // Only allow POST requests
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        throw new Exception("Method Not Allowed");
    }

    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);

    if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
        throw new Exception("Invalid JSON payload.");
    }

    // Extract & sanitize
    $uin             = trim($data['uin'] ?? '');
    $indexNumber      = trim($data['indexNumber'] ?? '');
    $email            = trim($data['email'] ?? '');
    $password         = $data['password'] ?? '';
    $confirmPassword  = $data['confirmPassword'] ?? '';

    if (empty($uin) || empty($indexNumber) || empty($email) || empty($password)) {
        throw new Exception("All fields are required.");
    }

    if ($password !== $confirmPassword) {
        throw new Exception("Passwords do not match.");
    }

    if (strlen($password) < 6) {
        throw new Exception("Password must be at least 6 characters long.");
    }

    // --- Registry Check ---
    $stmt = $pdo->prepare("SELECT id, is_claimed FROM student_registry WHERE uin = ? AND index_number = ?");
    $stmt->execute([$uin, $indexNumber]);
    $student = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$student) {
        throw new Exception("Student not found in registry. Please check your UIN and Index Number.");
    }

    // --- Check Existing User ---
    $checkUser = $pdo->prepare("SELECT id, email, is_email_verified FROM users WHERE uin = ?");
    $checkUser->execute([$uin]);
    $existingUser = $checkUser->fetch(PDO::FETCH_ASSOC);

    if ($student['is_claimed'] && $existingUser && $existingUser['is_email_verified']) {
        http_response_code(403);
        throw new Exception("Account already claimed and verified. Please login.");
    }

    // --- OTP Setup ---
    $otp          = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $expires_at   = date('Y-m-d H:i:s', strtotime('+1 hour'));
    $current_time = date('Y-m-d H:i:s');

    if ($existingUser && !$existingUser['is_email_verified']) {
        // Update OTP for existing unverified user
        $updateOtp = $pdo->prepare("UPDATE users SET otp_code = ?, otp_expires_at = ?, otp_last_sent_at = ? WHERE id = CAST(? AS uuid)");
        $updateOtp->execute([$otp, $expires_at, $current_time, $existingUser['id']]);
        $targetEmail = $existingUser['email'];
    } else {
        // Fresh Registration
        $pdo->beginTransaction();
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

        $insertUser = $pdo->prepare("
            INSERT INTO users (email, password_hash, role, uin, student_id, is_active, is_email_verified, otp_code, otp_expires_at, otp_last_sent_at)
            VALUES (?, ?, 'student', ?, ?, TRUE, FALSE, ?, ?, ?)
            RETURNING id
        ");
        $insertUser->execute([$email, $hashedPassword, $uin, $student['id'], $otp, $expires_at, $current_time]);
        $newUserId = $insertUser->fetchColumn();

        if (!$newUserId) {
            throw new Exception("User creation failed.");
        }

        $pdo->prepare("INSERT INTO students (user_id, registry_id) VALUES (CAST(? AS uuid), CAST(? AS uuid))")
            ->execute([$newUserId, $student['id']]);

        $pdo->prepare("UPDATE student_registry SET is_claimed = TRUE WHERE id = CAST(? AS uuid)")
            ->execute([$student['id']]);

        $pdo->commit();
        $targetEmail = $email;
    }

    // --- Email Sending ---
    $emailSent = sendOTPEmail($targetEmail, $otp);
    echo json_encode([
        "status"  => "success",
        "message" => $emailSent ? "OTP sent to $targetEmail." : "Account created, but email failed. Please resend OTP."
    ]);

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    
    // Set response code to 400 if it's still 200
    if (http_response_code() === 200) {
        http_response_code(400);
    }

    echo json_encode([
        "status"  => "error",
        "message" => $e->getMessage(),
        "requires_verification" => (isset($existingUser) && !$existingUser['is_email_verified'])
    ]);
}