<?php
header("Content-Type: application/json");
require_once __DIR__ . '/../common_auth.php';
requireStudent();

$input = json_decode(file_get_contents("php://input"), true);

// Sanitize inputs
$u_lat = (float)($input['latitude'] ?? 0);
$u_lng = (float)($input['longitude'] ?? 0);
$att_id = $input['attendance_id'] ?? null;

// Convert ISO8601 (JS format) to Database Format
$raw_date = $input['verified_at'] ?? date('c');
$verified_at = date('Y-m-d H:i:s', strtotime($raw_date));

if (!$att_id) {
    echo json_encode(["status" => "error", "message" => "Missing Attendance ID."]);
    exit;
}

try {
    $pdo->beginTransaction();

    // 1. Get original record. Note the explicit UUID cast for Postgres safety.
    $stmt = $pdo->prepare("
        SELECT a.id, c.latitude, c.longitude 
        FROM public.attendance_records a
        JOIN public.communities c ON a.community_id = c.id
        WHERE a.id = :aid::UUID AND a.user_id = :uid
    ");
    $stmt->execute(['aid' => $att_id, 'uid' => $currentUser['id']]);
    $record = $stmt->fetch();

    if (!$record) throw new Exception("Attendance record not found or access denied.");

    // 2. Check Distance (using PostGIS geography for meters)
    $distStmt = $pdo->prepare("
        SELECT ST_Distance(
            ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
            ST_SetSRID(ST_MakePoint(:c_lng, :c_lat), 4326)::geography
        )
    ");
    $distStmt->execute([
        'lng' => $u_lng, 'lat' => $u_lat,
        'c_lng' => $record['longitude'], 'c_lat' => $record['latitude']
    ]);
    $distance = (float)$distStmt->fetchColumn();

    // Define range (500 meters)
    $is_valid = ($distance <= 500);

    // 3. Log the verification attempt
    $logStmt = $pdo->prepare("
        INSERT INTO public.attendance_verifications 
        (attendance_id, verification_lat, verification_lng, verified_at, is_valid)
        VALUES (:aid::UUID, :lat, :lng, :v_at, :valid)
    ");
    $logStmt->execute([
        'aid'   => $att_id, 
        'lat'   => $u_lat, 
        'lng'   => $u_lng, 
        'v_at'  => $verified_at, 
        'valid' => $is_valid ? 'true' : 'false'
    ]);

    // 4. Final Status Update
    // If invalid, we might want to change status to 'flagged' for admin review
    $newStatus = $is_valid ? 'present' : 'flagged';
    $upd = $pdo->prepare("UPDATE public.attendance_records SET status = :status WHERE id = :aid::UUID");
    $upd->execute(['status' => $newStatus, 'aid' => $att_id]);

    $pdo->commit();

    echo json_encode([
        "status" => "success", 
        "verified" => $is_valid, 
        "distance" => round($distance, 2),
        "message" => $is_valid ? "Location verified." : "Verification failed: Out of range."
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    // Use 200 even for errors in verification logic so the frontend can display the message
    // Use 400/500 only for hard system failures
    http_response_code(400); 
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}