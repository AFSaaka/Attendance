<?php
// backend/config/db.php

function loadEnv()
{
    static $env = null;
    if ($env === null) {
        $path = __DIR__ . '/../.env';
        if (!file_exists($path)) {
            throw new Exception("Environment file (.env) not found.");
        }
        $env = parse_ini_file($path);
    }
    return $env;
}

function getDB()
{
    $env = loadEnv();
    $dsn = "pgsql:host={$env['DB_HOST']};port={$env['DB_PORT']};dbname={$env['DB_NAME']}";

    return new PDO($dsn, $env['DB_USER'], $env['DB_PASS'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false, // Better security for PostgreSQL
    ]);
}