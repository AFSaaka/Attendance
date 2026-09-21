<?php
declare(strict_types=1);

require_once __DIR__ . '/../../common_auth.php';
require_once __DIR__ . '/../../../utils/exportHelpers.php';

requireSuperAdmin();
header("Content-Type: application/json");

$sessionId     = $_GET['session_id'] ?? null;
$regionParam   = $_GET['region'] ?? null;
$districtParam = $_GET['district'] ?? null;
$communityId   = $_GET['community_id'] ?? null;

if (!$sessionId) {
    http_response_code(400);
    die(json_encode(["error" => "Academic Session ID is required."]));
}

try {
    $tempDir = __DIR__ . '/../../../temp_exports';
    if (!is_dir($tempDir)) mkdir($tempDir, 0775, true);

    // Opportunistic cleanup: if a previous export was abandoned (browser
    // closed mid-export, network drop, etc.) its zip is just sitting on
    // disk forever otherwise — on a free-tier instance with limited
    // storage, that adds up. Anything older than an hour is safe to assume
    // abandoned.
    foreach (glob($tempDir . '/*.zip') as $file) {
        if (filemtime($file) < time() - 3600) @unlink($file);
    }

    $communities = getExportCommunityList($pdo, $sessionId, $regionParam, $districtParam, $communityId);
    if (empty($communities)) {
        http_response_code(404);
        die(json_encode(["error" => "No records found for this selection."]));
    }

    $exportMode = 'full';
    $zipFileName = "Attendance_Export_" . date('Ymd_His') . ".zip";
    if (!empty($communityId)) {
        $exportMode = 'community';
        $name = str_replace(['/', '\\', ' '], '_', $communities[0]['name']);
        $zipFileName = "{$name}_Attendance.zip";
    } elseif (!empty($districtParam)) {
        $exportMode = 'district';
        $zipFileName = str_replace(' ', '_', $districtParam) . "_Attendance.zip";
    } elseif (!empty($regionParam)) {
        $exportMode = 'region';
        $zipFileName = str_replace(' ', '_', $regionParam) . "_Attendance.zip";
    }

    $stmt = $pdo->prepare("
        INSERT INTO public.export_jobs
            (session_id, export_mode, zip_filename, community_ids, community_names, total_count, status)
        VALUES (:session_id, :export_mode, :zip_filename, :community_ids, :community_names, :total_count, 'processing')
        RETURNING id
    ");
    $stmt->execute([
        ':session_id'      => $sessionId,
        ':export_mode'     => $exportMode,
        ':zip_filename'    => $zipFileName,
        ':community_ids'   => json_encode(array_column($communities, 'id')),
        ':community_names' => json_encode(array_column($communities, 'name')),
        ':total_count'     => count($communities),
    ]);
    $jobId = $stmt->fetchColumn();

    // Create the empty zip up front so the first chunk call can just append.
    $zipPath = $tempDir . "/{$jobId}.zip";
    $zip = new ZipArchive();
    $zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE);
    $zip->close();

    echo json_encode([
        "job_id"       => $jobId,
        "total"        => count($communities),
        "zip_filename" => $zipFileName,
    ]);

} catch (Exception $e) {
    http_response_code(500);
    error_log("Start Export Error: " . $e->getMessage());
    echo json_encode(["error" => "Could not start export."]);
}
