<?php
// backend/api/admin/manage_community.php
require_once __DIR__ . '/../common_auth.php';

requireAdmin(); 
header("Content-Type: application/json");

$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? null;
$id = $input['id'] ?? null; 

if (!$id || !$action) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Invalid Request"]);
    exit;
}

try {
    $pdo->beginTransaction();

    $sessionStmt = $pdo->query("SELECT id FROM public.academic_sessions WHERE is_current = true LIMIT 1");
    $currentSession = $sessionStmt->fetch(PDO::FETCH_ASSOC);
    $sessionId = $currentSession['id'] ?? null;

    if (!$sessionId) {
        http_response_code(428); 
        throw new Exception("NO_ACTIVE_SESSION");
    }

    $details = [];
    $actionType = "";

    switch ($action) {
        case 'toggle_active':
        case 'toggle_coords':
            $actionType = "COMMUNITY_COORD_VERIFY";
            $stmt = $pdo->prepare("UPDATE public.communities SET coordinate_check = NOT coordinate_check WHERE id = ? RETURNING coordinate_check");
            $stmt->execute([$id]);
            $newVal = $stmt->fetchColumn();
            $details = ["verified" => $newVal];
            break;

        case 'toggle_region_coords':
            $actionType = "REGION_COORD_VERIFY_BULK";
            // 1. Determine target state based on the first community found in that region
            $check = $pdo->prepare("SELECT coordinate_check FROM public.communities WHERE region = ? AND is_deleted = false LIMIT 1");
            $check->execute([$id]);
            $isCurrentlyActive = $check->fetchColumn();
            $newState = $isCurrentlyActive ? 'false' : 'true';

            // 2. Update all in region
            $stmt = $pdo->prepare("UPDATE public.communities SET coordinate_check = $newState WHERE region = ? AND is_deleted = false");
            $stmt->execute([$id]);
            
            $details = ["region" => $id, "bulk_verified" => ($newState === 'true')];
            break;

        case 'delete':
            requireSuperAdmin(); 
            $actionType = "COMMUNITY_SOFT_DELETE";
            $stmt = $pdo->prepare("UPDATE public.communities SET is_deleted = true WHERE id = ?");
            $stmt->execute([$id]);
            
            if ($stmt->rowCount() === 0) {
                throw new Exception("Community not found or already deleted.");
            }
            $details = ["info" => "Community marked as deleted"];
            break;

        default:
            throw new Exception("Invalid action requested.");
    }

    $logStmt = $pdo->prepare("INSERT INTO public.audit_logs (user_id, action_type, target_id, details, ip_address, session_id) VALUES (?, ?, ?, ?, ?, ?)");
    $logStmt->execute([
        $currentUser['id'] ?? null, 
        $actionType,
        (is_numeric($id) ? $id : null), // Region name isn't an ID, so handle carefully
        json_encode($details),
        $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0',
        $sessionId
    ]);

    $pdo->commit();
    echo json_encode(["status" => "success", "new_state" => $details]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    $msg = $e->getMessage();
    $code = ($msg === "NO_ACTIVE_SESSION") ? 428 : 500;
    http_response_code($code);
    echo json_encode(["status" => "error", "message" => $msg === "NO_ACTIVE_SESSION" ? "No active academic session found." : $msg]);
}