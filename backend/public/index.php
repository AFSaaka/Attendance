<?php
// backend/public/index.php

// 1. Force headers to be sent immediately
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed_origins = [
    "http://localhost:5173",
    "http://localhost:4173",
    "https://attendance-git-dev-af-saakas-projects.vercel.app",
    "https://attendance-production-71f3.up.railway.app",
    "https://attendance-af-saakas-projects.vercel.app"
];

if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
}
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS, DELETE, PUT");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Origin, Accept");

// 2. Handle Preflight and EXIT so no other code runs
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// 3. Now enable error reporting for debugging the rest of the script
ini_set('display_errors', 1);
error_reporting(E_ALL);

// ... rest of your routing and require_once logic ...

header("Content-Type: application/json");

// 5. Extract the URL (Handle the Railway routing properly)
$url = isset($_GET['url']) ? rtrim($_GET['url'], '/') : '';

// 6. Routing Table
$routes = [
    'auth/login' => '../api/auth/login.php',
    'auth/register' => '../api/auth/register.php',
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
    'student/get_placement' => '../api/student/get_placement.php',
    'student/submit_attendance' => '../api/student/submit_attendance.php',
    'student/check_daily_status' => '../api/student/check_daily_status.php',
    'student/sync_attendance' => '../api/student/sync_attendance.php',
    'attendance/sync' => '../api/attendance/sync.php',
    'auth/me' => '../api/auth/me.php',
];

if (array_key_exists($url, $routes)) {
    // SECURITY CHECK: Ensure the file exists before requiring it
    $filePath = realpath(__DIR__ . DIRECTORY_SEPARATOR . $routes[$url]);
    if ($filePath && file_exists($filePath)) {
        require_once $filePath;
    } else {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "API file missing: " . $url]);
    }
} else {
    http_response_code(404);
    echo json_encode(["status" => "error", "message" => "Endpoint not found: " . $url]);
}