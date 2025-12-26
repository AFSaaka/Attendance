<?php
// backend/api/student/verify-location.php
require_once __DIR__ . '/../common_auth.php';
requireLogin();

$data = json_decode(file_get_contents("php://input"), true);
$studentLat = $data['lat'] ?? null;
$studentLng = $data['lng'] ?? null;

if (!$studentLat || !$studentLng) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Coordinates missing."]);
    exit;
}

try {
    // 1. Get the student's assigned community name from the registry
    // 2. Calculate distance using PostGIS geography functions
    $sql = "SELECT 
                c.name,
                ST_Distance(
                    c.location, 
                    ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
                ) as distance_meters
            FROM public.communities c
            JOIN public.student_registry sr ON sr.community = c.name
            WHERE sr.user_id = :user_id";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        'lng' => $studentLng,
        'lat' => $studentLat,
        'user_id' => $_SESSION['user_id']
    ]);

    $result = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$result) {
        throw new Exception("Community record not found for this student.");
    }

    $distance = $result['distance_meters'];
    $is_on_site = $distance <= 200; // 200 meter threshold

    // 3. Update the attendance record
    // (You would insert into an attendance_logs table here)

    echo json_encode([
        "status" => $is_on_site ? "success" : "error",
        "distance" => $distance,
        "message" => $is_on_site ? "On-site" : "You are too far from your community center."
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}