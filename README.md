# Uptime Kuma Website

https://uptime.kuma.pet

## Dev

Install Dependencies

```bash
composer install
```

Run the server

```bash
composer run-script dev
```


## Deploy to Production

First time:

```bash
mkdir -p /opt/stacks/uptime-kuma-website
cd /opt/stacks/uptime-kuma-website
git clone https://github.com/louislam/uptime-kuma-website .

# Create `.env`.
# Rename `.env.sample` to `.env`.

chmod -R 777 cache

# Start the server.
docker compose up -d

# composer maybe not ready yet, run again if failed.
docker compose exec website composer install
```

Update source code:

```bash
cd /opt/stacks/uptime-kuma-website
git fetch --all
git checkout origin/master --force

# run if new dependencies added.
docker compose exec website composer install
```

Alternatively, you can run the following command to update the source code and dependencies in your local machine.

```bash
composer run-script deploy
```
