<?php
// backend/api/auth/register_debug.php

// 1. FORCE ERROR REPORTING
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Content-Type: text/html'); 
require_once __DIR__ . '/../../config/db.php'; 
require_once __DIR__ . '/../../utils/mailer.php';

echo "<h2>Starting Debug Test (PostgreSQL Fix)...</h2>";

$pdo = getDB();

// 2. FIXED TEST VALUES
$uin = '20262027'; 
$indexNumber = 'MLT/0123/25'; 
$email = 'test@example.com'; 
$password = 'password123';
$confirmPassword = 'password123';

try {
    if (!$pdo) throw new Exception("Database connection failed.");
    echo "✅ Database Connected.<br>";

    // Check Registry
    $stmt = $pdo->prepare("SELECT id, is_claimed FROM student_registry WHERE uin = ? AND index_number = ?");
    $stmt->execute([$uin, $indexNumber]);
    $student = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$student) {
        throw new Exception("Student not found in registry. Check if UIN $uin and Index $indexNumber exist in student_registry table.");
    }
    echo "✅ Student found in registry (ID: {$student['id']}).<br>";

    $checkUser = $pdo->prepare("SELECT id, is_email_verified FROM users WHERE uin = ?");
    $checkUser->execute([$uin]);
    $existingUser = $checkUser->fetch(PDO::FETCH_ASSOC);

    $otp = '123456'; 
    $expires_at = date('Y-m-d H:i:s', strtotime('+1 hour'));
    $current_time = date('Y-m-d H:i:s');

    if ($existingUser && !$existingUser['is_email_verified']) {
        echo "Scenario: Updating existing unverified user...<br>";
        $updateOtp = $pdo->prepare("UPDATE users SET otp_code = ?, otp_expires_at = ?, otp_last_sent_at = ? WHERE id = ?");
        $updateOtp->execute([$otp, $expires_at, $current_time, $existingUser['id']]);
    } else {
        echo "Scenario: Fresh Registration...<br>";
        $pdo->beginTransaction();
        
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        
        // FIX: Added RETURNING id for PostgreSQL UUID support
        $insertUser = $pdo->prepare("
            INSERT INTO users (email, password_hash, role, uin, student_id, is_active, is_email_verified, otp_code, otp_expires_at, otp_last_sent_at) 
            VALUES (?, ?, 'student', ?, ?, TRUE, FALSE, ?, ?, ?)
            RETURNING id
        ");
        
        $insertUser->execute([$email, $hashedPassword, $uin, $student['id'], $otp, $expires_at, $current_time]);
        
        // FIX: Fetch the ID from the statement result
        $result = $insertUser->fetch(PDO::FETCH_ASSOC);
        $newUserId = $result['id'] ?? null;

        if (!$newUserId) {
            throw new Exception("User inserted but ID was not returned. Check table structure.");
        }

        echo "✅ User inserted (ID: $newUserId).<br>";

        $pdo->prepare("INSERT INTO students (user_id, registry_id) VALUES (?, ?)")->execute([$newUserId, $student['id']]);
        $pdo->prepare("UPDATE student_registry SET is_claimed = TRUE WHERE id = ?")->execute([$student['id']]);
        
        $pdo->commit();
        echo "✅ Transaction committed.<br>";
    }

    echo "Attempting to send email...<br>";
    if (sendOTPEmail($email, $otp)) {
        echo "✅ Email sent successfully.<br>";
    } else {
        echo "❌ Email failed to send (Check mailer.php config).<br>";
    }

    echo "<h3>TEST SUCCESSFUL!</h3>";

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    echo "<h3 style='color:red;'>TEST FAILED</h3>";
    echo "<b>Error Message:</b> " . $e->getMessage() . "<br>";
    echo "<b>File:</b> " . $e->getFile() . " on line " . $e->getLine() . "<br>";
}