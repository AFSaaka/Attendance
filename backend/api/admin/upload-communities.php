<?php
// backend/api/admin/upload-communities.php
require_once __DIR__ . '/../common_auth.php';
require_once __DIR__ . '/../../vendor/autoload.php';

use Shuchkin\SimpleXLSX;

// 1. SECURITY: Only Admins/Superadmins can manage reference locations
requireAdmin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit(json_encode(["error" => "Method not allowed"]));
}

try {
    if (!isset($_FILES['file'])) {
        throw new Exception("No file provided for upload.");
    }

    $fileTmpPath = $_FILES['file']['tmp_name'];
    $fileName = $_FILES['file']['name'];
    $extension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
    $rows = [];

    // 2. FILE PARSING
    if ($extension === 'xlsx') {
        if ($xlsx = SimpleXLSX::parse($fileTmpPath)) {
            $rows = $xlsx->rows();
            array_shift($rows); // Skip header: [name, region, district, lat, lng]
        } else {
            throw new Exception("Excel Parse Error: " . SimpleXLSX::parseError());
        }
    } elseif ($extension === 'csv') {
        if (($handle = fopen($fileTmpPath, "r")) !== FALSE) {
            fgetcsv($handle); // Skip header
            while (($data = fgetcsv($handle)) !== FALSE) {
                $rows[] = $data;
            }
            fclose($handle);
        }
    } else {
        throw new Exception("Unsupported file format. Please use .csv or .xlsx");
    }

    $pdo->beginTransaction();

    /**
     * 3. HARDENED SQL LOGIC
     * We use a single set of coordinates and handle the NULL check 
     * inside the query using COALESCE or CASE.
     */
    $stmt = $pdo->prepare("
        INSERT INTO public.communities (name, region, district, latitude, longitude, location)
        VALUES (
            :name, :region, :district, :lat, :lng, 
            CASE 
                WHEN :lat_val IS NULL OR :lng_val IS NULL THEN NULL 
                ELSE ST_SetSRID(ST_MakePoint(:lng_ptr, :lat_ptr), 4326)::geography 
            END
        )
        ON CONFLICT (name, region, district) 
        DO UPDATE SET 
            latitude = EXCLUDED.latitude, 
            longitude = EXCLUDED.longitude,
            location = EXCLUDED.location,
            updated_at = NOW()
    ");

    $count = 0;
    foreach ($rows as $index => $data) {
        if (empty($data[0])) continue; // Skip empty rows

        // Sanitization & Type Casting
        $name     = trim($data[0]);
        $region   = trim($data[1]);
        $district = trim($data[2]);
        $lat      = (isset($data[3]) && is_numeric($data[3])) ? (float)$data[3] : null;
        $lng      = (isset($data[4]) && is_numeric($data[4])) ? (float)$data[4] : null;

        $stmt->execute([
            'name'     => $name,
            'region'   => $region,
            'district' => $district,
            'lat'      => $lat,
            'lng'      => $lng,
            'lat_val'  => $lat,
            'lng_val'  => $lng,
            'lat_ptr'  => $lat,
            'lng_ptr'  => $lng
        ]);
        $count++;
    }

    // 4. AUDIT LOGGING
    $logStmt = $pdo->prepare("
        INSERT INTO public.audit_logs (user_id, action_type, ip_address, details) 
        VALUES (?, 'COMMUNITY_BULK_UPLOAD', ?, ?)
    ");
    
    $details = json_encode([
        "message" => "Updated $count community GPS coordinates",
        "filename" => $fileName
    ]);

    $logStmt->execute([$currentUser['id'], $_SERVER['REMOTE_ADDR'], $details]);

    $pdo->commit();
    echo json_encode(["success" => true, "message" => "Successfully processed $count communities."]);

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    error_log("Community Upload Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["error" => "Upload failed. Check server logs for details."]);
}