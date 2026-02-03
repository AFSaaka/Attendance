<?php
// backend/api/test-mail.php
require_once __DIR__ . '/../utils/mailer.php';

$testEmail = $_GET['email'] ?? null;

if (!$testEmail) {
    exit("Please provide an email in the URL. Example: test-mail.php?email=test@me.com");
}

echo "<h2>SendGrid Web API Test Mode</h2>";
echo "Attempting to send test email to: <strong>$testEmail</strong> via HTTPS (Port 443)<br><br>";

try {
    // We call the function you just updated in mailer.php
    $success = sendOTPEmail($testEmail, "999888");

    if ($success) {
        echo "<h3 style='color: green;'>SUCCESS: API request accepted!</h3>";
        echo "<p>Check your inbox (and spam folder) for a code: <strong>999888</strong></p>";
    } else {
        echo "<h3 style='color: red;'>FAILED: SendGrid API returned an error.</h3>";
        echo "<p>Check your Render service logs to see the specific error message from curl.</p>";
    }

} catch (Exception $e) {
    echo "<h3 style='color: red;'>EXCEPTION CAUGHT:</h3>";
    echo "<pre>" . $e->getMessage() . "</pre>";
}