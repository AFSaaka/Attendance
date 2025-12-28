<?php
// backend/api/coordinator/audit-summary.php
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../common_auth.php';

header("Content-Type: application/json");

if (!isset($userId)) {
    http_response_code(401);
    exit(json_encode(["error" => "Unauthorized"]));
}

try {
    $today = date('Y-m-d');

    // 1. Get Coordinator's District
    $stmt = $pdo->prepare("SELECT district FROM public.coordinators WHERE user_id = :id");
    $stmt->execute(['id' => $userId]);
    $coord = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$coord) {
        exit(json_encode(["stats" => ["total" => 0, "active" => 0, "alerts" => 0], "audit" => []]));
    }
    $district = $coord['district'];

    // 2. Summary Stats
    // Optimized to ensure we only count distance alerts for students who ACTUALLY submitted
    $statsQuery = "SELECT 
        COUNT(se.id) as total,
        COUNT(ar.id) FILTER (WHERE ar.status = 'present') as active,
        COUNT(ar.id) FILTER (WHERE 
            ar.id IS NOT NULL AND 
            ST_DistanceSphere(
                ST_MakePoint(ar.longitude, ar.latitude), 
                ST_MakePoint(se.community_lng, se.community_lat)
            ) > 200
        ) as alerts
        FROM public.student_enrollments se
        LEFT JOIN public.students s ON se.registry_id = s.registry_id
        LEFT JOIN public.attendance_records ar ON s.user_id = ar.user_id AND ar.attendance_date = :today
        WHERE se.district = :district";

    $statsStmt = $pdo->prepare($statsQuery);
    $statsStmt->execute(['district' => $district, 'today' => $today]);
    $stats = $statsStmt->fetch(PDO::FETCH_ASSOC);

    // 3. Audit Table Data
    // FIXED JOIN CHAIN: Using LEFT JOIN for 'students' and 'attendance_records'
    $auditQuery = "SELECT 
        sr.full_name as student_name,
        sr.index_number,
        se.community,
        CASE 
            WHEN ar.id IS NULL THEN 'not yet' 
            ELSE ar.status 
        END as status,
        CASE 
            WHEN ar.id IS NULL THEN 0 
            ELSE ST_DistanceSphere(
                ST_MakePoint(ar.longitude, ar.latitude), 
                ST_MakePoint(se.community_lng, se.community_lat)
            ) 
        END as distance
    FROM public.student_enrollments se
    JOIN public.student_registry sr ON se.registry_id = sr.id
    LEFT JOIN public.students s ON se.registry_id = s.registry_id
    LEFT JOIN public.attendance_records ar ON s.user_id = ar.user_id AND ar.attendance_date = :today
    WHERE se.district = :district
    ORDER BY se.community ASC, sr.full_name ASC";

    $stmt = $pdo->prepare($auditQuery);
    $stmt->execute(['district' => $district, 'today' => $today]);
    $audit = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "stats" => [
            "total" => (int) $stats['total'],
            "active" => (int) $stats['active'],
            "alerts" => (int) $stats['alerts']
        ],
        "audit" => $audit
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}