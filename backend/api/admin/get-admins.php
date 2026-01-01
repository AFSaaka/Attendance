<?php
// backend/api/admin/get-admins.php
require_once __DIR__ . '/../common_auth.php'; 

/**
 * 1. SECURITY: Centralized Authorization
 * requireSuperAdmin() should handle the 403 response and exit 
 * if the user isn't a super_admin.
 */
requireSuperAdmin();

header("Content-Type: application/json");

try {
    /**
     * 2. PRECISE QUERY
     * We select only necessary columns. 
     * We ensure we are pulling users whose PRIMARY role is 'admin'.
     */
    $query = "
        SELECT 
            id, 
            user_name, 
            email, 
            admin_level, 
            is_active, 
            created_at,
            last_login -- Added to help Superadmins see who is active
        FROM public.users 
        WHERE role = 'admin' 
        ORDER BY 
            CASE WHEN admin_level = 'super_admin' THEN 1 ELSE 2 END, 
            user_name ASC
    ";

    $stmt = $pdo->query($query);
    $admins = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 3. SECURE RESPONSE
    // We wrap the result in a data object for better API extensibility
    echo json_encode([
        "status" => "success",
        "total" => count($admins),
        "data" => $admins
    ]);

} catch (PDOException $e) {
    // Log real error internally, show generic to user
    error_log("Get Admins Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        "status" => "error", 
        "message" => "Internal Server Error: Could not retrieve admin list."
    ]);
}