<?php
// backend/public/index.php

// 1. MUST match your React URL
$allowed_origin = "http://localhost:5173";

header("Access-Control-Allow-Origin: $allowed_origin");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}


// 2. Extract the URL
$url = isset($_GET['url']) ? rtrim($_GET['url'], '/') : '';

// 3. Updated Routing Table (MUST INCLUDE ALL ENDPOINTS)
$routes = [
    'auth/register' => '../api/auth/register.php',
    'auth/login' => '../api/auth/login.php',
    'auth/verify_otp' => '../api/auth/verify_otp.php',
    'auth/resend_otp' => '../api/auth/resend_otp.php',
    'student/get_placement' => '../api/student/get_placement.php', // ADD THIS!
    'student/submit_attendance' => '../api/student/submit_attendance.php',
    'student/check_daily_status' => '../api/student/check_daily_status.php',
    'student/sync_attendance' => '../api/student/sync_attendance.php',
    'attendance/sync' => '../api/attendance/sync.php',
    'auth/me' => '../api/auth/me.php',
    'coordinator/audit-summary' => '../api/coordinator/audit-summary.php',
];

if (array_key_exists($url, $routes)) {
    // Before requiring, make sure common_auth.php isn't duplicating CORS headers
    require_once $routes[$url];
} else {
    http_response_code(404);
    echo json_encode(["status" => "error", "message" => "Endpoint not found: " . $url]);
}