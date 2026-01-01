<?php
// backend/api/admin/add-student.php
require_once __DIR__ . '/../common_auth.php';

// 1. SECURITY GUARD: Only Admins/Coordinators
requireAdmin();

$data = json_decode(file_get_contents("php://input"), true);
$admin_id = $currentUser['id'];

// Basic validation
if (empty($data['uin']) || empty($data['index_number']) || empty($data['full_name'])) {
    http_response_code(400);
    exit(json_encode(["status" => "error", "message" => "Missing required fields: UIN, Index Number, or Full Name"]));
}

try {
    $pdo->beginTransaction();

    // 2. FETCH CURRENT SESSION
    // Using the same subquery logic for consistency
    $session_id = $pdo->query("SELECT id FROM public.academic_sessions WHERE is_current = true LIMIT 1")->fetchColumn();
    if (!$session_id) {
        $session_id = $pdo->query("SELECT id FROM public.academic_sessions ORDER BY year_end DESC LIMIT 1")->fetchColumn();
    }

    if (!$session_id) {
        throw new Exception("No active academic session found.");
    }

    // 3. TABLE 1: STUDENT REGISTRY (Upsert)
    // We update everything on conflict to ensure the most recent data is kept.
    $stmt = $pdo->prepare("
        INSERT INTO public.student_registry 
        (uin, index_number, full_name, program, region, district, community, is_deleted, updated_at)
        VALUES (:uin, :idx, :name, :prog, :reg, :dist, :comm, false, NOW())
        ON CONFLICT (index_number) 
        DO UPDATE SET 
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

    // 4. TABLE 2: STUDENT ENROLLMENT
    $stmtEnr = $pdo->prepare("
        INSERT INTO public.student_enrollments 
        (registry_id, session_id, level, program, region, district, community, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        ON CONFLICT (registry_id, session_id) 
        DO UPDATE SET 
            level = EXCLUDED.level,
            program = EXCLUDED.program,
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

    // 5. ENHANCED AUDIT LOGGING
    // Snapshotting the names for the 'Who did what to whom' requirement.
    $logStmt = $pdo->prepare("
        INSERT INTO public.audit_logs (user_id, action_type, session_id, target_id, ip_address, details) 
        VALUES (?, 'MANUAL_ADD_STUDENT', ?, ?, ?, ?)
    ");

    $details = json_encode([
        "message" => "Admin manually added student: " . $data['full_name'],
        "performed_by" => $currentUser['user_name'] ?? $currentUser['email'],
        "target_name" => $data['full_name'],
        "target_uin" => $data['uin'],
        "target_index" => $data['index_number']
    ]);

    $logStmt->execute([
        $admin_id, 
        $session_id,
        $registry_id,
        $_SERVER['REMOTE_ADDR'],
        $details
    ]);

    $pdo->commit();
    echo json_encode(["status" => "success", "message" => "Student record created/updated successfully"]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    
    // Check for Unique Constraint Violation (UIN conflict)
    if ($e->getCode() == '23505') {
        http_response_code(409);
        exit(json_encode(["status" => "error", "message" => "A student with this UIN or Index Number already exists."]));
    }

    error_log("Add Student DB Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "A database error occurred while adding the student."]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}