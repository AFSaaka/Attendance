<?php
// backend/api/auth/register.php

// 1. Set headers to force a file download
header('Content-Type: text/plain');
header('Content-Disposition: attachment; filename="backend_debug_report.txt"');

// 2. Gather all possible diagnostic info
$rawInput = file_get_contents('php://input');
$decoded = json_decode($rawInput, true);

$debugReport = "=== UDS PORTAL DEBUG REPORT ===\n";
$debugReport .= "Timestamp: " . date('Y-m-d H:i:s') . "\n";
$debugReport .= "Request Method: " . $_SERVER['REQUEST_METHOD'] . "\n";
$debugReport .= "---------------------------\n";

if (empty($rawInput)) {
    $debugReport .= "CRITICAL: No input data received from frontend.\n";
} else {
    $debugReport .= "RAW INPUT: " . $rawInput . "\n\n";
    $debugReport .= "PARSED DATA:\n" . print_r($decoded, true) . "\n";
}

$debugReport .= "---------------------------\n";
$debugReport .= "SERVER INFO:\n";
$debugReport .= "PHP Version: " . phpversion() . "\n";
$debugReport .= "Include Path: " . get_include_path() . "\n";

// 3. Output the report (This triggers the download in the browser)
echo $debugReport;
exit;