<?php
// backend/api/coordinator/set-community-start-date.php
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../common_auth.php';

$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['community_id'], $data['start_date'])) {
    http_response_code(400);
    exit(json_encode(["error" => "Incomplete data"]));
}

try {
    // Update the existing start_date column in communities table
    $stmt = $pdo->prepare("UPDATE public.communities SET start_date = :start_date WHERE id = :id");
    $stmt->execute([
        'start_date' => $data['start_date'],
        'id'         => $data['community_id']
    ]);

    echo json_encode(["status" => "success", "message" => "Start date updated"]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}