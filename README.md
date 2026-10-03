# Uptime Kuma Website

https://uptime.kuma.pet

Deno ([Hono](https://hono.dev)) serves the site and API routes; the frontend is
built with [Vite+](https://viteplus.dev) (which runs on Node by design).

## Requirements

- [Deno](https://deno.com) 2.x
- Node.js 24+ (only to run the Vite+ frontend toolchain)

## Dev

Install frontend dependencies (once, or when `frontend/package.json` changes):

```bash
deno task install-frontend
```

Run the backend (Deno, port 8000):

```bash
deno task dev
```

In another terminal, run the frontend dev server (Vite+, port 5173, HMR).
It proxies `/version`, `/sponsors`, and `/docs` to the backend:

```bash
deno task dev-frontend
```

Open http://localhost:5173/.

## Build

Build the frontend into `./dist`:

```bash
deno task build
```

Then serve the whole site with Deno (defaults to port 8000):

```bash
deno task start
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

# Start the server (builds the frontend and caches Deno deps in the image).
docker compose up -d --build
```

Update source code:

```bash
cd /opt/stacks/uptime-kuma-website
git fetch --all
git checkout origin/master --force
docker compose up -d --build
```

The container listens on port `80` (unchanged), so the existing Cloudflare
tunnel target does not need to be modified.

## Update Sponsors JSON

Since the GitHub API does not provide a way to get all data, download the CSV
file manually and convert it to JSON.

1. Go to https://github.com/sponsors/louislam/dashboard/your_sponsors
2. `Export`
3. `All time`
4. `CSV`
5. `Start export`
6. Check your email and download the CSV file.
7. Place the CSV in the root folder.
8. `deno task sponsors-to-json`
9. Commit and push the changes.
10. Deploy to production.

## Layout

```
server.ts                 Deno + Hono server (routes, static files)
src/sponsors.ts           Sponsors SVG generator (sharp image resize)
frontend/                 Vite+ frontend (index.html, src/, public/)
frontend/vite.config.ts   Outputs the built site to ../dist
dist/                     Built frontend (generated, gitignored)
cache/                    Resized sponsor avatar cache (gitignored)
version.json              Versions served at /version
github-public-sponsors.json
```

### Routes

| Route | Description |
| --- | --- |
| `/` | Home page (built by Vite+) |
| `/version` | Version JSON |
| `/sponsors` | Sponsors SVG |
| `/docs`, `/docs/*` | Redirect to the wiki |
