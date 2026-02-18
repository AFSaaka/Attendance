<?php
header("Content-Type: application/json");
require_once __DIR__ . '/../common_auth.php';
requireStudent(); 

$input = json_decode(file_get_contents("php://input"), true);
date_default_timezone_set('Africa/Accra');

$records = isset($input['records']) ? $input['records'] : [$input];
if (empty($records) || (isset($records[0]) && empty($records[0]))) {
    echo json_encode(["status" => "error", "message" => "No data."]);
    exit;
}

$syncedCount = 0; 
$skippedCount = 0;
$lastRecordId = null; // Variable to hold the UUID

try {
    $pdo->beginTransaction();

    foreach ($records as $data) {
        $u_lat = isset($data['latitude']) ? (float)$data['latitude'] : null;
        $u_lng = isset($data['longitude']) ? (float)$data['longitude'] : null;
        $u_acc = isset($data['accuracy']) ? (float)$data['accuracy'] : null;
        $captured_at = $data['captured_at'] ?? date('Y-m-d H:i:s');
        $att_date = date('Y-m-d', strtotime($captured_at));
        
        $incoming_offline = (isset($data['is_offline']) && ($data['is_offline'] === true || $data['is_offline'] === 'true'));
        $db_is_offline = $incoming_offline ? 'true' : 'false';
        $db_synced = $incoming_offline ? 'true' : 'false';

        $metaSql = "SELECT c.id as community_id, c.latitude as c_lat, c.longitude as c_lng, 
                           c.coordinate_check, se.session_id
                    FROM public.student_enrollments se
                    JOIN public.communities c ON se.community = c.name
                    WHERE se.id = :eid";
        $metaStmt = $pdo->prepare($metaSql);
        $metaStmt->execute(['eid' => $data['enrollment_id'] ?? null]);
        $meta = $metaStmt->fetch();

        if (!$meta) continue;

        $is_suspicious = ($data['is_mocked'] ?? false) || ($u_acc > 0 && $u_acc < 1);
        $reason = $is_suspicious ? "Spoofing detected" : null;

        if ($meta['coordinate_check'] && $u_lat && $u_lng) {
            $distSql = "SELECT ST_Distance(ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, ST_SetSRID(ST_MakePoint(:c_lng, :c_lat), 4326)::geography) as meters";
            $distStmt = $pdo->prepare($distSql);
            $distStmt->execute(['lng' => $u_lng, 'lat' => $u_lat, 'c_lng' => $meta['c_lng'], 'c_lat' => $meta['c_lat']]);
            $dist = $distStmt->fetchColumn();
            if ($dist > 500) { $is_suspicious = true; $reason = "Distance: " . round($dist) . "m"; }
        }

        // CHANGE 1: We hardcode 'pending' for the initial submission status
        // CHANGE 2: Added RETURNING id at the end
        $sql = "INSERT INTO public.attendance_records (
                    user_id, enrollment_id, community_id, session_id,
                    attendance_date, status, latitude, longitude, accuracy,
                    week_number, day_number, location_geom, 
                    is_suspicious, suspicious_reason, is_offline, captured_at, synced
                ) VALUES (
                    :uid, :eid, :cid, :sid, :date, 'pending', :lat, :lng, :acc, :wk, :day,
                    ST_SetSRID(ST_MakePoint(:lng_g, :lat_g), 4326)::geography,
                    :susp, :reason, :off, :cap, :synced
                ) 
                ON CONFLICT (user_id, attendance_date) 
                DO UPDATE SET 
                    synced = EXCLUDED.synced,
                    is_offline = EXCLUDED.is_offline,
                    is_suspicious = EXCLUDED.is_suspicious,
                    suspicious_reason = EXCLUDED.suspicious_reason,
                    updated_at = CURRENT_TIMESTAMP
                WHERE public.attendance_records.synced = FALSE
                RETURNING id"; 

        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            'uid' => $currentUser['id'], 'eid' => $data['enrollment_id'],
            'cid' => $meta['community_id'], 'sid' => $meta['session_id'],
            'date' => $att_date,
            'lat' => $u_lat, 'lng' => $u_lng, 'acc' => $u_acc,
            'wk' => $data['week_number'] ?? null, 'day' => $data['day_number'] ?? null,
            'lng_g' => $u_lng, 'lat_g' => $u_lat,
            'susp' => $is_suspicious ? 'true' : 'false', 'reason' => $reason,
            'off' => $db_is_offline, 'cap' => $captured_at, 'synced' => $db_synced
        ]);

        // Capture the UUID from the RETURNING clause
        $lastRecordId = $stmt->fetchColumn();

        if ($stmt->rowCount() > 0) $syncedCount++;
        else $skippedCount++;
    }

    $pdo->commit();
    
    // Return the record_id (UUID) so React can use it for verification later
    echo json_encode([
        "status" => "success", 
        "record_id" => $lastRecordId,
        "details" => ["synced" => $syncedCount, "skipped" => $skippedCount]
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
