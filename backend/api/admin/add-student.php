<?php
// backend/api/admin/add-student.php
require_once __DIR__ . '/../common_auth.php';
require_once __DIR__ . '/../../utils/validators.php';
requireAdmin();
validateCSRFToken();

$data = json_decode(file_get_contents("php://input"), true);
$admin_id = $currentUser['id'];

if (empty($data['uin']) || empty($data['index_number']) || empty($data['full_name'])) {
    http_response_code(400);
    exit(json_encode(["status" => "error", "message" => "Missing required fields"]));
}

// --- MOVE SESSION CHECK OUTSIDE TRANSACTION (Like Bulk Script) ---
try {
    $session_id = $pdo->query("SELECT id FROM public.academic_sessions WHERE is_current = true LIMIT 1")->fetchColumn();
    if (!$session_id) {
        $session_id = $pdo->query("SELECT id FROM public.academic_sessions ORDER BY year_end DESC LIMIT 1")->fetchColumn();
    }
    
    if (!$session_id) {
        throw new Exception("No active academic session found.");
    }
} catch (Exception $e) {
    http_response_code(500);
    exit(json_encode(["status" => "error", "message" => $e->getMessage()]));
}

// --- START TRANSACTION ---
try {
    $pdo->beginTransaction();

    // 1. TABLE 1: REGISTRY UPSERT
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

    // 2. FALLBACK FOR PRODUCTION (NEON)
    if (!$registry_id) {
        $fetchStmt = $pdo->prepare("SELECT id FROM public.student_registry WHERE index_number = ?");
        $fetchStmt->execute([trim($data['index_number'])]);
        $registry_id = $fetchStmt->fetchColumn();
    }

    if (!$registry_id) {
        throw new Exception("Registry record could not be created or found.");
    }

    // 2b. RESOLVE community_id — same lookup bulk-upload.php already does.
    // Without this, a manually-added student's enrollment has community_id
    // NULL, which silently breaks their GPS check when they try to submit
    // attendance later.
    $community_id = null;
    if (!empty($data['community'])) {
        $commStmt = $pdo->prepare("
            SELECT id FROM public.communities
            WHERE is_deleted = false
              AND LOWER(TRIM(name)) = LOWER(TRIM(?))
              AND LOWER(TRIM(district)) = LOWER(TRIM(?))
              AND LOWER(TRIM(region)) = LOWER(TRIM(?))
            LIMIT 1
        ");
        $commStmt->execute([
            $data['community'] ?? '',
            $data['district']  ?? '',
            $data['region']    ?? ''
        ]);
        $community_id = $commStmt->fetchColumn() ?: null;
    }

    // 3. TABLE 2: ENROLLMENT UPSERT
    $stmtEnr = $pdo->prepare("
        INSERT INTO public.student_enrollments 
        (registry_id, session_id, level, program, region, district, community, community_id, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ON CONFLICT (registry_id, session_id) DO UPDATE SET 
            level        = EXCLUDED.level,
            community_id = EXCLUDED.community_id,
            updated_at   = NOW()
    ");
    $stmtEnr->execute([
        $registry_id,
        $session_id,
        $data['level']     ?? '100',
        $data['program']   ?? null,
        $data['region']    ?? null,
        $data['district']  ?? null,
        $data['community'] ?? null,
        $community_id
    ]);

    // 4. AUDIT LOGGING
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
        json_encode(["uin" => $data['uin'], "idx" => $data['index_number']])
    ]);

    $pdo->commit();

    $response = ["status" => "success", "message" => "Record saved successfully"];
    if (!empty($data['community']) && !$community_id) {
        $response["warning"] = "Community '{$data['community']}' wasn't matched to a record in the communities table — this student was enrolled without a location link, so their GPS check-in won't work until an admin fixes this.";
    }
    echo json_encode($response);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    
    // Handle Duplicate UIN (Postgres Code 23505)
    if ($e->getCode() == '23505') {
        http_response_code(409);
        exit(json_encode(["status" => "error", "message" => "UIN or Index Number conflict."]));
    }

    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "DB Error: " . $e->getMessage()]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}