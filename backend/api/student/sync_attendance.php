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

// 1. Prepare Meta Lookup
$metaSql = "SELECT c.latitude, c.longitude, c.coordinate_check, c.id as community_id, se.session_id
            FROM public.student_enrollments se
            JOIN public.communities c ON se.community = c.name
            WHERE se.id = :eid AND se.user_id = :uid";
$metaStmt = $pdo->prepare($metaSql);

// 2. Prepare the UPSERT
// We use the most granular unique constraint columns here
$sql = "INSERT INTO public.attendance_records (
            user_id, enrollment_id, community_id, session_id,
            attendance_date, status, latitude, longitude, accuracy,
            week_number, day_number, location_geom, synced,
            is_suspicious, suspicious_reason
        ) VALUES (
            :uid, :eid, :cid, :sid,
            :captured_date, :status, :lat, :lng, :acc,
            :week, :day, 
            ST_SetSRID(ST_MakePoint(:lng_geom, :lat_geom), 4326),
            TRUE, :is_suspicious, :reason
        ) 
        ON CONFLICT (user_id, attendance_date) 
        DO UPDATE SET 
            status = EXCLUDED.status,
            is_suspicious = EXCLUDED.is_suspicious,
            suspicious_reason = EXCLUDED.suspicious_reason,
            updated_at = CURRENT_TIMESTAMP";

$insertStmt = $pdo->prepare($sql);

foreach ($records as $record) {
    try {
        $metaStmt->execute(['eid' => $record['enrollment_id'], 'uid' => $user_id]);
        $meta = $metaStmt->fetch();

        if (!$meta) throw new Exception("Invalid enrollment mapping for record.");

        // Anti-Spoofing
        $is_mocked = $record['is_mocked'] ?? false;
        $accuracy = (float)($record['accuracy'] ?? 0);
        $is_suspicious = $is_mocked || ($accuracy > 0 && $accuracy < 1);
        $reason = $is_suspicious ? "Offline sync: Suspicious GPS metadata." : null;

        // Server-side Distance Re-verification
        if ($meta['coordinate_check'] && !empty($record['latitude'])) {
            $distSql = "SELECT ST_Distance(
                ST_SetSRID(ST_MakePoint(:u_lng, :u_lat), 4326)::geography,
                ST_SetSRID(ST_MakePoint(:c_lng, :c_lat), 4326)::geography
            ) as meters";
            $dStmt = $pdo->prepare($distSql);
            $dStmt->execute([
                'u_lng' => (float)$record['longitude'], 'u_lat' => (float)$record['latitude'],
                'c_lng' => (float)$meta['longitude'], 'c_lat' => (float)$meta['latitude']
            ]);
            $dist = $dStmt->fetchColumn();

            if ($dist > 500) {
                $is_suspicious = true;
                $reason = "Distance: " . round($dist) . "m from community.";
            }
        }

        $capturedDate = date('Y-m-d', strtotime($record['captured_at']));

        $insertStmt->execute([
            'uid'  => $user_id,
            'eid'  => $record['enrollment_id'],
            'cid'  => $meta['community_id'],
            'sid'  => $meta['session_id'],
            'captured_date' => $capturedDate,
            'status' => $record['status'] ?? 'present',
            'lat'    => $record['latitude'],
            'lng'    => $record['longitude'],
            'acc'    => $accuracy,
            'week'   => $record['week_number'],
            'day'    => $record['day_number'],
            'lng_geom' => (float)$record['longitude'],
            'lat_geom' => (float)$record['latitude'],
            'is_suspicious' => $is_suspicious ? 1 : 0,
            'reason' => $reason
        ]);

        $results['synced']++;
    } catch (Exception $e) {
        $results['failed']++;
        $results['errors'][] = $e->getMessage();
    }
}

echo json_encode(["status" => "success", "details" => $results]);