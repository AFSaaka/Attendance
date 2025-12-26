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
    "failed" => 0,
    "errors" => []
];

try {
    // Prepare the SQL once for performance
    $sql = "INSERT INTO public.attendance_records (
                user_id, enrollment_id, attendance_date, 
                status, latitude, longitude, 
                week_number, day_number, location_geom
            ) VALUES (
                :uid, :eid, :captured_date, 
                :status, :lat::numeric, :lng::numeric, 
                :week, :day, 
                ST_SetSRID(ST_MakePoint(:lng_geom::double precision, :lat_geom::double precision), 4326)
            ) ON CONFLICT (user_id, enrollment_id, attendance_date) DO NOTHING";

    $stmt = $pdo->prepare($sql);

    foreach ($records as $record) {
        try {
            // Use the captured date from the offline record, not the current server time
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

            if ($stmt->rowCount() > 0) {
                $results['synced']++;
            } else {
                // If rowCount is 0, it means the ON CONFLICT triggered (already exists)
                $results['failed']++;
            }
        } catch (Exception $e) {
            $results['failed']++;
            $results['errors'][] = $e->getMessage();
        }
    }

    echo json_encode([
        "status" => "success",
        "message" => "Sync complete. {$results['synced']} records added, {$results['failed']} skipped/failed.",
        "details" => $results
    ]);

} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => "Database Sync Error: " . $e->getMessage()]);
}