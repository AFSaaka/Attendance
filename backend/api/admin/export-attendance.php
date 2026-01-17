<?php
declare(strict_types=1);

require_once __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/../common_auth.php';
require_once __DIR__ . '/../../models/ReportGenerator.php';

requireSuperAdmin(); 

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
    // UPDATED: Included sr.index_number and fixed JOIN logic
    $query = "
        SELECT 
            c.id as group_key, 
            c.name as community_name, 
            c.region, 
            c.district, 
            c.start_date, 
            c.duration_weeks,
            se.level,
            asess.description as session_desc,
            sr.full_name, 
            sr.index_number, 
            ar.week_number, 
            ar.day_number, 
            ar.status
        FROM public.student_enrollments se
        JOIN public.student_registry sr ON se.registry_id = sr.id
        JOIN public.academic_sessions asess ON se.session_id = asess.id
        JOIN public.communities c ON 
            se.community = c.name AND 
            se.region = c.region AND 
            se.district = c.district
        LEFT JOIN public.attendance_records ar ON ar.enrollment_id = se.id
        WHERE se.session_id = :session_id
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
    
    $communities = $stmt->fetchAll(PDO::FETCH_GROUP | PDO::FETCH_ASSOC);

    if (empty($communities)) {
        throw new Exception("No attendance records found for the selected criteria.");
    }

    // 2. Setup ZIP
    $zip = new ZipArchive();
    $tempDir = __DIR__ . '/../../temp_exports';
    if (!is_dir($tempDir)) mkdir($tempDir, 0775, true);

    $zipFileName = "Attendance_Report_" . date('Ymd_His') . ".zip";
    $zipPath = $tempDir . '/' . $zipFileName;

    if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== TRUE) {
        throw new Exception("Could not create ZIP file at $zipPath");
    }

    foreach ($communities as $commId => $rows) {
       // Inside the foreach ($communities as $commId => $rows) loop:

    // 1. Prepare Metadata
    $meta = $rows[0];
    $meta['student_level'] = $meta['level'] ?? 'N/A';
    $communityName = str_replace(['/', '\\'], '_', $meta['community_name']); // Sanitize name
    $region = $meta['region'];
    $district = $meta['district'];

    // 2. Generate Content
    $structuredStudents = [];
    foreach ($rows as $row) {
        $idx = $row['index_number'];
        if (!isset($structuredStudents[$idx])) {
            $structuredStudents[$idx] = [
                'index_number' => $idx,
                'full_name' => $row['full_name'],
                'attendance' => []
            ];
        }
        if ($row['week_number']) {
            $structuredStudents[$idx]['attendance'][$row['week_number']][$row['day_number']] = $row['status'];
        }
    }

    // Generate PDF
    $report = new ReportGenerator($meta);
    for ($w = 1; $w <= ($meta['duration_weeks'] ?: 5); $w++) {
        $report->generateWeekPage($w, $structuredStudents);
    }
    $pdfContent = $report->Output('', 'S');

    // Generate CSV (Using the updated logic with $meta)
    $csvContent = generateScoreCSV($structuredStudents, $meta);

    // 3. ZIP Structure Implementation
    // Path: Region / District / attendance / community_attendance.pdf
    $pdfPath = "$region/$district/attendance/{$communityName}_attendance.pdf";
    
    // Path: Region / District / scoresheets / community_scoresheet.csv
    $csvPath = "$region/$district/scoresheets/{$communityName}_scoresheet.csv";

    $zip->addFromString($pdfPath, $pdfContent);
    $zip->addFromString($csvPath, $csvContent);
    }

    $zip->close();

    // 3. Download and Cleanup
    header('Content-Type: application/zip');
    header('Content-Length: ' . filesize($zipPath));
    header('Content-Disposition: attachment; filename="' . $zipFileName . '"');
    readfile($zipPath);
    unlink($zipPath); 
    exit;

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage(), "trace" => $e->getTraceAsString()]);
}

function generateScoreCSV($students, $meta) {
    $output = fopen('php://temp', 'r+');
    fputcsv($output, ['Index Number', 'Full Name', 'Days Present', 'Total Possible', 'Score (%)']);
    
    // Calculate total possible days: Duration in weeks * 7 days per week
    // We use the meta from the community currently being processed
    $durationWeeks = (int)($meta['duration_weeks'] ?? 5);
    $totalPossibleDays = $durationWeeks * 7; 

    foreach ($students as $s) {
        $presentCount = 0;
        
        // Count 'present' status across all weeks and days
        if (isset($s['attendance']) && is_array($s['attendance'])) {
            foreach ($s['attendance'] as $week) {
                foreach ($week as $status) {
                    if ($status === 'present') {
                        $presentCount++;
                    }
                }
            }
        }

        // Calculation: (present / total_possible) * 100
        $score = $totalPossibleDays > 0 
            ? round(($presentCount / $totalPossibleDays) * 100, 2) 
            : 0;

        fputcsv($output, [
            $s['index_number'], 
            $s['full_name'], 
            $presentCount, 
            $totalPossibleDays, 
            $score . '%'
        ]);
    }
    
    rewind($output);
    return stream_get_contents($output);
}