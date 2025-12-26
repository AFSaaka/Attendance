<?php
// api/student/check_daily_status.php
header("Content-Type: application/json");
require_once "../../config/db.php";
require_once __DIR__ . '/../common_auth.php';

// We assume the user_id is passed as a query parameter or from a session
$user_id = $_GET['user_id'] ?? null;

if (!$user_id) {
    echo json_encode(["signed" => false, "message" => "No user ID provided"]);
    exit;
}

try {
    // Check for any 'present' record for THIS user on THIS day
    $sql = "SELECT id FROM public.attendance_records 
            WHERE user_id = :uid 
            AND attendance_date = CURRENT_DATE 
            LIMIT 1";

    $stmt = $pdo->prepare($sql);
    $stmt->execute(['uid' => $user_id]);
    $record = $stmt->fetch();

    echo json_encode([
        "signed" => !!$record, // returns true if record exists, false otherwise
        "server_date" => date("Y-m-d")
    ]);

} catch (PDOException $e) {
    echo json_encode(["signed" => false, "error" => $e->getMessage()]);
}