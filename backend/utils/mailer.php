<?php
// backend/utils/mailer.php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../config/db.php'; 

/**
 * Internal helper to configure PHPMailer with SMTP settings.
 * Centralizing this ensures that changes to credentials only happen in one place.
 */
function getMailerInstance()
{
    $env = loadEnv();
    $mail = new PHPMailer(true);

    // SMTP Server Settings
    $mail->isSMTP();
    $mail->Host       = $env['SMTP_HOST'];
    $mail->SMTPAuth   = true;
    $mail->Username   = $env['SMTP_USER'];
    $mail->Password   = $env['SMTP_PASS'];
    $mail->Port       = $env['SMTP_PORT'];
    $mail->CharSet    = 'UTF-8';

    // Security logic: SMTPS (465) vs STARTTLS (587)
    $mail->SMTPSecure = ($env['SMTP_PORT'] == 465) 
        ? PHPMailer::ENCRYPTION_SMTPS 
        : PHPMailer::ENCRYPTION_STARTTLS;

    $mail->Timeout = 10;
    $mail->setFrom($env['SMTP_FROM'] ?? 'no-reply@uds.edu.gh', 'UDS TTFPP Portal');

    return $mail;
}

function sendOTPEmail($recipientEmail, $otpCode)
{
    try {
        $mail = getMailerInstance();
        $mail->addAddress($recipientEmail);

        $mail->isHTML(true);
        $mail->Subject = 'UDS TTFPP - Account Verification Code';
        $mail->Body    = "
            <div style='font-family: sans-serif; max-width: 500px; border: 1px solid #ddd; padding: 20px; border-radius: 10px;'>
                <h2 style='color: #198104; text-align: center;'>Account Verification</h2>
                <p>Hello Student,</p>
                <p>To complete your account claim, please enter the following 6-digit code in the portal:</p>
                <div style='background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 10px; color: #0c0481; border-radius: 5px; margin: 20px 0;'>
                    $otpCode
                </div>
                <p style='font-size: 12px; color: #888;'>This code will expire in 1 hour.</p>
                <hr style='border: 0; border-top: 1px solid #eee;' />
                <p style='font-size: 11px; text-align: center; color: #aaa;'>University for Development Studies - TTFPP</p>
            </div>
        ";
        $mail->AltBody = "Your UDS verification code is: $otpCode. It expires in 1 hour.";

        return $mail->send();
    } catch (Exception $e) {
        error_log("OTP Mailer Error: " . $e->getMessage());
        return false;
    }
}

function sendAdminInviteEmail($recipientEmail, $userName, $otpCode)
{
    try {
        $mail = getMailerInstance();
        $mail->addAddress($recipientEmail, $userName);

        $mail->isHTML(true);
        $mail->Subject = 'UDS TTFPP - Administrative Access Invitation';
        $mail->Body    = "
            <div style='font-family: sans-serif; max-width: 550px; border: 1px solid #e2e8f0; padding: 30px; border-radius: 12px; color: #1e293b; line-height: 1.5;'>
                <div style='text-align: center; margin-bottom: 20px;'>
                    <h2 style='color: #198104; margin-bottom: 5px;'>Administrative Access</h2>
                    <p style='color: #64748b; font-size: 14px;'>University for Development Studies</p>
                </div>
                <p>Hello <strong>$userName</strong>,</p>
                <p>You have been granted administrative access to the <strong>UDS TTFPP Portal</strong>. Use the temporary 6-digit access code below:</p>
                <div style='background: #f8fafc; border: 2px dashed #cbd5e1; padding: 25px; text-align: center; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1e40af; border-radius: 8px; margin: 25px 0;'>
                    $otpCode
                </div>
                <div style='background: #fff9db; border-left: 4px solid #fab005; padding: 12px; font-size: 13px; color: #856404; margin-bottom: 20px;'>
                    <strong>Security Notice:</strong> Valid for 48 hours.
                </div>
                <hr style='border: 0; border-top: 1px solid #eee; margin: 20px 0;' />
                <p style='font-size: 11px; text-align: center; color: #94a3b8;'>Automated notification. Do not reply.</p>
            </div>
        ";
        $mail->AltBody = "Hello $userName, your administrative access code is: $otpCode. It expires in 48 hours.";

        return $mail->send();
    } catch (Exception $e) {
        error_log("Admin Mailer Error: " . $e->getMessage());
        return false;
    }
}