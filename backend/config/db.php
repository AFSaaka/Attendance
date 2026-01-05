<?php
// backend/config/db.php

function getDB()
{
    // 1. Try to get the Railway-provided DATABASE_URL first
    $databaseUrl = getenv('DATABASE_URL');

    if ($databaseUrl) {
        // Parse the Railway connection string
        $dbopts = parse_url($databaseUrl);
        $dsn = "pgsql:host={$dbopts['host']};port={$dbopts['port']};dbname=" . ltrim($dbopts['path'], '/');
        $user = $dbopts['user'];
        $pass = $dbopts['pass'];
    } else {
        // 2. Fallback to local .env for development
        $path = __DIR__ . '/../.env';
        if (!file_exists($path)) {
            throw new Exception("No database configuration found (DATABASE_URL or .env).");
        }
        $env = parse_ini_file($path);
        $dsn = "pgsql:host={$env['DB_HOST']};port={$env['DB_PORT']};dbname={$env['DB_NAME']}";
        $user = $env['DB_USER'];
        $pass = $env['DB_PASS'];
    }

    return new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
}