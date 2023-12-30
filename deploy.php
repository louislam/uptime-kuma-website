<?php
use phpseclib3\Net\SSH2;

require "./vendor/autoload.php";

// Read .env file
$dotenv = Dotenv\Dotenv::createImmutable("./");
$dotenv->safeLoad();


// SSH to the production server

$hostname = $_ENV["DEPLOY_SSH_HOSTNAME"];
$port = $_ENV["DEPLOY_SSH_PORT"];
$username = $_ENV["DEPLOY_SSH_USERNAME"];
$password = $_ENV["DEPLOY_SSH_PASSWORD"];
$workingDir = $_ENV["DEPLOY_SSH_WORKING_DIR"];

echo "Connecting to $username@$hostname:$port\n";

$ssh = new SSH2($hostname, $port);

if (!$ssh->login($username, $password)) {
    exit('Login Failed');
}

echo "Connected\n";

// ls
echo $ssh->exec("
cd $workingDir
ls -la
git fetch --all
git checkout origin/master --force
docker compose exec website composer install
");

$ssh->disconnect();

echo "Finished\n";



