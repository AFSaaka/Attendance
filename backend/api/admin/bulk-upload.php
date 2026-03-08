<?php
// backend/api/admin/bulk-upload-students.php

require_once __DIR__ . '/../common_auth.php';
require_once __DIR__ . '/../../utils/validators.php';
require_once __DIR__ . '/../../vendor/autoload.php';

use Shuchkin\SimpleXLSX;

requireAdmin();
validateCSRFToken(); 

if (!isset($_FILES['student_file'])) {
    http_response_code(400);
    exit(json_encode(["status" => "error", "message" => "No file uploaded"]));
}

$fileName  = $_FILES['student_file']['name'];
$filePath  = $_FILES['student_file']['tmp_name'];
$extension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

try {
    // 1. SESSION CHECK
    $session_id = $pdo->query("SELECT id FROM public.academic_sessions WHERE is_current = true LIMIT 1")->fetchColumn();
    if (!$session_id) {
        throw new Exception("No active academic session found.");
    }

    // 2. PARSE FILE
    $rows = [];
    if ($extension === 'csv') {
        if (($handle = fopen($filePath, "r")) !== FALSE) {
            fgetcsv($handle); // Skip header
            while (($data = fgetcsv($handle)) !== FALSE) { $rows[] = $data; }
            fclose($handle);
        }
    } elseif ($extension === 'xlsx') {
        if ($xlsx = SimpleXLSX::parse($filePath)) {
            $rows = $xlsx->rows();
            array_shift($rows); // Skip header
        } else {
            throw new Exception("Excel parse error: " . SimpleXLSX::parseError());
        }
    } else {
        throw new Exception("Invalid file type. Please upload .csv or .xlsx");
    }

    // 3. START TRANSACTION
    $pdo->beginTransaction();

    $successCount = 0;
    $errors = [];
    $processedUins = []; 

    // 4. PREPARE STATEMENTS
    // We update everything on conflict. 
    // Note: If UIN conflicts but Index doesn't, the 23505 catch in the loop handles it.
    $stmtRegistry = $pdo->prepare("
        INSERT INTO public.student_registry 
        (uin, index_number, full_name, program, region, district, community, is_deleted, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, false, NOW()) 
        ON CONFLICT (index_number) DO UPDATE SET 
            full_name = EXCLUDED.full_name,
            uin = EXCLUDED.uin,
            program = EXCLUDED.program,
            region = EXCLUDED.region,
            district = EXCLUDED.district,
            community = EXCLUDED.community,
            is_deleted = false,
            updated_at = NOW()
        RETURNING id
    ");

    $stmtEnroll = $pdo->prepare("
        INSERT INTO public.student_enrollments 
        (registry_id, session_id, level, program, region, district, community, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        ON CONFLICT (registry_id, session_id) DO UPDATE SET 
            level = EXCLUDED.level,
            updated_at = NOW()
    ");

    // 5. THE LOOP
    foreach ($rows as $index => $row) {
        $row = array_map('trim', $row);
        
        if (empty(array_filter($row))) continue;

        if (count($row) < 8) {
            $errors[] = "Row " . ($index + 2) . ": Missing columns (Expected 8).";
            continue;
        }

        [$uin, $idx, $name, $prog, $reg, $dist, $comm, $level] = $row;

        // Local Duplicate Check
        if (isset($processedUins[$uin])) {
            $errors[] = "Row " . ($index + 2) . ": Duplicate UIN ($uin) within file.";
            continue;
        }
        $processedUins[$uin] = true;

        $spName = "row_" . $index;
        try {
            $pdo->exec("SAVEPOINT $spName");

            $stmtRegistry->execute([$uin, $idx, $name, $prog, $reg, $dist, $comm]);
            $registry_id = $stmtRegistry->fetchColumn();

            if (!$registry_id) {
                // Logic: If ON CONFLICT didn't return an ID, fetch it manually
                $fetchStmt = $pdo->prepare("SELECT id FROM public.student_registry WHERE index_number = ?");
                $fetchStmt->execute([$idx]);
                $registry_id = $fetchStmt->fetchColumn();
            }

            $stmtEnroll->execute([$registry_id, $session_id, $level, $prog, $reg, $dist, $comm]);
            
            $successCount++;
            $pdo->exec("RELEASE SAVEPOINT $spName");

        } catch (PDOException $e) {
            $pdo->exec("ROLLBACK TO SAVEPOINT $spName");
            
            if ($e->getCode() == '23505') {
                $errors[] = "Row " . ($index + 2) . ": Conflict on UIN '$uin' (Already assigned to another Index Number).";
            } else {
                $errors[] = "Row " . ($index + 2) . ": " . $e->getMessage();
            }
        }
    }

    // 6. FINAL LOGGING
    $logStmt = $pdo->prepare("INSERT INTO public.audit_logs (user_id, action_type, details, ip_address) VALUES (?, 'BULK_UPLOAD', ?, ?)");
    $logStmt->execute([
        $currentUser['id'], 
        json_encode(["file" => $fileName, "success" => $successCount, "errors" => count($errors)]),
        $_SERVER['REMOTE_ADDR']
    ]);

    $pdo->commit();
    echo json_encode(["status" => "success", "count" => $successCount, "errors" => $errors]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log("BULK ERROR: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}