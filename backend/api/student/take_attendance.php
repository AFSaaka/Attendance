<?php
require_once __DIR__ . '/../common_auth.php';
require_once __DIR__ . '/../../utils/validators.php';
requireLogin();
// TEMPORARILY DISABLED - debugging CSRF flow
// validateCSRFToken();

$data = json_decode(file_get_contents("php://input"), true);
$lat = $data['lat'] ?? null;
$lng = $data['lng'] ?? null;
$userId = $_SESSION['user_id'];

// Validate coordinates
if ($lat === null || $lng === null || !validate_coordinates($lat, $lng)) {
    error_log("Invalid coordinates: lat=$lat, lng=$lng");
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "An error occurred. Please try again."]);
    exit;
}

try {
    // This query finds the student's assigned community and calculates the distance
    // ST_Distance returns meters when used with the geography type
    $sql = "
        SELECT 
            c.name as community_name,
            ST_Distance(
                c.location, 
                ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
            ) as distance_meters
        FROM public.student_registry sr
        JOIN public.communities c ON sr.community = c.name
        WHERE sr.user_id = :user_id
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute(['lng' => $lng, 'lat' => $lat, 'user_id' => $userId]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$result) {
        echo json_encode(["status" => "error", "message" => "Placement data not found."]);
        exit;
    }

    $distance = (float) $result['distance_meters'];
    $is_on_site = ($distance <= 1000); // 1000 meter threshold

    if ($is_on_site) {
        // TODO: Insert into your attendance_logs table here
        echo json_encode([
            "status" => "success",
            "distance" => $distance,
            "message" => "Attendance verified."
        ]);
    } else {
        echo json_encode([
            "status" => "error",
            "distance" => $distance,
            "message" => "You are outside the community zone."
        ]);
    }

} catch (PDOException $e) {
    error_log("Take Attendance Error: " . $e->getMessage());
    echo json_encode(["status" => "error", "message" => "An error occurred. Please try again."]);
}