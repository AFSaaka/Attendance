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
    // 1. Prepare the lookup for community GPS (Security cross-check)
    $metaSql = "SELECT c.latitude, c.longitude, c.coordinate_check, c.id as community_id, se.session_id
                FROM public.student_enrollments se
                JOIN public.communities c ON se.community = c.name
                WHERE se.id = :eid AND se.user_id = :uid";
    $metaStmt = $pdo->prepare($metaSql);

    // 2. Prepare the Hardened Insert (With Suspicious Flags)
    $sql = "INSERT INTO public.attendance_records (
                user_id, enrollment_id, community_id, session_id,
                attendance_date, status, latitude, longitude, accuracy,
                week_number, day_number, location_geom, synced,
                is_suspicious, suspicious_reason
            ) VALUES (
                :uid, :eid, :cid, :sid,
                :captured_date, :status, :lat::numeric, :lng::numeric, :acc::numeric,
                :week, :day, 
                ST_SetSRID(ST_MakePoint(:lng_geom::double precision, :lat_geom::double precision), 4326),
                TRUE, :is_suspicious, :reason
            ) 
            ON CONFLICT ON CONSTRAINT unique_user_enrollment_date 
            DO UPDATE SET 
                status = EXCLUDED.status,
                is_suspicious = EXCLUDED.is_suspicious,
                suspicious_reason = EXCLUDED.suspicious_reason,
                updated_at = CURRENT_TIMESTAMP";

    $insertStmt = $pdo->prepare($sql);

    foreach ($records as $record) {
        try {
            // A. Fetch true community metadata (Don't trust frontend IDs)
            $metaStmt->execute(['eid' => $record['enrollment_id'], 'uid' => $user_id]);
            $meta = $metaStmt->fetch();

            if (!$meta) throw new Exception("Invalid enrollment mapping.");

            // B. Anti-Spoofing Check
            $is_mocked = $record['is_mocked'] ?? false;
            $accuracy = $record['accuracy'] ?? null;
            $is_suspicious = $is_mocked || ($accuracy === 0 || $accuracy === 1);
            $reason = $is_suspicious ? "Offline sync: Suspicious GPS metadata detected." : null;

            // C. Distance Check (Re-verify on Server)
            if ($meta['coordinate_check']) {
                $distSql = "SELECT ST_Distance(
                    ST_SetSRID(ST_MakePoint(:u_lng::double precision, :u_lat::double precision), 4326)::geography,
                    ST_SetSRID(ST_MakePoint(:c_lng::double precision, :c_lat::double precision), 4326)::geography
                ) as meters";
                $dStmt = $pdo->prepare($distSql);
                $dStmt->execute([
                    'u_lng' => $record['longitude'], 'u_lat' => $record['latitude'],
                    'c_lng' => $meta['longitude'], 'c_lat' => $meta['latitude']
                ]);
                $dist = $dStmt->fetchColumn();

                if ($dist > 500) {
                    $is_suspicious = true;
                    $reason = "Distance mismatch: " . round($dist) . "m from target during offline capture.";
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
                'lng_geom' => $record['longitude'],
                'lat_geom' => $record['latitude'],
                'is_suspicious' => $is_suspicious ? 1 : 0,
                'reason' => $reason
            ]);

            $results['synced']++;
        } catch (Exception $e) {
            $results['failed']++;
            $results['errors'][] = "Record {$record['captured_at']}: " . $e->getMessage();
        }
    }

    echo json_encode(["status" => "success", "details" => $results]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database Sync Failure"]);
}