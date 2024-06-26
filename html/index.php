<?php
require "../vendor/autoload.php";

$app = new Slim\Slim();
$app->config("debug", getenv("DEV") === "1");

$plates = new League\Plates\Engine("../views");

$app->get("/", function () use ($plates) {
    echo $plates->render("main");
});

$app->get("/version", function () use ($plates, $app) {
    $app->response()->header("Content-Type", "application/json");
    echo file_get_contents("../version.json");
});

$app->get("/sponsors", function () use ($plates, $app) {
    $app->response()->header("Content-Type", "image/svg+xml");
    $app->response()->header("cache-control", "max-age=7200, s-maxage=7200");
    echo $plates->render("sponsors");
});

$docs = function () use ($plates, $app) {
    $app->response()->header("Location", "https://github.com/louislam/uptime-kuma/wiki");
};

$app->get("/docs", $docs);
$app->get("/docs/:any+", $docs);

$app->run();
