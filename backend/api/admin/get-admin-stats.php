<?php
// backend/api/admin/get-admin-stats.php
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../common_auth.php'; // Ensure admin-only check is inside here

header("Content-Type: application/json");

try {
    // We run three counts in one request for performance
    $stats = [];

    // 1. Total Students
    $stats['students'] = $pdo->query("SELECT COUNT(*) FROM public.students")->fetchColumn();

    // 2. Total Communities
    $stats['communities'] = $pdo->query("SELECT COUNT(*) FROM public.communities")->fetchColumn();

    // 3. Total Coordinators
    $stats['coordinators'] = $pdo->query("SELECT COUNT(*) FROM public.coordinators")->fetchColumn();

    echo json_encode($stats);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}