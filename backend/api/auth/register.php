<?php
// backend/api/auth/register.php
header('Content-Type: application/json');

require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../utils/mailer.php';

try {
    $pdo = getDB();

    // FORCE exceptions (critical for live servers)
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

    $data = json_decode(file_get_contents('php://input'), true);

    if (!$data) {
        throw new Exception("No data received");
    }

    // Normalize inputs
    $uin = trim($data['uin'] ?? '');
    $indexNumber = trim($data['indexNumber'] ?? '');
    $email = strtolower(trim($data['email'] ?? ''));
    $password = $data['password'] ?? '';
    $confirmPassword = $data['confirmPassword'] ?? '';

    // Validation
    if (empty($uin) || empty($indexNumber) || empty($email) || empty($password)) {
        throw new Exception("All fields are required.");
    }

    if ($password !== $confirmPassword) {
        throw new Exception("Passwords do not match. Please re-enter.");
    }

    if (strlen($password) < 6) {
        throw new Exception("Password must be at least 6 characters long.");
    }

    // Check registry
    $stmt = $pdo->prepare("
        SELECT id, is_claimed
        FROM student_registry
        WHERE TRIM(uin) = TRIM(?) AND TRIM(index_number) = TRIM(?)
    ");
    $stmt->execute([$uin, $indexNumber]);
    $student = $stmt->fetch();

    if (!$student) {
        throw new Exception("Student not found in registry.");
    }

    // Check existing user
    $checkUser = $pdo->prepare("
        SELECT id, is_email_verified
        FROM users
        WHERE uin = ?
    ");
    $checkUser->execute([$uin]);
    $existingUser = $checkUser->fetch();

    if ($student['is_claimed'] && $existingUser && $existingUser['is_email_verified']) {
        http_response_code(403);
        throw new Exception("Account already claimed and verified. Please login.");
    }

    // OTP generation (safe fallback)
    try {
        $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    } catch (Exception $e) {
        $otp = str_pad(mt_rand(0, 999999), 6, '0', STR_PAD_LEFT);
    }

    $expires_at = date('Y-m-d H:i:s', strtotime('+1 hour'));
    $current_time = date('Y-m-d H:i:s');

    if ($existingUser && !$existingUser['is_email_verified']) {
        // Re-send OTP for unverified account
        $updateOtp = $pdo->prepare("
            UPDATE users
            SET otp_code = ?, otp_expires_at = ?, otp_last_sent_at = ?
            WHERE id = ?
        ");
        $updateOtp->execute([
            $otp,
            $expires_at,
            $current_time,
            $existingUser['id']
        ]);

        $targetEmail = $email;

    } else {
        // Fresh registration
        $pdo->beginTransaction();

        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

        $insertUser = $pdo->prepare("
            INSERT INTO users (
                email,
                password_hash,
                role,
                uin,
                student_id,
                is_active,
                is_email_verified,
                otp_code,
                otp_expires_at,
                otp_last_sent_at
            )
            VALUES (?, ?, 'student', ?, ?, true, false, ?, ?, ?)
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

        $newUserId = $insertUser->fetch()['id'];

        $pdo->prepare("
            INSERT INTO students (user_id, registry_id)
            VALUES (?, ?)
        ")->execute([$newUserId, $student['id']]);

        $pdo->prepare("
            UPDATE student_registry
            SET is_claimed = true
            WHERE id = ?
        ")->execute([$student['id']]);

        $pdo->commit();

        $targetEmail = $email;
    }

    // Send OTP email
    if (sendOTPEmail($targetEmail, $otp)) {
        echo json_encode([
            "status" => "success",
            "message" => "OTP sent to $targetEmail."
        ]);
    } else {
        echo json_encode([
            "status" => "success",
            "message" => "Account secured, but email failed. Please click 'Resend' on the next screen."
        ]);
    }

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    if (http_response_code() === 200) {
        http_response_code(400);
    }

    error_log("REGISTER ERROR: " . $e->getMessage());

    echo json_encode([
        "status" => "error",
        "message" => $e->getMessage(),
        "requires_verification" => (!empty($existingUser) && empty($existingUser['is_email_verified']))
    ]);
}
