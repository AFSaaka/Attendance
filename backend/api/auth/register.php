<?php
// backend/api/auth/register.php
require_once __DIR__ . '/../../config/db.php';

$pdo = getDB();
$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    echo json_encode(["status" => "error", "message" => "No data received"]);
    exit;
}

$uin = $data['uin'] ?? '';
$indexNumber = $data['indexNumber'] ?? '';
$email = $data['email'] ?? '';
$password = $data['password'] ?? '';

try {
    $pdo->beginTransaction(); // Start transaction

    // 1. Verify and lock the registry row
    $stmt = $pdo->prepare("
        SELECT id, full_name, is_claimed 
        FROM student_registry 
        WHERE uin = ? AND index_number = ? 
        FOR UPDATE
    ");
    $stmt->execute([$uin, $indexNumber]);
    $student = $stmt->fetch();

    if (!$student) {
        throw new Exception("Student not found in registry.");
    }
    if ($student['is_claimed']) {
        throw new Exception("This account has already been claimed.");
    }

    // 2. Create the User (matching your UUID/password_hash schema)
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
    $insertUser = $pdo->prepare("
        INSERT INTO users (email, password_hash, role, uin, student_id, is_active) 
        VALUES (?, ?, 'student', ?, ?, TRUE)
    ");
    $insertUser->execute([$email, $hashedPassword, $uin, $student['id']]);

    // 3. Mark as claimed in registry
    $updateRegistry = $pdo->prepare("UPDATE student_registry SET is_claimed = TRUE WHERE id = ?");
    $updateRegistry->execute([$student['id']]);

    $pdo->commit(); // Save everything

    echo json_encode([
        "status" => "success",
        "message" => "Account claimed successfully! Welcome, " . $student['full_name']
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction())
        $pdo->rollBack();
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}