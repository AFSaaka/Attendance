<?php
// api/coordinator/get_attendance.php
header("Content-Type: application/json");
require_once __DIR__ . '/../common_auth.php';
require_once __DIR__ . '/../../config/db.php';

if ($_SESSION['role'] !== 'coordinator') {
    http_response_code(403);
    exit(json_encode(["status" => "error", "message" => "Unauthorized"]));
}

try {
    $today = date('Y-m-d');

    // 1. Stats with Regional context
    $statsQuery = "SELECT 
        COUNT(*) FILTER (WHERE attendance_date = :today AND status = 'present') as present_today,
        COUNT(*) FILTER (WHERE attendance_date = :today AND status = 'absent') as absent_today,
        (SELECT COUNT(*) FROM public.student_registry WHERE is_claimed = FALSE) as unclaimed_students
        FROM public.attendance_records";

    $statsStmt = $pdo->prepare($statsQuery);
    $statsStmt->execute(['today' => $today]);
    $stats = $statsStmt->fetch(PDO::FETCH_ASSOC);

    // 2. Fetch records from our new view
    $recordsStmt = $pdo->query("SELECT * FROM coordinator_attendance_view LIMIT 100");
    $records = $recordsStmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "status" => "success",
        "stats" => $stats,
        "records" => $records
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}