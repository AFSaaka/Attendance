<?php
// backend/api/test-mail.php
header('Content-Type: application/json');
require_once __DIR__ . '/../utils/mailer.php';

// Allow testing via browser: test-mail.php?email=your-email@example.com
$testEmail = $_GET['email'] ?? null;

if (!$testEmail) {
    echo json_encode(["status" => "error", "message" => "Please provide an email in the URL. Example: test-mail.php?email=test@me.com"]);
    exit;
}

try {
    echo "Attempting to send test email to: $testEmail...\n";
    
    // We use a dummy OTP for testing
    $success = sendOTPEmail($testEmail, "123456");

    if ($success) {
        echo json_encode([
            "status" => "success", 
            "message" => "Mail sent successfully! Check your inbox/spam folder."
        ]);
    } else {
        // This will trigger if PHPMailer returns false
        echo json_encode([
            "status" => "error", 
            "message" => "Mail function returned false. Check error logs for SMTP details."
        ]);
    }
} catch (Exception $e) {
    echo json_encode([
        "status" => "error", 
        "message" => "Exception caught: " . $e->getMessage()
    ]);
}

