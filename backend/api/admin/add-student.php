<?php
// backend/api/admin/add-student.php
require_once __DIR__ . '/../common_auth.php';

requireAdmin();

header('Content-Type: application/json');

$data = json_decode(file_get_contents("php://input"), true);
$admin_id = $currentUser['id'];

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
        throw new Exception("No academic session found.");
    }

    // 2. SAVEPOINT
    $pdo->exec("SAVEPOINT single_add_start");

    try {
        // 3. REGISTRY UPSERT (conflict-tolerant)
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

        try {
            $stmt->execute([
                'uin'  => trim($data['uin']),
                'idx'  => trim($data['index_number']),
                'name' => trim($data['full_name']),
                'prog' => $data['program']   ?? null,
                'reg'  => $data['region']    ?? null,
                'dist' => $data['district']  ?? null,
                'comm' => $data['community'] ?? null
            ]);

            $registry_id = $stmt->fetchColumn();

        } catch (PDOException $e) {
            // tolerate UIN conflict like bulk upload
            if ($e->getCode() !== '23505') {
                throw $e;
            }
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

        $pdo->exec("RELEASE SAVEPOINT single_add_start");

    } catch (Exception $inner) {
        $pdo->exec("ROLLBACK TO SAVEPOINT single_add_start");
        throw $inner;
    }

    // 5. AUDIT LOG
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
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("ADD STUDENT ERROR: " . $e->getMessage());
    http_response_code(500);
$errorMsg = $e instanceof PDOException ? $e->getMessage() : $e->getMessage();
error_log("ADD STUDENT ERROR: " . $errorMsg);
echo json_encode([
    "status"  => "error",
    "message" => $errorMsg
]);
}
