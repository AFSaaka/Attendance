<?php
declare(strict_types=1);

require_once __DIR__ . '/../../common_auth.php';

requireSuperAdmin();

$jobId = $_GET['job_id'] ?? null;
if (!$jobId) { http_response_code(400); die("job_id is required."); }

try {
    $stmt = $pdo->prepare("SELECT * FROM public.export_jobs WHERE id = :id");
    $stmt->execute([':id' => $jobId]);
    $job = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$job) { http_response_code(404); die("Export job not found."); }
    if ($job['status'] !== 'done') { http_response_code(409); die("Export is not finished yet."); }

    $zipPath = __DIR__ . "/../../../temp_exports/{$jobId}.zip";
    if (!file_exists($zipPath)) {
        http_response_code(410);
        die("Export file is no longer available (it may have expired). Please start a new export.");
    }

    if (ob_get_level()) ob_end_clean();
    header('Content-Type: application/zip');
    header('Content-Disposition: attachment; filename="' . $job['zip_filename'] . '"');
    header('Content-Length: ' . filesize($zipPath));
    readfile($zipPath);
    unlink($zipPath);

    $pdo->prepare("DELETE FROM public.export_jobs WHERE id = :id")->execute([':id' => $jobId]);
    exit;

} catch (Exception $e) {
    error_log("Download Export Error: " . $e->getMessage());
    http_response_code(500);
    die("Download failed.");
}
