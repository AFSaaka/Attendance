<?php
// backend/api/coordinator/audit-summary.php


require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../common_auth.php'; // Adjust path to reach backend/api/common_auth.php

// Ensure $userId is set by common_auth.php
if (!isset($userId)) {
    http_response_code(401);
    echo json_encode(["error" => "Unauthorized - Session missing"]);
    exit();
}

try {
    // 1. Get the Coordinator's District first
    $stmt = $pdo->prepare("SELECT district FROM public.coordinators WHERE user_id = :id");
    $stmt->execute(['id' => $userId]);
    $coord = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$coord) {
        echo json_encode(["stats" => ["total" => 0, "active" => 0, "alerts" => 0], "audit" => []]);
        exit();
    }

    $district = $coord['district'];

    // 2. Fetch Summary Statistics
    // Count total students in this district and those with "discrepancies"
    $statsQuery = "SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN u.is_active = true THEN 1 END) as active,
        COUNT(CASE WHEN u.must_reset_password = true THEN 1 END) as alerts 
        FROM public.users u
        JOIN public.student_registry sr ON u.student_id = sr.id
        WHERE sr.district = :district AND u.role = 'student'";

    $stmt = $pdo->prepare($statsQuery);
    $stmt->execute(['district' => $district]);
    $stats = $stmt->fetch(PDO::FETCH_ASSOC);

    // 3. Fetch Audit Table Data
    $auditQuery = "SELECT 
    sr.full_name as student_name,
    sr.index_number, -- Changed from u.uin
    sr.community,
    'N/A' as distance,
    CASE WHEN u.is_active = true THEN 'Present' ELSE 'Absent' END as status
    FROM public.users u
    JOIN public.student_registry sr ON u.student_id = sr.id
    WHERE sr.district = :district AND u.role = 'student'
    ORDER BY sr.full_name ASC";
    $stmt = $pdo->prepare($auditQuery);
    $stmt->execute(['district' => $district]);
    $audit = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 4. Return combined data to React
    echo json_encode([
        "stats" => [
            "total" => (int) $stats['total'],
            "active" => (int) $stats['active'],
            "alerts" => (int) $stats['alerts']
        ],
        "audit" => $audit
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database error: " . $e->getMessage()]);
}
?>