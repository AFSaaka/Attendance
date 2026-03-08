<?php
//backend/public/index.php

// 1. Session Security (Optimized for Safari)
ini_set('session.cookie_samesite', 'Lax'); 
ini_set('session.cookie_secure', '1'); 
ini_set('session.cookie_httponly', '1');
ini_set('session.use_only_cookies', '1');

// 2. CORS (Now simplified because of the proxy)
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

// Allow both local dev and your Netlify production domain
$allowed_origins = [
    "http://localhost:5173",
    "https://ttfpp-attendance.netlify.app"
];

if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
}

header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

session_start(); // Start the session AFTER setting params

// 2. Extract the URL
$url = isset($_GET['url']) ? rtrim($_GET['url'], '/') : '';



// 3. Updated Routing Table (MUST INCLUDE ALL ENDPOINTS)
$routes = [
    'auth/register' => '../api/auth/register.php',
    'auth/login' => '../api/auth/login.php',
    'auth/verify_otp' => '../api/auth/verify_otp.php',
    'auth/reset-password' => '../api/auth/reset-password.php',
    'auth/resend_otp' => '../api/auth/resend_otp.php',
    'admin/stats' => '../api/admin/get-admin-stats.php',
    'admin/add-student' => '../api/admin/add-student.php',
    'admin/bulk-upload' => '../api/admin/bulk-upload.php',
    'admin/add-coordinator' => '../api/admin/add-coordinator.php',
    'admin/get-coordinators' => '../api/admin/get-coordinators.php',
    'admin/get-students' => '../api/admin/get-students.php',
    'admin/manage_community' => '../api/admin/manage_community.php',
    'admin/edit_community' => '../api/admin/edit_community.php',
    'admin/manage-admins' => '../api/admin/manage-admins.php',
    'admin/get-academic-sessions' => '../api/admin/get-academic-sessions.php',
    'admin/get-location-filters' => '../api/admin/get-location-filters.php',
    'admin/manage_session' => '../api/admin/manage_session.php',
    'admin/get-system-activity' => '../api/admin/get-system-activity.php',
    'admin/generate-log-file' => '../api/admin/generate-log-file.php',
    'admin/upload-communities' => '../api/admin/upload-communities.php',
    'admin/export-attendance' => '../api/admin/export-attendance.php',
    'admin/get-communities' => '../api/admin/get-communities.php',
    'admin/add-community-single' => '../api/admin/add-community-single.php',
    'admin/add-admin-single' => '../api/admin/add-admin-single.php',
    'admin/upload-admins' => '../api/admin/upload-admins.php',
    'admin/get-admins' => '../api/admin/get-admins.php',
    'admin/update-student' => '../api/admin/update-student.php',
    'admin/student-actions' => '../api/admin/student-actions.php',
    'admin/bulk-upload-coordinators' => '../api/admin/bulk-upload-coordinators.php',
    'admin/get-sessions' => '../api/admin/get-sessions.php',
    'student/get_placement' => '../api/student/get_placement.php', // ADD THIS!
    'student/submit_attendance' => '../api/student/submit_attendance.php',
    'student/check_daily_status' => '../api/student/check_daily_status.php',
    'student/sync_attendance' => '../api/student/sync_attendance.php',
    'attendance/sync' => '../api/attendance/sync.php',
    'auth/me' => '../api/auth/me.php',
    'auth/verify' => '../api/auth/verify.php',
    'test-mail' => '../api/test-mail.php',
   
];

if (array_key_exists($url, $routes)) {
    // Before requiring, make sure common_auth.php isn't duplicating CORS headers
    require_once $routes[$url];
} else {
    http_response_code(404);
    echo json_encode(["status" => "error", "message" => "Endpoint not found: " . $url]);
}