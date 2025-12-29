<?php
// backend/api/admin/upload-admins.php
require_once __DIR__ . '/../../config/db.php';
// IMPORTANT: Use common_auth to ensure $pdo and requireSuperAdmin are available
require_once __DIR__ . '/../common_auth.php'; 
require_once __DIR__ . '/../../vendor/autoload.php';
use Shuchkin\SimpleXLSX;

requireSuperAdmin(); // Use our new security check

if ($_SERVER['REQUEST_METHOD'] !== 'POST') exit;

try {
    if (!isset($_FILES['file'])) throw new Exception("No file uploaded");

    $fileTmpPath = $_FILES['file']['tmp_name'];
    $xlsx = SimpleXLSX::parse($fileTmpPath);
    if (!$xlsx) throw new Exception(SimpleXLSX::parseError());
    
    $rows = $xlsx->rows();
    if (empty($rows)) throw new Exception("File is empty or invalid");

    array_shift($rows); // Skip header [Name, Email, Admin Level]

    $pdo->beginTransaction();
    
    // Check your DB: Is it 'password' or 'password_hash'? 
    // Based on your common_auth/get-admins, 'password' is more likely.
    $stmt = $pdo->prepare("
        INSERT INTO public.users (email, user_name, password_hash, role, admin_level, must_reset_password)
        VALUES (:email, :name, :pass, 'admin', :level, true)
        ON CONFLICT (email) DO NOTHING
    ");

    $count = 0;
    foreach ($rows as $row) {
        $email = isset($row[1]) ? trim($row[1]) : '';
        if (empty($email)) continue; 

        $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $hashedPassword = password_hash($otp, PASSWORD_DEFAULT);

        $stmt->execute([
            ':name'  => trim($row[0]),
            ':email' => $email,
            ':pass'  => $hashedPassword,
            ':level' => (!empty($row[2]) && strtolower(trim($row[2])) === 'super admin') ? 'super_admin' : 'admin'
        ]);
        
        // ONLY increment if the database actually added a new row
        if ($stmt->rowCount() > 0) {
            $count++;
        }
    }

    $pdo->commit();
    echo json_encode(["success" => true, "count" => $count]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}