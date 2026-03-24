<?php
// cron/daily_attendance_check.php
// Marks absent for all enrolled students who haven't submitted attendance today
require_once __DIR__ . '/../../config/db.php';

date_default_timezone_set('Africa/Accra');

try {
    $pdo = getDB();
    $today = date('Y-m-d');

    // Get active session
    $session_id = $pdo->query(
        "SELECT id FROM public.academic_sessions WHERE is_current = true LIMIT 1"
    )->fetchColumn();

    if (!$session_id) {
        echo "No active session found. Skipping.";
        exit;
    }

    // Insert absent records for students with no attendance today
    // Uses the correct tables: student_enrollments + users
    $sql = "
        INSERT INTO public.attendance_records (
            user_id, enrollment_id, session_id, community_id,
            attendance_date, status, synced, week_number, day_number
        )
        SELECT
            u.id AS user_id,
            se.id AS enrollment_id,
            se.session_id,
            se.community_id,
            :today AS attendance_date,
            'absent' AS status,
            TRUE AS synced,
            FLOOR(
                EXTRACT(DAY FROM (:today::date - c.start_date)) / 7
            ) + 1 AS week_number,
            MOD(
                EXTRACT(DAY FROM (:today::date - c.start_date))::int, 7
            ) + 1 AS day_number
        FROM public.student_enrollments se
        JOIN public.users u ON u.student_id = se.registry_id
        JOIN public.communities c ON c.id = se.community_id
        WHERE se.session_id = :session_id
          AND u.is_active = true
          AND c.start_date <= :today::date
          AND c.start_date + (c.duration_weeks * 7 * INTERVAL '1 day') >= :today::date
          AND NOT EXISTS (
              SELECT 1 FROM public.attendance_records ar
              WHERE ar.user_id = u.id
              AND ar.attendance_date = :today::date
          )
        ON CONFLICT (user_id, attendance_date) DO NOTHING
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        'today'      => $today,
        'session_id' => $session_id,
    ]);

    $count = $stmt->rowCount();
    echo "Daily absent check complete. $count absent records inserted for $today.";

} catch (Exception $e) {
    error_log("Cron Error: " . $e->getMessage());
    echo "Error: " . $e->getMessage();
}