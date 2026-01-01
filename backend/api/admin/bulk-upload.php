<?php
// backend/api/admin/bulk-upload-students.php

require_once __DIR__ . '/../common_auth.php';
require_once __DIR__ . '/../../vendor/autoload.php';

use Shuchkin\SimpleXLSX;

// 1. SECURITY: Only Admins/Superadmins
requireAdmin();

if (!isset($_FILES['student_file'])) {
    http_response_code(400);
    exit(json_encode(["status" => "error", "message" => "No file uploaded"]));
}

$fileName  = $_FILES['student_file']['name'];
$filePath  = $_FILES['student_file']['tmp_name'];
$extension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

try {
    $pdo->beginTransaction();
    
    // 2. FETCH CURRENT SESSION
    $session_id = $pdo->query("SELECT id FROM public.academic_sessions WHERE is_current = true LIMIT 1")->fetchColumn();
    if (!$session_id) {
        throw new Exception("No active academic session found. Please set a current session first.");
    }

    $rows = [];
    // 3. SECURE FILE PARSING
    if ($extension === 'csv') {
        if (($handle = fopen($filePath, "r")) !== FALSE) {
            fgetcsv($handle); // Skip header
            while (($data = fgetcsv($handle)) !== FALSE) {
                $rows[] = $data;
            }
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
        throw new Exception("Invalid file type. Only .csv or .xlsx allowed.");
    }

    $successCount = 0;
    $errors = [];

    // 4. PREPARE STATEMENTS (Performance: Prepare once, execute many)
    $stmtRegistry = $pdo->prepare("
        INSERT INTO public.student_registry 
        (uin, index_number, full_name, program, region, district, community, is_deleted) 
        VALUES (?, ?, ?, ?, ?, ?, ?, false) 
        ON CONFLICT (index_number) 
        DO UPDATE SET 
            full_name = EXCLUDED.full_name,
            uin = EXCLUDED.uin, -- Update UIN in case it changed
            is_deleted = false 
        RETURNING id
    ");

    $stmtEnroll = $pdo->prepare("
        INSERT INTO public.student_enrollments 
        (registry_id, session_id, level, program, region, district, community) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (registry_id, session_id) 
        DO UPDATE SET 
            level = EXCLUDED.level,
            program = EXCLUDED.program,
            region = EXCLUDED.region,
            district = EXCLUDED.district,
            community = EXCLUDED.community
    ");

    // 5. DATA PROCESSING LOOP
    foreach ($rows as $index => $row) {
        // Data Cleanup
        $row = array_map('trim', $row);
        
        // Skip truly empty rows
        if (empty(array_filter($row))) continue;

        if (count($row) < 8) {
            $errors[] = "Row " . ($index + 2) . ": Insufficient columns.";
            continue;
        }

        [$uin, $idx, $name, $prog, $reg, $dist, $comm, $level] = $row;

        if (empty($uin) || empty($idx) || empty($name)) {
            $errors[] = "Row " . ($index + 2) . ": Missing required fields (UIN, Index, or Name).";
            continue;
        }

        try {
            // Upsert Registry
            $stmtRegistry->execute([$uin, $idx, $name, $prog, $reg, $dist, $comm]);
            $registry_id = $stmtRegistry->fetchColumn();

            // Upsert Enrollment
            $stmtEnroll->execute([$registry_id, $session_id, $level, $prog, $reg, $dist, $comm]);
            
            $successCount++;
        } catch (PDOException $e) {
            // Check for UIN conflict specifically
            if ($e->getCode() == '23505') {
                $errors[] = "Row " . ($index + 2) . ": UIN or Index Number already exists for another student.";
            } else {
                throw $e; // Re-throw major DB errors to trigger rollback
            }
        }
    }

    // 6. ENHANCED AUDIT LOGGING
    $logStmt = $pdo->prepare("
        INSERT INTO public.audit_logs (user_id, action_type, session_id, target_id, details, ip_address) 
        VALUES (?, 'BULK_UPLOAD', ?, NULL, ?, ?)
    ");
    
    $details = json_encode([
        "filename" => $fileName,
        "total_processed" => $successCount,
        "errors_encountered" => count($errors),
        "error_list" => array_slice($errors, 0, 10) // Store first 10 errors for debugging
    ]);

    $logStmt->execute([
        $currentUser['id'], 
        $session_id,
        $details,
        $_SERVER['REMOTE_ADDR']
    ]);

    $pdo->commit();
    echo json_encode([
        "status" => "success", 
        "count" => $successCount, 
        "errors" => $errors
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log("Bulk Upload Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Critical upload failure: " . $e->getMessage()]);
}