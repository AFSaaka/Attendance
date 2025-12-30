<?php
// backend/api/admin/update-student.php
require_once __DIR__ . '/../common_auth.php';

// Only Admins/SuperAdmins
requireAdmin(); 

$data = json_decode(file_get_contents("php://input"), true);

// Extract data - Using your shared schema names
$id           = $data['id'] ?? null; 
$full_name    = isset($data['full_name']) ? trim($data['full_name']) : '';
$uin          = isset($data['uin']) ? trim($data['uin']) : '';
$index_number = isset($data['index_number']) ? trim($data['index_number']) : '';

// Validation: Require ID and Name (UIN and Index can be empty strings but must be present)
if (!$id || empty($full_name)) {
    http_response_code(400);
    exit(json_encode(["error" => "Required data missing: ID or Full Name"]));
}

try {
    $pdo->beginTransaction();

    // 1. Update Registry (Identity)
    $stmtReg = $pdo->prepare("
        UPDATE public.student_registry 
        SET full_name = ?, uin = ?, index_number = ?, updated_at = NOW()
        WHERE id = ?
    ");
    $stmtReg->execute([$full_name, $uin, $index_number, $id]);

    // 2. Update Enrollment (Targeting the CURRENT session based on your schema)
    // We use 'is_current' as per your CREATE TABLE definition
    $stmtEnr = $pdo->prepare("
        UPDATE public.student_enrollments 
        SET program = ?, region = ?, district = ?, community = ?, level = ?, updated_at = NOW()
        WHERE registry_id = ? 
        AND session_id = (
            SELECT id FROM public.academic_sessions 
            ORDER BY is_current DESC, year_start DESC 
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

    $pdo->commit();
    echo json_encode(["success" => true, "message" => "Student record synchronized"]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    
    error_log("Update Failure: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["error" => "Database Error: " . $e->getMessage()]);
}