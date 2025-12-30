<?php
// backend/api/admin/get-students.php

// 1. Load the database and our security guards
require_once __DIR__ . '/../common_auth.php';

/**
 * SECURITY CHECK:
 * This ensures ONLY logged-in staff (admins or coordinators) can see this list.
 * If a student or a hacker tries to load this, the function stops them immediately.
 */
requireAdmin();

try {
    /**
     * 2. SMART SESSION FINDER
     * Just like the upload script, we first look for the session marked 'is_current'.
     * This ensures the dashboard always shows the "Active" school year.
     */
    $session_id = $pdo->query("
        SELECT id FROM public.academic_sessions 
        WHERE is_current = true 
        LIMIT 1
    ")->fetchColumn();

    // Fallback: If no session is checked 'is_current', find the newest one by date.
    if (!$session_id) {
        $session_id = $pdo->query("
            SELECT id FROM public.academic_sessions 
            ORDER BY year_end DESC 
            LIMIT 1
        ")->fetchColumn();
    }

    // If there are zero sessions in the database, return an empty list [] so React doesn't crash.
    if (!$session_id) {
        header('Content-Type: application/json');
        echo json_encode([]);
        exit;
    }

    /**
     * 3. FETCHING THE STUDENT DATA
     * We use an INNER JOIN because we only want students who are 
     * actually enrolled in the active session we found above.
     */
    $stmt = $pdo->prepare("
        SELECT 
            sr.id, 
            sr.uin, 
            sr.index_number, 
            sr.full_name, 
            sr.is_claimed,
            se.program, 
            se.region, 
            se.district, 
            se.community, 
            se.level,
            u.email,
            u.is_active
        FROM public.student_registry sr
        INNER JOIN public.student_enrollments se ON sr.id = se.registry_id
        LEFT JOIN public.users u ON sr.id = u.student_id
        WHERE se.session_id = ? 
          AND sr.is_deleted = false  -- SAFETY: Hide students marked as deleted
        ORDER BY se.region ASC, sr.full_name ASC
    ");
    
    $stmt->execute([$session_id]);
    $students = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // 4. Send the final list back to your React dashboard
    header('Content-Type: application/json');
    echo json_encode($students);

} catch (Exception $e) {
    /**
     * 5. PRODUCTION ERROR HANDLING
     * We don't show the technical "SQL Error" to the user because it's a security risk.
     * We send a generic 500 status and a polite message.
     */
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "We had trouble loading the student list. Please contact the system administrator."
    ]);
}