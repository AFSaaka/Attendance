<?php
// backend/config/db.php

function getDB()
{
    // PASTE YOUR ACTUAL CONNECTION STRING HERE TEMPORARILY
    // It looks like: postgres://postgres:password@host:port/railway
    $databaseUrl = "YOUR_ACTUAL_CONNECTION_STRING_FROM_RAILWAY_DASHBOARD";

    if ($databaseUrl) {
        $dbopts = parse_url($databaseUrl);
        $dsn = sprintf(
            "pgsql:host=%s;port=%d;dbname=%s;sslmode=require",
            $dbopts['host'],
            $dbopts['port'],
            ltrim($dbopts['path'], '/')
        );
        $user = $dbopts['user'];
        $pass = $dbopts['pass'];

        return new PDO($dsn, $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }
    
    throw new Exception("Static DATABASE_URL is empty.");
}