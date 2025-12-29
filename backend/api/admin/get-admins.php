<?php
// backend/api/admin/get-admins.php
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../common_auth.php'; 
requireSuperAdmin();

// Security Check: Only super_admin can fetch the full list of admins
// Assuming $currentUser is populated by common_auth.php
if ($currentUser['admin_level'] !== 'super_admin') {
    http_response_code(403);
    exit(json_encode(["error" => "Unauthorized"]));
}

try {
    // Use 'IN' to capture both types of admin roles you might have in your database
$stmt = $pdo->query("
    SELECT id, user_name, email, admin_level, is_active, created_at 
    FROM public.users 
    WHERE role = 'admin' 
    OR role = 'super_admin'
    OR admin_level = 'super_admin'
    ORDER BY created_at DESC
");
    $admins = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($admins);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}