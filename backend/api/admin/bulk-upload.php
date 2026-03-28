<?php
// backend/api/admin/bulk-upload.php

require_once __DIR__ . '/../common_auth.php';
require_once __DIR__ . '/../../utils/validators.php';
require_once __DIR__ . '/../../vendor/autoload.php';

use Shuchkin\SimpleXLSX;

// Increase time limit for large uploads — Render allows up to 30s on free tier
// This won't help with the gateway timeout but ensures PHP itself doesn't die first
set_time_limit(120);
ini_set('memory_limit', '256M');

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
    $session_id = $pdo->query(
        "SELECT id FROM public.academic_sessions WHERE is_current = true LIMIT 1"
    )->fetchColumn();

    if (!$session_id) {
        throw new Exception("No active academic session found.");
    }

    // 2. PARSE FILE
    $rows = [];
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
        throw new Exception("Invalid file type. Please upload .csv or .xlsx");
    }

    // 3. VALIDATE AND CLEAN ROWS BEFORE TOUCHING THE DATABASE
    $cleanRows     = [];
    $errors        = [];
    $seenUins      = [];
    $seenIndices   = [];

    foreach ($rows as $i => $row) {
        $row = array_map('trim', array_map('strval', $row));
        if (empty(array_filter($row))) continue;

        if (count($row) < 8) {
            $errors[] = "Row " . ($i + 2) . ": Only " . count($row) . " columns (expected 8).";
            continue;
        }

        [$uin, $idx, $name, $prog, $reg, $dist, $comm, $level] = $row;

        if (empty($uin) || empty($idx) || empty($name)) {
            $errors[] = "Row " . ($i + 2) . ": UIN, index number, and name are required.";
            continue;
        }

        // Deduplicate within file
        if (isset($seenUins[$uin])) {
            $errors[] = "Row " . ($i + 2) . ": Duplicate UIN ($uin) in file.";
            continue;
        }
        if (isset($seenIndices[$idx])) {
            $errors[] = "Row " . ($i + 2) . ": Duplicate index number ($idx) in file.";
            continue;
        }

        $seenUins[$uin]      = true;
        $seenIndices[$idx]   = true;
        $cleanRows[]         = [$uin, $idx, $name, $prog, $reg, $dist, $comm, $level];
    }

    if (empty($cleanRows)) {
        throw new Exception("No valid rows found in file. Check errors: " . implode("; ", array_slice($errors, 0, 3)));
    }

    // 4. SINGLE TRANSACTION — no per-row SAVEPOINTs
    $pdo->beginTransaction();

    // Prepared statements created ONCE outside the loop
    $stmtRegistry = $pdo->prepare("
        INSERT INTO public.student_registry
            (uin, index_number, full_name, program, region, district, community, is_deleted, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, false, NOW())
        ON CONFLICT (index_number) DO UPDATE SET
            full_name    = EXCLUDED.full_name,
            uin          = EXCLUDED.uin,
            program      = EXCLUDED.program,
            region       = EXCLUDED.region,
            district     = EXCLUDED.district,
            community    = EXCLUDED.community,
            is_deleted   = false,
            updated_at   = NOW()
        RETURNING id
    ");

    // Fetch by index as fallback (ON CONFLICT DO UPDATE returns no row on some PG versions)
    $stmtFetch = $pdo->prepare(
        "SELECT id FROM public.student_registry WHERE index_number = ?"
    );

    $stmtEnroll = $pdo->prepare("
        INSERT INTO public.student_enrollments
            (registry_id, session_id, level, program, region, district, community, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        ON CONFLICT (registry_id, session_id) DO UPDATE SET
            level      = EXCLUDED.level,
            program    = EXCLUDED.program,
            region     = EXCLUDED.region,
            district   = EXCLUDED.district,
            community  = EXCLUDED.community,
            updated_at = NOW()
    ");

    $successCount = 0;

    foreach ($cleanRows as $row) {
        [$uin, $idx, $name, $prog, $reg, $dist, $comm, $level] = $row;

        $stmtRegistry->execute([$uin, $idx, $name, $prog, $reg, $dist, $comm]);
        $registry_id = $stmtRegistry->fetchColumn();

        // Fallback fetch if RETURNING gave nothing
        if (!$registry_id) {
            $stmtFetch->execute([$idx]);
            $registry_id = $stmtFetch->fetchColumn();
        }

        if (!$registry_id) {
            $errors[] = "Could not resolve registry ID for index $idx — skipped.";
            continue;
        }

        $stmtEnroll->execute([$registry_id, $session_id, $level, $prog, $reg, $dist, $comm]);
        $successCount++;
    }

    // 5. AUDIT LOG
    $logStmt = $pdo->prepare("
        INSERT INTO public.audit_logs (user_id, action_type, details, ip_address)
        VALUES (?, 'BULK_UPLOAD', ?, ?)
    ");
    $logStmt->execute([
        $currentUser['id'],
        json_encode([
            "file"       => $fileName,
            "success"    => $successCount,
            "errors"     => count($errors),
            "session_id" => $session_id,
        ]),
        $_SERVER['REMOTE_ADDR'],
    ]);

    $pdo->commit();

    echo json_encode([
        "status"  => "success",
        "count"   => $successCount,
        "errors"  => $errors,
        "message" => "Successfully imported $successCount students." .
                     (count($errors) > 0 ? " " . count($errors) . " rows skipped." : ""),
    ]);

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    error_log("BULK UPLOAD ERROR: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}