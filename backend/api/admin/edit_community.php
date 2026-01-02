<?php
// backend/api/admin/edit_community.php
require_once __DIR__ . '/../common_auth.php';
requireAdmin(); // Standard admin check

header("Content-Type: application/json");

$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['id'])) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Missing ID"]);
    exit;
}

try {
    $pdo->beginTransaction();

    $stmt = $pdo->prepare("
        UPDATE public.communities 
        SET 
            name = ?, 
            region = ?, 
            district = ?, 
            latitude = ?, 
            longitude = ? 
        WHERE id = ?
    ");

    $stmt->execute([
        $input['name'],
        $input['region'],
        $input['district'],
        (float)$input['latitude'],
        (float)$input['longitude'],
        $input['id']
    ]);

    // Log the change
    $logStmt = $pdo->prepare("INSERT INTO public.audit_logs (user_id, action_type, target_id, details) VALUES (?, ?, ?, ?)");
    $logStmt->execute([
        $currentUser['id'],
        'COMMUNITY_EDIT',
        $input['id'],
        json_encode(['name' => $input['name']])
    ]);

    $pdo->commit();
    echo json_encode(["status" => "success"]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}