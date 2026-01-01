<?php
// backend/api/admin/student-actions.php

require_once __DIR__ . '/../common_auth.php';

// 1. SECURITY: Only Super Admins can perform these actions
requireSuperAdmin(); 

$data = json_decode(file_get_contents("php://input"), true);
$registry_id = $data['id'] ?? null; 
$action = $data['action'] ?? null;
$admin_id = $currentUser['id']; 

if (!$registry_id || !$action) {
    http_response_code(400);
    exit(json_encode(["error" => "Invalid request: Missing student ID or action type."]));
}

try {
    $pdo->beginTransaction();

    // A. FETCH CONTEXT FOR AUDIT LOG (The "Snapshot")
    // We get the student's name now so the log makes sense even after deletion.
    $stmtName = $pdo->prepare("SELECT full_name, uin FROM public.student_registry WHERE id = ?");
    $stmtName->execute([$registry_id]);
    $student = $stmtName->fetch(PDO::FETCH_ASSOC);
    $target_display_name = $student ? $student['full_name'] . " (" . $student['uin'] . ")" : "Unknown Student";

    // B. FETCH CURRENT SESSION
    $session_query = $pdo->query("SELECT id FROM public.academic_sessions WHERE is_current = true LIMIT 1");
    $current_session_id = $session_query->fetchColumn();

    $logType = "";
    $logMsg = "";

    // C. EXECUTE ACTIONS
    switch ($action) {
        case 'clear_device':
            $stmt = $pdo->prepare("UPDATE public.users SET device_fingerprint = NULL WHERE student_id = ?");
            $stmt->execute([$registry_id]);
            $logType = "DEVICE_CLEAR";
            $logMsg = "Cleared device lock for $target_display_name";
            break;

        case 'toggle_status':
            $stmt = $pdo->prepare("UPDATE public.users SET is_active = NOT is_active WHERE student_id = ?");
            $stmt->execute([$registry_id]);
            $logType = "STATUS_TOGGLE";
            $logMsg = "Toggled account access for $target_display_name";
            break;

        case 'delete':
            $stmt1 = $pdo->prepare("UPDATE public.student_registry SET is_deleted = true, deleted_at = NOW() WHERE id = ?");
            $stmt1->execute([$registry_id]);

            $stmt2 = $pdo->prepare("UPDATE public.users SET is_active = false WHERE student_id = ?");
            $stmt2->execute([$registry_id]);

            if ($current_session_id) {
                $stmt3 = $pdo->prepare("DELETE FROM public.student_enrollments WHERE registry_id = ? AND session_id = ?");
                $stmt3->execute([$registry_id, $current_session_id]);
            }
            $logType = "STUDENT_SOFT_DELETE";
            $logMsg = "Soft-deleted student record: $target_display_name";
            break;

        default:
            throw new Exception("Action not recognized: " . $action);
    }

    /**
     * D. ENHANCED AUDIT LOGGING
     * We save the Admin's name and Student's name into the JSON 'details'
     */
    $logStmt = $pdo->prepare("
        INSERT INTO public.audit_logs (
            user_id, 
            action_type, 
            target_id, 
            session_id, 
            ip_address, 
            details
        ) 
        SELECT 
            ?, -- user_id
            ?, -- action_type
            ?, -- target_id
            (SELECT id FROM public.academic_sessions WHERE is_current = true LIMIT 1), 
            ?, -- ip_address
            ?  -- details (JSONB)
    ");
    
    $details = json_encode([
        "message" => $logMsg,
        "performed_by" => $currentUser['user_name'] ?? $currentUser['email'],
        "target_name" => $student['full_name'] ?? 'Unknown',
        "target_uin" => $student['uin'] ?? 'N/A',
        "action_raw" => $action
    ]);

    $logStmt->execute([
        $admin_id, 
        $logType, 
        $registry_id, 
        $_SERVER['REMOTE_ADDR'], 
        $details
    ]);

    $pdo->commit();
    
    header('Content-Type: application/json');
    echo json_encode(["success" => true, "message" => $logMsg]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) { $pdo->rollBack(); }
    http_response_code(500);
    echo json_encode(["error" => "System Error: " . $e->getMessage()]);
}