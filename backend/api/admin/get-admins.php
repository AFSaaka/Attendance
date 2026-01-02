<?php
// backend/api/admin/get-admins.php
require_once __DIR__ . '/../common_auth.php'; 
requireSuperAdmin();

header("Content-Type: application/json");

try {
    $query = "
        SELECT 
            id, user_name, email, admin_level, is_active, 
            is_email_verified, must_reset_password, otp_code, 
            otp_expires_at, created_at
        FROM public.users 
        WHERE role = 'admin' 
        ORDER BY 
            CASE WHEN admin_level = 'super_admin' THEN 1 ELSE 2 END, 
            user_name ASC
    ";

    $stmt = $pdo->query($query);
    $admins = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "status" => "success",
        "data" => $admins
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}