<?php
declare(strict_types=1);

require_once __DIR__ . '/../common_auth.php';

// SECURITY: Only superadmins can view or export activity logs.
requireSuperAdmin(); 

// Prevent any accidental output before headers
ob_clean();

$days = isset($_GET['days']) ? (int)$_GET['days'] : 7;
$filename = "system_audit_" . date('Y-m-d') . "_" . $days . "days.csv";

header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="' . $filename . '"');

// Create a file pointer connected to the output stream
$output = fopen('php://output', 'w');

// Add CSV Headers
fputcsv($output, ['Timestamp', 'Action', 'Admin / Actor', 'Target Student', 'Student UIN', 'Details', 'IP Address']);

try {
    // Optimized query for export using the schema provided
    $sql = "
        SELECT 
            al.created_at,
            al.action_type,
            COALESCE(u.user_name, u.email, 'System') as admin_identity,
            COALESCE(sr.full_name, al.details->>'target_name', 'N/A') as target_name,
            COALESCE(sr.uin, al.details->>'target_uin', 'N/A') as target_uin,
            al.details->>'message' as description,
            al.ip_address
        FROM public.audit_logs al
        LEFT JOIN public.users u ON al.user_id = u.id
        LEFT JOIN public.student_registry sr ON (al.target_id IS NOT NULL AND al.target_id = sr.id)
        WHERE al.created_at >= NOW() - INTERVAL '$days days'
        ORDER BY al.created_at DESC
    ";

    $stmt = $pdo->query($sql);

    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        fputcsv($output, $row);
    }

} catch (PDOException $e) {
    error_log("CSV Export Error: " . $e->getMessage());
}

fclose($output);
exit;