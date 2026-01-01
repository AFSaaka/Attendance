<?php
// backend/api/admin/upload-admins.php
require_once __DIR__ . '/../common_auth.php'; 
require_once __DIR__ . '/../../vendor/autoload.php';
use Shuchkin\SimpleXLSX;

// 1. MANDATORY SECURITY: Only a Superadmin can create other Admins
requireSuperAdmin(); 

header("Content-Type: application/json");
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit;
}

try {
    if (!isset($_FILES['file'])) throw new Exception("No file uploaded");

    $fileTmpPath = $_FILES['file']['tmp_name'];
    $xlsx = SimpleXLSX::parse($fileTmpPath);
    if (!$xlsx) throw new Exception(SimpleXLSX::parseError());
    
    $rows = $xlsx->rows();
    if (empty($rows)) throw new Exception("File is empty or invalid");

    array_shift($rows); // Skip header [Name, Email, Admin Level]

    $pdo->beginTransaction();
    
    // We use a more descriptive variable set for clarity
    $stmt = $pdo->prepare("
        INSERT INTO public.users 
        (email, user_name, password_hash, role, admin_level, must_reset_password, otp_code, otp_expires_at, is_active)
        VALUES (:email, :name, :pass, 'admin', :level, true, :otp, :expires, true)
        ON CONFLICT (email) DO NOTHING
    ");

    $processed = [];
    $skippedCount = 0;
    $successCount = 0;

    foreach ($rows as $index => $row) {
        $name  = isset($row[0]) ? trim($row[0]) : '';
        $email = isset($row[1]) ? strtolower(trim($row[1])) : '';
        $rawLevel = isset($row[2]) ? strtolower(trim($row[2])) : 'admin';

        if (empty($email) || empty($name)) continue; 

        // Generate Secure 6-digit OTP
        $otp = (string)random_int(100000, 999999);
        $hashedPassword = password_hash($otp, PASSWORD_DEFAULT);
        $expiresAt = date('Y-m-d H:i:s', strtotime('+48 hours'));

        // Determine Level
        $finalLevel = ($rawLevel === 'super admin' || $rawLevel === 'super_admin') ? 'super_admin' : 'admin';

        $stmt->execute([
            ':name'    => $name,
            ':email'   => $email,
            ':pass'    => $hashedPassword,
            ':level'   => $finalLevel,
            ':otp'     => $otp,
            ':expires' => $expiresAt
        ]);
        
        if ($stmt->rowCount() > 0) {
            $successCount++;
            // We collect these so the Superadmin can copy the passwords immediately
            $processed[] = [
                "name"  => $name,
                "email" => $email,
                "level" => $finalLevel,
                "temp_pass" => $otp 
            ];
        } else {
            $skippedCount++;
        }
    }

    // 2. AUDIT LOGGING (The "Who did what")
    $logStmt = $pdo->prepare("
        INSERT INTO public.audit_logs (user_id, action_type, ip_address, details) 
        VALUES (?, 'ADMIN_BULK_UPLOAD', ?, ?)
    ");
    
    $details = json_encode([
        "message" => "Superadmin uploaded $successCount new admin accounts",
        "skipped" => $skippedCount,
        "accounts" => array_map(function($a) { return $a['email'] . " (" . $a['level'] . ")"; }, $processed)
    ]);

    $logStmt->execute([$currentUser['id'], $_SERVER['REMOTE_ADDR'], $details]);

    $pdo->commit();

    // 3. RETURN DATA TO FRONTEND
    echo json_encode([
        "success" => true, 
        "count" => $successCount, 
        "skipped" => $skippedCount,
        "credentials" => $processed // Return this so Admin can distribute passwords
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log("Admin Upload Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["error" => "An internal error occurred while processing admin accounts."]);
}