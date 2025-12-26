<?php
header("Content-Type: application/json");
require_once __DIR__ . '/../common_auth.php';
requireLogin();
require_once __DIR__ . '/../../config/db.php';

$data = json_decode(file_get_contents("php://input"), true);

try {
    $enrollment_id = $data['enrollment_id'] ?? null;
    $user_id = $_SESSION['user_id'] ?? null;
    $u_lat = $data['latitude'] ?? null;
    $u_lng = $data['longitude'] ?? null;

    if (!$enrollment_id || !$u_lat || !$u_lng) {
        echo json_encode(["status" => "error", "message" => "Missing required data."]);
        exit;
    }

    // 1. Fetch official community coordinates
    $checkSql = "SELECT community_lat, community_lng FROM public.student_enrollments WHERE id = :eid";
    $checkStmt = $pdo->prepare($checkSql);
    $checkStmt->execute(['eid' => $enrollment_id]);
    $community = $checkStmt->fetch();

    if (!$community || is_null($community['community_lat'])) {
        echo json_encode(["status" => "error", "message" => "Community coordinates not found."]);
        exit;
    }

    // 2. DISTANCE VERIFICATION (With explicit type casting in the SQL string)
    $distSql = "SELECT ST_Distance(
        ST_SetSRID(ST_MakePoint(:u_lng::double precision, :u_lat::double precision), 4326)::geography,
        ST_SetSRID(ST_MakePoint(:c_lng::double precision, :c_lat::double precision), 4326)::geography
    ) as meters";

    $distStmt = $pdo->prepare($distSql);
    $distStmt->execute([
        'u_lng' => $u_lng,
        'u_lat' => $u_lat,
        'c_lng' => $community['community_lng'],
        'c_lat' => $community['community_lat']
    ]);
    $distResult = $distStmt->fetch();

    if ($distResult['meters'] > 200) {
        echo json_encode([
            "status" => "error",
            "message" => "Too far away (" . round($distResult['meters']) . "m)."
        ]);
        exit;
    }

    // 3. THE INSERT (Using unique names and explicit casting)
    $sql = "INSERT INTO public.attendance_records (
                user_id, enrollment_id, attendance_date, 
                status, latitude, longitude, 
                week_number, day_number, location_geom
            ) VALUES (
                :ins_uid, :ins_eid, CURRENT_DATE, 
                :ins_status, :ins_lat::numeric, :ins_lng::numeric, 
                :ins_week, :ins_day, 
                ST_SetSRID(ST_MakePoint(:ins_lng_geom::double precision, :ins_lat_geom::double precision), 4326)
            )";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        'ins_uid' => $user_id,
        'ins_eid' => $enrollment_id,
        'ins_status' => $data['status'] ?? 'present',
        'ins_lat' => $u_lat,
        'ins_lng' => $u_lng,
        'ins_week' => $data['week_number'],
        'ins_day' => $data['day_number'],
        'ins_lat_geom' => $u_lat,
        'ins_lng_geom' => $u_lng
    ]);

    echo json_encode(["status" => "success", "message" => "Attendance recorded successfully!"]);

} catch (PDOException $e) {
    if ($e->getCode() == '23505') {
        echo json_encode(["status" => "error", "message" => "Already signed for today!"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Database Error: " . $e->getMessage()]);
    }
}