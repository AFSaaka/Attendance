<?php
// backend/api/admin/bulk-upload-coordinators.php
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../common_auth.php';
require_once __DIR__ . '/../../vendor/autoload.php';

use Shuchkin\SimpleXLSX;

header("Content-Type: application/json");

if (!isset($_FILES['coordinator_file'])) {
    http_response_code(400);
    echo json_encode(["error" => "No file uploaded"]);
    exit;
}

$filePath = $_FILES['coordinator_file']['tmp_name'];

try {
    $pdo->beginTransaction();
    
    if ($xlsx = SimpleXLSX::parse($filePath)) {
        $rows = $xlsx->rows();
        array_shift($rows); // Skip header: [full_name, email, phone_number, region, district]

        $count = 0;
        foreach ($rows as $row) {
            if (count($row) < 5 || empty($row[1])) continue;

            [$name, $email, $phone, $region, $district] = $row;

            // 1. Generate OTP Security Data
            $otp = (string)rand(100000, 999999);
            $hashedOtp = password_hash($otp, PASSWORD_DEFAULT);
            $expiresAt = date('Y-m-d H:i:s', strtotime('+24 hours'));

            // 2. Insert into Users Table (Account)
            $stmtUser = $pdo->prepare("
                INSERT INTO public.users 
                (email, password_hash, role, user_name, otp_code, otp_expires_at, must_reset_password, is_email_verified) 
                VALUES (?, ?, 'coordinator', ?, ?, ?, true, false)
                RETURNING id
            ");
            $stmtUser->execute([$email, $hashedOtp, $name, $otp, $expiresAt]);
            $userId = $stmtUser->fetchColumn();

            // 3. Insert into Coordinators Table (Profile)
            $stmtCoord = $pdo->prepare("
                INSERT INTO public.coordinators 
                (user_id, full_name, region, district, phone_number) 
                VALUES (?, ?, ?, ?, ?)
            ");
            $stmtCoord->execute([$userId, $name, $region, $district, $phone]);

            $count++;
        }

        $pdo->commit();
        echo json_encode(["status" => "success", "count" => $count]);
    } else {
        throw new Exception(SimpleXLSX::parseError());
    }

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}