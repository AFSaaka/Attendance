<?php
// backend/api/admin/add-coordinator.php
require_once __DIR__ . '/../common_auth.php';

header("Content-Type: application/json");

// 1. SECURITY: Only Superadmins can manually create other staff
requireSuperAdmin(); 

$data = json_decode(file_get_contents("php://input"), true);
$admin_id = $currentUser['id'];

// Validation
if (empty($data['email']) || empty($data['full_name']) || empty($data['phone_number'])) {
    http_response_code(400);
    exit(json_encode(["error" => "Email, Full Name, and Phone Number are required"]));
}

try {
    $pdo->beginTransaction();

    // 2. SECURE AUTH DATA
    // random_int is cryptographically secure compared to rand()
    $otp = (string)random_int(100000, 999999);
    $hashed_otp = password_hash($otp, PASSWORD_DEFAULT);
    $expires_at = date('Y-m-d H:i:s', strtotime('+48 hours')); // Longer window for manual setup

    // 3. CREATE USER ACCOUNT
    $stmtUser = $pdo->prepare("
        INSERT INTO public.users 
        (email, password_hash, role, user_name, otp_code, otp_expires_at, must_reset_password, is_email_verified, is_active) 
        VALUES (:email, :pass, 'coordinator', :name, :otp, :expires, true, false, true) 
        RETURNING id
    ");
    
    $stmtUser->execute([
        'email'   => strtolower(trim($data['email'])),
        'pass'    => $hashed_otp,
        'name'    => trim($data['full_name']),
        'otp'     => $otp, // Plaintext for first-time login
        'expires' => $expires_at
    ]);
    
    $user_id = $stmtUser->fetchColumn();

    // 4. CREATE COORDINATOR PROFILE
    $stmtCoord = $pdo->prepare("
        INSERT INTO public.coordinators (user_id, full_name, region, district, phone_number) 
        VALUES (:uid, :name, :reg, :dist, :phone)
    ");
    
    $stmtCoord->execute([
        'uid'   => $user_id,
        'name'  => trim($data['full_name']),
        'reg'   => $data['region'] ?? null,
        'dist'  => $data['district'] ?? null,
        'phone' => trim($data['phone_number'])
    ]);

    // 5. LOG THE ACTION (Critical for Staff Changes)
    $logStmt = $pdo->prepare("
        INSERT INTO public.audit_logs (user_id, action_type, target_id, ip_address, details) 
        SELECT ?, 'COORDINATOR_MANUAL_CREATE', ?, ?, ?
    ");
    
    $details = json_encode([
        "message" => "Superadmin created coordinator account for " . $data['full_name'],
        "email" => $data['email'],
        "region" => $data['region'],
        "district" => $data['district']
    ]);

    $logStmt->execute([
        $admin_id,
        $user_id,
        $_SERVER['REMOTE_ADDR'],
        $details
    ]);

    $pdo->commit();

    // 6. SUCCESS RESPONSE
    echo json_encode([
        "status" => "success", 
        "message" => "Coordinator created successfully",
        "data" => [
            "id" => $user_id,
            "otp" => $otp // Admin needs this to tell the coordinator how to log in
        ]
    ]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    
    if ($e->getCode() == '23505') {
        http_response_code(409);
        exit(json_encode(["error" => "This email is already registered in the system."]));
    }

    error_log("Add Coordinator Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["error" => "Failed to create coordinator account due to a database error."]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}