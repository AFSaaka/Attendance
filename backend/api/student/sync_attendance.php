<?php
header("Content-Type: application/json");
require_once __DIR__ . '/../common_auth.php';
requireLogin();
require_once __DIR__ . '/../../config/db.php';

$data = json_decode(file_get_contents("php://input"), true);
$records = $data['records'] ?? [];
$user_id = $_SESSION['user_id'] ?? null;

if (!$user_id || empty($records)) {
    echo json_encode(["status" => "error", "message" => "Invalid sync data or session expired."]);
    exit;
}

$results = [
    "synced" => 0,
    "skipped" => 0,
    "failed" => 0,
    "errors" => []
];

try {
    // 1. Added 'synced' column to the INSERT list
    // 2. Added 'ON CONFLICT' update to ensure it's marked as synced even if previously skipped
    $sql = "INSERT INTO public.attendance_records (
                user_id, enrollment_id, attendance_date, 
                status, latitude, longitude, 
                week_number, day_number, location_geom,
                synced 
            ) VALUES (
                :uid, :eid, :captured_date, 
                :status, :lat::numeric, :lng::numeric, 
                :week, :day, 
                ST_SetSRID(ST_MakePoint(:lng_geom::double precision, :lat_geom::double precision), 4326),
                TRUE
            ) 
            ON CONFLICT (user_id, enrollment_id, attendance_date) 
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
                'uid' => $user_id,
                'eid' => $record['enrollment_id'],
                'captured_date' => $capturedDate,
                'status' => $record['status'] ?? 'present',
                'lat' => $record['latitude'],
                'lng' => $record['longitude'],
                'week' => $record['week_number'],
                'day' => $record['day_number'],
                'lng_geom' => $record['longitude'],
                'lat_geom' => $record['latitude']
            ]);

            // With DO UPDATE, rowCount() returns 1 for new insert, 2 for update
            if ($stmt->rowCount() > 0) {
                $results['synced']++;
            } else {
                $results['skipped']++;
            }
        } catch (Exception $e) {
            $results['failed']++;
            $results['errors'][] = $e->getMessage();
        }
    }

    echo json_encode([
        "status" => "success",
        "message" => "Sync complete. {$results['synced']} updated/added, {$results['skipped']} skipped.",
        "details" => $results
    ]);

} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => "Database Sync Error: " . $e->getMessage()]);
}