<?php
// backend/api/admin/get-coordinators.php
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../common_auth.php';

try {
    $stmt = $pdo->query("
        SELECT 
            u.id, 
            u.email, 
            u.must_reset_password, 
            u.otp_code, 
            u.otp_expires_at,
            c.full_name, 
            c.district, 
            c.region, 
            c.phone_number
        FROM public.users u
        JOIN public.coordinators c ON u.id = c.user_id
        WHERE u.role = 'coordinator'
        ORDER BY c.created_at DESC
    ");
    $coordinators = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($coordinators);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}