<?php
// backend/api/admin/manage-admins.php
require_once __DIR__ . '/../common_auth.php';
require_once __DIR__ . '/../../utils/mailer.php'; 

// 1. Security Guard
requireSuperAdmin();

header("Content-Type: application/json");

// Capture JSON input
$data = json_decode(file_get_contents('php://input'), true);
$action = $data['action'] ?? '';
$adminId = $data['id'] ?? null; 

if (!$action) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Action is required"]);
    exit;
}

try {
    $pdo->beginTransaction();
    $response = ["status" => "success"];
    $auditDetails = [];
    $targetId = $adminId; 

    // --- ACTION: SEND BULK INVITES ---
    if ($action === 'send_all_pending') {
        // Fetch active admins who need reset AND have an OTP code generated
        $stmt = $pdo->prepare("
            SELECT id, user_name, email, otp_code 
            FROM public.users 
            WHERE (role = 'admin' OR admin_level = 'super_admin')
            AND must_reset_password = true 
            AND is_active = true 
            AND otp_code IS NOT NULL
        ");
        $stmt->execute();
        $pendingAdmins = $stmt->fetchAll();

        $successCount = 0;
        $failCount = 0;

        foreach ($pendingAdmins as $user) {
            if (sendAdminInviteEmail($user['email'], $user['user_name'], $user['otp_code'])) {
                $successCount++;
                
                // Update "Last Invited" timestamp
                $upd = $pdo->prepare("UPDATE public.users SET last_invited_at = NOW() WHERE id = ?");
                $upd->execute([$user['id']]);
                
                // Individual audit for bulk items
                $log = $pdo->prepare("INSERT INTO public.audit_logs (user_id, action_type, target_id, details, ip_address) VALUES (?, 'SEND_INVITE_BULK', ?, ?::jsonb, ?)");
                $log->execute([$_SESSION['user_id'], $user['id'], json_encode(["status" => "success"]), $_SERVER['REMOTE_ADDR']]);
            } else {
                $failCount++;
            }
        }
        $response = [
            "status" => "success", 
            "message" => "Bulk process complete",
            "details" => ["sent" => $successCount, "failed" => $failCount]
        ];
        $auditDetails = ["bulk_sent" => $successCount, "bulk_failed" => $failCount];

    // --- ACTION: SEND SINGLE INVITE ---
    } elseif ($action === 'send_invite' && $adminId) {
        $stmt = $pdo->prepare("SELECT user_name, email, otp_code FROM public.users WHERE id = ?");
        $stmt->execute([$adminId]);
        $user = $stmt->fetch();

        if (!$user) throw new Exception("Admin not found.");
        if (empty($user['otp_code'])) throw new Exception("No OTP code found. Please Refresh OTP before sending.");

        if (sendAdminInviteEmail($user['email'], $user['user_name'], $user['otp_code'])) {
            $upd = $pdo->prepare("UPDATE public.users SET last_invited_at = NOW() WHERE id = ?");
            $upd->execute([$adminId]);
            $auditDetails = ["mode" => "manual_trigger", "email" => $user['email']];
        } else {
            throw new Exception("Mail server failed to send invitation.");
        }

    // --- ACTION: REFRESH OTP ---
    } elseif ($action === 'refresh_otp' && $adminId) {
        $newOtp = (string)random_int(100000, 999999);
        $hash = password_hash($newOtp, PASSWORD_DEFAULT);
        $expiry = date('Y-m-d H:i:s', strtotime('+48 hours'));

        $stmt = $pdo->prepare("
            UPDATE public.users 
            SET otp_code = ?, password_hash = ?, otp_expires_at = ?, must_reset_password = true, updated_at = NOW() 
            WHERE id = ?
        ");
        $stmt->execute([$newOtp, $hash, $expiry, $adminId]);
        
        $response["new_otp"] = $newOtp;
        $auditDetails = ["reason" => "Manual OTP Refresh", "new_expiry" => $expiry];

    // --- ACTION: TOGGLE STATUS ---
    } elseif ($action === 'toggle_status' && $adminId) {
        if ($adminId === $_SESSION['user_id']) {
            throw new Exception("Security Constraint: You cannot disable your own account.");
        }
        $stmt = $pdo->prepare("UPDATE public.users SET is_active = NOT is_active, updated_at = NOW() WHERE id = ?");
        $stmt->execute([$adminId]);
        $auditDetails = ["action" => "Status Toggle"];

    // --- ACTION: UPDATE DETAILS ---
    } elseif ($action === 'update_details' && $adminId) {
        $stmt = $pdo->prepare("UPDATE public.users SET user_name = ?, email = ?, admin_level = ?, updated_at = NOW() WHERE id = ?");
        $stmt->execute([$data['user_name'], $data['email'], $data['admin_level'], $adminId]);
        $auditDetails = ["updated_fields" => $data];
    }

    // --- FINAL AUDIT LOGGING ---
    if ($action !== 'send_all_pending') { // Bulk is logged per-user inside the loop
        $logStmt = $pdo->prepare("
            INSERT INTO public.audit_logs (user_id, action_type, target_id, details, ip_address) 
            VALUES (?, ?, ?, ?::jsonb, ?)
        ");
        $logStmt->execute([
            $_SESSION['user_id'], 
            strtoupper($action), 
            $targetId, 
            json_encode($auditDetails), 
            $_SERVER['REMOTE_ADDR']
        ]);
    }

    $pdo->commit();
    echo json_encode($response);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}