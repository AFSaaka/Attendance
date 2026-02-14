<?php
// api/student/submit_attendance.php
header("Content-Type: application/json");
require_once __DIR__ . '/../common_auth.php';

requireStudent(); 

$data = json_decode(file_get_contents("php://input"), true);
date_default_timezone_set('Africa/Accra');

try {
    $enrollment_id = $data['enrollment_id'] ?? null;
    $user_id = $currentUser['id']; 
    $u_lat = $data['latitude'] ?? null;
    $u_lng = $data['longitude'] ?? null;
    $u_acc = $data['accuracy'] ?? null; // NEW: Capture accuracy
    $is_mocked = $data['is_mocked'] ?? false; // NEW: Capture frontend detection

    if (!$enrollment_id || !$u_lat || !$u_lng) {
        echo json_encode(["status" => "error", "message" => "Missing required location data."]);
        exit;
    }

    // 1. Fetch community metadata
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

    // 2. ANTI-SPOOFING LOGIC (Backend Validation)
    $is_suspicious = $is_mocked;
    $suspicious_reason = $is_mocked ? "Frontend detected mock location" : null;

    // Check for "Perfect" accuracy (Common in spoofers)
    if ($u_acc === 0 || $u_acc === 1) {
        $is_suspicious = true;
        $suspicious_reason = "Anomalous accuracy reported: {$u_acc}m";
    }

    // 3. DISTANCE VERIFICATION
    $distance_meters = 0;
    if ($meta['coordinate_check'] === true) {
        $distSql = "SELECT ST_Distance(
            ST_SetSRID(ST_MakePoint(:u_lng::double precision, :u_lat::double precision), 4326)::geography,
            ST_SetSRID(ST_MakePoint(:c_lng::double precision, :c_lat::double precision), 4326)::geography
        ) as meters";

        $distStmt = $pdo->prepare($distSql);
        $distStmt->execute([
            'u_lng' => $u_lng, 'u_lat' => $u_lat,
            'c_lng' => $meta['longitude'], 'c_lat' => $meta['latitude']
        ]);
        $distResult = $distStmt->fetch();
        $distance_meters = $distResult['meters'];

        if ($distance_meters > 500) {
            echo json_encode(["status" => "error", "message" => "Too far away (" . round($distance_meters) . "m)."]);
            exit;
        }
    }

    // 4. THE INSERT (Enhanced with security fields)
    // NOTE: You may need to add 'accuracy', 'is_suspicious', and 'suspicious_reason' columns to your table
    $sql = "INSERT INTO public.attendance_records (
                user_id, enrollment_id, community_id, session_id,
                attendance_date, status, latitude, longitude, accuracy,
                week_number, day_number, location_geom, 
                is_suspicious, suspicious_reason
            ) VALUES (
                :ins_uid, :ins_eid, :ins_cid, :ins_sid,
                CURRENT_DATE, :ins_status, :ins_lat::numeric, :ins_lng::numeric, :ins_acc::numeric,
                :ins_week, :ins_day, 
                ST_SetSRID(ST_MakePoint(:ins_lng_geom::double precision, :ins_lat_geom::double precision), 4326),
                :ins_suspicious, :ins_reason
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
        'ins_acc' => $u_acc,
        'ins_week' => $data['week_number'],
        'ins_day' => $data['day_number'],
        'ins_lat_geom' => $u_lat,
        'ins_lng_geom' => $u_lng,
        'ins_suspicious' => $is_suspicious ? 1 : 0,
        'ins_reason' => $suspicious_reason
    ]);

    echo json_encode([
        "status" => "success", 
        "message" => $is_suspicious ? "Recorded (Pending Review)" : "Attendance recorded successfully!"
    ]);

} catch (PDOException $e) {
    if ($e->getCode() == '23505') {
        echo json_encode(["status" => "error", "message" => "Already signed for today!"]);
    } else {
        error_log($e->getMessage()); // Log full error for admin
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Internal server error."]);
    }
}