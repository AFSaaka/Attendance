<?php
// backend/api/admin/set-active-session.php
require_once __DIR__ . '/../common_auth.php';

// 1. SECURITY: Only Superadmins can change the global state
requireSuperAdmin(); 

header("Content-Type: application/json");

$data = json_decode(file_get_contents("php://input"), true);
$targetSessionId = $data['session_id'] ?? null;

if (!$targetSessionId) {
    http_response_code(400);
    exit(json_encode(["error" => "No session ID provided"]));
}

try {
    $pdo->beginTransaction();

    // 2. VERIFY SESSION EXISTS (Preventing the 'Zero-Active' state)
    $stmtCheck = $pdo->prepare("SELECT year_start, year_end FROM public.academic_sessions WHERE id = ?");
    $stmtCheck->execute([$targetSessionId]);
    $session = $stmtCheck->fetch(PDO::FETCH_ASSOC);

    if (!$session) {
        throw new Exception("The selected academic session does not exist.");
    }

    $sessionLabel = $session['year_start'] . "/" . $session['year_end'];

    // 3. ATOMIC TOGGLE
    // Reset all
    $pdo->query("UPDATE public.academic_sessions SET is_current = false, updated_at = NOW()");

    // Set target
    $stmtUpdate = $pdo->prepare("UPDATE public.academic_sessions SET is_current = true, updated_at = NOW() WHERE id = ?");
    $stmtUpdate->execute([$targetSessionId]);

    // 4. ENHANCED AUDIT LOGGING
    $logStmt = $pdo->prepare("
        INSERT INTO public.audit_logs (user_id, action_type, session_id, ip_address, details) 
        VALUES (?, 'SWITCH_ACADEMIC_YEAR', ?, ?, ?)
    ");

    $details = json_encode([
        "message" => "Global academic year switched to $sessionLabel",
        "switched_by" => $currentUser['user_name'] ?? $currentUser['email'],
        "session_id" => $targetSessionId
    ]);

    $logStmt->execute([
        $currentUser['id'],
        $targetSessionId,
        $_SERVER['REMOTE_ADDR'],
        $details
    ]);

    $pdo->commit();

    echo json_encode([
        "status" => "success", 
        "message" => "Active session switched to $sessionLabel",
        "active_session" => [
            "id" => $targetSessionId,
            "label" => $sessionLabel
        ]
    ]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log("Session Switch DB Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["error" => "Database error: Could not update session."]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(400);
    echo json_encode(["error" => $e->getMessage()]);
}