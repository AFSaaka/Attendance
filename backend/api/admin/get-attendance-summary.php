<?php
declare(strict_types=1);
header("Content-Type: application/json; charset=utf-8");

require_once __DIR__ . '/../common_auth.php';
require_once __DIR__ . '/../../utils/validators.php';

requireAdmin();

try {
    // 1. Get active session
    $session_id = $pdo->query(
        "SELECT id FROM public.academic_sessions WHERE is_current = true LIMIT 1"
    )->fetchColumn();

    if (!$session_id) {
        http_response_code(428);
        echo json_encode(["status" => "error", "message" => "No active academic session found."]);
        exit;
    }

    // 2. Date filter — defaults to today (Ghana timezone)
    date_default_timezone_set('Africa/Accra');
    $date = $_GET['date'] ?? date('Y-m-d');

    // Validate date format
    if (!validate_date($date)) {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Invalid date format. Use YYYY-MM-DD."]);
        exit;
    }

    // 3. Optional region/district filters
    $region   = $_GET['region']   ?? null;
    $district = $_GET['district'] ?? null;

    // 4. Build WHERE clause dynamically
    $where = "se.session_id = :session_id";
    $params = ['session_id' => $session_id, 'date' => $date];

    if ($region) {
        $where .= " AND se.region = :region";
        $params['region'] = $region;
    }
    if ($district) {
        $where .= " AND se.district = :district";
        $params['district'] = $district;
    }

    // 5. Daily summary — one row per community
    // Uses LEFT JOIN so communities with zero attendance still appear
    $summarySql = "
        SELECT
            se.region,
            se.district,
            se.community,
            COUNT(DISTINCT se.registry_id)                          AS total_students,
            COUNT(DISTINCT ar.user_id)                              AS present_count,
            COUNT(DISTINCT se.registry_id) - COUNT(DISTINCT ar.user_id) AS absent_count,
            COUNT(DISTINCT CASE WHEN ar.is_suspicious THEN ar.user_id END) AS suspicious_count,
            ROUND(
                COUNT(DISTINCT ar.user_id)::numeric /
                NULLIF(COUNT(DISTINCT se.registry_id), 0) * 100,
            1) AS attendance_rate
        FROM public.student_enrollments se
        LEFT JOIN public.attendance_records ar
            ON  ar.enrollment_id   = se.id
            AND ar.attendance_date = :date
            AND ar.status          = 'present'
        WHERE $where
        GROUP BY se.region, se.district, se.community
        ORDER BY se.region, se.district, se.community
    ";

    $stmt = $pdo->prepare($summarySql);
    $stmt->execute($params);
    $communities = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 6. Overall totals for the day
    $totalStudents  = array_sum(array_column($communities, 'total_students'));
    $totalPresent   = array_sum(array_column($communities, 'present_count'));
    $totalAbsent    = array_sum(array_column($communities, 'absent_count'));
    $totalSuspicious = array_sum(array_column($communities, 'suspicious_count'));
    $overallRate    = $totalStudents > 0
        ? round(($totalPresent / $totalStudents) * 100, 1)
        : 0;

    // 7. Get available regions for filter dropdown
    $regionsStmt = $pdo->prepare("
        SELECT DISTINCT region FROM public.student_enrollments
        WHERE session_id = :sid ORDER BY region
    ");
    $regionsStmt->execute(['sid' => $session_id]);
    $regions = $regionsStmt->fetchAll(PDO::FETCH_COLUMN);

    echo json_encode([
        "status" => "success",
        "date"   => $date,
        "totals" => [
            "total_students"   => $totalStudents,
            "present"          => $totalPresent,
            "absent"           => $totalAbsent,
            "suspicious"       => $totalSuspicious,
            "attendance_rate"  => $overallRate,
        ],
        "communities" => $communities,
        "filters"     => [
            "regions" => $regions,
        ],
    ]);

} catch (Exception $e) {
    error_log("Attendance Summary Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "An error occurred. Please try again."]);
}