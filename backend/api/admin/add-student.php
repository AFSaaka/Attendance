<?php
// backend/api/admin/add-student.php
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../common_auth.php';

$data = json_decode(file_get_contents("php://input"), true);

try {
    $pdo->beginTransaction();

    // 1. Insert into Registry (ignore if exists, but return the ID)
    $stmt = $pdo->prepare("
        INSERT INTO public.student_registry (uin, index_number, full_name, program, region, district, community)
        VALUES (:uin, :idx, :name, :prog, :reg, :dist, :comm)
        ON CONFLICT (index_number) DO UPDATE SET full_name = EXCLUDED.full_name
        RETURNING id
    ");
    
    $stmt->execute([
        'uin' => $data['uin'],
        'idx' => $data['index_number'],
        'name' => $data['full_name'],
        'prog' => $data['program'],
        'reg'  => $data['region'],
        'dist' => $data['district'],
        'comm' => $data['community']
    ]);
    $registry_id = $stmt->fetchColumn();

    // 2. Get the current active session (Assumption: most recent session)
    $session_id = $pdo->query("SELECT id FROM public.academic_sessions ORDER BY year_end DESC LIMIT 1")->fetchColumn();

    // 3. Create Enrollment record
    $stmt = $pdo->prepare("
        INSERT INTO public.student_enrollments 
        (registry_id, session_id, level, program, region, district, community)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $registry_id,
        $session_id,
        $data['level'],
        $data['program'],
        $data['region'],
        $data['district'],
        $data['community']
    ]);

    $pdo->commit();
    echo json_encode(["status" => "success"]);

} catch (Exception $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}