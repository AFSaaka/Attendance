<?php
// Database configuration for Neon
$host = 'ep-muddy-dawn-ahbbz7rf-pooler.c-3.us-east-1.aws.neon.tech';
$db   = 'neondb';
$user = 'neondb_owner';
$pass = 'npg_4UFNwloJA7ha'; // Note: In production, use environment variables!
$port = "5432";

// Neon requires SSL. The 'sslmode=require' part is critical.
$dsn = "pgsql:host=$host;port=$port;dbname=$db;sslmode=require";

try {
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ];
    
    $pdo = new PDO($dsn, $user, $pass, $options);
    
    echo "<h1>Connection Successful!</h1>";
    echo "Successfully connected to Neon PostgreSQL.";
    
} catch (PDOException $e) {
    echo "<h1>Connection Failed</h1>";
    echo "Error message: " . $e->getMessage();
}
?>