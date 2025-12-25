<?php
// backend/api/auth/me.php
header("Access-Control-Allow-Origin: http://localhost:5173"); // Update with your React URL
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

// 1. Correct paths based on your structure
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../common_auth.php'; // Going up one level to find common_auth.php

/**
 * EXPERT NOTE: common_auth.php usually validates the session or JWT.
 * We assume it defines a variable like $userId or $decodedToken.
 */

if (!isset($userId) && isset($_SESSION['user_id'])) {
    $userId = $_SESSION['user_id'];
}

if (!$userId) {
    http_response_code(401);
    echo json_encode(["error" => "Authentication required"]);
    exit();
}

try {
    // 2. Optimized SQL Join using your specific columns
    $sql = "SELECT 
                u.id, u.email, u.role, u.is_email_verified,
                c.full_name, c.region, c.district, c.phone_number
            FROM public.users u
            JOIN public.coordinators c ON u.id = c.user_id
            WHERE u.id = :id AND u.is_active = true";

    $stmt = $pdo->prepare($sql);
    $stmt->execute(['id' => $userId]);
    $coordinator = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($coordinator) {
        // Remove any null values to keep React props clean
        echo json_encode(array_filter($coordinator));
    } else {
        http_response_code(404);
        echo json_encode(["error" => "Coordinator details not found"]);
    }

} catch (PDOException $e) {
    // Log the error internally, but don't show specific DB details to the user
    error_log("Database Error in me.php: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["error" => "Internal server error"]);
}
?>