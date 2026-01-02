<?php
// backend/api/admin/get-academic-sessions.php
require_once __DIR__ . '/../common_auth.php';
requireSuperAdmin(); 

header("Content-Type: application/json");

try {
    // Order by current status first, then by the start year descending
    $stmt = $pdo->query("SELECT * FROM public.academic_sessions 
                         ORDER BY is_current DESC, year_start DESC");
    $sessions = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "status" => "success",
        "data" => $sessions
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}