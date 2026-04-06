<?php
// backend/api/admin/manage_community.php
require_once __DIR__ . '/../common_auth.php';
require_once __DIR__ . '/../../utils/validators.php';

requireAdmin();
validateCSRFToken();
header("Content-Type: application/json");

$input  = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? null;
$id     = $input['id']     ?? null;

if (!$id || !$action) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Invalid Request"]);
    exit;
}

try {
    $pdo->beginTransaction();

    $sessionStmt    = $pdo->query("SELECT id FROM public.academic_sessions WHERE is_current = true LIMIT 1");
    $currentSession = $sessionStmt->fetch(PDO::FETCH_ASSOC);
    $sessionId      = $currentSession['id'] ?? null;

    if (!$sessionId) {
        http_response_code(428);
        throw new Exception("NO_ACTIVE_SESSION");
    }

    $details    = [];
    $actionType = "";

    switch ($action) {

        case 'toggle_active':
        case 'toggle_coords':
            $actionType = "COMMUNITY_COORD_VERIFY";
            $stmt = $pdo->prepare("UPDATE public.communities SET coordinate_check = NOT coordinate_check WHERE id = ? RETURNING coordinate_check");
            $stmt->execute([$id]);
            $newVal  = $stmt->fetchColumn();
            $details = ["verified" => $newVal];
            break;

        case 'toggle_region_coords':
            $actionType = "REGION_COORD_VERIFY_BULK";
            $check = $pdo->prepare("SELECT coordinate_check FROM public.communities WHERE region = ? AND is_deleted = false LIMIT 1");
            $check->execute([$id]);
            $isCurrentlyActive = $check->fetchColumn();
            $newState = $isCurrentlyActive ? 'false' : 'true';

            $stmt = $pdo->prepare("UPDATE public.communities SET coordinate_check = $newState WHERE region = ? AND is_deleted = false");
            $stmt->execute([$id]);

            $details = ["region" => $id, "bulk_verified" => ($newState === 'true')];
            break;

        // ─── NEW: set start_date + duration_weeks for every community in a region ───
        case 'set_region_start_date':
            $actionType  = "REGION_START_DATE_BULK";
            $startDate   = $input['start_date']     ?? null;
            $durationWks = isset($input['duration_weeks']) ? (int)$input['duration_weeks'] : null;

            if (!$startDate || !validate_date($startDate)) {
                http_response_code(400);
                throw new Exception("A valid start date (YYYY-MM-DD) is required.");
            }

            if ($durationWks !== null && ($durationWks < 1 || $durationWks > 52)) {
                http_response_code(400);
                throw new Exception("Duration must be between 1 and 52 weeks.");
            }

            // Check for existing attendance records in this region — warn but don't block
            // (individual community guard already exists in edit_community.php)
            $countStmt = $pdo->prepare("
                SELECT COUNT(*) FROM public.attendance_records ar
                JOIN public.student_enrollments se ON ar.enrollment_id = se.id
                JOIN public.communities c ON se.community_id = c.id
                WHERE c.region = ? AND c.is_deleted = false
            ");
            $countStmt->execute([$id]);
            $existingCount = (int)$countStmt->fetchColumn();

            if ($existingCount > 0) {
                http_response_code(409);
                throw new Exception(
                    "Cannot set start date — {$existingCount} attendance records already exist " .
                    "for communities in {$id}. Update communities individually to override."
                );
            }

            // Build SET clause dynamically — duration is optional
            if ($durationWks !== null) {
                $stmt = $pdo->prepare("
                    UPDATE public.communities
                    SET start_date     = ?,
                        duration_weeks = ?,
                        updated_at     = NOW()
                    WHERE region     = ?
                      AND is_deleted = false
                ");
                $stmt->execute([$startDate, $durationWks, $id]);
            } else {
                $stmt = $pdo->prepare("
                    UPDATE public.communities
                    SET start_date = ?,
                        updated_at = NOW()
                    WHERE region     = ?
                      AND is_deleted = false
                ");
                $stmt->execute([$startDate, $id]);
            }

            $affected = $stmt->rowCount();
            $details  = [
                "region"         => $id,
                "start_date"     => $startDate,
                "duration_weeks" => $durationWks,
                "communities_updated" => $affected,
            ];
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

    // Audit log
    $logStmt  = $pdo->prepare("INSERT INTO public.audit_logs (user_id, action_type, target_id, details, ip_address, session_id) VALUES (?, ?, ?, ?, ?, ?)");
    $targetId = null;
    if ($action !== 'toggle_region_coords' && $action !== 'set_region_start_date') {
        if (preg_match('/^[0-9a-f-]{36}$/i', $id)) {
            $targetId = $id;
        }
    }

    $logStmt->execute([
        $currentUser['id'] ?? null,
        $actionType,
        $targetId,
        json_encode($details),
        $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0',
        $sessionId
    ]);

    $pdo->commit();
    echo json_encode(["status" => "success", "new_state" => $details]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    $msg  = $e->getMessage();
    $code = match(true) {
        $msg === "NO_ACTIVE_SESSION" => 428,
        http_response_code() !== 200 => http_response_code(),
        default                       => 500,
    };
    http_response_code($code);
    echo json_encode([
        "status"  => "error",
        "message" => $msg === "NO_ACTIVE_SESSION"
            ? "No active academic session found."
            : $msg,
    ]);
}