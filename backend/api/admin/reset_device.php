<?php
// Only allow admins to reach this (you would add role checks here)
require_once __DIR__ . '/../../config/db.php';
$pdo = getDB();

$data = json_decode(file_get_contents("php://input"), true);
$student_id = $data['student_id'];

$stmt = $pdo->prepare("UPDATE users SET device_fingerprint = NULL, device_locked_at = NULL WHERE id = ?");
if ($stmt->execute([$student_id])) {
    echo json_encode(["status" => "success", "message" => "Device link reset successfully."]);
}