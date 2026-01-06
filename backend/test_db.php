<?php
// backend/test_db.php
require_once 'config/db.php';

header('Content-Type: application/json');

try {
    $db = getDB();
    
    // Test 1: Connection
    if ($db) {
        $response['connection'] = "SUCCESS: Connected to Railway Postgres!";
    }

    // Test 2: Table Check
    $stmt = $db->query("SELECT count(*) FROM public.users");
    $userCount = $stmt->fetchColumn();
    $response['user_table'] = "SUCCESS: Found $userCount users in the database.";

    // Test 3: Specific Admin Check
    $stmt = $db->prepare("SELECT email FROM public.users WHERE email = ?");
    $stmt->execute(['admin@uds.edu.gh']);
    $admin = $stmt->fetch();
    
    $response['admin_check'] = $admin 
        ? "SUCCESS: Admin account 'admin@uds.edu.gh' is present." 
        : "WARNING: Connection worked, but Admin account is missing!";

} catch (Exception $e) {
    http_response_code(500);
    $response['error'] = "FAILURE: " . $e->getMessage();
}

echo json_encode($response, JSON_PRETTY_PRINT);