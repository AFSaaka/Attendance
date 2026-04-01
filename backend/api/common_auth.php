<?php
// backend/api/common_auth.php

if (session_status() === PHP_SESSION_NONE) {
    $isProduction = getenv('DATABASE_URL') ? true : false;

    ini_set('session.cookie_httponly', 1);
    ini_set('session.use_only_cookies', 1);

    if ($isProduction) {
        ini_set('session.cookie_samesite', 'None');
        $secure = true;
    } else {
        ini_set('session.cookie_samesite', 'Lax');
        $secure = false;
    }

    // ✅ FIX: 90 days session lifetime (7,776,000 seconds)
    // This keeps students logged in for 3 months like WhatsApp/Telegram
    session_start([
        'cookie_lifetime' => 7776000,   // 90 days
        'gc_maxlifetime'  => 7776000,   // PHP garbage collection matches
        'cookie_secure'   => $secure,
        'cookie_path'     => '/',
    ]);

    require_once __DIR__ . '/../utils/validators.php';
    generate_csrf_token();
}

require_once __DIR__ . '/../config/db.php';
$pdo = getDB();

$userId      = $_SESSION['user_id'] ?? null;
$currentUser = null;

if ($userId) {
    $authStmt = $pdo->prepare("
        SELECT id, user_name, email, role, admin_level, is_active 
        FROM public.users 
        WHERE id = ?
    ");
    $authStmt->execute([$userId]);
    $userRow = $authStmt->fetch(PDO::FETCH_ASSOC);

    if ($userRow && $userRow['is_active'] === true) {
        $currentUser = $userRow;

        // ✅ FIX: Refresh session expiry on every request so active users never expire
        // Only refresh if more than 1 hour has passed since last activity
        if (!isset($_SESSION['last_activity']) || (time() - $_SESSION['last_activity']) > 3600) {
            $_SESSION['last_activity'] = time();
            // Touch the session to reset gc timer
            session_write_close();
            session_start([
                'cookie_lifetime' => 7776000,
                'gc_maxlifetime'  => 7776000,
                'cookie_secure'   => $secure ?? true,
                'cookie_path'     => '/',
            ]);
        }
    } else {
        session_destroy();
        $currentUser = null;
    }
}

function requireLogin() {
    global $currentUser;
    if (!$currentUser) {
        http_response_code(401);
        echo json_encode(["status" => "error", "message" => "Please log in to continue."]);
        exit;
    }
}

function requireSuperAdmin() {
    global $currentUser;
    requireLogin();
    if (($currentUser['admin_level'] ?? '') !== 'super_admin') {
        http_response_code(403);
        echo json_encode(["status" => "error", "message" => "Only Super Admins can do this."]);
        exit;
    }
}

function requireAdmin() {
    global $currentUser;
    requireLogin();
    $allowedRoles = ['admin', 'coordinator'];
    if (!in_array($currentUser['role'], $allowedRoles) && ($currentUser['admin_level'] ?? '') !== 'super_admin') {
        http_response_code(403);
        echo json_encode(["status" => "error", "message" => "Admin access required."]);
        exit;
    }
}

function requireStudent() {
    global $currentUser;
    requireLogin();
    if (($currentUser['role'] ?? '') !== 'student') {
        http_response_code(403);
        echo json_encode(["status" => "error", "message" => "This area is only for students."]);
        exit;
    }
}