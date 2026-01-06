<?php
// backend/config/db.php

function getDB()
{
    // 1. Try to get the Railway-provided DATABASE_URL first
    $databaseUrl = getenv('DATABASE_URL');

    if ($databaseUrl) {
        // Parse the Railway connection string
        $dbopts = parse_url($databaseUrl);
        
        // ADDED: sslmode=require is mandatory for Railway external connections
        $dsn = sprintf(
            "pgsql:host=%s;port=%d;dbname=%s;sslmode=require",
            $dbopts['host'],
            $dbopts['port'],
            ltrim($dbopts['path'], '/')
        );
        $user = $dbopts['user'];
        $pass = $dbopts['pass'];
    } else {
        // 2. Fallback to local .env for development
        $path = __DIR__ . '/../.env';
        if (!file_exists($path)) {
            throw new Exception("No database configuration found (DATABASE_URL or .env).");
        }
        
        // Note: parse_ini_file works well for simple .env files
        $env = parse_ini_file($path);
        
        // Local usually doesn't need SSL, but we keep the format clean
        $dsn = "pgsql:host={$env['DB_HOST']};port={$env['DB_PORT']};dbname={$env['DB_NAME']}";
        $user = $env['DB_USER'];
        $pass = $env['DB_PASS'];
    }

    try {
        return new PDO($dsn, $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            // ADDED: Force UTF8 encoding
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8" 
        ]);
    } catch (PDOException $e) {
        // Useful for debugging frustration: show exactly why it failed
        throw new Exception("Database Connection Failed: " . $e->getMessage());
    }
}