<?php
declare(strict_types=1);

require_once __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/../common_auth.php';
require_once __DIR__ . '/../../models/ReportGenerator.php';

requireSuperAdmin(); //

set_time_limit(0); 
ini_set('memory_limit', '1024M');

$sessionId = $_GET['session_id'] ?? null;
$region = $_GET['region'] ?? null;
$district = $_GET['district'] ?? null;
$communityId = $_GET['community_id'] ?? null;

if (!$sessionId) {
    http_response_code(400);
    die(json_encode(["error" => "Academic Session ID is required."]));
}

try {
    // 1. Fetch Aggregated Data
    $query = "
        SELECT 
            c.id as group_key, 
            c.name as community_name, c.region, c.district, c.start_date, c.duration_weeks,
            asess.description as session_desc,
            sr.full_name, sr.uin,
            ar.week_number, ar.day_number, ar.status
        FROM public.communities c
        JOIN public.academic_sessions asess ON c.session_id = asess.id
        JOIN public.student_enrollments se ON se.community_id = c.id
        JOIN public.student_registry sr ON se.student_id = sr.id
        LEFT JOIN public.attendance_records ar ON ar.enrollment_id = se.id
        WHERE asess.id = :session_id
    ";

    if ($region) $query .= " AND c.region = :region";
    if ($district) $query .= " AND c.district = :district";
    if ($communityId) $query .= " AND c.id = :community_id";
    
    $query .= " ORDER BY c.region, c.district, c.name, sr.full_name, ar.week_number, ar.day_number";

    $stmt = $pdo->prepare($query);
    $params = ['session_id' => $sessionId];
    if ($region) $params['region'] = $region;
    if ($district) $params['district'] = $district;
    if ($communityId) $params['community_id'] = $communityId;
    $stmt->execute($params);
    
    // Group records by community_id
    $communities = $stmt->fetchAll(PDO::FETCH_GROUP | PDO::FETCH_ASSOC);

    // 2. Setup ZIP
    $zip = new ZipArchive();
    $tempDir = __DIR__ . '/../../temp_exports';
    $zipFileName = "Attendance_Report_" . date('Ymd_His') . ".zip";
    $zipPath = $tempDir . '/' . $zipFileName;

    if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== TRUE) {
        throw new Exception("Could not create ZIP file at $zipPath");
    }

    foreach ($communities as $commId => $rows) {
        $meta = $rows[0];
        $meta['student_level'] = "Level 300"; // Assuming or fetch from DB
        
        // Structure data: [student_uin] => [info..., attendance => [week][day] => status]
        $structuredStudents = [];
        foreach ($rows as $row) {
            $uin = $row['uin'];
            if (!isset($structuredStudents[$uin])) {
                $structuredStudents[$uin] = [
                    'uin' => $uin,
                    'full_name' => $row['full_name'],
                    'attendance' => []
                ];
            }
            if ($row['week_number']) {
                $structuredStudents[$uin]['attendance'][$row['week_number']][$row['day_number']] = $row['status'];
            }
        }

        // Generate PDF using our ReportGenerator Class
        $report = new ReportGenerator($meta);
        for ($w = 1; $w <= ($meta['duration_weeks'] ?: 5); $w++) {
            $report->generateWeekPage($w, $structuredStudents);
        }
        $pdfContent = $report->Output('', 'S');

        // Generate CSV Score
        $csvContent = generateScoreCSV($structuredStudents);

        // Add to ZIP hierarchy
        $folderPath = "{$meta['region']}/{$meta['district']}/{$meta['community_name']}/";
        $zip->addFromString($folderPath . "Weekly_Attendance_Sheets.pdf", $pdfContent);
        $zip->addFromString($folderPath . "Attendance_Scores.csv", $csvContent);
    }

    $zip->close();

    // 3. Download and Cleanup
    header('Content-Type: application/zip');
    header('Content-Length: ' . filesize($zipPath));
    header('Content-Disposition: attachment; filename="' . $zipFileName . '"');
    readfile($zipPath);
    
    unlink($zipPath); // Delete temp file after download
    exit;

} catch (Exception $e) {
    error_log($e->getMessage());
    http_response_code(500);
    echo json_encode(["error" => "Export failed. Please check server logs."]);
}

function generateScoreCSV($students) {
    $output = fopen('php://temp', 'r+');
    fputcsv($output, ['Student Index', 'Full Name', 'Days Present', 'Score (%)']);
    
    foreach ($students as $s) {
        $present = 0;
        $totalPossible = 0;
        foreach($s['attendance'] as $week) {
            foreach($week as $status) {
                if ($status === 'present') $present++;
                $totalPossible++;
            }
        }
        $score = $totalPossible > 0 ? round(($present / $totalPossible) * 100, 2) : 0;
        fputcsv($output, [$s['uin'], $s['full_name'], $present, $score . '%']);
    }
    
    rewind($output);
    return stream_get_contents($output);
}