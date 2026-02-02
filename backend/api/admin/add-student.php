<?php
// backend/api/admin/add-student.php
require_once __DIR__ . '/../common_auth.php';

requireAdmin();

$data = json_decode(file_get_contents("php://input"), true);
$admin_id = $currentUser['id'];

// 1. LOG THE INCOMING DATA
error_log("DEBUG: Received Manual Add Request for: " . ($data['full_name'] ?? 'Unknown'));

if (empty($data['uin']) || empty($data['index_number']) || empty($data['full_name'])) {
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
    
    if (!$session_id) {
        throw new Exception("No active academic session found. Please create a session first.");
    }

    // 3. TABLE 1: REGISTRY UPSERT
    // We conflict on index_number.
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

    // CRITICAL FIX FOR LIVE HOSTING:
    // If Postgres doesn't return an ID (common when no data changed during an UPDATE), 
    // we must fetch it manually to avoid poisoning the transaction in the next step.
    if (!$registry_id) {
        $fetchStmt = $pdo->prepare("SELECT id FROM public.student_registry WHERE index_number = ?");
        $fetchStmt->execute([trim($data['index_number'])]);
        $registry_id = $fetchStmt->fetchColumn();
    }

    if (!$registry_id) {
        throw new Exception("Failed to secure a valid Student Registry ID.");
    }

    // 4. TABLE 2: ENROLLMENT UPSERT
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