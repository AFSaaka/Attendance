<?php
/**
 * backend/utils/validators.php
 * Centralized input validation functions for the API
 */

/**
 * Validates geographic coordinates
 * @param float $lat Latitude (-90 to 90)
 * @param float $lng Longitude (-180 to 180)
 * @return bool
 */
function validate_coordinates($lat, $lng) {
    if (!is_numeric($lat) || !is_numeric($lng)) {
        return false;
    }
    
    $lat = (float)$lat;
    $lng = (float)$lng;
    
    return $lat >= -90 && $lat <= 90 && $lng >= -180 && $lng <= 180;
}

/**
 * Validates email format
 * @param string $email
 * @return bool
 */
function validate_email($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

/**
 * Validates date format (YYYY-MM-DD)
 * @param string $date
 * @return bool
 */
function validate_date($date) {
    if (!is_string($date) || strlen($date) !== 10) {
        return false;
    }
    
    // Check format YYYY-MM-DD
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        return false;
    }
    
    // Check if it's a valid date
    $parts = explode('-', $date);
    return checkdate((int)$parts[1], (int)$parts[2], (int)$parts[0]);
}

/**
 * Validates file upload
 * @param array $file $_FILES array entry
 * @param array $allowed_extensions Whitelist of allowed extensions (e.g., ['csv', 'xlsx'])
 * @param int $max_size_mb Maximum file size in MB
 * @return bool
 */
function validate_file_upload($file, $allowed_extensions = [], $max_size_mb = 5) {
    // Check if file was uploaded
    if (!isset($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
        return false;
    }
    
    // Check file size
    $max_bytes = $max_size_mb * 1024 * 1024;
    if ($file['size'] > $max_bytes) {
        return false;
    }
    
    // Check extension
    if (!empty($allowed_extensions)) {
        $filename = $file['name'];
        $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        if (!in_array($ext, $allowed_extensions, true)) {
            return false;
        }
    }
    
    // Check MIME type if available
    if (function_exists('finfo_file')) {
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);
        
        // Allow common spreadsheet MIME types
        $allowed_mimes = [
            'text/csv',
            'text/plain',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ];
        
        if (!in_array($mime, $allowed_mimes, true)) {
            return false;
        }
    }
    
    return true;
}

/**
 * Validates enum value against whitelist
 * @param mixed $value
 * @param array $allowed_values
 * @return bool
 */
function validate_enum($value, $allowed_values) {
    return in_array($value, $allowed_values, true);
}

/**
 * Validates text length
 * @param string $text
 * @param int $max_length
 * @param int $min_length
 * @return bool
 */
function validate_text_length($text, $max_length = 255, $min_length = 1) {
    $len = strlen($text);
    return $len >= $min_length && $len <= $max_length;
}

/**
 * Validates numeric range
 * @param int|float $value
 * @param int|float $min
 * @param int|float $max
 * @return bool
 */
function validate_range($value, $min, $max) {
    if (!is_numeric($value)) {
        return false;
    }
    $val = (float)$value;
    return $val >= $min && $val <= $max;
}
