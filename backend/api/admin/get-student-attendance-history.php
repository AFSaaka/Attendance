<?php
declare(strict_types=1);
header("Content-Type: application/json; charset=utf-8");

require_once __DIR__ . '/../common_auth.php';

requireAdmin();

try {
    $uin = $_GET['uin'] ?? null;

    if (!$uin) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "uin is required."]);
        exit;
    }

    // Get active session
    $session_id = $pdo->query(
        "SELECT id FROM public.academic_sessions WHERE is_current = true LIMIT 1"
    )->fetchColumn();

    if (!$session_id) {
        http_response_code(428);
        echo json_encode(["status" => "error", "message" => "No active academic session."]);
        exit;
    }

    // Get student info + enrollment for this session
    $studentSql = "
        SELECT
            sr.full_name,
            sr.uin,
            sr.index_number,
            se.id         AS enrollment_id,
            se.program,
            se.level,
            se.community,
            se.district,
            se.region,
            u.id          AS user_id,
            u.is_active
        FROM public.student_registry sr
        JOIN public.users u ON u.uin = sr.uin
        JOIN public.student_enrollments se ON se.registry_id = sr.id
            AND se.session_id = :session_id
        WHERE sr.uin = :uin
        LIMIT 1
    ";
    $studentStmt = $pdo->prepare($studentSql);
    $studentStmt->execute(['session_id' => $session_id, 'uin' => $uin]);
    $student = $studentStmt->fetch(PDO::FETCH_ASSOC);

    if (!$student) {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "Student not found or not enrolled in active session."]);
        exit;
    }

    // Get all attendance records for this student in the active session
    $recordsSql = "
        SELECT
            ar.attendance_date,
            ar.status,
            ar.week_number,
            ar.day_number,
            ar.captured_at,
            ar.is_suspicious,
            ar.suspicious_reason,
            ar.is_offline,
            ar.accuracy,
            ar.latitude,
            ar.longitude
        FROM public.attendance_records ar
        WHERE ar.user_id      = :user_id
          AND ar.session_id   = :session_id
        ORDER BY ar.attendance_date ASC
    ";
    $recordsStmt = $pdo->prepare($recordsSql);
    $recordsStmt->execute([
        'user_id'    => $student['user_id'],
        'session_id' => $session_id,
    ]);
    $records = $recordsStmt->fetchAll(PDO::FETCH_ASSOC);

    // Summary stats
    $totalPresent    = count(array_filter($records, fn($r) => $r['status'] === 'present'));
    $totalSuspicious = count(array_filter($records, fn($r) => $r['is_suspicious']));
    $totalOffline    = count(array_filter($records, fn($r) => $r['is_offline']));

    echo json_encode([
        "status"  => "success",
        "student" => $student,
        "summary" => [
            "total_present"    => $totalPresent,
            "total_suspicious" => $totalSuspicious,
            "total_offline"    => $totalOffline,
        ],
        "records" => $records,
    ]);

} catch (Exception $e) {
    error_log("Student History Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "An error occurred. Please try again."]);
}