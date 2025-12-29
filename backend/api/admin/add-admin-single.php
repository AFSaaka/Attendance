<?php
// backend/api/admin/add-admin-single.php
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../common_auth.php'; // Ensure only Super Admins can do this

requireSuperAdmin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit(json_encode(["error" => "Method not allowed"]));
}

try {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if (empty($data['email']) || empty($data['user_name'])) {
        throw new Exception("Email and User Name are required.");
    }

    // 1. Generate 6-digit OTP
    $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    
    // 2. Hash the OTP to serve as the temporary password
    $hashedPassword = password_hash($otp, PASSWORD_DEFAULT);

    $stmt = $pdo->prepare("
        INSERT INTO public.users (
            email, 
            user_name, 
            password_hash, 
            role, 
            admin_level, 
            must_reset_password, 
            is_active
        ) VALUES (:email, :name, :pass, 'admin', :level, true, true)
    ");

    $stmt->execute([
        ':email' => trim($data['email']),
        ':name'  => trim($data['user_name']),
        ':pass'  => $hashedPassword,
        ':level' => $data['admin_level'] ?? 'admin'
    ]);

    // For now, we return the OTP so you can test login. 
    // This will be removed once the email system is integrated.
    echo json_encode([
        "success" => true, 
        "message" => "Admin created successfully.",
        "temp_otp" => $otp 
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}