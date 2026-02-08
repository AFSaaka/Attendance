<?php
// backend/api/auth/register.php

// ⚠️ DEV ONLY — remove in production
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');

require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../utils/mailer.php';

try {
    /*
    |--------------------------------------------------------------------------
    | 1. Parse & validate JSON FIRST
    |--------------------------------------------------------------------------
    */
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);

    if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
        throw new Exception("Invalid JSON payload.");
    }

    // Extract & sanitize
    $uin              = trim($data['uin'] ?? '');
    $indexNumber      = trim($data['indexNumber'] ?? '');
    $email            = trim($data['email'] ?? '');
    $password         = $data['password'] ?? '';
    $confirmPassword  = $data['confirmPassword'] ?? '';

    if (
        empty($uin) ||
        empty($indexNumber) ||
        empty($email) ||
        empty($password) ||
        empty($confirmPassword)
    ) {
        throw new Exception("All fields are required.");
    }

    if ($password !== $confirmPassword) {
        throw new Exception("Passwords do not match.");
    }

    if (strlen($password) < 6) {
        throw new Exception("Password must be at least 6 characters long.");
    }

    /*
    |--------------------------------------------------------------------------
    | 2. DB Connection
    |--------------------------------------------------------------------------
    */
    $pdo = getDB();

    if (!$pdo) {
        throw new Exception("Database connection failed.");
    }

    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);

    /*
    |--------------------------------------------------------------------------
    | 3. Check Student Registry
    |--------------------------------------------------------------------------
    */
    $stmt = $pdo->prepare("
        SELECT id, is_claimed 
        FROM student_registry 
        WHERE uin = ? AND index_number = ?
    ");
    $stmt->execute([$uin, $indexNumber]);
    $student = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$student) {
        throw new Exception("Student not found in registry.");
    }

    /*
    |--------------------------------------------------------------------------
    | 4. Check Existing User
    |--------------------------------------------------------------------------
    */
    $checkUser = $pdo->prepare("
        SELECT id, email, is_email_verified 
        FROM users 
        WHERE uin = ?
    ");
    $checkUser->execute([$uin]);
    $existingUser = $checkUser->fetch(PDO::FETCH_ASSOC);

    if (
        $student['is_claimed'] &&
        $existingUser &&
        $existingUser['is_email_verified']
    ) {
        http_response_code(403);
        throw new Exception("Account already claimed and verified. Please login.");
    }

    /*
    |--------------------------------------------------------------------------
    | 5. OTP Setup
    |--------------------------------------------------------------------------
    */
    $otp          = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $expires_at   = date('Y-m-d H:i:s', strtotime('+1 hour'));
    $current_time = date('Y-m-d H:i:s');

    /*
    |--------------------------------------------------------------------------
    | 6. Existing Unverified User → Update OTP
    |--------------------------------------------------------------------------
    */
    if ($existingUser && !$existingUser['is_email_verified']) {

        $updateOtp = $pdo->prepare("
            UPDATE users 
            SET otp_code = ?, otp_expires_at = ?, otp_last_sent_at = ?
            WHERE id = CAST(? AS uuid)
        ");
        $updateOtp->execute([
            $otp,
            $expires_at,
            $current_time,
            $existingUser['id']
        ]);

        // IMPORTANT: always use email already on record
        $targetEmail = $existingUser['email'];

    } else {
        /*
        |--------------------------------------------------------------------------
        | 7. Fresh Registration (Transaction)
        |--------------------------------------------------------------------------
        */
        $pdo->beginTransaction();

        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

        // NOTE: NO UUID CAST here — matches working debug script
        $insertUser = $pdo->prepare("
            INSERT INTO users
            (email, password_hash, role, uin, student_id, is_active, is_email_verified, otp_code, otp_expires_at, otp_last_sent_at)
            VALUES (?, ?, 'student', ?, ?, TRUE, FALSE, ?, ?, ?)
            RETURNING id
        ");
        $insertUser->execute([
            $email,
            $hashedPassword,
            $uin,
            $student['id'],
            $otp,
            $expires_at,
            $current_time
        ]);

        $row = $insertUser->fetch(PDO::FETCH_ASSOC);
        $newUserId = $row['id'] ?? null;

        if (!$newUserId) {
            throw new Exception("User created but ID was not returned.");
        }

        // Link student (UUID-safe)
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

    /*
    |--------------------------------------------------------------------------
    | 8. Send OTP Email (outside transaction)
    |--------------------------------------------------------------------------
    */
    if (sendOTPEmail($targetEmail, $otp)) {
        echo json_encode([
            "status"  => "success",
            "message" => "OTP sent to $targetEmail."
        ]);
    } else {
        echo json_encode([
            "status"  => "success",
            "message" => "Account created, but email failed. Please resend OTP."
        ]);
    }

} catch (Exception $e) {

    if (isset($pdo) && $pdo->inTransaction()) {
        try {
            $pdo->rollBack();
        } catch (Exception $ignore) {}
    }

    if (http_response_code() === 200) {
        http_response_code(400);
    }

    $response = [
        "status"  => "error",
        "message" => $e->getMessage()
    ];

    if (isset($existingUser) && !$existingUser['is_email_verified']) {
        $response['requires_verification'] = true;
    }

    echo json_encode($response);
}
