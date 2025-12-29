<?php
// backend/api/admin/upload-communities.php
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../common_auth.php';
require_once __DIR__ . '/../../vendor/autoload.php';

use Shuchkin\SimpleXLSX;

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit(json_encode(["error" => "Method not allowed"]));
}

try {
    if (!isset($_FILES['file'])) {
        throw new Exception("Please select a file to upload.");
    }

    $fileTmpPath = $_FILES['file']['tmp_name'];
    $extension = strtolower(pathinfo($_FILES['file']['name'], PATHINFO_EXTENSION));
    $rows = [];

    // Parse File
    if ($extension === 'xlsx') {
        if ($xlsx = SimpleXLSX::parse($fileTmpPath)) {
            $rows = $xlsx->rows();
            array_shift($rows); // Skip header
        } else {
            throw new Exception(SimpleXLSX::parseError());
        }
    } elseif ($extension === 'csv') {
        if (($handle = fopen($fileTmpPath, "r")) !== FALSE) {
            fgetcsv($handle); // Skip header
            while (($data = fgetcsv($handle, 1000, ",")) !== FALSE) {
                $rows[] = $data;
            }
            fclose($handle);
        }
    }

    $pdo->beginTransaction();

    // The CAST (::double precision) tells Postgres how to handle NULLs for coordinates
    $stmt = $pdo->prepare("
        INSERT INTO public.communities (name, region, district, latitude, longitude, location)
        VALUES (
            :name, :region, :district, :lat, :lng, 
            CASE 
                WHEN :lat2::double precision IS NULL OR :lng2::double precision IS NULL THEN NULL 
                ELSE ST_SetSRID(ST_MakePoint(:lng3::double precision, :lat3::double precision), 4326)::geography 
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
    foreach ($rows as $data) {
        if (empty($data[0])) continue;

        // Force to float or NULL
        $lat = (isset($data[3]) && is_numeric($data[3])) ? (float)$data[3] : null;
        $lng = (isset($data[4]) && is_numeric($data[4])) ? (float)$data[4] : null;

        $stmt->execute([
            ':name'     => trim($data[0]),
            ':region'   => trim($data[1]),
            ':district' => trim($data[2]),
            ':lat'      => $lat,
            ':lng'      => $lng,
            ':lat2'     => $lat,
            ':lng2'     => $lng,
            ':lat3'     => $lat,
            ':lng3'     => $lng
        ]);
        $count++;
    }

    $pdo->commit();
    echo json_encode(["success" => true, "message" => "Processed $count communities."]);

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
}