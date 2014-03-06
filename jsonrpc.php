<?php
require_once("jsonRPCClient.php");
require_once("jsonRPCServer.php");
error_reporting(E_ALL);
ini_set('error_reporting', E_ALL);

class General {
	public function get_last_aired($tvshowid, $zipfile_url){
	    $path = realpath(dirname(__FILE__));

	    if (!file_exists($path . '/zip')) {
            mkdir($path . '/zip', 0777, true);
        }
		$local_zip = $path . "/zip/" . hash("md5", $zipfile_url) .".zip";
		// copy zip locally
		copy($zipfile_url, $local_zip);
		$za = new ZipArchive();
		// open zip
		$za->open($local_zip);
		$content = '';
		// get xml fromzip
		$fp = $za->getStream("en.xml");
		while (!feof($fp)) {
			$contents .= fread($fp, 2);
		}
		// close and delete
		fclose($fp);
		unlink($local_zip);
		// xml to array
		$xml = simplexml_load_string($contents);
		$array = json_decode(json_encode((array) $xml), 1);
		$array = array($xml->getName() => $array);
		
		$today = date("Y-m-d");
		$last_aired = false;
		foreach ($array["Data"]["Episode"] as $episode){
			if((strtotime("+1 days", strtotime($episode["FirstAired"]))) > time()){
				break;
			}
			$last_aired = $episode;
		}
		$last_aired["tvshowid"] = $tvshowid;
		return $last_aired;
	}
}

$general = new General();

jsonRPCServer::handle($general)
    or print 'no request';
/*
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
*/

?>
