<?php
// backend/config/db.php

function getDB()
{
    // Check all possible places Railway stores environment variables
    $databaseUrl = getenv('DATABASE_URL') ?: ($_ENV['DATABASE_URL'] ?? ($_SERVER['DATABASE_URL'] ?? null));

    if ($databaseUrl) {
        $dbopts = parse_url($databaseUrl);
        
        // Build DSN with SSL forced for Railway
        $dsn = sprintf(
            "pgsql:host=%s;port=%d;dbname=%s;sslmode=require",
            $dbopts['host'],
            $dbopts['port'],
            ltrim($dbopts['path'], '/')
        );
        
        $user = $dbopts['user'];
        $pass = $dbopts['pass'];
    } else {
        // Fallback to local .env
        $path = __DIR__ . '/../.env';
        if (file_exists($path)) {
            $env = parse_ini_file($path);
            $dsn = "pgsql:host={$env['DB_HOST']};port={$env['DB_PORT']};dbname={$env['DB_NAME']}";
            $user = $env['DB_USER'];
            $pass = $env['DB_PASS'];
        } else {
            // This is what you are seeing now
            throw new Exception("DATABASE_URL not found in getenv, \$_ENV, or \$_SERVER.");
        }
    }

    return new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
}