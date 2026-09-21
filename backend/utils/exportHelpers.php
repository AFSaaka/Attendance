<?php
// backend/utils/exportHelpers.php
//
// Shared between the export/*.php job endpoints. Kept in one place
// deliberately — this is the same lesson from the password-policy fix:
// scoring/report logic duplicated across files drifts apart over time.

/**
 * Same scoring logic as before, just relocated so it has one home.
 */
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

/**
 * Returns the ordered list of communities matching the export filters.
 * This is what determines how many progress "steps" a job has — one
 * community = one chunk request = one progress bar tick.
 */
function getExportCommunityList(PDO $pdo, $sessionId, $regionParam, $districtParam, $communityId) {
    $query = "
        SELECT DISTINCT c.id, c.name, c.region, c.district
        FROM public.student_enrollments se
        JOIN public.communities c ON c.id = se.community_id
        WHERE se.session_id = :session_id
          AND c.is_deleted = false
    ";
    $params = [':session_id' => $sessionId];
    if ($regionParam)   { $query .= " AND c.region = :region"; $params[':region'] = $regionParam; }
    if ($districtParam) { $query .= " AND c.district = :district"; $params[':district'] = $districtParam; }
    if ($communityId)   { $query .= " AND c.id = :community_id"; $params[':community_id'] = $communityId; }
    $query .= " ORDER BY c.region, c.district, c.name";

    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Generates the PDF+CSV for exactly ONE community and appends them into
 * the job's zip file. This is the unit of work one chunk request does —
 * kept small on purpose so it always finishes well under any proxy timeout,
 * regardless of how many communities the overall export covers.
 */
function processOneCommunityExport(PDO $pdo, $sessionId, $communityRow, $exportMode, $zipPath) {
    require_once __DIR__ . '/../models/ReportGenerator.php';

    $query = "
        SELECT 
            c.id as group_key, c.name as community_name, c.region, c.district,
            c.start_date, c.duration_weeks, se.level,
            sr.full_name, sr.index_number, ar.week_number, ar.day_number, ar.status
        FROM public.student_enrollments se
        JOIN public.student_registry sr ON se.registry_id = sr.id
        JOIN public.communities c ON c.id = se.community_id
        LEFT JOIN public.attendance_records ar ON ar.enrollment_id = se.id
        WHERE se.session_id = :session_id
          AND c.id = :community_id
          AND c.is_deleted = false
          AND sr.is_deleted = false
        ORDER BY sr.full_name
    ";
    $stmt = $pdo->prepare($query);
    $stmt->execute([':session_id' => $sessionId, ':community_id' => $communityRow['id']]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($rows)) return; // no enrolled students here — nothing to add, not an error

    $meta = $rows[0];
    $meta['student_level'] = $meta['level'] ?? 'N/A';
    $cName = str_replace(['/', '\\', ' '], '_', $meta['community_name']);

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

    $report = new ReportGenerator($meta);
    for ($w = 1; $w <= ($meta['duration_weeks'] ?: 5); $w++) { $report->generateWeekPage($w, $structuredStudents); }
    $pdf = $report->Output('', 'S');
    $csv = generateScoreCSV($structuredStudents, $meta);

    $zip = new ZipArchive();
    // CREATE (no OVERWRITE) opens the existing zip for appending — this
    // is what lets each chunk request add to the same file across
    // multiple separate HTTP requests.
    if ($zip->open($zipPath, ZipArchive::CREATE) !== TRUE) {
        throw new Exception("Could not open export zip for appending.");
    }

    if ($exportMode === 'community') {
        $zip->addFromString("{$cName}_attendance.pdf", $pdf);
        $zip->addFromString("{$cName}_scoresheet.csv", $csv);
    } elseif ($exportMode === 'district') {
        $zip->addFromString("{$cName}/{$cName}_attendance.pdf", $pdf);
        $zip->addFromString("{$cName}/{$cName}_scoresheet.csv", $csv);
    } else {
        $path = "{$meta['region']}/{$meta['district']}/{$cName}";
        $zip->addFromString("$path/{$cName}_attendance.pdf", $pdf);
        $zip->addFromString("$path/{$cName}_scoresheet.csv", $csv);
    }

    $zip->close();
}
