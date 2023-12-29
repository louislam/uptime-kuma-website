<?php
require "../vendor/autoload.php";

$app = new Slim\Slim();
$plates = new League\Plates\Engine("../views");

$app->get("/", function () use ($plates) {
    echo $plates->render("main");
});

$app->get("/version", function () use ($plates, $app) {
    $app->response()->header("Content-Type", "application/json");
    echo file_get_contents("../version.json");
});

$app->get("/sponsors", function () use ($plates, $app) {
    echo $plates->render("sponsors");
});

$app->run();
