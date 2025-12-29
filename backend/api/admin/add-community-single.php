<?php
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../common_auth.php';

$data = json_decode(file_get_contents("php://input"), true);

if (empty($data['name']) || empty($data['region']) || empty($data['district'])) {
    http_response_code(400);
    exit(json_encode(["error" => "Name, Region, and District are required."]));
}

try {
    // Determine if coordinates are validly provided
    $hasCoords = (!empty($data['latitude']) && !empty($data['longitude']));
    $lat = $hasCoords ? (float)$data['latitude'] : null;
    $lng = $hasCoords ? (float)$data['longitude'] : null;

    $sql = "INSERT INTO public.communities (name, region, district, latitude, longitude, location, start_date, duration_weeks)
            VALUES (:name, :region, :district, :lat, :lng, 
            " . ($hasCoords ? "ST_SetSRID(ST_MakePoint(:lng2, :lat2), 4326)" : "NULL") . ", 
            :start_date, :duration)";

    $stmt = $pdo->prepare($sql);
    
    $params = [
        ':name'     => trim($data['name']),
        ':region'   => trim($data['region']),
        ':district' => trim($data['district']),
        ':lat'      => $lat,
        ':lng'      => $lng,
        ':start_date' => !empty($data['start_date']) ? $data['start_date'] : null,
        ':duration'   => !empty($data['duration_weeks']) ? (int)$data['duration_weeks'] : 5
    ];

    if ($hasCoords) {
        $params[':lng2'] = $lng;
        $params[':lat2'] = $lat;
    }

    $stmt->execute($params);
    echo json_encode(["success" => true]);

} catch (PDOException $e) {
    http_response_code(500);
    if ($e->getCode() == 23505) {
        echo json_encode(["error" => "Community already exists in this district."]);
    } else {
        echo json_encode(["error" => "Database Error: " . $e->getMessage()]);
    }
}