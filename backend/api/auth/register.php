<?php
// backend/api/auth/register.php
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: https://ttfpp-attendance.netlify.app');  // ← Change * to your exact frontend domain later (e.g. https://your-frontend.vercel.app)
    header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');  // Add more if you use custom headers
    header('Access-Control-Max-Age: 86400');  // Cache preflight for 24 hours
    http_response_code(204);  // No content – success for OPTIONS
    exit;
}
header('Access-Control-Allow-Origin: https://ttfpp-attendance.netlify.app');  // Same as above – tighten later
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../utils/mailer.php';

 $pdo = getDB();
    $data = json_decode(file_get_contents('php://input'), true);
  // Extract and trim inputs
    $uin           = trim($data['uin']           ?? '');
    $indexNumber   = trim($data['indexNumber']   ?? '');
    $email         = trim($data['email']         ?? '');
    $password      = $data['password']           ?? '';
    $confirmPassword = $data['confirmPassword'] ?? '';

try {
   
    if (!$pdo) {
        throw new Exception("Database connection failed.");
    }

    // Enable proper error handling
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);



    if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
        throw new Exception("Invalid JSON data received");
    }

  

    // Validation
    if (empty($uin) || empty($indexNumber) || empty($email) || empty($password) || empty($confirmPassword)) {
        throw new Exception("All fields are required.");
    }

    if ($password !== $confirmPassword) {
        throw new Exception("Passwords do not match. Please re-enter.");
    }

    if (strlen($password) < 6) {
        throw new Exception("Password must be at least 6 characters long.");
    }

    // 1. Check Registry
    $stmt = $pdo->prepare("SELECT id, is_claimed FROM student_registry WHERE uin = ? AND index_number = ?");
    $stmt->execute([$uin, $indexNumber]);
    $student = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$student) {
        throw new Exception("Student not found in registry.");
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

        $insertUser = $pdo->prepare("
            INSERT INTO users 
            (email, password_hash, role, uin, student_id, is_active, is_email_verified, otp_code, otp_expires_at, otp_last_sent_at) 
            VALUES (?, ?, 'student', ?, CAST(? AS uuid), TRUE, FALSE, ?, ?, ?)
            RETURNING id
        ");
        $insertUser->execute([$email, $hashedPassword, $uin, $student['id'], $otp, $expires_at, $current_time]);

        $row = $insertUser->fetch(PDO::FETCH_ASSOC);
        $newUserId = $row['id'] ?? null;

        if (!$newUserId) {
            throw new Exception("Failed to retrieve new user ID after insert.");
        }

        // Link student record
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

    // 3. Send OTP email (outside transaction — failure shouldn't rollback account)
    if (sendOTPEmail($targetEmail, $otp)) {
        echo json_encode([
            "status"  => "success",
            "message" => "OTP sent to $targetEmail."
        ]);
    } else {
        echo json_encode([
            "status"  => "success",
            "message" => "Account secured, but email failed. Please click 'Resend' on the next screen."
        ]);
    }

} catch (Exception $e) {
    // Safe rollback
    if (isset($pdo) && $pdo->inTransaction()) {
        try {
            $pdo->rollBack();
        } catch (Exception $rollbackEx) {
            // Ignore secondary rollback errors to not hide original error
        }
    }

    // Set appropriate HTTP status
    $status = http_response_code();
    if ($status === 200) {
        http_response_code(400);
    }

    $response = [
        "status"  => "error",
        "message" => $e->getMessage(),
    ];

    // Helpful flag for frontend (resend OTP flow)
    if (isset($existingUser) && !$existingUser['is_email_verified']) {
        $response["requires_verification"] = true;
    }

    echo json_encode($response);
}