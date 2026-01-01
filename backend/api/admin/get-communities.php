<?php
// backend/api/admin/get-communities.php
require_once __DIR__ . '/../common_auth.php';

// 1. SECURITY: Only authenticated staff can view the community registry
// Coordinators need this to see their assigned areas; Admins need it for management.
requireAdmin(); 

header("Content-Type: application/json");

try {
    /**
     * 2. OPTIMIZED SQL
     * - We avoid SELECT * to save bandwidth.
     * - We use ST_X and ST_Y to extract coordinates from the 'location' geography column.
     * - We include a 'student_count' subquery (Optional but highly useful for dashboards).
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
            (SELECT COUNT(*) FROM public.student_registry WHERE community = name AND is_deleted = false) as active_students
        FROM public.communities 
        ORDER BY region ASC, district ASC, name ASC
    ";

    $stmt = $pdo->query($query);
    $communities = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 3. SECURE & STRUCTURED RESPONSE
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