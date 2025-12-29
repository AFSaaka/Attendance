<?php
// backend/api/admin/add-coordinator.php
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../common_auth.php';

header("Content-Type: application/json");

$data = json_decode(file_get_contents("php://input"), true);

// Comprehensive validation
if (empty($data['email']) || empty($data['full_name']) || empty($data['phone_number'])) {
    http_response_code(400);
    echo json_encode(["error" => "Email, Full Name, and Phone Number are required"]);
    exit;
}

try {
    $pdo->beginTransaction();

    // 1. Generate OTP Security Data
    $otp = (string)rand(100000, 999999);
    $hashed_otp = password_hash($otp, PASSWORD_DEFAULT);
    $expires_at = date('Y-m-d H:i:s', strtotime('+24 hours'));

    // 2. Create User Account
    // We use password_hash column and set must_reset_password to true
    $stmtUser = $pdo->prepare("
        INSERT INTO public.users 
        (email, password_hash, role, user_name, otp_code, otp_expires_at, must_reset_password, is_email_verified) 
        VALUES (:email, :pass, 'coordinator', :name, :otp, :expires, true, false) 
        RETURNING id
    ");
    
    $stmtUser->execute([
        'email'   => $data['email'],
        'pass'    => $hashed_otp,
        'name'    => $data['full_name'],
        'otp'     => $otp,
        'expires' => $expires_at
    ]);
    
    $user_id = $stmtUser->fetchColumn();

    // 3. Create Coordinator Profile
    // Matching your schema: user_id, full_name, region, district, phone_number
    $stmtCoord = $pdo->prepare("
        INSERT INTO public.coordinators (user_id, full_name, region, district, phone_number) 
        VALUES (:uid, :name, :reg, :dist, :phone)
    ");
    
    $stmtCoord->execute([
        'uid'   => $user_id,
        'name'  => $data['full_name'],
        'reg'   => $data['region'],
        'dist'  => $data['district'],
        'phone' => $data['phone_number']
    ]);

    $pdo->commit();
    echo json_encode([
        "status" => "success", 
        "message" => "Coordinator created",
        "otp" => $otp // Returned so admin can see it immediately
    ]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    
    if ($e->getCode() == 23505) {
        echo json_encode(["error" => "A user with this email already exists."]);
    } else {
        echo json_encode(["error" => "Database error: " . $e->getMessage()]);
    }
}