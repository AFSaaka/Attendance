<?php
// api/student/sync_attendance.php
header("Content-Type: application/json");
require_once __DIR__ . '/../common_auth.php';
requireStudent();

$data = json_decode(file_get_contents("php://input"), true);
$records = $data['records'] ?? [];
$user_id = $currentUser['id'];

if (empty($records)) {
    echo json_encode(["status" => "error", "message" => "No records to sync."]);
    exit;
}

$results = ["synced" => 0, "failed" => 0, "errors" => []];

try {
    // 1. Notice we added community_id and session_id to the INSERT
    $sql = "INSERT INTO public.attendance_records (
                user_id, enrollment_id, community_id, session_id,
                attendance_date, status, latitude, longitude, 
                week_number, day_number, location_geom, synced 
            ) VALUES (
                :uid, :eid, :cid, :sid,
                :captured_date, :status, :lat::numeric, :lng::numeric, 
                :week, :day, 
                ST_SetSRID(ST_MakePoint(:lng_geom::double precision, :lat_geom::double precision), 4326),
                TRUE
            ) 
            ON CONFLICT ON CONSTRAINT unique_user_enrollment_date 
            DO UPDATE SET 
                status = EXCLUDED.status,
                latitude = EXCLUDED.latitude,
                longitude = EXCLUDED.longitude,
                location_geom = EXCLUDED.location_geom,
                synced = TRUE,
                updated_at = CURRENT_TIMESTAMP";

    $stmt = $pdo->prepare($sql);

    foreach ($records as $record) {
        try {
            $capturedDate = date('Y-m-d', strtotime($record['captured_at']));

            $stmt->execute([
                'uid'  => $user_id,
                'eid'  => $record['enrollment_id'],
                'cid'  => $record['community_id'] ?? null, // From frontend
                'sid'  => $record['session_id'] ?? null,   // From frontend
                'captured_date' => $capturedDate,
                'status' => $record['status'] ?? 'present',
                'lat'    => $record['latitude'],
                'lng'    => $record['longitude'],
                'week'   => $record['week_number'],
                'day'    => $record['day_number'],
                'lng_geom' => $record['longitude'],
                'lat_geom' => $record['latitude']
            ]);

            $results['synced']++;
        } catch (Exception $e) {
            $results['failed']++;
            $results['errors'][] = "Date {$record['captured_at']}: " . $e->getMessage();
        }
    }

    echo json_encode(["status" => "success", "details" => $results]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database Sync Failure"]);
}