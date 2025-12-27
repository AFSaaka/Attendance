<?php
// cron/daily_attendance_check.php
require_once __DIR__ . '/../../config/db.php';

try {
    // 1. Get all active enrollments for the current day
    // We only mark absent if no record exists for TODAY
    $today = date('Y-m-d');

    $sql = "INSERT INTO public.attendance_records (user_id, enrollment_id, attendance_date, status, synced)
            SELECT 
                e.user_id, 
                e.id as enrollment_id, 
                :today as attendance_date, 
                'absent' as status,
                TRUE as synced
            FROM public.enrollments e
            WHERE e.status = 'active'
            AND NOT EXISTS (
                SELECT 1 FROM public.attendance_records ar 
                WHERE ar.user_id = e.user_id 
                AND ar.attendance_date = :today
            )
            ON CONFLICT (user_id, enrollment_id, attendance_date) DO NOTHING";

    $stmt = $pdo->prepare($sql);
    $stmt->execute(['today' => $today]);

    echo "Daily cleanup complete. Records processed.";

} catch (Exception $e) {
    error_log("Cron Error: " . $e->getMessage());
}