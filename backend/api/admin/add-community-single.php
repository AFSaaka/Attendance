<?php
// backend/api/admin/add-community.php
require_once __DIR__ . '/../common_auth.php';
require_once __DIR__ . '/../../utils/validators.php';

requireAdmin();
validateCSRFToken();

$data = json_decode(file_get_contents("php://input"), true);
$admin_id = $currentUser['id'];

if (empty($data['name']) || empty($data['region']) || empty($data['district'])) {
    http_response_code(400);
    exit(json_encode(["error" => "Name, Region, and District are required."]));
}

try {
    $pdo->beginTransaction();

    // 1. GET CURRENT SESSION ID
    $sessStmt = $pdo->query("SELECT id FROM public.academic_sessions WHERE is_current = true LIMIT 1");
    $currentSession = $sessStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$currentSession) {
        throw new Exception("No active academic session found. Please set a session to 'current' first.");
    }
    $sessionId = $currentSession['id'];

    // 2. UPDATED SQL (Including session_id)
    $sql = "INSERT INTO public.communities 
            (name, region, district, latitude, longitude, location, start_date, duration_weeks, session_id)
            VALUES (:name, :region, :district, :lat, :lng, 
                CASE 
                    WHEN :lat_val::double precision IS NULL OR :lng_val::double precision IS NULL THEN NULL 
                    ELSE ST_SetSRID(ST_MakePoint(:lng_ptr::double precision, :lat_ptr::double precision), 4326)::geography 
                END, 
                :start_date::date, :duration::int, :session_id)
            ON CONFLICT (name, region, district) 
            DO UPDATE SET 
                latitude = EXCLUDED.latitude,
                longitude = EXCLUDED.longitude,
                location = EXCLUDED.location,
                start_date = EXCLUDED.start_date,
                duration_weeks = EXCLUDED.duration_weeks,
                session_id = EXCLUDED.session_id, -- Keep the session_id updated
                is_deleted = false,               -- If re-adding a deleted community, restore it
                updated_at = NOW()
            RETURNING id";

    $stmt = $pdo->prepare($sql);
    
    $lat = (isset($data['latitude']) && is_numeric($data['latitude'])) ? (float)$data['latitude'] : null;
    $lng = (isset($data['longitude']) && is_numeric($data['longitude'])) ? (float)$data['longitude'] : null;
    $startDate = (!empty($data['start_date'])) ? $data['start_date'] : null;
    $duration = (isset($data['duration_weeks']) && is_numeric($data['duration_weeks'])) ? (int)$data['duration_weeks'] : 5;

    $stmt->execute([
        'name'       => trim($data['name']),
        'region'     => trim($data['region']),
        'district'   => trim($data['district']),
        'lat'        => $lat,
        'lng'        => $lng,
        'lat_val'    => $lat,
        'lng_val'    => $lng,
        'lat_ptr'    => $lat,
        'lng_ptr'    => $lng,
        'start_date' => $startDate,
        'duration'   => $duration,
        'session_id' => $sessionId // New parameter
    ]);
    
    $community_id = $stmt->fetchColumn();

    // 3. AUDIT LOGGING
    $logStmt = $pdo->prepare("
        INSERT INTO public.audit_logs (user_id, action_type, ip_address, details) 
        VALUES (?, 'COMMUNITY_MANUAL_CREATE', ?, ?)
    ");
    
    $details = json_encode([
        "message" => "Admin created/updated community: " . $data['name'],
        "session_id" => $sessionId,
        "community_id" => $community_id
    ]);

    $logStmt->execute([$admin_id, $_SERVER['REMOTE_ADDR'], $details]);

    $pdo->commit();
    echo json_encode(["success" => true, "message" => "Community saved for the current session."]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log("Add Community Error: " . $e->getMessage());
    http_response_code(500);
     echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}