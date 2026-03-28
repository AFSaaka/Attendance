<?php
// backend/api/admin/manage_session.php
require_once __DIR__ . '/../common_auth.php';
require_once __DIR__ . '/../../utils/validators.php';
requireSuperAdmin();
validateCSRFToken();

header("Content-Type: application/json");
$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? null;
$id     = $input['id']     ?? null;

try {
    $pdo->beginTransaction();

    switch ($action) {
        case 'create':
            $stmt = $pdo->prepare("
                INSERT INTO public.academic_sessions (year_start, year_end, description)
                VALUES (?, ?, ?)
            ");
            $stmt->execute([$input['year_start'], $input['year_end'], $input['description']]);
            break;

        case 'edit':
            // updated_at removed — not reliably present in all environments
            $stmt = $pdo->prepare("
                UPDATE public.academic_sessions
                SET year_start = ?, year_end = ?, description = ?
                WHERE id = ?
            ");
            $stmt->execute([$input['year_start'], $input['year_end'], $input['description'], $id]);
            break;

        case 'set_current':
            // Step 1: Deactivate all — use prepared statement, NOT $pdo->query()
            // $pdo->query() inside a transaction can silently abort it in PostgreSQL
            $deactivate = $pdo->prepare("
                UPDATE public.academic_sessions SET is_current = false
            ");
            $deactivate->execute();

            // Step 2: Activate the selected session
            $activate = $pdo->prepare("
                UPDATE public.academic_sessions SET is_current = true WHERE id = ?
            ");
            $activate->execute([$id]);
            break;

        case 'delete':
            $check = $pdo->prepare("SELECT is_current FROM public.academic_sessions WHERE id = ?");
            $check->execute([$id]);
            if ($check->fetchColumn()) {
                throw new Exception("CANNOT_DELETE_ACTIVE_SESSION");
            }
            $stmt = $pdo->prepare("DELETE FROM public.academic_sessions WHERE id = ?");
            $stmt->execute([$id]);
            break;

        default:
            throw new Exception("INVALID_ACTION");
    }

    $pdo->commit();
    echo json_encode(["status" => "success"]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log("manage_session error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}