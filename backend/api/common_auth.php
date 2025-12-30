<?php
// backend/api/common_auth.php

/**
 * 1. SESSION SECURITY (THE LOCK ON THE FRONT DOOR)
 * We set these before starting the session to tell the browser:
 * "Only the website can touch these cookies, not malicious scripts."
 */
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.cookie_httponly', 1); // Prevents JavaScript from stealing the session ID
    ini_set('session.use_only_cookies', 1); // Forces the browser to only use cookies (safer)
    ini_set('session.cookie_samesite', 'Lax'); // Protects against some types of "fake request" attacks

    session_start([
        'cookie_lifetime' => 86400, // Stay logged in for 24 hours
        'cookie_secure'   => false,  // IMPORTANT: Set to TRUE once you have an SSL certificate (HTTPS)
    ]);
}

/**
 * 2. DATABASE CONNECTION
 * We connect to the database here so every page that uses this file 
 * can immediately talk to the database without reconnecting.
 */
require_once __DIR__ . '/../config/db.php';
$pdo = getDB();

/**
 * 3. IDENTIFYING THE USER
 * We check if the browser has a "user_id" saved in its session.
 */
$userId = $_SESSION['user_id'] ?? null;
$currentUser = null; 

if ($userId) {
    // We look up the user in the database to make sure they still exist and are active
    $authStmt = $pdo->prepare("
        SELECT id, user_name, email, role, admin_level, is_active 
        FROM public.users 
        WHERE id = ?
    ");
    $authStmt->execute([$userId]);
    $userRow = $authStmt->fetch(PDO::FETCH_ASSOC);

    // SECURITY UPGRADE: Only mark them as 'currentUser' if their account is ACTIVE
    if ($userRow && $userRow['is_active'] === true) {
        $currentUser = $userRow;
    } else {
        // If the account was deactivated while they were logged in, kick them out
        session_destroy();
        $currentUser = null;
    }
}

/**
 * 4. GUARD FUNCTIONS (THE SECURITY GUARDS)
 * Use these at the top of other files to block people who shouldn't be there.
 */

// Function to block anyone not logged in
function requireLogin() {
    global $currentUser; 
    if (!$currentUser) {
        http_response_code(401); // 401 means "I don't know who you are"
        echo json_encode(["status" => "error", "message" => "Please log in to continue."]);
        exit;
    }
}

// Function to block anyone who isn't a Super Admin
function requireSuperAdmin() {
    global $currentUser;
    requireLogin(); // First, check if they are even logged in
    
    if (($currentUser['admin_level'] ?? '') !== 'super_admin') {
        http_response_code(403); // 403 means "I know who you are, but you aren't allowed here"
        echo json_encode(["status" => "error", "message" => "Only Super Admins can do this."]);
        exit;
    }
}

// Function to block anyone who isn't an Admin OR a Super Admin
function requireAdmin() {
    global $currentUser;
    requireLogin();
    
    // Check if the user is either a coordinator, admin, or super_admin
    $allowedRoles = ['admin', 'coordinator'];
    if (!in_array($currentUser['role'], $allowedRoles) && ($currentUser['admin_level'] ?? '') !== 'super_admin') {
        http_response_code(403);
        echo json_encode(["status" => "error", "message" => "Admin access required."]);
        exit;
    }
}

// Function to block anyone who isn't a Student
function requireStudent() {
    global $currentUser;
    requireLogin(); // First, make sure they are logged in at all
    
    // Check if the role is specifically 'student'
    if (($currentUser['role'] ?? '') !== 'student') {
        http_response_code(403); // Forbidden
        echo json_encode([
            "status" => "error", 
            "message" => "This area is only for students."
        ]);
        exit;
    }
}