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

## Update Sponsors JSON

Since GitHub API does not provide a way to get all all data. We have to download the csv file manually and convert it to JSON.

1. Go to https://github.com/sponsors/louislam/dashboard/your_sponsors
2. `Export`
3. `All time`
4. `CSV`
5. `Start export`
6. Check your email and download the CSV file.
7. Place the CSV in the root folder.
8. `php github-csv-to-summary-json.php`
9. Commit and push the changes.
10. Deploy to production.
