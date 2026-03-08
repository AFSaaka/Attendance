<?php
// backend/api/admin/upload-communities.php
require_once __DIR__ . '/../common_auth.php';
require_once __DIR__ . '/../../utils/validators.php';
require_once __DIR__ . '/../../vendor/autoload.php';

use Shuchkin\SimpleXLSX;

requireAdmin();
validateCSRFToken();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit(json_encode(["error" => "Method not allowed"]));
}

try {
    if (!isset($_FILES['file'])) {
        throw new Exception("No file provided for upload.");
    }

    // 1. GET CURRENT SESSION ID (Get this once before the loop)
    $sessStmt = $pdo->query("SELECT id FROM public.academic_sessions WHERE is_current = true LIMIT 1");
    $currentSession = $sessStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$currentSession) {
        throw new Exception("No active academic session found. Please set a session to 'current' before uploading.");
    }
    $sessionId = $currentSession['id'];

    $fileTmpPath = $_FILES['file']['tmp_name'];
    $fileName = $_FILES['file']['name'];
    $extension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
    $rows = [];

    // FILE PARSING
    if ($extension === 'xlsx') {
        if ($xlsx = SimpleXLSX::parse($fileTmpPath)) {
            $rows = $xlsx->rows();
            array_shift($rows); // Skip header: [name, region, district, lat, lng, start_date, duration]
        } else {
            throw new Exception("Excel Parse Error: " . SimpleXLSX::parseError());
        }
    } elseif ($extension === 'csv') {
        if (($handle = fopen($fileTmpPath, "r")) !== FALSE) {
            fgetcsv($handle); // Skip header
            while (($data = fgetcsv($handle)) !== FALSE) {
                $rows[] = $data;
            }
            fclose($handle);
        }
    } else {
        throw new Exception("Unsupported file format. Please use .csv or .xlsx");
    }

    $pdo->beginTransaction();

    // 2. UPDATED SQL (Added session_id and is_deleted reset)
    $stmt = $pdo->prepare("
        INSERT INTO public.communities 
        (name, region, district, latitude, longitude, location, start_date, duration_weeks, session_id)
        VALUES (
            :name, :region, :district, :lat, :lng, 
            CASE 
                WHEN :lat_val::double precision IS NULL OR :lng_val::double precision IS NULL THEN NULL 
                ELSE ST_SetSRID(ST_MakePoint(:lng_ptr::double precision, :lat_ptr::double precision), 4326)::geography 
            END,
            :start_date::date,
            :duration::int,
            :session_id
        )
        ON CONFLICT (name, region, district) 
        DO UPDATE SET 
            latitude = EXCLUDED.latitude, 
            longitude = EXCLUDED.longitude,
            location = EXCLUDED.location,
            start_date = EXCLUDED.start_date,
            duration_weeks = EXCLUDED.duration_weeks,
            session_id = EXCLUDED.session_id,
            is_deleted = false, 
            updated_at = NOW()
    ");

    $count = 0;
    foreach ($rows as $index => $data) {
        if (empty($data[0])) continue; 

        $lat = (isset($data[3]) && is_numeric($data[3])) ? (float)$data[3] : null;
        $lng = (isset($data[4]) && is_numeric($data[4])) ? (float)$data[4] : null;
        $startDate = (!empty($data[5])) ? trim($data[5]) : null;
        $duration  = (isset($data[6]) && is_numeric($data[6])) ? (int)$data[6] : 5;

        $stmt->execute([
            'name'       => trim((string)$data[0]),
            'region'     => trim((string)$data[1]),
            'district'   => trim((string)$data[2]),
            'lat'        => $lat,
            'lng'        => $lng,
            'lat_val'    => $lat,
            'lng_val'    => $lng,
            'lat_ptr'    => $lat,
            'lng_ptr'    => $lng,
            'start_date' => $startDate,
            'duration'   => $duration,
            'session_id' => $sessionId // Link to current session
        ]);
        $count++;
    }

    // AUDIT LOGGING
    $logStmt = $pdo->prepare("
        INSERT INTO public.audit_logs (user_id, action_type, ip_address, details) 
        VALUES (?, 'COMMUNITY_BULK_UPLOAD', ?, ?)
    ");
    
    $details = json_encode([
        "message" => "Processed $count communities for session $sessionId",
        "filename" => $fileName,
        "session_id" => $sessionId
    ]);

    $logStmt->execute([$currentUser['id'], $_SERVER['REMOTE_ADDR'], $details]);

    $pdo->commit();
    echo json_encode(["success" => true, "message" => "Successfully processed $count communities."]);

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    error_log("Community Upload Error: " . $e->getMessage());
    echo json_encode(["error" => "An error occurred. Please try again."]);
}