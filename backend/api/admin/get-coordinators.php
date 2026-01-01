<?php
// backend/api/admin/get-coordinators.php
require_once __DIR__ . '/../common_auth.php';

// 1. SECURITY: Only Admins and Superadmins can view the staff list.
requireAdmin();

header("Content-Type: application/json");

try {
    /**
     * 2. REFINED SQL
     * - We exclude the raw 'otp_code' for security.
     * - We calculate an 'account_status' in the query to simplify React logic.
     */
    $stmt = $pdo->query("
        SELECT 
            u.id, 
            u.email, 
            u.must_reset_password, 
            u.is_active,
            u.otp_expires_at,
            c.full_name, 
            c.district, 
            c.region, 
            c.phone_number,
            c.created_at,
            -- Logic to show if a coordinator is 'Pending' (hasn't logged in yet)
            CASE 
                WHEN u.must_reset_password = true AND u.otp_expires_at > NOW() THEN 'pending'
                WHEN u.is_active = false THEN 'deactivated'
                ELSE 'active'
            END as status
        FROM public.users u
        JOIN public.coordinators c ON u.id = c.user_id
        WHERE u.role = 'coordinator'
        ORDER BY c.created_at DESC
    ");

    $coordinators = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 3. SECURE RESPONSE
    echo json_encode([
        "status" => "success",
        "count" => count($coordinators),
        "data" => $coordinators
    ]);

} catch (Exception $e) {
    // Log the actual error for the developer
    error_log("Get Coordinators Error: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Internal Server Error: Unable to fetch coordinator list."
    ]);
}