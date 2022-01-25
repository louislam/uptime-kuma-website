<?php
$cols = 10;

$sponsorList = [];
$openCollectiveList = json_decode(file_get_contents("https://opencollective.com/uptime-kuma/members/all.json"));
$githubSponsorList = githubSponsorList();
//print_r($githubSponsorList);
//die();

function githubSponsorList() {
    $authorization = "Authorization: Bearer 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";
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "https://api.github.com/graphql");
    
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json' ,
        "User-Agent: uptime-kuma-website",
        $authorization
    ]);
    
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");
    
    $data = new stdClass();
    $data->query = "
{
  viewer {
    login
    sponsors(first: 100) {
      totalCount
      nodes {
        ... on User {
          login
          avatarUrl
        }
        ... on Organization {
          login
          avatarUrl
        }
      }
    }
  }
}
    ";
    
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    $result = curl_exec($ch);
    curl_close($ch);
    
    $list = [];
    
     $tempList = json_decode($result)->data->viewer->sponsors->nodes;
     
    // Load GitHub money json: export from https://github.com/sponsors/louislam/dashboard/activity
    $githubSponsorMoneyList = json_decode(file_get_contents("louislam-sponsorships-all-time.json"));
    
    foreach ($tempList as $item) {
        $obj = new stdClass();
        $obj->name = $item->login;
        $obj->amount = 0;
        
        foreach ($githubSponsorMoneyList as $item2) {
            
            // Skip private
            if (! $item2->is_public) {
                continue;
            }
            
            if ($item2->sponsor_handle === $item->login && count($item2->transactions) >= 1) {
                $amount = floatval(substr($item2->transactions[0]->tier_monthly_amount, 1));
                
                $obj->amount = $amount;
                
                
                
                if ($item2->is_yearly && $item2->transactions[0]->tier_monthly_amount != $item2->transactions[0]->processed_amount) {
                    $obj->amount = $obj->amount * 12;
                }
                
                break;
            }
        }

        $obj->currency = "USD";
        $obj->image = $item->avatarUrl;
        $obj->url = "https://github.com/$item->login";
        
        if ($obj->amount > 0) {
            $list[] = $obj;
        }
      
    }
    
    return $list;
}

foreach ($openCollectiveList as $item) {
    $obj = new stdClass();
    $obj->name = $item->name;
    $obj->amount = $item->totalAmountDonated;
    $obj->currency = $item->currency;
    $obj->image = $item->image;
    $obj->url = $item->profile;
    
    if ($obj->amount > 0) {
        $sponsorList[] = $obj;
    }
}

foreach ($githubSponsorList as $obj) {
    if ($obj->amount > 0) {
        $sponsorList[] = $obj;
    }
}

usort($sponsorList, function ($a, $b) {
    if ($a->amount === $b->amount) {
        return strcmp($a->name, $b->name);
    }
    return $a->amount < $b->amount;
});

$itemWidth = 120;
$itemHeight = 140;

$totalWidth = $itemWidth * $cols;
$totalHeight = ceil(count($sponsorList) / $cols) * $itemHeight;


function getImageData($imageURL) {
    if ($imageURL == "") {
        $imageURL =  "https://raw.githubusercontent.com/louislam/uptime-kuma/master/public/icon-192x192.png";
    }
    
    $key = md5($imageURL) . sha1($imageURL);
    
    if (file_exists("cache/$key")) {
        return file_get_contents("cache/$key");
    } else {
        $data = file_get_contents($imageURL);
        $file_info = new finfo(FILEINFO_MIME_TYPE);
        $type = $file_info->buffer($data);
        
        $data = 'data:' . $type . ';base64,' . base64_encode($data);
        file_put_contents("cache/$key", $data);
        return $data;
    }
}

header('Content-type: image/svg+xml');
header("cache-control: max-age=7200, s-maxage=7200");
?><svg xmlns="http://www.w3.org/2000/svg" width="<?=$totalWidth ?>" height="<?=$totalHeight ?>">
    <style>
        a {
            transition: all ease-in-out 0.2s;
            font-family: sans-serif;
        }
        a:hover {
            opacity: 0.5;
        }
    </style>
    
    <?php
        $col = 1;
        $x = 0;
        $y = 0;
    ?>
    <?php foreach($sponsorList as $sponsor) : ?>
        <a href="https://louislam.net" target="_blank">
            <image width="100" height="100" x="<?=$x ?>" y="<?=$y ?>" href="<?=getImageData($sponsor->image) ?>" />
            <text x="<?=$x ?>" y="<?=$y + 105 ?>" clip-path="url(#clip<?=$col ?>)" dominant-baseline="hanging" text-anchor="start"><?=$sponsor->name ?></text>
            <text x="<?=$x ?>" y="<?=$y + 125 ?>" clip-path="url(#clip<?=$col ?>)" dominant-baseline="hanging" text-anchor="start"><?=$sponsor->currency ?> <?=$sponsor->amount ?></text>
        </a>
        <clipPath id="clip<?=$col ?>">
            <rect x="<?=$x ?>" y="<?=$y + 105 ?>" width="105" height="40"/>
        </clipPath>
        <?php
            if ($col % $cols === 0) {
                $x = 0;
                $y = $y + $itemHeight;
            } else {
                $x = $x + $itemWidth;
            }
            $col++;
        ?>
    <?php endforeach; ?>
 </svg>

