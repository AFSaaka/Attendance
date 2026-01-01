<?php
declare(strict_types=1);

require_once __DIR__ . '/../common_auth.php';

// Security check
requireAdmin(); 

try {
    $stmt = $pdo->query("SELECT id, year_start, year_end, description, is_current FROM public.academic_sessions ORDER BY year_start DESC");
    $sessions = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode($sessions);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => "Failed to fetch sessions"]);
}