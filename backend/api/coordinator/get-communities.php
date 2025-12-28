<?php
// backend/api/coordinator/get-communities.php
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../common_auth.php';

header("Content-Type: application/json");

// 1. Get district from GET request
$district = $_GET['district'] ?? '';

if (empty($district)) {
    echo json_encode([]); // Return empty array if no district provided
    exit;
}

try {
    // 2. Query using the columns shown in your schema (id, name, district)
    $stmt = $pdo->prepare("SELECT id, name FROM public.communities WHERE district = :district ORDER BY name ASC");
    $stmt->execute(['district' => $district]);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 3. Always return an array, even if empty
    echo json_encode($results ? $results : []);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}