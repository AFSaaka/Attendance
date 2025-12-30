<?php
// backend/api/admin/add-student.php
// require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../common_auth.php';

/**
 * 1. SECURITY GUARD
 * Only Admins/Coordinators can manually add students.
 */
requireAdmin();

$data = json_decode(file_get_contents("php://input"), true);

// Basic validation: Ensure we have the minimum required data
if (empty($data['uin']) || empty($data['index_number']) || empty($data['full_name'])) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Missing required fields (UIN, Index Number, or Name)"]);
    exit;
}

try {
    $pdo->beginTransaction();

    /**
     * 2. SMART SESSION FINDER
     * We use the exact same logic here as in bulk-upload.
     * Priority: is_current = true. Fallback: Latest year.
     */
    $session_id = $pdo->query("
        SELECT id FROM public.academic_sessions 
        WHERE is_current = true 
        LIMIT 1
    ")->fetchColumn();

    if (!$session_id) {
        $session_id = $pdo->query("
            SELECT id FROM public.academic_sessions 
            ORDER BY year_end DESC 
            LIMIT 1
        ")->fetchColumn();
    }

    if (!$session_id) {
        throw new Exception("No active academic session found. Please create one first.");
    }

    /**
     * 3. TABLE 1: STUDENT REGISTRY
     * If index_number exists, we update the name (Upsert).
     * We also ensure is_deleted is set to false in case they were previously removed.
     */
    $stmt = $pdo->prepare("
        INSERT INTO public.student_registry 
        (uin, index_number, full_name, program, region, district, community, is_deleted)
        VALUES (:uin, :idx, :name, :prog, :reg, :dist, :comm, false)
        ON CONFLICT (index_number) 
        DO UPDATE SET 
            full_name = EXCLUDED.full_name,
            is_deleted = false
        RETURNING id
    ");
    
    $stmt->execute([
        'uin'   => $data['uin'],
        'idx'   => $data['index_number'],
        'name'  => $data['full_name'],
        'prog'  => $data['program']  ?? null,
        'reg'   => $data['region']   ?? null,
        'dist'  => $data['district'] ?? null,
        'comm'  => $data['community']?? null
    ]);
    $registry_id = $stmt->fetchColumn();

    /**
     * 4. TABLE 2: STUDENT ENROLLMENT
     * Links this student to the active session.
     * We use ON CONFLICT DO NOTHING so that if you accidentally click 
     * 'Add' twice for the same student, it doesn't crash.
     */
    $stmt = $pdo->prepare("
        INSERT INTO public.student_enrollments 
        (registry_id, session_id, level, program, region, district, community)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (registry_id, session_id) DO NOTHING
    ");
    $stmt->execute([
        $registry_id,
        $session_id,
        $data['level']     ?? '100',
        $data['program']   ?? null,
        $data['region']    ?? null,
        $data['district']  ?? null,
        $data['community'] ?? null
    ]);

    /**
     * 5. AUDIT LOGGING
     * Track which Admin added this specific student.
     */
    $logStmt = $pdo->prepare("
        INSERT INTO public.audit_logs (user_id, action_type, details, ip_address) 
        VALUES (?, 'MANUAL_ADD_STUDENT', ?, ?)
    ");
    $logStmt->execute([
        $currentUser['id'], 
        json_encode(["index_number" => $data['index_number'], "name" => $data['full_name']]),
        $_SERVER['REMOTE_ADDR']
    ]);

    $pdo->commit();
    echo json_encode(["status" => "success", "message" => "Student added successfully"]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode([
        "status" => "error", 
        "message" => "Database error: " . $e->getMessage()
    ]);
}