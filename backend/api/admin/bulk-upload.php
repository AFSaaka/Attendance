<?php
// backend/api/admin/bulk-upload-students.php

require_once __DIR__ . '/../common_auth.php';
require_once __DIR__ . '/../../vendor/autoload.php';

use Shuchkin\SimpleXLSX;

requireAdmin(); // Custom instruction: Only superadmins/admins

if (!isset($_FILES['student_file'])) {
    http_response_code(400);
    exit(json_encode(["status" => "error", "message" => "No file uploaded"]));
}

$fileName  = $_FILES['student_file']['name'];
$filePath  = $_FILES['student_file']['tmp_name'];
$extension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

try {
    // 1. SESSION CHECK (Do this BEFORE starting transaction)
    $session_id = $pdo->query("SELECT id FROM public.academic_sessions WHERE is_current = true LIMIT 1")->fetchColumn();
    if (!$session_id) {
        throw new Exception("No active academic session found.");
    }

    // 2. PARSE FILE
    $rows = [];
    if ($extension === 'csv') {
        if (($handle = fopen($filePath, "r")) !== FALSE) {
            fgetcsv($handle); 
            while (($data = fgetcsv($handle)) !== FALSE) { $rows[] = $data; }
            fclose($handle);
        }
    } elseif ($extension === 'xlsx') {
        if ($xlsx = SimpleXLSX::parse($filePath)) {
            $rows = $xlsx->rows();
            array_shift($rows); 
        } else {
            throw new Exception("Excel parse error: " . SimpleXLSX::parseError());
        }
    } else {
        throw new Exception("Invalid file type.");
    }

    // 3. START TRANSACTION
    $pdo->beginTransaction();

    $successCount = 0;
    $errors = [];
    $processedUins = []; // Local cache to detect duplicates in the file

    // 4. PREPARE STATEMENTS
    $stmtRegistry = $pdo->prepare("
        INSERT INTO public.student_registry 
        (uin, index_number, full_name, program, region, district, community, is_deleted) 
        VALUES (?, ?, ?, ?, ?, ?, ?, false) 
        ON CONFLICT (index_number) DO UPDATE SET 
            full_name = EXCLUDED.full_name,
            uin = EXCLUDED.uin,
            is_deleted = false 
        RETURNING id
    ");

    $stmtEnroll = $pdo->prepare("
        INSERT INTO public.student_enrollments 
        (registry_id, session_id, level, program, region, district, community) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (registry_id, session_id) DO UPDATE SET level = EXCLUDED.level
    ");

    // 5. THE LOOP (With Savepoints)
    foreach ($rows as $index => $row) {
        $row = array_map('trim', $row);
        // TEMPORARY DEBUG: This will tell us why it's skipping
    if (empty(array_filter($row))) {
        error_log("Row " . ($index + 2) . " skipped because it is empty.");
        continue;
    }

        if (count($row) < 8) {
            $errors[] = "Row " . ($index + 2) . ": Missing columns.";
            continue;
        }

        [$uin, $idx, $name, $prog, $reg, $dist, $comm, $level] = $row;

        // Check for duplicates within the uploaded file itself
        if (isset($processedUins[$uin])) {
            $errors[] = "Row " . ($index + 2) . ": Duplicate UIN ($uin) found within the file.";
            continue;
        }
        $processedUins[$uin] = true;

        try {
            // POSTGRES FIX: Create a Savepoint for this specific row
            $spName = "row_" . $index;
            $pdo->exec("SAVEPOINT $spName");

            $stmtRegistry->execute([$uin, $idx, $name, $prog, $reg, $dist, $comm]);
            $registry_id = $stmtRegistry->fetchColumn();

            if (!$registry_id) {
                // If fetchColumn fails, the Index Number conflict logic might have returned nothing
                throw new Exception("Could not retrieve Registry ID.");
            }

            $stmtEnroll->execute([$registry_id, $session_id, $level, $prog, $reg, $dist, $comm]);
            
            $successCount++;
            
            // Success: Clean up the savepoint
            $pdo->exec("RELEASE SAVEPOINT $spName");

        } catch (PDOException $e) {
            // ROLLBACK to the start of this row only
            $pdo->exec("ROLLBACK TO SAVEPOINT $spName");
            
            if ($e->getCode() == '23505') {
                $errors[] = "Row " . ($index + 2) . ": Database Conflict (UIN $uin likely exists elsewhere).";
            } else {
                $errors[] = "Row " . ($index + 2) . ": DB Error: " . $e->getMessage();
            }
        }
    }

    // 6. LOGGING & COMMIT
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
    error_log("Critical Upload Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}