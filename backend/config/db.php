<?php
// backend/config/db.php

function getDB()
{
    $path = __DIR__ . '/../.env';
    if (!file_exists($path)) {
        throw new Exception("Environment file (.env) not found at: " . $path);
    }

    $env = parse_ini_file($path);

    // Check if variables exist in .env
    if (!$env || !isset($env['DB_HOST'])) {
        throw new Exception("Invalid .env file format.");
    }

    $dsn = "pgsql:host={$env['DB_HOST']};port={$env['DB_PORT']};dbname={$env['DB_NAME']}";

    return new PDO($dsn, $env['DB_USER'], $env['DB_PASS'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
}