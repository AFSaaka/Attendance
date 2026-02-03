<?php
// backend/api/auth/register.php - ATOMIC DEBUG VERSION
header('Content-Type: application/json');
require_once __DIR__ . '/../../config/db.php'; 
require_once __DIR__ . '/../../utils/mailer.php';

$pdo = getDB();
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$data = json_decode(file_get_contents('php://input'), true);
$uin = trim($data['uin'] ?? 'DEBUG_UIN'); // Use test data if empty
$email = trim($data['email'] ?? 'debug@test.com');

try {
    // TEST 1: Outside Transaction
    echo "Check 1: Registry Query... ";
    $stmt = $pdo->prepare("SELECT id FROM public.student_registry LIMIT 1");
    $stmt->execute();
    echo "Success.\n";

    // TEST 2: Start Transaction
    echo "Check 2: Begin Transaction... ";
    $pdo->beginTransaction();
    echo "Success.\n";

    // TEST 3: The Write (This is where it likely fails)
    echo "Check 3: Simple Insert... ";
    $sql = "INSERT INTO public.users (email, password_hash, role, uin, is_active) VALUES (?, 'hash', 'student', ?, TRUE) RETURNING id";
    $insert = $pdo->prepare($sql);
    $insert->execute([$email . time(), $uin . time()]);
    $newId = $insert->fetchColumn();
    echo "Success. New ID: $newId\n";

    // TEST 4: Commit
    echo "Check 4: Committing... ";
    $pdo->commit();
    echo "Success.\n";

} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo "\n!!! REAL ERROR DETECTED !!!\n";
    echo "Message: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . " on line " . $e->getLine() . "\n";
    exit;
}