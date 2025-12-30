<?php
// backend/api/admin/bulk-upload-students.php

// require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../common_auth.php';
require_once __DIR__ . '/../../vendor/autoload.php';

use Shuchkin\SimpleXLSX;

/**
 * 1. SECURITY GUARD
 * Only Admins/Coordinators should be allowed to upload student lists.
 * This uses the function we defined in common_auth.php.
 */
requireAdmin();

// Check if a file was actually sent in the request
if (!isset($_FILES['student_file'])) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "No file uploaded"]);
    exit;
}

$fileName  = $_FILES['student_file']['name'];
$filePath  = $_FILES['student_file']['tmp_name'];
$extension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

try {
    // Start a transaction. This ensures that if the script crashes halfway,
    // NO data is saved, preventing "half-finished" uploads.
    $pdo->beginTransaction();
    
    /**
     * 2. SMART SESSION FINDER
     * Priority 1: Find the session where 'is_current' is checked (True).
     * Priority 2: If no session is checked, find the one with the latest year.
     */
    $session_id = $pdo->query("
        SELECT id FROM public.academic_sessions 
        WHERE is_current = true 
        LIMIT 1
    ")->fetchColumn();
    
    // Fallback: If you forgot to check the 'is_current' box, find the newest year
    if (!$session_id) {
        $session_id = $pdo->query("
            SELECT id FROM public.academic_sessions 
            ORDER BY year_end DESC 
            LIMIT 1
        ")->fetchColumn();
    }
    
    // If the database is completely empty of sessions, we cannot continue.
    if (!$session_id) {
        throw new Exception("No active academic session found. Please create one in the database first.");
    }
    
    $rows = [];

    /**
     * 3. FILE READING
     * This part opens the file and converts the rows into a simple PHP list (array).
     */
    if ($extension === 'csv') {
        $handle = fopen($filePath, "r");
        fgetcsv($handle); // Skip the top header row (Labels)
        while (($data = fgetcsv($handle)) !== FALSE) {
            $rows[] = $data;
        }
        fclose($handle);
    } elseif ($extension === 'xlsx') {
        if ($xlsx = SimpleXLSX::parse($filePath)) {
            $rows = $xlsx->rows();
            array_shift($rows); // Skip the top header row
        } else {
            throw new Exception("Excel parse error: " . SimpleXLSX::parseError());
        }
    } else {
        throw new Exception("Invalid file type. Please upload a .csv or .xlsx file.");
    }

    $successCount = 0;

    /**
     * 4. SAVING TO DATABASE
     * We loop through every row in your Excel/CSV file.
     */
    foreach ($rows as $row) {
        // Ensure the row has all 8 required columns
        if (count($row) < 8) continue; 
        
        [$uin, $idx, $name, $prog, $reg, $dist, $comm, $level] = $row;
        
        // Skip rows where the Index Number or UIN is missing
        if (empty($uin) || empty($idx)) continue;

        /**
         * 5. TABLE 1: STUDENT REGISTRY (Permanent Info)
         * If the index number exists, we just update the name.
         * If they were 'deleted', we set is_deleted back to 'false'.
         */
        $stmt = $pdo->prepare("
            INSERT INTO public.student_registry 
            (uin, index_number, full_name, program, region, district, community, is_deleted) 
            VALUES (?, ?, ?, ?, ?, ?, ?, false) 
            ON CONFLICT (index_number) 
            DO UPDATE SET 
                full_name = EXCLUDED.full_name,
                is_deleted = false 
            RETURNING id
        ");
        $stmt->execute([$uin, $idx, $name, $prog, $reg, $dist, $comm]);
        $registry_id = $stmt->fetchColumn();

        /**
         * 6. TABLE 2: STUDENT ENROLLMENT (Yearly Info)
         * This links the student ID to the Session ID we found earlier.
         * This is where their 'Level' (100 or 200) is stored.
         */
        $stmt = $pdo->prepare("
            INSERT INTO public.student_enrollments 
            (registry_id, session_id, level, program, region, district, community) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (registry_id, session_id) DO NOTHING
        ");
        $stmt->execute([$registry_id, $session_id, $level, $prog, $reg, $dist, $comm]);
        
        $successCount++;
    }

    /**
     * 7. AUDIT LOGGING
     * We record WHO did this upload so there is accountability.
     */
    $logStmt = $pdo->prepare("
        INSERT INTO public.audit_logs (user_id, action_type, details, ip_address) 
        VALUES (?, 'BULK_UPLOAD', ?, ?)
    ");
    $logStmt->execute([
        $currentUser['id'], 
        json_encode(["filename" => $fileName, "count" => $successCount, "session_id" => $session_id]),
        $_SERVER['REMOTE_ADDR']
    ]);

    // Everything worked! Save all changes permanently.
    $pdo->commit();
    echo json_encode(["status" => "success", "count" => $successCount]);

} catch (Exception $e) {
    // If anything went wrong, undo all database changes from this upload.
    if ($pdo->inTransaction()) $pdo->rollBack();
    
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}