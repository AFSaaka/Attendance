<?php
// backend/api/admin/get-communities.php
require_once __DIR__ . '/../common_auth.php';

requireAdmin(); 

header("Content-Type: application/json");

try {
    /**
     * 2. OPTIMIZED SQL
     * - Added WHERE is_deleted = false to exclude hidden communities.
     */
    $query = "
    SELECT 
        id, 
        name, 
        region, 
        district, 
        latitude, 
        longitude,
        start_date,
        duration_weeks,
        coordinate_check,
        (SELECT COUNT(*) FROM public.student_registry WHERE community = name AND is_deleted = false) as active_students
    FROM public.communities 
    WHERE is_deleted = false 
    ORDER BY region ASC, district ASC, name ASC
";

    $stmt = $pdo->query($query);
    $communities = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "status" => "success",
        "timestamp" => date('c'),
        "count" => count($communities),
        "data" => $communities
    ]);

} catch (PDOException $e) {
    error_log("Get Communities Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        "status" => "error", 
        "message" => "Internal Server Error: Unable to fetch community list."
    ]);
}