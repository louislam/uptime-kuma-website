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
    <a class="btn btn-primary" href="https://demo.kuma.pet/start-demo">Live Demo</a>
    <a class="btn btn-primary" href="https://github.com/louislam/uptime-kuma/wiki">Docs</a>
</div>

<!-- Dynamic Port and Volume Name -->
<div class="flex container w-50" id="setting_btns">
    <div class="input-group mt-3">
        <label for="inp_port" class="input-group-text">Port</label>
        <input type="number" min="0" max="65535" class="form-control" value="3001" id="inp_port" placeholder="e.g. 3001" />
    </div>
    <div class="input-group mt-3">
        <label for="inp_volume" class="input-group-text">Volume and Container Name</label>
        <input type="text" class="form-control" value="uptime-kuma" id="inp_volume" placeholder="e.g. uptime-kuma" />
    </div>
</div>

<div class="cmd mt-3">
    docker run -d --restart=always -p <strong id="port_cmd">3001</strong>:3001 -v <strong id="vol_cmd">uptime-kuma</strong>:/app/data --name <strong id="name_cmd">uptime-kuma</strong> louislam/uptime-kuma:1
</div>

<!-- copy button -->
<div class="flex mt-3">
    <button class="btn btn-primary" onclick="copy()">Copy Command</button>
</div>

<div class="footer">
    <a href="https://github.com/louislam/uptime-kuma">Github</a>
    <a href="https://status.kuma.pet/">Status Page</a>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.0.1/js/bootstrap.bundle.min.js" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
<script>
    // Update the command based on the input
    document.getElementById('inp_port').addEventListener('input', function() {
        document.getElementById('port_cmd').innerText = this.value;
    });

    document.getElementById('inp_volume').addEventListener('input', function() {
        let name = this.value.replace(/[^a-z0-9]/gi, '-').toLowerCase(); // Replace invalid characters (only allow a-z and 0-9)
        document.getElementById('vol_cmd').innerText = name;
        document.getElementById('name_cmd').innerText = name;
    });

    const copy = () => {
        if (!navigator.clipboard) {
            alert('Your browser does not support clipboard API');
            return;
        }

        if (document.getElementById('inp_port').value === '' || document.getElementById('inp_volume').value === '') {
            alert('Please fill in the port and volume name');
            return;
        }

        navigator.clipboard.writeText(document.querySelector('.cmd').innerText);
        alert('Docker command copied to clipboard! Simply paste it in your terminal and woa-la!');
    }
</script>
</body>

</html>
