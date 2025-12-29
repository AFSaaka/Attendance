<?php
// backend/api/admin/get-communities.php
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../common_auth.php';

try {
    // We select all fields, ordering by region and district for easy grouping
    $stmt = $pdo->query("SELECT * FROM public.communities ORDER BY region, district, name ASC");
    $communities = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode($communities);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}