<?php
declare(strict_types=1);

require_once __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/../common_auth.php';
require_once __DIR__ . '/../../models/ReportGenerator.php';

requireSuperAdmin(); 

set_time_limit(0); 
ini_set('memory_limit', '1024M');

$sessionId = $_GET['session_id'] ?? null;
$regionParam = $_GET['region'] ?? null;
$districtParam = $_GET['district'] ?? null;
$communityId = $_GET['community_id'] ?? null;

if (!$sessionId) {
    http_response_code(400);
    die(json_encode(["error" => "Academic Session ID is required."]));
}

try {
    // 1. DYNAMIC FILENAME & STRUCTURE MODE
    $zipFileName = "Attendance_Export_" . date('Ymd_His') . ".zip";
    $exportMode = 'full'; // modes: community, district, region, full

    if (!empty($communityId)) {
        $exportMode = 'community';
    } elseif (!empty($districtParam)) {
        $exportMode = 'district';
        $zipFileName = str_replace(' ', '_', $districtParam) . "_Attendance.zip";
    } elseif (!empty($regionParam)) {
        $exportMode = 'region';
        $zipFileName = str_replace(' ', '_', $regionParam) . "_Attendance.zip";
    }

    // 2. FETCH DATA
    $query = "
        SELECT 
            c.id as group_key, 
            c.name as community_name, 
            c.region, 
            c.district, 
            c.start_date, 
            c.duration_weeks,
            se.level,
            sr.full_name, 
            sr.index_number, 
            ar.week_number, 
            ar.day_number, 
            ar.status
        FROM public.student_enrollments se
        JOIN public.student_registry sr ON se.registry_id = sr.id
        JOIN public.communities c ON (se.community = c.name AND se.region = c.region AND se.district = c.district)
        LEFT JOIN public.attendance_records ar ON ar.enrollment_id = se.id
        WHERE se.session_id = :session_id
          AND c.is_deleted = false
          AND sr.is_deleted = false
    ";

    $params = [':session_id' => $sessionId];
    if ($regionParam) { $query .= " AND c.region = :region"; $params[':region'] = $regionParam; }
    if ($districtParam) { $query .= " AND c.district = :district"; $params[':district'] = $districtParam; }
    if ($communityId) { $query .= " AND c.id = :community_id"; $params[':community_id'] = $communityId; }

    $query .= " ORDER BY c.region, c.district, c.name, sr.full_name";
    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $communities = $stmt->fetchAll(PDO::FETCH_GROUP | PDO::FETCH_ASSOC);

    if (empty($communities)) throw new Exception("No records found.");

    // 3. SPECIAL CASE: SINGLE COMMUNITY FILENAME
    if ($exportMode === 'community') {
        $firstComm = reset($communities);
        $name = str_replace(['/', '\\', ' '], '_', $firstComm[0]['community_name']);
        $zipFileName = "{$name}_Attendance.zip";
    }

    $zip = new ZipArchive();
    $tempDir = __DIR__ . '/../../temp_exports';
    if (!is_dir($tempDir)) mkdir($tempDir, 0775, true);
    $zipPath = $tempDir . '/' . $zipFileName;

    if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== TRUE) {
        throw new Exception("ZIP creation failed.");
    }

    foreach ($communities as $commId => $rows) {
        $meta = $rows[0];
        $meta['student_level'] = $meta['level'] ?? 'N/A';
        $cName = str_replace(['/', '\\', ' '], '_', $meta['community_name']);
        
        // Data Structuring
        $structuredStudents = [];
        foreach ($rows as $row) {
            $idx = $row['index_number'];
            if (!isset($structuredStudents[$idx])) {
                $structuredStudents[$idx] = ['index_number' => $idx, 'full_name' => $row['full_name'], 'attendance' => []];
            }
            if ($row['week_number']) {
                $structuredStudents[$idx]['attendance'][$row['week_number']][$row['day_number']] = $row['status'];
            }
        }

        // Generate Content
        $report = new ReportGenerator($meta);
        for ($w = 1; $w <= ($meta['duration_weeks'] ?: 5); $w++) { $report->generateWeekPage($w, $structuredStudents); }
        $pdf = $report->Output('', 'S');
        $csv = generateScoreCSV($structuredStudents, $meta);

        // 4. DYNAMIC PATH LOGIC (The "Good" part)
        if ($exportMode === 'community') {
            // No subfolders, just the files
            $zip->addFromString("{$cName}_attendance.pdf", $pdf);
            $zip->addFromString("{$cName}_scoresheet.csv", $csv);
        } elseif ($exportMode === 'district') {
            // District filtered: Show Community Folders
            $zip->addFromString("{$cName}/{$cName}_attendance.pdf", $pdf);
            $zip->addFromString("{$cName}/{$cName}_scoresheet.csv", $csv);
        } else {
            // Region or Full Export: Nested structure
            $path = "{$meta['region']}/{$meta['district']}/{$cName}";
            $zip->addFromString("$path/{$cName}_attendance.pdf", $pdf);
            $zip->addFromString("$path/{$cName}_scoresheet.csv", $csv);
        }
    }

    $zip->close();

    // 5. STREAMING
    if (ob_get_level()) ob_end_clean();
    header('Content-Type: application/zip');
    header('Content-Disposition: attachment; filename="' . $zipFileName . '"');
    header('Content-Length: ' . filesize($zipPath));
    readfile($zipPath);
    unlink($zipPath); 
    exit;

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}

function generateScoreCSV($students, $meta) {
    $output = fopen('php://temp', 'r+');
    fputcsv($output, ['Index Number', 'Full Name', 'Days Present', 'Total Possible', 'Score (%)']);
    $totalPossibleDays = (int)($meta['duration_weeks'] ?? 5) * 7; 
    foreach ($students as $s) {
        $presentCount = 0;
        foreach (($s['attendance'] ?? []) as $week) {
            foreach ($week as $status) { if ($status === 'present') $presentCount++; }
        }
        $score = $totalPossibleDays > 0 ? round(($presentCount / $totalPossibleDays) * 100, 2) : 0;
        fputcsv($output, [$s['index_number'], $s['full_name'], $presentCount, $totalPossibleDays, $score . '%']);
    }
    rewind($output);
    return stream_get_contents($output);
}