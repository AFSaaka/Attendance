<?php
// backend/utils/mailer.php
require_once __DIR__ . '/../config/db.php';

function sendViaResend($recipientEmail, $recipientName, $subject, $htmlContent, $plainText) {
    try {
        $env       = loadEnv();
        $apiKey    = $env['RESEND_API_KEY'] ?? getenv('RESEND_API_KEY') ?? null;
        $fromEmail = $env['SMTP_FROM']      ?? getenv('SMTP_FROM')      ?? 'onboarding@resend.dev';
    } catch (Exception $e) {
        error_log("Mailer Config Error: " . $e->getMessage());
        return false;
    }

    if (!$apiKey) {
        error_log("Resend Error: RESEND_API_KEY is missing.");
        return false;
    }

    $data = [
        "from"    => "UDS TTFPP Portal <{$fromEmail}>",
        "to"      => [$recipientEmail],
        "subject" => $subject,
        "html"    => $htmlContent,
        "text"    => $plainText,
    ];

    $ch = curl_init('https://api.resend.com/emails');
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $apiKey,
        'Content-Type: application/json',
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);

    if (!getenv('DATABASE_URL')) {
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    }

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
   

    if ($httpCode >= 200 && $httpCode < 300) {
        return true;
    }

    error_log("Resend API Error ($httpCode): " . $response);
    return false;
}

function sendOTPEmail($recipientEmail, $otpCode) {
    $subject   = "UDS TTFPP - Account Verification Code";
    $plainText = "Your verification code is: $otpCode. It expires in 15 minutes.";
    $htmlContent = "
        <div style='font-family: sans-serif; max-width: 500px; border: 1px solid #ddd; padding: 20px; border-radius: 10px;'>
            <h2 style='color: #198104; text-align: center;'>Account Verification</h2>
            <p>Hello Student,</p>
            <p>To complete your account claim, please use the code below:</p>
            <div style='background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 10px; color: #0c0481;'>$otpCode</div>
            <p style='font-size: 12px; color: #888;'>This code expires in 15 minutes.</p>
            <hr style='border: 0; border-top: 1px solid #f1f5f9; margin: 10px 0;'>
            <p style='font-size: 12px; color: #94a3b8; text-align: center;'>
                University for Development Studies - TTFPP
            </p>
        </div>";

    return sendViaResend($recipientEmail, "Student", $subject, $htmlContent, $plainText);
}

function sendAdminInviteEmail($recipientEmail, $userName, $otpCode) {
    $subject   = "UDS TTFPP - Administrative Access Invitation";
    $plainText = "Hello $userName, your admin access code is: $otpCode. Valid for 48 hours.";
    $htmlContent = "
        <div style='font-family: sans-serif; max-width: 550px; border: 1px solid #e2e8f0; padding: 30px; border-radius: 12px; color: #1e293b;'>
            <h2 style='color: #198104;'>Administrative Access</h2>
            <p>Hello <strong>$userName</strong>,</p>
            <p>You have been granted administrative access to the UDS TTFPP Portal. Use the code below to complete your setup:</p>
            <div style='background: #f8fafc; border: 2px dashed #cbd5e1; padding: 25px; text-align: center; font-size: 36px; font-weight: bold; color: #1e40af;'>$otpCode</div>
            <p>This code is valid for 48 hours.</p>
            <hr style='border: 0; border-top: 1px solid #f1f5f9; margin: 10px 0;'>
            <p style='font-size: 12px; color: #94a3b8; text-align: center;'>
                University for Development Studies - TTFPP
            </p>
        </div>";

    return sendViaResend($recipientEmail, $userName, $subject, $htmlContent, $plainText);
}