<?php
// api/student/submit_attendance.php
header("Content-Type: application/json");
require_once __DIR__ . '/../common_auth.php';

// 1. Stricter Security Guard
requireStudent(); 

$data = json_decode(file_get_contents("php://input"), true);
date_default_timezone_set('Africa/Accra');

try {
    $enrollment_id = $data['enrollment_id'] ?? null;
    $user_id = $currentUser['id']; 
    $u_lat = $data['latitude'] ?? null;
    $u_lng = $data['longitude'] ?? null;

    if (!$enrollment_id || !$u_lat || !$u_lng) {
        echo json_encode(["status" => "error", "message" => "Missing required location data."]);
        exit;
    }

    // 2. Fetch community coordinates, toggle, AND IDs for the record
    $checkSql = "SELECT c.id as community_id, c.latitude, c.longitude, c.coordinate_check, se.session_id
                 FROM public.student_enrollments se
                 JOIN public.communities c ON se.community = c.name
                 WHERE se.id = :eid";
    
    $checkStmt = $pdo->prepare($checkSql);
    $checkStmt->execute(['eid' => $enrollment_id]);
    $meta = $checkStmt->fetch();

    if (!$meta) {
        echo json_encode(["status" => "error", "message" => "Placement record not found."]);
        exit;
    }

    // 3. CONDITIONAL DISTANCE VERIFICATION
    if ($meta['coordinate_check'] === true) {
        if (is_null($meta['latitude'])) {
            echo json_encode(["status" => "error", "message" => "Community GPS not set. Contact Admin."]);
            exit;
        }

        $distSql = "SELECT ST_Distance(
            ST_SetSRID(ST_MakePoint(:u_lng::double precision, :u_lat::double precision), 4326)::geography,
            ST_SetSRID(ST_MakePoint(:c_lng::double precision, :c_lat::double precision), 4326)::geography
        ) as meters";

        $distStmt = $pdo->prepare($distSql);
        $distStmt->execute([
            'u_lng' => $u_lng,
            'u_lat' => $u_lat,
            'c_lng' => $meta['longitude'],
            'c_lat' => $meta['latitude']
        ]);
        $distResult = $distStmt->fetch();

        if ($distResult['meters'] > 200) {
            echo json_encode([
                "status" => "error",
                "message" => "Too far away (" . round($distResult['meters']) . "m). Verification required."
            ]);
            exit;
        }
    }

    // 4. THE INSERT (Now including community_id and session_id)
    $sql = "INSERT INTO public.attendance_records (
                user_id, enrollment_id, community_id, session_id,
                attendance_date, status, latitude, longitude, 
                week_number, day_number, location_geom, synced
            ) VALUES (
                :ins_uid, :ins_eid, :ins_cid, :ins_sid,
                CURRENT_DATE, :ins_status, :ins_lat::numeric, :ins_lng::numeric, 
                :ins_week, :ins_day, 
                ST_SetSRID(ST_MakePoint(:ins_lng_geom::double precision, :ins_lat_geom::double precision), 4326),
                TRUE
            )";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        'ins_uid' => $user_id,
        'ins_eid' => $enrollment_id,
        'ins_cid' => $meta['community_id'],
        'ins_sid' => $meta['session_id'],
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
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Submission failed."]);
    }
}