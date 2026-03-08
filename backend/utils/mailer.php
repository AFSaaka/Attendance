<?php
// backend/utils/mailer.php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../vendor/autoload.php';

/**
 * SendGrid Web API Helper
 */
function sendViaSendGridAPI($recipientEmail, $recipientName, $subject, $htmlContent, $plainText) {
    // 1. GET SETTINGS (Matching your db.php flow)
    try {
        $env = loadEnv(); // This function handles Production vs Local .env
        $apiKey = $env['SMTP_PASS'] ?? null;
        $fromEmail = $env['SMTP_FROM'] ?? 'no-reply@uds.edu.gh';
    } catch (Exception $e) {
        error_log("Mailer Config Error: " . $e->getMessage());
        return false;
    }

    if (!$apiKey) {
        error_log("SendGrid Error: API Key is missing.");
        return false;
    }

    $url = 'https://api.sendgrid.com/v3/mail/send';
    
    $data = [
        "personalizations" => [[
            "to" => [["email" => $recipientEmail, "name" => $recipientName]],
            "subject" => $subject
        ]],
        "from" => ["email" => $fromEmail, "name" => "UDS TTFPP Portal"],
        "content" => [
            ["type" => "text/plain", "value" => $plainText],
            ["type" => "text/html", "value" => $htmlContent]
        ]
    ];

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $apiKey,
        'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    
    // ENVIRONMENT-AWARE SSL: Disable verification only in local development
    // Production (DATABASE_URL set) uses default SSL verification for security
    // Local dev (no DATABASE_URL) may need verification disabled due to CA bundle issues
    if (!getenv('DATABASE_URL')) {
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    }
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    if ($httpCode >= 200 && $httpCode < 300) {
        return true;
    } else {
        error_log("SendGrid API Error ($httpCode): " . $response);
        return false;
    }
}

/**
 * Sends OTP to students for registration
 */
function sendOTPEmail($recipientEmail, $otpCode) {
    $subject = "UDS TTFPP - Account Verification Code";
    $plainText = "Your verification code is: $otpCode";
    $htmlContent = "
        <div style='font-family: sans-serif; max-width: 500px; border: 1px solid #ddd; padding: 20px; border-radius: 10px;'>
            <h2 style='color: #198104; text-align: center;'>Account Verification</h2>
            <p> Hello Student,</p>
            <p>To complete your account claim, please use the code below:</p>
            <div style='background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 10px; color: #0c0481;'>$otpCode</div>
            <p style='font-size: 12px; color: #888;'> This code expires in 1 hour.</p>
            <hr style='border: 0; border-top: 1px solid #f1f5f9; margin: 10px 0;'>
            <p style='font-size: 12px; color: #94a3b8; text-align: center;'>
                University for Development Studies - TTFPP
            </p>
        </div>";

    return sendViaSendGridAPI($recipientEmail, "Student", $subject, $htmlContent, $plainText);
}

/**
 * Sends invitation to new admins
 */
function sendAdminInviteEmail($recipientEmail, $userName, $otpCode) {
    $subject = "UDS TTFPP - Administrative Access Invitation";
    $plainText = "Hello $userName, your admin access code is: $otpCode";
    $htmlContent = "
        <div style='font-family: sans-serif; max-width: 550px; border: 1px solid #e2e8f0; padding: 30px; border-radius: 12px; color: #1e293b;'>
            <h2 style='color: #198104;'>Administrative Access</h2>
            <p>Hello <strong>$userName</strong>,</p>
            <p>You have been granted administrative access. Use the code below:</p>
            <div style='background: #f8fafc; border: 2px dashed #cbd5e1; padding: 25px; text-align: center; font-size: 36px; font-weight: bold; color: #1e40af;'>$otpCode</div>
            <p>This code is valid for 48 hours.</p>
            <hr style='border: 0; border-top: 1px solid #f1f5f9; margin: 10px 0;'>
            <p style='font-size: 12px; color: #94a3b8; text-align: center;'>
                University for Development Studies - TTFPP
            </p>
        </div>";

    return sendViaSendGridAPI($recipientEmail, $userName, $subject, $htmlContent, $plainText);
}