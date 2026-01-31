<?php
// backend/config/db.php

/**
 * Returns an associative array of configuration variables.
 * Prioritizes System Env (Production) then .env file (Local).
 */
function loadEnv() {
    $dbUrl = getenv('DATABASE_URL');
    
    if ($dbUrl) {
        // PRODUCTION: Pull from System Environment
        return [
            'DATABASE_URL' => $dbUrl,
            'SMTP_HOST'    => getenv('SMTP_HOST'),
            'SMTP_USER'    => getenv('SMTP_USER'),
            'SMTP_PASS'    => getenv('SMTP_PASS'),
            'SMTP_PORT'    => getenv('SMTP_PORT'),
            'SMTP_FROM'    => getenv('SMTP_FROM')
        ];
    }

    // LOCAL: Pull from .env file
    $path = __DIR__ . '/../.env';
    if (!file_exists($path)) {
        throw new Exception("Environment configuration not found (.env file missing).");
    }
    return parse_ini_file($path);
}

function getDB() {
    $env = loadEnv();

    if (!empty($env['DATABASE_URL'])) {
        // PRODUCTION MODE (Render/Neon)
        try {
            $parsedUrl = parse_url($env['DATABASE_URL']);
            $host   = $parsedUrl['host'];
            $port   = $parsedUrl['port'] ?? 5432;
            $user   = $parsedUrl['user'];
            $pass   = $parsedUrl['pass'];
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
        $dsn = "pgsql:host={$env['DB_HOST']};port={$env['DB_PORT']};dbname={$env['DB_NAME']}";
        return new PDO($dsn, $env['DB_USER'], $env['DB_PASS'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }
}