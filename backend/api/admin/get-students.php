<?php
// backend/api/admin/get-students.php
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../common_auth.php';

try {
    /**
     * We want the list of students and their current enrollment details.
     * Note: We use DISTINCT ON (optional based on your needs) or a simple join 
     * if you only expect one enrollment per student per dashboard view.
     */
    $stmt = $pdo->query("
        SELECT 
            sr.id, 
            sr.uin, 
            sr.index_number, 
            sr.full_name, 
            sr.is_claimed,
            se.program, 
            se.region, 
            se.district, 
            se.community, 
            se.level,
            u.email,
            u.is_active
        FROM public.student_registry sr
        LEFT JOIN public.student_enrollments se ON sr.id = se.registry_id
        LEFT JOIN public.users u ON sr.id = u.student_id
        -- Typically you'd filter by the current active session here
        -- WHERE se.session_id = (SELECT id FROM public.academic_sessions WHERE is_current = true)
        ORDER BY se.region ASC, sr.full_name ASC
    ");
    
    $students = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Header for JSON response
    header('Content-Type: application/json');
    echo json_encode($students);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "error" => "Failed to fetch student list",
        "details" => $e->getMessage()
    ]);
}