<!DOCTYPE html>
<html lang="en">
<head>
    <title>Uptime Kuma</title>
    <meta charset="UTF-8" />
    <meta name="theme-color" content="#090C10" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="A self-hosted monitoring tool" />
    <link rel="icon" type="image/svg+xml" href="/img/icon.svg" />
    <meta name="google-site-verification" content="dN_3ww4h_ShmISE82F-Qmr4MAliHmaGGEHRfuWgxM4E" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.0.1/css/bootstrap.min.css" crossorigin="anonymous" referrerpolicy="no-referrer" />
    <link rel="stylesheet" type="text/css" href="/css/app.css?v=2" />
</head>

<body>

<img src="/img/icon.svg" alt="Uptime Kuma" class="logo mt-5 mb-3" />

<h1>Uptime Kuma</h1>

<div>
    A self-hosted monitoring tool
    <br /><br />
</div>

<div class="flex">
    <a class="btn btn-primary" href="https://demo.uptime.kuma.pet">Live Demo</a>
    <a class="btn btn-primary" href="https://github.com/louislam/uptime-kuma/wiki">Docs</a>
</div>

<div class="cmd mt-3">
    docker run -d --restart=always -p <strong>3001</strong>:3001 -v <strong>uptime-kuma</strong>:/app/data --name <strong>uptime-kuma</strong> louislam/uptime-kuma:1
</div>

<div class="footer">
    <a href="https://github.com/louislam/uptime-kuma">Github</a>
    <a href="https://status.kuma.pet/">Status Page</a>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.0.1/js/bootstrap.bundle.min.js" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
</body>

</html>
