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
    // Scope to active session so records from previous sessions
    // on the same calendar date don't falsely show as signed
    $sql = "SELECT ar.id 
            FROM public.attendance_records ar
            JOIN public.student_enrollments se ON ar.enrollment_id = se.id
            JOIN public.academic_sessions asess ON se.session_id = asess.id
            WHERE ar.user_id = :uid 
            AND ar.attendance_date = CURRENT_DATE
            AND asess.is_current = true
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