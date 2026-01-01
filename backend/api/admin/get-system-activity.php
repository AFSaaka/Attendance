<?php
// backend/api/admin/get-system-activity.php
declare(strict_types=1);

require_once __DIR__ . '/../common_auth.php';

// Only superadmins can view
requireSuperAdmin(); 

header("Content-Type: application/json; charset=utf-8");

try {
    // We use LEFT JOIN and strict NULL checks to prevent 500 errors on invalid UUIDs
    $sql = "
        SELECT 
            al.id,
            al.created_at,
            al.action_type,
            al.ip_address,
            -- Actor identification
            COALESCE(u.user_name, u.email, 'System') as admin_identity,
            -- Target identification from student_registry
            COALESCE(sr.full_name, al.details->>'target_name', 'N/A') as target_name,
            COALESCE(sr.uin, al.details->>'target_uin', 'N/A') as target_uin,
            -- Action description
            al.details->>'message' as description
        FROM public.audit_logs al
        LEFT JOIN public.users u ON al.user_id = u.id
        LEFT JOIN public.student_registry sr ON (
            al.target_id IS NOT NULL 
            AND al.target_id = sr.id
        )
        ORDER BY al.created_at DESC
        LIMIT 25
    ";

    $stmt = $pdo->query($sql);
    $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(["status" => "success", "data" => $logs]);

} catch (PDOException $e) {
    // Log the EXACT error for the developer (you)
    error_log("Audit Log SQL Failure: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        "status" => "error", 
        "message" => "Database error. Ensure target_id is a valid UUID or NULL."
    ]);
}