<?php
// backend/api/student/get_placement.php

// 1. Load the central security and auth helper
require_once __DIR__ . '/../common_auth.php';

// 2. Enforce the security guard
requireLogin();

// 3. The logic is now strictly focused on data retrieval
try {
    // We use the ID directly from the secure session provided by common_auth.php
    $stmt = $pdo->prepare("
    SELECT 
        se.id,             -- THIS IS THE MISSING KEY
        sr.full_name, 
        sr.uin, 
        sr.index_number,
        se.program, 
        se.level, 
        se.region, 
        se.district, 
        se.community,
        asess.description as academic_year,
        c.latitude as community_lat,
        c.longitude as community_lng,
        c.start_date,
        c.duration_weeks
    FROM students s
    JOIN student_registry sr ON s.registry_id = sr.id
    LEFT JOIN student_enrollments se ON sr.id = se.registry_id
    LEFT JOIN academic_sessions asess ON se.session_id = asess.id
    LEFT JOIN communities c ON se.community = c.name
    WHERE s.user_id = ?
    LIMIT 1
");
    $stmt->execute([$_SESSION['user_id']]);
    $data = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($data) {
        echo json_encode(["status" => "success", "placement" => $data]);
    } else {
        // Logically, a user exists but may not have enrollment data yet
        echo json_encode(["status" => "error", "message" => "Enrollment record not found."]);
    }
} catch (PDOException $e) {
    // Security Note: Don't echo $e->getMessage() in production to hide table names
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database retrieval failed."]);
}