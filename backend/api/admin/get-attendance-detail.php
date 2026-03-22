<?php
declare(strict_types=1);
header("Content-Type: application/json; charset=utf-8");

require_once __DIR__ . '/../common_auth.php';
require_once __DIR__ . '/../../utils/validators.php';

requireAdmin();

try {
    date_default_timezone_set('Africa/Accra');

    $date      = $_GET['date']      ?? date('Y-m-d');
    $community = $_GET['community'] ?? null;
    $district  = $_GET['district']  ?? null;
    $status    = $_GET['status']    ?? null;
    $page      = max(1, (int)($_GET['page'] ?? 1));
    $limit     = 50;
    $offset    = ($page - 1) * $limit;

    if (!validate_date($date)) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Invalid date format."]);
        exit;
    }

    if (!$community || !$district) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "community and district are required."]);
        exit;
    }

    if ($status && !in_array($status, ['present', 'absent', 'suspicious'], true)) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Invalid status filter."]);
        exit;
    }

    $session_id = $pdo->query(
        "SELECT id FROM public.academic_sessions WHERE is_current = true LIMIT 1"
    )->fetchColumn();

    if (!$session_id) {
        http_response_code(428);
        echo json_encode(["status" => "error", "message" => "No active academic session."]);
        exit;
    }

    $statusFilter = "";
    $params = [
        'session_id' => $session_id,
        'community'  => $community,
        'district'   => $district,
        'date'       => $date,
    ];

    if ($status === 'present') {
        $statusFilter = "AND ar.status = 'present'";
    } elseif ($status === 'absent') {
        $statusFilter = "AND ar.id IS NULL";
    } elseif ($status === 'suspicious') {
        $statusFilter = "AND ar.is_suspicious = true";
    }

    $sql = "
        SELECT
            sr.full_name,
            sr.uin,
            sr.index_number,
            se.program,
            se.level,
            ar.status,
            ar.captured_at,
            ar.latitude,
            ar.longitude,
            ar.accuracy,
            ar.is_suspicious,
            ar.suspicious_reason,
            ar.is_offline,
            CASE WHEN ar.id IS NOT NULL THEN true ELSE false END AS has_record
        FROM public.student_enrollments se
        JOIN public.student_registry sr ON se.registry_id = sr.id
        LEFT JOIN public.attendance_records ar
            ON  ar.enrollment_id   = se.id
            AND ar.attendance_date = :date
        WHERE se.session_id = :session_id
          AND se.community  = :community
          AND se.district   = :district
          $statusFilter
        ORDER BY sr.full_name
        LIMIT $limit OFFSET $offset
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $students = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $countSql = "
        SELECT COUNT(*)
        FROM public.student_enrollments se
        JOIN public.student_registry sr ON se.registry_id = sr.id
        LEFT JOIN public.attendance_records ar
            ON  ar.enrollment_id   = se.id
            AND ar.attendance_date = :date
        WHERE se.session_id = :session_id
          AND se.community  = :community
          AND se.district   = :district
          $statusFilter
    ";
    $countStmt = $pdo->prepare($countSql);
    $countStmt->execute($params);
    $total = (int) $countStmt->fetchColumn();

    echo json_encode([
        "status"     => "success",
        "date"       => $date,
        "community"  => $community,
        "district"   => $district,
        "students"   => $students,
        "pagination" => [
            "page"        => $page,
            "limit"       => $limit,
            "total"       => $total,
            "total_pages" => ceil($total / $limit),
        ],
    ]);

} catch (Exception $e) {
    error_log("Attendance Detail Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "An error occurred. Please try again."]);
}