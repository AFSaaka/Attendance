<?php
// backend/api/auth/register.php
header('Content-Type: application/json');

// Ensure these paths are 100% correct based on your folder structure
require_once __DIR__ . '/../../config/db.php'; 
require_once __DIR__ . '/../../utils/mailer.php';

$pdo = getDB();
$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    echo json_encode(["status" => "error", "message" => "No data received"]);
    exit;
}

$uin = $data['uin'] ?? '';
$indexNumber = $data['indexNumber'] ?? '';
$email = $data['email'] ?? '';
$password = $data['password'] ?? '';

try {
    if (!$pdo) throw new Exception("Database connection failed.");
    
    $pdo->beginTransaction();

    // 1. Verify registry
    $stmt = $pdo->prepare("SELECT id, full_name, is_claimed FROM student_registry WHERE uin = ? AND index_number = ? FOR UPDATE");
    $stmt->execute([$uin, $indexNumber]);
    $student = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$student)
        throw new Exception("Student not found in registry.");
    if ($student['is_claimed'])
        throw new Exception("Account already claimed.");

    // 2. Prepare Account & OTP Security
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
    $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    
    // Explicitly format dates for PostgreSQL
    $current_time = date('Y-m-d H:i:s');
    $expires_at = date('Y-m-d H:i:s', strtotime('+1 hour'));

    // 3. Insert into users and get the UUID
    $insertUser = $pdo->prepare("
        INSERT INTO users (
            email, password_hash, role, uin, student_id, 
            is_active, is_email_verified, otp_code, otp_expires_at, 
            otp_failed_attempts, otp_last_sent_at
        ) 
        VALUES (?, ?, 'student', ?, ?, TRUE, FALSE, ?, ?, 0, ?)
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
    
    $newUserData = $insertUser->fetch(PDO::FETCH_ASSOC);
    if (!$newUserData) throw new Exception("Failed to create user record.");
    $newUserId = $newUserData['id'];

    // 3.5 Link to students profile table
    $insertStudentProfile = $pdo->prepare("INSERT INTO students (user_id, registry_id) VALUES (?, ?)");
    $insertStudentProfile->execute([$newUserId, $student['id']]);

    // 4. Update Registry
    $updateRegistry = $pdo->prepare("UPDATE student_registry SET is_claimed = TRUE WHERE id = ?");
    $updateRegistry->execute([$student['id']]);

    // 5. Send Email and Commit
    // We call the mailer BEFORE committing. If it returns false, we hit the 'else'.
    if (sendOTPEmail($email, $otp)) {
        $pdo->commit();
        echo json_encode(["status" => "success", "message" => "OTP sent to $email. Valid for 1 hour."]);
    } else {
        // IMPORTANT: If you reach here, the database changes are UNDONE
        throw new Exception("Email service error. Account not created. Please try again later.");
    }

} catch (Exception $e) {
    if ($pdo && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log("Registration Error: " . $e->getMessage());

    http_response_code(400);
    echo json_encode([
        "status" => "error",
        "message" => $e->getMessage()
    ]);
}