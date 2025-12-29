<?php
// backend/api/common_auth.php

// 1. Remove ob_start and CORS headers (index.php already did this!)

// 2. Strict Session Security
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.cookie_httponly', 1);
    ini_set('session.use_only_cookies', 1);
    ini_set('session.cookie_samesite', 'Lax');

    session_start([
        'cookie_lifetime' => 86400,
        'cookie_secure' => false, // Set to true only for HTTPS production
    ]);
}

// 3. Global Database Connection
require_once __DIR__ . '/../config/db.php';
$pdo = getDB();

// 4. Set global userId for use in endpoints like me.php and audit-summary.php
$userId = $_SESSION['user_id'] ?? null;
$currentUser = null; // Initialize global user object

if ($userId) {
    // Fetch the full user record so we know their admin_level and role
    $authStmt = $pdo->prepare("SELECT id, user_name, email, role, admin_level FROM public.users WHERE id = ?");
    $authStmt->execute([$userId]);
    $currentUser = $authStmt->fetch(PDO::FETCH_ASSOC);
}

function requireLogin() {
    global $currentUser; 
    if (!$currentUser) {
        http_response_code(401);
        echo json_encode(["status" => "error", "message" => "Unauthorized access."]);
        exit;
    }
}

// Optional: Add a specific check for Super Admins
function requireSuperAdmin() {
    global $currentUser;
    requireLogin();
    if (($currentUser['admin_level'] ?? '') !== 'super_admin') {
        http_response_code(403);
        echo json_encode(["status" => "error", "message" => "Super Admin privileges required."]);
        exit;
    }
}