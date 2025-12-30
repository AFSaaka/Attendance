<?php
// backend/api/admin/student-actions.php
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../common_auth.php';

// Get the data from the React frontend
$data = json_decode(file_get_contents("php://input"), true);
$student_registry_id = $data['id'] ?? null;
$action = $data['action'] ?? null;
$admin_id = $_SESSION['user_id'] ?? null; // The logged-in admin

if (!$student_registry_id || $action !== 'clear_device') {
    http_response_code(400);
    exit(json_encode(["error" => "Invalid request"]));
}

try {
    // We use a TRANSACTION to ensure BOTH the update and the log happen together
    $pdo->beginTransaction();

    // 1. Clear the device fingerprint in the users table
    $stmt = $pdo->prepare("
        UPDATE public.users 
        SET device_fingerprint = NULL 
        WHERE student_id = ?
    ");
    $stmt->execute([$student_registry_id]);

    // 2. Create the Audit Log entry
    $logStmt = $pdo->prepare("
        INSERT INTO public.audit_logs (user_id, action_type, target_id, ip_address, details) 
        VALUES (?, 'DEVICE_CLEAR', ?, ?, ?)
    ");
    
    $details = json_encode(["message" => "Admin cleared device fingerprint"]);
    $logStmt->execute([
        $admin_id, 
        $student_registry_id, 
        $_SERVER['REMOTE_ADDR'], // Captures the Admin's IP address
        $details
    ]);

    // Commit the changes to the database
    $pdo->commit();

    echo json_encode(["success" => true, "message" => "Device cleared and action logged."]);

} catch (Exception $e) {
    // If anything goes wrong, cancel everything
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}