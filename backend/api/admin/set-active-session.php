<?php
// backend/api/admin/set-active-session.php
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../common_auth.php';

// Only Superadmins should be allowed to change the school year!
requireSuperAdmin(); 

$data = json_decode(file_get_contents("php://input"), true);
$targetSessionId = $data['session_id'] ?? null;

if (!$targetSessionId) {
    http_response_code(400);
    echo json_encode(["error" => "No session ID provided"]);
    exit;
}

try {
    $pdo->beginTransaction();

    // 1. Reset all sessions to false
    $pdo->query("UPDATE public.academic_sessions SET is_current = false");

    // 2. Set the chosen session to true
    $stmt = $pdo->prepare("UPDATE public.academic_sessions SET is_current = true WHERE id = ?");
    $stmt->execute([$targetSessionId]);

    // 3. Log this major change
    $logStmt = $pdo->prepare("INSERT INTO public.audit_logs (user_id, action_type, details) VALUES (?, 'SWITCH_ACADEMIC_YEAR', ?)");
    $logStmt->execute([$currentUser['id'], "Switched active session to $targetSessionId"]);

    $pdo->commit();
    echo json_encode(["status" => "success", "message" => "Academic year updated!"]);

} catch (Exception $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}