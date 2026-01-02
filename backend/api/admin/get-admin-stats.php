<?php
declare(strict_types=1);

require_once __DIR__ . '/../common_auth.php';

requireAdmin(); 

header("Content-Type: application/json; charset=utf-8");

try {
    // 1. Get current session context (Vital for accurate enrollment counts)
    $session_id = $pdo->query("SELECT id FROM public.academic_sessions WHERE is_current = true LIMIT 1")->fetchColumn();

    if (!$session_id) {
        throw new Exception("Active academic session not found.");
    }

    /**
     * 2. REVISED COUNTS:
     * registered_students: Actual users linked to the registry.
     * total_students: EVERYONE enrolled via bulk upload for this session.
     */
    $sql = "
        SELECT 
            (SELECT COUNT(*)::int FROM public.students) as registered_students,
            (SELECT COUNT(*)::int FROM public.student_enrollments WHERE session_id = :sid) as total_students,
            (SELECT COUNT(*)::int FROM public.communities) as total_communities
            
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute(['sid' => $session_id]);
    $data = $stmt->fetch(PDO::FETCH_ASSOC);

    echo json_encode([
        "status" => "success",
        "stats" => [
            "registered_students" => $data['registered_students'],
            "total_students"      => $data['total_students'],
            "total_communities"   => $data['total_communities'],
           
        ],
        "session_context" => $session_id
    ]);

} catch (Exception $e) {
    error_log("Dashboard Stats Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Internal Server Error"]);
}