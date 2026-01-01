<?php
// backend/api/admin/add-admin-single.php
require_once __DIR__ . '/../common_auth.php'; 

// 1. SECURITY: Explicitly restricted to Superadmins
requireSuperAdmin();

header("Content-Type: application/json");
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit(json_encode(["error" => "Method not allowed"]));
}

try {
    $data = json_decode(file_get_contents("php://input"), true);
    $admin_id = $currentUser['id'];
    
    // Strict Validation
    if (empty($data['email']) || empty($data['user_name'])) {
        http_response_code(400);
        exit(json_encode(["error" => "Email and User Name are required."]));
    }

    $email = strtolower(trim($data['email']));
    $name = trim($data['user_name']);
    $level = (isset($data['admin_level']) && $data['admin_level'] === 'super_admin') ? 'super_admin' : 'admin';

    $pdo->beginTransaction();

    // 2. SECURE AUTH DATA
    $otp = (string)random_int(100000, 999999);
    $hashedPassword = password_hash($otp, PASSWORD_DEFAULT);
    $expiresAt = date('Y-m-d H:i:s', strtotime('+48 hours'));

    // 3. INSERT USER
    $stmt = $pdo->prepare("
        INSERT INTO public.users (
            email, user_name, password_hash, role, admin_level, 
            must_reset_password, otp_code, otp_expires_at, is_active
        ) VALUES (:email, :name, :pass, 'admin', :level, true, :otp, :expires, true)
        RETURNING id
    ");

    $stmt->execute([
        ':email'   => $email,
        ':name'    => $name,
        ':pass'    => $hashedPassword,
        ':level'   => $level,
        ':otp'     => $otp,
        ':expires' => $expiresAt
    ]);
    
    $new_user_id = $stmt->fetchColumn();

    // 4. LOG THE ACTION (Forensic requirement)
    $logStmt = $pdo->prepare("
        INSERT INTO public.audit_logs (user_id, action_type, target_id, ip_address, details) 
        VALUES (?, 'ADMIN_CREATE_SINGLE', ?, ?, ?)
    ");
    
    $details = json_encode([
        "message" => "Superadmin created " . $level . " account for " . $name,
        "email" => $email,
        "assigned_level" => $level
    ]);

    $logStmt->execute([
        $admin_id,
        $new_user_id,
        $_SERVER['REMOTE_ADDR'],
        $details
    ]);

    $pdo->commit();

    // 5. SECURE RESPONSE
    echo json_encode([
        "success" => true, 
        "message" => "Admin account created.",
        "temp_pass" => $otp // Displayed once for the Superadmin to share
    ]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    
    if ($e->getCode() == '23505') {
        http_response_code(409);
        exit(json_encode(["error" => "This email is already registered in the system."]));
    }
    
    error_log("Add Admin Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["error" => "Database error occurred."]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}