<?php
// backend/utils/mailer.php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../config/db.php'; // Access your loadEnv() function

function sendOTPEmail($recipientEmail, $otpCode)
{
    try {
        // Load configurations from .env
        $env = loadEnv();

        $mail = new PHPMailer(true);

        // SMTP Server Settings
        $mail->isSMTP();
        $mail->Host = $env['SMTP_HOST'];
        $mail->SMTPAuth = true;
        $mail->Username = $env['SMTP_USER'];
        $mail->Password = $env['SMTP_PASS'];
        $mail->Port = $env['SMTP_PORT'];

        // Security logic: use SMTPS for port 465, STARTTLS for 587
        $mail->SMTPSecure = ($env['SMTP_PORT'] == 465)
            ? PHPMailer::ENCRYPTION_SMTPS
            : PHPMailer::ENCRYPTION_STARTTLS;

        // Performance: Set a timeout (don't let the script hang if the server is down)
        $mail->Timeout = 10;

        // Recipients
        $mail->setFrom($env['SMTP_FROM'] ?? 'no-reply@uds.edu.gh', 'UDS TTFPP Portal');
        $mail->addAddress($recipientEmail);

        // Content
        $mail->isHTML(true);
        $mail->Subject = 'UDS TTFPP - Account Verification Code';

        // Professional HTML body
        $mail->Body = "
            <div style='font-family: sans-serif; max-width: 500px; border: 1px solid #ddd; padding: 20px; border-radius: 10px;'>
                <h2 style='color: #198104; text-align: center;'>Account Verification</h2>
                <p>Hello Student,</p>
                <p>To complete your account claim, please enter the following 6-digit code in the portal:</p>
                <div style='background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 10px; color: #0c0481; border-radius: 5px; margin: 20px 0;'>
                    $otpCode
                </div>
                <p style='font-size: 12px; color: #888;'>This code will expire in 15 minutes.</p>
                <hr style='border: 0; border-top: 1px solid #eee;' />
                <p style='font-size: 11px; text-align: center; color: #aaa;'>University for Development Studies - TTFPP</p>
            </div>
        ";

        // Plain text version for better email deliverability (prevents Spam flags)
        $mail->AltBody = "Your UDS verification code is: $otpCode. It expires in 15 minutes.";

        $mail->send();
        return true;
    } catch (Exception $e) {
        // Log error to PHP error log instead of showing to user
        error_log("Mailer Error: " . $e->getMessage());
        return false;
    }
}