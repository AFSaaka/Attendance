<?php
declare(strict_types=1);

require_once __DIR__ . '/../common_auth.php';
requireSuperAdmin();


$type = $_GET['type'] ?? '';
$sessionId = $_GET['session_id'] ?? null;
$region = $_GET['region'] ?? null;
$district = $_GET['district'] ?? null;

if (!$sessionId) {
    http_response_code(400);
    echo json_encode(["error" => "Session ID is required"]);
    exit;
}

// Optimization: Shared condition to exclude deleted records
$activeOnly = "AND is_deleted = false";

try {
    if ($type === 'regions') {
        $stmt = $pdo->prepare("SELECT DISTINCT region FROM public.communities WHERE session_id = ? $activeOnly ORDER BY region");
        $stmt->execute([$sessionId]);
        echo json_encode($stmt->fetchAll(PDO::FETCH_COLUMN));
    } 
    elseif ($type === 'districts') {
        $stmt = $pdo->prepare("SELECT DISTINCT district FROM public.communities WHERE session_id = ? AND region = ? $activeOnly ORDER BY district");
        $stmt->execute([$sessionId, $region]);
        echo json_encode($stmt->fetchAll(PDO::FETCH_COLUMN));
    } 
    elseif ($type === 'communities') {
        $stmt = $pdo->prepare("SELECT id, name FROM public.communities WHERE session_id = ? AND region = ? AND district = ? $activeOnly ORDER BY name");
        $stmt->execute([$sessionId, $region, $district]);
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    } else {
        echo json_encode([]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["error" => "Internal Server Error", "details" => $e->getMessage()]);
}