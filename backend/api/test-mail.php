<?php
// backend/api/test-mail.php
// REMOVE header('Content-Type: application/json'); so we can see the debug text clearly
require_once __DIR__ . '/../utils/mailer.php';

$testEmail = $_GET['email'] ?? null;

if (!$testEmail) {
    exit("Please provide an email in the URL. Example: test-mail.php?email=test@me.com");
}

echo "<h2>SMTP Debug Mode</h2>";
echo "Attempting to send test email to: <strong>$testEmail</strong><br><br>";

try {
    // 1. Get the mailer instance
    $mail = getMailerInstance();
    
    // 2. FORCE DEBUG OUTPUT
    $mail->SMTPDebug = 3; // Level 3 shows connection logs and data transfer
    $mail->Debugoutput = function($str, $level) {
        echo "<pre style='background: #f4f4f4; padding: 5px; border-bottom: 1px solid #ccc;'>SMTP: $str</pre>";
    };
    
    // 3. Set up a simple test mail
    $mail->addAddress($testEmail);
    $mail->Subject = 'UDS Portal - SMTP Connection Test';
    $mail->Body    = "This is a test to verify SendGrid settings on Render.";
    
    // 4. Try to send
    if ($mail->send()) {
        echo "<h3 style='color: green;'>SUCCESS: Mail sent!</h3>";
    } else {
        echo "<h3 style='color: red;'>FAILED: Mail function returned false.</h3>";
    }

} catch (Exception $e) {
    echo "<h3 style='color: red;'>EXCEPTION CAUGHT:</h3>";
    echo "<pre>" . $e->getMessage() . "</pre>";
    echo "<strong>PHPMailer ErrorInfo:</strong> " . ($mail->ErrorInfo ?? 'None');
}