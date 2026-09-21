<?php
declare(strict_types=1);

require_once __DIR__ . '/../../common_auth.php';
require_once __DIR__ . '/../../../utils/exportHelpers.php';

requireSuperAdmin();
header("Content-Type: application/json");

$jobId = $_GET['job_id'] ?? null;
if (!$jobId) {
    http_response_code(400);
    die(json_encode(["error" => "job_id is required."]));
}

try {
    $stmt = $pdo->prepare("SELECT * FROM public.export_jobs WHERE id = :id");
    $stmt->execute([':id' => $jobId]);
    $job = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$job) {
        http_response_code(404);
        die(json_encode(["error" => "Export job not found — it may have expired. Please start a new export."]));
    }
    if ($job['status'] === 'done') {
        echo json_encode(["done" => true, "processed" => $job['processed_count'], "total" => $job['total_count']]);
        exit;
    }
    if ($job['status'] === 'error') {
        http_response_code(500);
        die(json_encode(["error" => $job['error_message'] ?? "Export failed."]));
    }

    $communityIds   = json_decode($job['community_ids'], true);
    $communityNames = json_decode($job['community_names'], true);
    $nextIndex = (int)$job['processed_count'];

    if ($nextIndex >= count($communityIds)) {
        $pdo->prepare("UPDATE public.export_jobs SET status = 'done', updated_at = NOW() WHERE id = :id")
            ->execute([':id' => $jobId]);
        echo json_encode(["done" => true, "processed" => $job['processed_count'], "total" => $job['total_count']]);
        exit;
    }

    $zipPath = __DIR__ . "/../../../temp_exports/{$jobId}.zip";
    $communityRow = ['id' => $communityIds[$nextIndex], 'name' => $communityNames[$nextIndex]];

    processOneCommunityExport($pdo, $job['session_id'], $communityRow, $job['export_mode'], $zipPath);

    $newCount = $nextIndex + 1;
    $isDone = $newCount >= count($communityIds);

    $pdo->prepare("
        UPDATE public.export_jobs 
        SET processed_count = :count, status = :status, updated_at = NOW() 
        WHERE id = :id
    ")->execute([
        ':count'  => $newCount,
        ':status' => $isDone ? 'done' : 'processing',
        ':id'     => $jobId,
    ]);

    echo json_encode([
        "done"              => $isDone,
        "processed"         => $newCount,
        "total"             => count($communityIds),
        "current_community" => $communityRow['name'],
    ]);

} catch (Exception $e) {
    error_log("Process Export Chunk Error (job {$jobId}): " . $e->getMessage());
    if (isset($jobId)) {
        $pdo->prepare("UPDATE public.export_jobs SET status = 'error', error_message = :msg, updated_at = NOW() WHERE id = :id")
            ->execute([':msg' => $e->getMessage(), ':id' => $jobId]);
    }
    http_response_code(500);
    echo json_encode(["error" => "Failed to process a community's export. The job has been marked failed — start a new export."]);
}
