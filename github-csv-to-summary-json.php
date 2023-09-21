<?php


/*
 * How to run:
 * php github-csv-to-summary-json.php
 */

$Login = -1;
$Name = -1;
$PublicEmail = -1;
$IsPublic = -1;
$Amount = -1;
$Status = -1;

$csvFile = file("louislam-sponsorships-all-time.csv");

$list = [];

echo "Total lines in csv: " . count($csvFile) . "\n";

$isFirst = true;
foreach ($csvFile as $line) {
    $row = str_getcsv($line);

    //
    if ($isFirst) {

        for ($i = 0; $i < count($row); $i++) {
            if ($row[$i] === "Sponsor Handle") {
                $Login = $i;
            } else if ($row[$i] === "Sponsor Profile Name") {
                $Name = $i;
            } else if ($row[$i] === "Sponsor Public Email") {
                $PublicEmail = $i;
            } else if ($row[$i] === "Is Public?") {
                $IsPublic = $i;
            } else if ($row[$i] === "Processed Amount") {
                $Amount = $i;
            } else if ($row[$i] === "Status") {
                $Status = $i;
            }
        }

        $isFirst = false;
        continue;
    }

    // Settled only
    if ($row[$Status] !== "settled") {
        echo "Skip row because not settled: " . $row[$Status] . "\n";
        continue;
    }

    if (!isset($list[$row[$Login]])) {
        $obj = new stdClass();

        // If it is private, mark it as a guest
        if ($row[$IsPublic] !== "true") {
            $obj->login = "hidden-" . substr(md5($row[$Login]), 12, 24);
            $obj->url = "https://github.com/louislam/uptime-kuma";
            $obj->name = "Guest";
        } else {
            $obj->login = $row[$Login];
            $obj->url = "https://github.com/$obj->login";
            if (!empty($row[$Name])) {
                $obj->name = $row[$Name];
            } else {
                $obj->name = $obj->login;
            }

        }

        $obj->currency = "USD";
        $obj->image = "";
        $obj->amount = 0;
        $obj->is_public = $row[$IsPublic] === "true";
    }

    // Offset 1, strip out dollar sign
    $obj->amount += floatval(substr($row[$Amount], 1));

    $list[$obj->login] = $obj;
}

$list = array_values($list);

echo "Total row in list: " . count($list) . "\n";

// Get profile pic url from github api
$imageList = getImages($list);

foreach ($list as $user) {
    foreach ($imageList as $item) {
        if (empty($item)) {
            continue;
        }

        if ($user->login === $item->login) {
            $user->image = $item->avatarUrl;
        }
    }
}

usort($list, function ($a, $b) {
    $cmp = strcmp($a->login, $b->login);

    if ($cmp !== 0) {
        return $cmp;
    } else if ($a->amount > $b->amount) {
        return -1;
    } else {
        return 1;
    }
});

file_put_contents("github-public-sponsors.json", json_encode($list, JSON_PRETTY_PRINT));



function getImages($list) {
    $config = include("config.php");
    $authorization = "Authorization: Bearer " . $config->githubAPIToken;
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "https://api.github.com/graphql");

    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json' ,
        "User-Agent: uptime-kuma-website",
        $authorization
    ]);

    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");


    $query = "";
    $i = 1;
    foreach ($list as $user) {
        if ($user->is_public) {

            $query .= "
             user$i: user(login: \"$user->login\") {
                 login
                 avatarUrl
            }
         ";

            $i++;
        }
    }

    if (empty($query)) {
        return [];
    }

    $data = new stdClass();
    $data->query = "{ $query }";

    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $result = curl_exec($ch);

    if ($result !== false) {
        $json = json_decode($result);

        if (isset($json->data)) {
            $data = array_values((array) $json->data);
            return $data;
        }
    } else {
        echo curl_error($ch);
        throw new Exception("Failed to get image list from github api");
    }

    curl_close($ch);
}
