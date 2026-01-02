<?php
// backend/api/admin/upload-admins.php
require_once __DIR__ . '/../common_auth.php'; 
require_once __DIR__ . '/../../vendor/autoload.php';
use Shuchkin\SimpleXLSX;

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
        // 1. Column Validation: Ensure at least Name and Email exist
        $name  = isset($row[0]) ? trim($row[0]) : '';
        $email = isset($row[1]) ? strtolower(trim($row[1])) : '';
        $rawLevel = isset($row[2]) ? strtolower(trim($row[2])) : 'admin';

        // 2. Data Integrity Check: If column 2 isn't a valid email, it's likely a formatting error
        if (empty($name) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $skippedCount++;
            continue; 
        }

        $otp = (string)random_int(100000, 999999);
        $hashedPassword = password_hash($otp, PASSWORD_DEFAULT);
        $expiresAt = date('Y-m-d H:i:s', strtotime('+48 hours'));
        $finalLevel = (str_contains($rawLevel, 'super')) ? 'super_admin' : 'admin';

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

    // 3. Audit Log
    $logStmt = $pdo->prepare("INSERT INTO public.audit_logs (user_id, action_type, ip_address, details) VALUES (?, 'ADMIN_BULK_UPLOAD', ?, ?)");
    $details = json_encode(["success" => $successCount, "skipped" => $skippedCount]);
    $logStmt->execute([$_SESSION['user_id'], $_SERVER['REMOTE_ADDR'], $details]);

    $pdo->commit();

    echo json_encode([
        "success" => true, 
        "count" => $successCount, 
        "skipped" => $skippedCount,
        "credentials" => $processed 
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}