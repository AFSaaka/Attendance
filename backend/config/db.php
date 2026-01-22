<?php
// backend/config/db.php

function getDB()
{
    // 1. Try to get the single DATABASE_URL from Render/Neon
    $dbUrl = getenv('DATABASE_URL');

    if ($dbUrl) {
        // PRODUCTION MODE (Render)
        try {
            $parsedUrl = parse_url($dbUrl);
            $host = $parsedUrl['host'];
            $port = $parsedUrl['port'] ?? 5432;
            $user = $parsedUrl['user'];
            $pass = $parsedUrl['pass'];
            $dbname = ltrim($parsedUrl['path'], '/');

            $dsn = "pgsql:host=$host;port=$port;dbname=$dbname;sslmode=require";
            return new PDO($dsn, $user, $pass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        } catch (Exception $e) {
            throw new Exception("Production DB Connection Error: " . $e->getMessage());
        }
    } else {
        // LOCAL DEVELOPMENT MODE (Windows)
        $path = __DIR__ . '/../.env';
        if (!file_exists($path)) {
            throw new Exception("Environment configuration not found (No DATABASE_URL or .env file).");
        }
        
        $env = parse_ini_file($path);
        $dsn = "pgsql:host={$env['DB_HOST']};port={$env['DB_PORT']};dbname={$env['DB_NAME']}";

        return new PDO($dsn, $env['DB_USER'], $env['DB_PASS'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }
}