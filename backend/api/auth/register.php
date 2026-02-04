<?php
require_once __DIR__ . '/../../config/db.php';
$pdo = getDB();
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$stmt = $pdo->prepare("INSERT INTO users (email) VALUES ('test@example.com') RETURNING id");
$stmt->execute();
$row = $stmt->fetch(PDO::FETCH_ASSOC);
echo json_encode($row); // Should output {"id": some_number}
?>