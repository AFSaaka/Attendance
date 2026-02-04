<?php
// backend/api/auth/register_debug.php

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Content-Type: text/html'); 
require_once __DIR__ . '/../../config/db.php'; 
require_once __DIR__ . '/../../utils/mailer.php';

echo "<h2>Starting Debug Test (PostgreSQL Fix)...</h2>";

$pdo = getDB();

$uin = '20262027'; 
$indexNumber = 'MLT/0123/25'; 
$email = 'afsaaka@yahoo.com'; 
$password = 'password123';
$confirmPassword = 'password123';

try {
    if (!$pdo) throw new Exception("Database connection failed.");
    echo "✅ Database Connected.<br>";

    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Check Registry
    $stmt = $pdo->prepare("SELECT id, is_claimed FROM student_registry WHERE uin = ? AND index_number = ?");
    $stmt->execute([$uin, $indexNumber]);
    $student = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$student) {
        throw new Exception("Student not found in registry.");
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
        
        $insertUser = $pdo->prepare("
            INSERT INTO users (email, password_hash, role, uin, student_id, is_active, is_email_verified, otp_code, otp_expires_at, otp_last_sent_at) 
            VALUES (?, ?, 'student', ?, ?, TRUE, FALSE, ?, ?, ?)
            RETURNING id
        ");
        
        $insertUser->execute([$email, $hashedPassword, $uin, $student['id'], $otp, $expires_at, $current_time]);
        
        $result = $insertUser->fetch(PDO::FETCH_ASSOC);
        $newUserId = $result['id'] ?? null;

        if (!$newUserId) {
            throw new Exception("User inserted but ID was not returned.");
        }

        echo "✅ User inserted (ID: $newUserId).<br>";

        // FIX 1: Explicit UUID cast for safety (very common need in PostgreSQL + PHP)
        $insertStudent = $pdo->prepare("
            INSERT INTO students (user_id, registry_id) 
            VALUES (CAST(? AS uuid), CAST(? AS uuid))
        ");
        $insertStudent->execute([$newUserId, $student['id']]);

        echo "✅ Student link created.<br>";

        // FIX 2: Same for update (in case registry.id is also UUID)
        $updateRegistry = $pdo->prepare("
            UPDATE student_registry 
            SET is_claimed = TRUE 
            WHERE id = CAST(? AS uuid)
        ");
        $updateRegistry->execute([$student['id']]);

        echo "✅ Registry marked as claimed.<br>";
        
        $pdo->commit();
        echo "✅ Transaction committed.<br>";
    }

    echo "Attempting to send email...<br>";
    if (sendOTPEmail($email, $otp)) {
        echo "✅ Email sent successfully.<br>";
    } else {
        echo "❌ Email failed to send.<br>";
    }

    echo "<h3 style='color:green;'>TEST SUCCESSFUL!</h3>";

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        try { $pdo->rollBack(); } catch (Exception $rb) { /* ignore rollback errors */ }
    }
    echo "<h3 style='color:red;'>TEST FAILED</h3>";
    echo "<b>Error Message:</b> " . htmlspecialchars($e->getMessage()) . "<br>";
    echo "<b>File:</b> " . $e->getFile() . " on line " . $e->getLine() . "<br>";
    echo "<b>Previous statements status:</b> User insert succeeded, failure after that.<br>";
}