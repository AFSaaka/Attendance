<?php
// backend/api/admin/edit_community.php
require_once __DIR__ . '/../common_auth.php';
require_once __DIR__ . '/../../utils/validators.php';
requireAdmin();
validateCSRFToken(); 

header("Content-Type: application/json");

$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['id'])) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Missing ID"]);
    exit;
}
// Guard: prevent start_date change if attendance already exists
if (isset($input['start_date'])) {
    $existingStmt = $pdo->prepare("SELECT start_date FROM public.communities WHERE id = ?::uuid");
    $existingStmt->execute([$input['id']]);
    $existing = $existingStmt->fetch();

    if ($existing && $existing['start_date'] !== $input['start_date']) {
        $countStmt = $pdo->prepare("
            SELECT COUNT(*) FROM public.attendance_records ar
            JOIN public.student_enrollments se ON ar.enrollment_id = se.id
            WHERE se.community_id = ?::uuid
        ");
        $countStmt->execute([$input['id']]);
        $count = $countStmt->fetchColumn();

        if ($count > 0) {
            http_response_code(409);
            echo json_encode([
                "status" => "error",
                "message" => "Cannot change start date — $count attendance records already exist for this community. Changing the date would corrupt week/day calculations for existing records."
            ]);
            exit;
        }
    }
}

try {
    $pdo->beginTransaction();

    
    $stmt = $pdo->prepare("
        UPDATE public.communities 
        SET 
            name = ?, 
            region = ?, 
            district = ?, 
            latitude = ?, 
            longitude = ?,
            start_date = ?,
            duration_weeks = ?,
            location = CASE 
                WHEN ?::double precision IS NULL OR ?::double precision IS NULL THEN NULL 
                ELSE ST_SetSRID(ST_MakePoint(?::double precision, ?::double precision), 4326)::geography 
            END,
            updated_at = NOW()
        WHERE id = ?::uuid
    ");

    // Prepare variables to match your schema types
    $lat = (isset($input['latitude']) && is_numeric($input['latitude'])) ? (float)$input['latitude'] : null;
    $lng = (isset($input['longitude']) && is_numeric($input['longitude'])) ? (float)$input['longitude'] : null;
    $startDate = (!empty($input['start_date'])) ? $input['start_date'] : null;
    $duration = (isset($input['duration_weeks'])) ? (int)$input['duration_weeks'] : 5;

    $stmt->execute([
        $input['name'],       // 1. name
        $input['region'],     // 2. region
        $input['district'],   // 3. district
        $lat,                 // 4. latitude
        $lng,                 // 5. longitude
        $startDate,           // 6. start_date
        $duration,            // 7. duration_weeks
        $lat,                 // 8. (for CASE check)
        $lng,                 // 9. (for CASE check)
        $lng,                 // 10. (for ST_MakePoint - Longitude/X)
        $lat,                 // 11. (for ST_MakePoint - Latitude/Y)
        $input['id']          // 12. id (UUID)
    ]);

    // Audit Log
    $logStmt = $pdo->prepare("INSERT INTO public.audit_logs (user_id, action_type, target_id, details) VALUES (?, ?, ?, ?)");
    $logStmt->execute([
        $currentUser['id'],
        'COMMUNITY_EDIT',
        $input['id'],
        json_encode(['name' => $input['name']])
    ]);

    $pdo->commit();
    echo json_encode(["status" => "success"]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    // Returning the full error so you can see exactly what Postgres is complaining about
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}