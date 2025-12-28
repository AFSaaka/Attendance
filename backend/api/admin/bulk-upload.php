<?php
// backend/api/admin/bulk-upload-students.php
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../common_auth.php';
require_once __DIR__ . '/../../vendor/autoload.php';

use Shuchkin\SimpleXLSX;

if (!isset($_FILES['student_file'])) {
    http_response_code(400);
    echo json_encode(["error" => "No file uploaded"]);
    exit;
}

$fileName = $_FILES['student_file']['name'];
$filePath = $_FILES['student_file']['tmp_name'];
$extension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

try {
    $pdo->beginTransaction();
    
    // Get current session
    $session_id = $pdo->query("SELECT id FROM public.academic_sessions ORDER BY year_end DESC LIMIT 1")->fetchColumn();
    
    $rows = [];

    if ($extension === 'csv') {
        $handle = fopen($filePath, "r");
        fgetcsv($handle); // Skip header
        while (($data = fgetcsv($handle)) !== FALSE) {
            $rows[] = $data;
        }
        fclose($handle);
    } elseif ($extension === 'xlsx') {
        if ($xlsx = SimpleXLSX::parse($filePath)) {
            $rows = $xlsx->rows();
            array_shift($rows); // Skip header row
        } else {
            throw new Exception(SimpleXLSX::parseError());
        }
    } else {
        throw new Exception("Please upload a .csv or .xlsx file.");
    }

    $successCount = 0;
    foreach ($rows as $row) {
        // Map: uin, index_number, full_name, program, region, district, community, level
        if (count($row) < 8) continue; 
        
        [$uin, $idx, $name, $prog, $reg, $dist, $comm, $level] = $row;
        if (empty($uin) || empty($idx)) continue;

        // 1. Registry
        $stmt = $pdo->prepare("INSERT INTO public.student_registry (uin, index_number, full_name, program, region, district, community) 
            VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT (index_number) DO UPDATE SET full_name = EXCLUDED.full_name RETURNING id");
        $stmt->execute([$uin, $idx, $name, $prog, $reg, $dist, $comm]);
        $registry_id = $stmt->fetchColumn();

        // 2. Enrollment
        $stmt = $pdo->prepare("INSERT INTO public.student_enrollments (registry_id, session_id, level, program, region, district, community) 
            VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$registry_id, $session_id, $level, $prog, $reg, $dist, $comm]);
        
        $successCount++;
    }

    $pdo->commit();
    echo json_encode(["status" => "success", "count" => $successCount]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}