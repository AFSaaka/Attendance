<?php
// backend/api/admin/update-student.php
require_once __DIR__ . '/../common_auth.php';

// Only Admins/SuperAdmins
requireAdmin(); 

$data = json_decode(file_get_contents("php://input"), true);

$id           = $data['id'] ?? null; 
$full_name    = isset($data['full_name']) ? trim($data['full_name']) : '';
$uin          = isset($data['uin']) ? trim($data['uin']) : '';
$index_number = isset($data['index_number']) ? trim($data['index_number']) : '';
$admin_id     = $currentUser['id'];

if (!$id || empty($full_name)) {
    http_response_code(400);
    exit(json_encode(["error" => "Required data missing: ID or Full Name"]));
}

try {
    $pdo->beginTransaction();

    // 1. Update Registry (Master Identity)
    $stmtReg = $pdo->prepare("
        UPDATE public.student_registry 
        SET full_name = ?, uin = ?, index_number = ?, updated_at = NOW()
        WHERE id = ?
    ");
    $stmtReg->execute([$full_name, $uin, $index_number, $id]);

    // 2. Sync to Users Table (If the student has claimed their account)
    // We update the UIN here so their login stays valid.
    $stmtUser = $pdo->prepare("
        UPDATE public.users 
        SET uin = ?, updated_at = NOW()
        WHERE student_id = ?
    ");
    $stmtUser->execute([$uin, $id]);

    // 3. Update Enrollment (Location/Academic Details)
    $stmtEnr = $pdo->prepare("
        UPDATE public.student_enrollments 
        SET program = ?, region = ?, district = ?, community = ?, level = ?, updated_at = NOW()
        WHERE registry_id = ? 
        AND session_id = (
            SELECT id FROM public.academic_sessions 
            WHERE is_current = true 
            LIMIT 1
        )
    ");
    $stmtEnr->execute([
        $data['program'] ?? '',
        $data['region'] ?? '',
        $data['district'] ?? '',
        $data['community'] ?? '',
        $data['level'] ?? '',
        $id
    ]);

    // 4. Create Audit Log
    $logStmt = $pdo->prepare("
        INSERT INTO public.audit_logs (user_id, action_type, target_id, session_id, ip_address, details) 
        SELECT 
            ?, 'STUDENT_UPDATE', ?, id, ?, ?
        FROM public.academic_sessions WHERE is_current = true LIMIT 1
    ");
    
    $details = json_encode([
        "message" => "Admin updated student profile",
        "changes" => [
            "name" => $full_name,
            "uin" => $uin,
            "index" => $index_number
        ]
    ]);

    $logStmt->execute([$admin_id, $id, $_SERVER['REMOTE_ADDR'], $details]);

    $pdo->commit();
    echo json_encode(["success" => true, "message" => "Student records fully synchronized."]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    
    // Handle Unique Constraint Violations (PostgreSQL error code 23505)
    if ($e->getCode() == 23505) {
        http_response_code(409); // Conflict
        exit(json_encode(["error" => "UIN or Index Number already exists for another student."]));
    }

    http_response_code(500);
    echo json_encode(["error" => "System Error: Update failed."]);
}