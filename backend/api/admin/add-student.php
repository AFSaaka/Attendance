<?php
// backend/api/admin/add-student.php
require_once __DIR__ . '/../common_auth.php';

requireAdmin();

$data = json_decode(file_get_contents("php://input"), true);
$admin_id = $currentUser['id'];

// 1. LOG THE INCOMING DATA
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
    // Get the current active session or the most recent one
    $session_id = $pdo->query("SELECT id FROM public.academic_sessions WHERE is_current = true LIMIT 1")->fetchColumn();
    if (!$session_id) {
        $session_id = $pdo->query("SELECT id FROM public.academic_sessions ORDER BY year_end DESC LIMIT 1")->fetchColumn();
    }
    
    if (!$session_id) {
        throw new Exception("No active academic session found. Please create a session first.");
    }
    error_log("DEBUG: Target Session ID: " . $session_id);

    // 3. TABLE 1: REGISTRY UPSERT
    // We conflict on index_number. If it exists, we update the name and UIN.
    error_log("DEBUG: Attempting Table 1 (Registry) Upsert for UIN: " . $data['uin']);
    $stmt = $pdo->prepare("
        INSERT INTO public.student_registry 
        (uin, index_number, full_name, program, region, district, community, is_deleted, updated_at)
        VALUES (:uin, :idx, :name, :prog, :reg, :dist, :comm, false, NOW())
        ON CONFLICT (index_number) DO UPDATE SET 
            full_name = EXCLUDED.full_name,
            uin = EXCLUDED.uin,
            program = EXCLUDED.program,
            region = EXCLUDED.region,
            district = EXCLUDED.district,
            community = EXCLUDED.community,
            is_deleted = false,
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

    // 4. TABLE 2: ENROLLMENT UPSERT
    // Requires the UNIQUE(registry_id, session_id) constraint in Postgres
    error_log("DEBUG: Attempting Table 2 (Enrollment) for Registry ID: " . $registry_id);
    $stmtEnr = $pdo->prepare("
        INSERT INTO public.student_enrollments 
        (registry_id, session_id, level, program, region, district, community, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        ON CONFLICT (registry_id, session_id) DO UPDATE SET 
            level = EXCLUDED.level,
            program = EXCLUDED.program,
            region = EXCLUDED.region,
            district = EXCLUDED.district,
            community = EXCLUDED.community,
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
    $logStmt = $pdo->prepare("
        INSERT INTO public.audit_logs 
        (user_id, action_type, session_id, target_id, ip_address, details) 
        VALUES (?, 'MANUAL_ADD_STUDENT', ?, ?, ?, ?)
    ");
    $logStmt->execute([
        $admin_id, 
        $session_id, 
        $registry_id, 
        $_SERVER['REMOTE_ADDR'],
        json_encode([
            "message" => "Added/Updated student: " . $data['full_name'],
            "uin" => $data['uin'],
            "index_number" => $data['index_number']
        ])
    ]);

    $pdo->commit();
    error_log("DEBUG: Transaction Fully Committed.");
    echo json_encode(["status" => "success", "message" => "Student record created/updated successfully"]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    
    error_log("CRITICAL DB ERROR: " . $e->getMessage());
    
    // Check for unique violation (specifically for the UIN if index_number didn't conflict)
    if ($e->getCode() == '23505') {
        http_response_code(409);
        echo json_encode(["status" => "error", "message" => "Duplicate Conflict: This UIN or Index Number is already assigned to another student."]);
        exit;
    }

    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log("GENERAL ERROR: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}