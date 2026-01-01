<?php
// backend/api/admin/refresh-coordinator-otp.php
require_once __DIR__ . '/../common_auth.php';

// 1. SECURITY: Only Admins/Superadmins can reset staff credentials
requireAdmin();

header("Content-Type: application/json");

$data = json_decode(file_get_contents("php://input"), true);
$userId = $data['user_id'] ?? null;
$adminId = $currentUser['id'];

if (!$userId) {
    http_response_code(400);
    exit(json_encode(["error" => "User ID is required"]));
}

try {
    $pdo->beginTransaction();

    // 2. VERIFY TARGET USER
    // Ensure we are only touching coordinators and get their name for the log
    $checkStmt = $pdo->prepare("SELECT user_name, email FROM public.users WHERE id = ? AND role = 'coordinator'");
    $checkStmt->execute([$userId]);
    $targetUser = $checkStmt->fetch(PDO::FETCH_ASSOC);

    if (!$targetUser) {
        throw new Exception("Coordinator not found or invalid user role.");
    }

    // 3. SECURE TOKEN GENERATION
    $newOtp = (string)random_int(100000, 999999);
    $hashedOtp = password_hash($newOtp, PASSWORD_DEFAULT);
    $expiresAt = date('Y-m-d H:i:s', strtotime('+24 hours'));

    // 4. UPDATE USER
    $stmt = $pdo->prepare("
        UPDATE public.users 
        SET 
            otp_code = ?, 
            password_hash = ?, 
            otp_expires_at = ?, 
            otp_last_sent_at = NOW(),
            must_reset_password = true,
            is_active = true -- Reactivate if they were locked out
        WHERE id = ?
    ");
    $stmt->execute([$newOtp, $hashedOtp, $expiresAt, $userId]);

    // 5. AUDIT LOGGING
    $logStmt = $pdo->prepare("
        INSERT INTO public.audit_logs (user_id, action_type, target_id, ip_address, details) 
        VALUES (?, 'COORDINATOR_OTP_REFRESH', ?, ?, ?)
    ");
    
    $details = json_encode([
        "message" => "Admin refreshed OTP for " . $targetUser['user_name'],
        "target_email" => $targetUser['email'],
        "performed_by" => $currentUser['user_name']
    ]);

    $logStmt->execute([$adminId, $userId, $_SERVER['REMOTE_ADDR'], $details]);

    $pdo->commit();

    echo json_encode([
        "status" => "success", 
        "message" => "New OTP generated for " . $targetUser['user_name'],
        "new_otp" => $newOtp 
    ]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log("OTP Refresh DB Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["error" => "Database error: Could not refresh credentials."]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(400);
    echo json_encode(["error" => $e->getMessage()]);
}