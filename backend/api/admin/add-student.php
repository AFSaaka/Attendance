<?php
// backend/api/admin/add-student.php
require_once __DIR__ . '/../common_auth.php';

requireAdmin();

$data = json_decode(file_get_contents("php://input"), true);
$admin_id = $currentUser['id'];

// 1. LOG THE INCOMING DATA (Check what React is sending)
error_log("DEBUG: Received Manual Add Request for: " . ($data['full_name'] ?? 'Unknown'));
error_log("DEBUG: Full Payload: " . json_encode($data));

if (empty($data['uin']) || empty($data['index_number']) || empty($data['full_name'])) {
    error_log("DEBUG: Validation Failed - Missing UIN, Index, or Name");
    http_response_code(400);
    exit(json_encode(["status" => "error", "message" => "Missing required fields"]));
}

try {
    $pdo->beginTransaction();

    // 2. SESSION LOGGING
    $session_id = $pdo->query("SELECT id FROM public.academic_sessions WHERE is_current = true LIMIT 1")->fetchColumn();
    if (!$session_id) {
        $session_id = $pdo->query("SELECT id FROM public.academic_sessions ORDER BY year_end DESC LIMIT 1")->fetchColumn();
    }
    error_log("DEBUG: Target Session ID: " . ($session_id ?: 'NONE FOUND'));

    if (!$session_id) {
        throw new Exception("No active academic session found.");
    }

    // 3. TABLE 1: REGISTRY LOGGING
    error_log("DEBUG: Attempting Table 1 (Registry) Upsert for UIN: " . $data['uin']);
    $stmt = $pdo->prepare("
        INSERT INTO public.student_registry 
        (uin, index_number, full_name, program, region, district, community, is_deleted, updated_at)
        VALUES (:uin, :idx, :name, :prog, :reg, :dist, :comm, false, NOW())
        ON CONFLICT (index_number) DO UPDATE SET 
            full_name = EXCLUDED.full_name,
            uin = EXCLUDED.uin,
            updated_at = NOW()
        RETURNING id
    ");
    
    $stmt->execute([
        'uin'   => trim($data['uin']),
        'idx'   => trim($data['index_number']),
        'name'  => trim($data['full_name']),
        'prog'  => $data['program']   ?? null,
        'reg'   => $data['region']    ?? null,
        'dist'  => $data['district']  ?? null,
        'comm'  => $data['community'] ?? null
    ]);
    $registry_id = $stmt->fetchColumn();
    error_log("DEBUG: Table 1 Success. Registry ID: " . $registry_id);

    // 4. TABLE 2: ENROLLMENT LOGGING
    error_log("DEBUG: Attempting Table 2 (Enrollment) for Registry ID: " . $registry_id);
    $stmtEnr = $pdo->prepare("
        INSERT INTO public.student_enrollments 
        (registry_id, session_id, level, program, region, district, community, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        ON CONFLICT (registry_id, session_id) DO UPDATE SET 
            level = EXCLUDED.level,
            updated_at = NOW()
    ");
    $stmtEnr->execute([
        $registry_id,
        $session_id,
        $data['level']     ?? '100',
        $data['program']   ?? null,
        $data['region']    ?? null,
        $data['district']  ?? null,
        $data['community'] ?? null
    ]);
    error_log("DEBUG: Table 2 Success.");

    // 5. AUDIT LOGGING
    $logStmt = $pdo->prepare("INSERT INTO public.audit_logs (user_id, action_type, session_id, target_id, ip_address, details) VALUES (?, 'MANUAL_ADD_STUDENT', ?, ?, ?, ?)");
    $logStmt->execute([
        $admin_id, $session_id, $registry_id, $_SERVER['REMOTE_ADDR'],
        json_encode(["message" => "Added student: " . $data['full_name']])
    ]);

    $pdo->commit();
    error_log("DEBUG: Transaction Fully Committed.");
    echo json_encode(["status" => "success", "message" => "Student record created/updated successfully"]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    
    // DETAILED ERROR LOGGING
    error_log("CRITICAL DB ERROR: " . $e->getMessage());
    error_log("SQL STATE: " . $e->getCode());
    
    if ($e->getCode() == '23505') {
        http_response_code(409);
        exit(json_encode(["status" => "error", "message" => "A student with this UIN or Index Number already exists."]));
    }

    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log("GENERAL ERROR: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}