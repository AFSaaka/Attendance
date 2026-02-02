<?php
// backend/api/admin/add-student.php
require_once __DIR__ . '/../common_auth.php';

requireAdmin();
header('Content-Type: application/json');

$data = json_decode(file_get_contents("php://input"), true);
$admin_id = $currentUser['id'] ?? null;

if (empty($data['uin']) || empty($data['index_number']) || empty($data['full_name'])) {
    http_response_code(400);
    exit(json_encode(["status" => "error", "message" => "Missing required fields"]));
}

try {
    $pdo->beginTransaction();

    // 1. SESSION RESOLUTION
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
        throw new Exception("No active academic session found.");
    }

    // 2. Treat single student as "one row" with its own savepoint
    $spName = "single_student";
    $pdo->exec("SAVEPOINT $spName");

    try {
        // 3. REGISTRY UPSERT
        $stmtRegistry = $pdo->prepare("
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

        try {
            $stmtRegistry->execute([
                'uin'  => trim($data['uin']),
                'idx'  => trim($data['index_number']),
                'name' => trim($data['full_name']),
                'prog' => $data['program']   ?? null,
                'reg'  => $data['region']    ?? null,
                'dist' => $data['district']  ?? null,
                'comm' => $data['community'] ?? null
            ]);
            $registry_id = $stmtRegistry->fetchColumn();
        } catch (PDOException $e) {
            // tolerate conflict
            if ($e->getCode() !== '23505') throw $e;
        }

        // Always resolve registry_id safely
        if (empty($registry_id)) {
            $fetch = $pdo->prepare("
                SELECT id FROM public.student_registry
                WHERE uin = ? OR index_number = ?
                LIMIT 1
            ");
            $fetch->execute([
                trim($data['uin']),
                trim($data['index_number'])
            ]);
            $registry_id = $fetch->fetchColumn();
        }

        if (!$registry_id) {
            throw new Exception("Could not resolve Registry ID.");
        }

        // 4. ENROLLMENT UPSERT
        $stmtEnroll = $pdo->prepare("
            INSERT INTO public.student_enrollments
            (registry_id, session_id, level, program, region, district, community, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
            ON CONFLICT (registry_id, session_id) DO UPDATE SET
                level = EXCLUDED.level,
                updated_at = NOW()
        ");
        $stmtEnroll->execute([
            $registry_id,
            $session_id,
            $data['level']     ?? '100',
            $data['program']   ?? null,
            $data['region']    ?? null,
            $data['district']  ?? null,
            $data['community'] ?? null
        ]);

        $pdo->exec("RELEASE SAVEPOINT $spName");

    } catch (Exception $inner) {
        $pdo->exec("ROLLBACK TO SAVEPOINT $spName");
        throw $inner;
    }

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
            "uin"   => $data['uin'],
            "index" => $data['index_number']
        ])
    ]);

    $pdo->commit();

    echo json_encode([
        "status"  => "success",
        "message" => "Student record processed successfully"
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log("ADD STUDENT ERROR: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        "status"  => "error",
        "message" => "Failed to process student record"
    ]);
}
