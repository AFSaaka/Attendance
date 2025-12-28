<?php
// backend/api/admin/bulk-upload-coordinators.php
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../common_auth.php';
require_once __DIR__ . '/../../vendor/autoload.php';

use Shuchkin\SimpleXLSX;

$filePath = $_FILES['coordinator_file']['tmp_name'];
$extension = strtolower(pathinfo($_FILES['coordinator_file']['name'], PATHINFO_EXTENSION));

try {
    $pdo->beginTransaction();
    $rows = ($extension === 'xlsx') ? SimpleXLSX::parse($filePath)->rows() : [];
    if ($extension === 'csv') { /* Add CSV logic here similar to students */ }
    
    array_shift($rows); // Skip header: name, email, district, region

    foreach ($rows as $row) {
        [$name, $email, $district, $region] = $row;
        if (empty($email)) continue;

        // 1. Create User Account
        $password = password_hash("TTFPP2025", PASSWORD_DEFAULT);
        $stmt = $pdo->prepare("INSERT INTO public.users (email, password, role, user_name) 
                               VALUES (?, ?, 'coordinator', ?) RETURNING id");
        $stmt->execute([$email, $password, $name]);
        $user_id = $stmt->fetchColumn();

        // 2. Create Coordinator Profile
        $stmt = $pdo->prepare("INSERT INTO public.coordinators (user_id, district, region) VALUES (?, ?, ?)");
        $stmt->execute([$user_id, $district, $region]);
    }

    $pdo->commit();
    echo json_encode(["status" => "success", "count" => count($rows)]);
} catch (Exception $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}