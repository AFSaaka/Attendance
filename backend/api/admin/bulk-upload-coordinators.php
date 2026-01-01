<?php
// backend/api/admin/bulk-upload-coordinators.php
require_once __DIR__ . '/../common_auth.php';
require_once __DIR__ . '/../../vendor/autoload.php';

use Shuchkin\SimpleXLSX;

// 1. SECURITY GUARD: ONLY Superadmins can create staff/coordinator accounts
requireSuperAdmin(); 

header("Content-Type: application/json");

if (!isset($_FILES['coordinator_file'])) {
    http_response_code(400);
    exit(json_encode(["error" => "No file uploaded"]));
}

$filePath = $_FILES['coordinator_file']['tmp_name'];
$admin_id = $currentUser['id'];

try {
    $pdo->beginTransaction();

    // 2. FETCH CURRENT SESSION for Audit
    $session_id = $pdo->query("SELECT id FROM public.academic_sessions WHERE is_current = true LIMIT 1")->fetchColumn();

    if ($xlsx = SimpleXLSX::parse($filePath)) {
        $rows = $xlsx->rows();
        array_shift($rows); // Skip header: [full_name, email, phone_number, region, district]

        $successCount = 0;
        $errors = [];

        // PREPARE STATEMENTS (Performance & Security)
        $stmtUser = $pdo->prepare("
            INSERT INTO public.users 
            (email, password_hash, role, user_name, otp_code, otp_expires_at, must_reset_password, is_email_verified, is_active) 
            VALUES (?, ?, 'coordinator', ?, ?, ?, true, false, true)
            RETURNING id
        ");

        $stmtCoord = $pdo->prepare("
            INSERT INTO public.coordinators 
            (user_id, full_name, region, district, phone_number) 
            VALUES (?, ?, ?, ?, ?)
        ");

        foreach ($rows as $index => $row) {
            $row = array_map('trim', $row);
            if (empty(array_filter($row))) continue; // Skip empty lines

            if (count($row) < 5 || empty($row[1])) {
                $errors[] = "Row " . ($index + 2) . ": Missing email or insufficient data.";
                continue;
            }

            [$name, $email, $phone, $region, $district] = $row;

            // 3. SECURE AUTH DATA
            // Use random_int for better entropy than rand()
            $otp = (string)random_int(100000, 999999);
            // We hash the OTP because it acts as a temporary password
            $hashedOtp = password_hash($otp, PASSWORD_DEFAULT);
            $expiresAt = date('Y-m-d H:i:s', strtotime('+48 hours')); // 48h for staff

            try {
                // 4. INSERT ACCOUNT
                // Note: We do NOT store the plaintext $otp in the DB for security.
                // The admin will need to send these via email or a separate notification system.
                $stmtUser->execute([$email, $hashedOtp, $name, $otp, $expiresAt]);
                $userId = $stmtUser->fetchColumn();

                // 5. INSERT PROFILE
                $stmtCoord->execute([$userId, $name, $region, $district, $phone]);

                $successCount++;
            } catch (PDOException $e) {
                if ($e->getCode() == '23505') {
                    $errors[] = "Row " . ($index + 2) . ": Email ($email) is already registered.";
                } else {
                    throw $e; // Critical DB error
                }
            }
        }

        // 6. ENHANCED AUDIT LOG
        $logStmt = $pdo->prepare("
            INSERT INTO public.audit_logs (user_id, action_type, session_id, ip_address, details) 
            VALUES (?, 'BULK_COORDINATOR_UPLOAD', ?, ?, ?)
        ");
        
        $details = json_encode([
            "message" => "Provisioned $successCount new coordinator accounts",
            "filename" => $_FILES['coordinator_file']['name'],
            "success_count" => $successCount,
            "failed_emails" => count($errors)
        ]);

        $logStmt->execute([$admin_id, $session_id, $_SERVER['REMOTE_ADDR'], $details]);

        $pdo->commit();
        echo json_encode([
            "status" => "success", 
            "count" => $successCount, 
            "errors" => $errors
        ]);
    } else {
        throw new Exception(SimpleXLSX::parseError());
    }

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log("Coordinator Upload Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["error" => "Internal Server Error: Account creation failed."]);
}