<?php
// api/student/check_daily_status.php
header("Content-Type: application/json");

// 1. Load the helper - this starts the session and connects to the DB
require_once __DIR__ . '/../common_auth.php';

// 2. Use the guard function - if not a student, it kills the script here
requireStudent();

// 3. Set timezone for Ghana
date_default_timezone_set('Africa/Accra');

try {
    /** * We use $currentUser['id'] which was safely populated by common_auth.php.
     * We no longer need $_GET['user_id'], which makes the script un-hackable by ID swapping.
     */
    $sql = "SELECT id FROM public.attendance_records 
            WHERE user_id = :uid 
            AND attendance_date = CURRENT_DATE 
            LIMIT 1";

    $stmt = $pdo->prepare($sql);
    $stmt->execute(['uid' => $currentUser['id']]);
    $record = $stmt->fetch();

    echo json_encode([
        "signed" => !!$record, 
        "server_date" => date("Y-m-d"),
        "status" => "success"
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["signed" => false, "error" => "Database check failed"]);
}