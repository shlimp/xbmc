<?php
error_reporting(E_ALL);
ini_set('error_reporting', E_ALL);
$data = json_decode($HTTP_RAW_POST_DATA, true);
$url = $data["url"];
$request = $data["request"];
$curl = curl_init($url);
curl_setopt_array($curl, array(
    CURLOPT_RETURNTRANSFER => 1,
    CURLOPT_POST => 1,
    CURLOPT_POSTFIELDS => json_encode($request),
    CURLOPT_HTTPHEADER => array('Content-Type: application/json')
));

$resp = curl_exec($curl);
echo $resp;
curl_close($curl);

?>