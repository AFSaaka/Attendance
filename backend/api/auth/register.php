<?php
// backend/api/auth/register.php
header('Content-Type: application/json');

// Optional: temporary debug helpers (remove/comment in production)
// ini_set('display_errors', 1);
// error_reporting(E_ALL);

require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../utils/mailer.php';

try {
    $pdo = getDB();
    if (!$pdo) {
        throw new Exception("Database connection failed.");
    }

    // Force real prepares + exceptions (good practice)
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);

    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true);

    if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
        throw new Exception("Invalid JSON data received");
    }

    $uin           = trim($data['uin'] ?? '');
    $indexNumber   = trim($data['indexNumber'] ?? '');
    $email         = trim($data['email'] ?? '');
    $password      = $data['password'] ?? '';
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

    // 1. Check registry
    $stmt = $pdo->prepare("SELECT id, is_claimed FROM student_registry WHERE uin = ? AND index_number = ?");
    $stmt->execute([$uin, $indexNumber]);
    $student = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$student) {
        throw new Exception("Student not found in registry.");
    }

    // Check existing user
    $checkUser = $pdo->prepare("SELECT id, is_email_verified FROM users WHERE uin = ?");
    $checkUser->execute([$uin]);
    $existingUser = $checkUser->fetch(PDO::FETCH_ASSOC);

    if ($student['is_claimed'] && $existingUser && $existingUser['is_email_verified']) {
        http_response_code(403);
        throw new Exception("Account already claimed and verified. Please login.");
    }

    $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $expires_at   = date('Y-m-d H:i:s', strtotime('+1 hour'));
    $current_time = date('Y-m-d H:i:s');

    if ($existingUser && !$existingUser['is_email_verified']) {
        // Update OTP for unverified existing account
        $updateOtp = $pdo->prepare("
            UPDATE users 
            SET otp_code = ?, otp_expires_at = ?, otp_last_sent_at = ? 
            WHERE id = ?
        ");
        $updateOtp->execute([$otp, $expires_at, $current_time, $existingUser['id']]);
        $targetEmail = $email;
    } else {
        // Fresh registration — use RETURNING id (PostgreSQL native & reliable)
        $pdo->beginTransaction();

        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

        $insertUser = $pdo->prepare("
            INSERT INTO users 
            (email, password_hash, role, uin, student_id, is_active, is_email_verified, otp_code, otp_expires_at, otp_last_sent_at)
            VALUES (?, ?, 'student', ?, ?, TRUE, FALSE, ?, ?, ?)
            RETURNING id
        ");
        $insertUser->execute([$email, $hashedPassword, $uin, $student['id'], $otp, $expires_at, $current_time]);

        // Fetch the newly inserted ID directly
        $row = $insertUser->fetch(PDO::FETCH_ASSOC);
        $newUserId = $row['id'];

        // Link student record
        $pdo->prepare("INSERT INTO students (user_id, registry_id) VALUES (?, ?)")
            ->execute([$newUserId, $student['id']]);

        // Mark as claimed
        $pdo->prepare("UPDATE student_registry SET is_claimed = TRUE WHERE id = ?")
            ->execute([$student['id']]);

        $pdo->commit();
        $targetEmail = $email;
    }

    // Send OTP email
    if (sendOTPEmail($targetEmail, $otp)) {
        echo json_encode(["status" => "success", "message" => "OTP sent to $targetEmail."]);
    } else {
        echo json_encode([
            "status"  => "success",
            "message" => "Account secured, but email failed. Please click 'Resend' on the next screen."
        ]);
    }

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    $statusCode = (http_response_code() === 200) ? 400 : http_response_code();
    if ($statusCode === 0) $statusCode = 500;

    http_response_code($statusCode);

    $response = [
        "status"  => "error",
        "message" => $e->getMessage(),
    ];

    if (isset($existingUser) && !$existingUser['is_email_verified']) {
        $response["requires_verification"] = true;
    }

    // Optional: log for debugging
    error_log("Registration failed: " . $e->getMessage());

    echo json_encode($response);
}