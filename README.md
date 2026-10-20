# Uptime Kuma Website

https://uptime.kuma.pet

Node.js ([Hono](https://hono.dev)) serves the site and API routes; the frontend is
built with [Vite+](https://viteplus.dev).

## Requirements

- Node.js 26+

## Dev

Install dependencies (once, or when `package.json` / `frontend/package.json` change):

```bash
npm install
npm run install-frontend
```

Run the backend (port 8000):

```bash
npm run dev
```

In another terminal, run the frontend dev server (Vite+, port 5173, HMR).
It proxies `/version`, `/sponsors`, and `/docs` to the backend:

```bash
npm run dev-frontend
```

Open http://localhost:5173/.

## Build

Build the frontend into `./dist`:

```bash
npm run build
```

Then serve the whole site with Node (defaults to port 8000):

```bash
npm start
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

# Start the server (builds the frontend and installs Node deps in the image).
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

The site reads `github-public-sponsors.json`. Rebuild it from the GitHub
Sponsors GraphQL API:

```bash
npm run sponsors:json
```

`GITHUB_API_TOKEN` in `.env` needs the `read:user` scope.

GitHub Actions runs the same command every 4 hours
(`.github/workflows/update-sponsors.yml`) and commits only when the JSON
changes, as `github-actions[bot]`. It needs a `SPONSORS_TOKEN` repository secret
with the `read:user` scope.

The commit only updates the repository. Production still needs a deploy
(`git pull` + rebuild) unless the JSON is served from a mounted volume.

- `--out <path>` writes somewhere else.
- `--merge <json>` carries over sponsors that no longer exist on GitHub, so the
  all-time list keeps them.
- `--check` compares against `github-public-sponsors - ground truth.json`
  without writing.

Known GraphQL limits: deleted sponsor accounts disappear unless `--merge` is used. The CSV export marks invoiced / credit-balance payments as `credit_balance_adjusted`; the converter counts them alongside `settled`.

Fallback, from a GitHub Sponsors CSV export:

1. Go to https://github.com/sponsors/louislam/dashboard/your_sponsors
2. `Export` → `All time` → `CSV` → `Start export`
3. Download the CSV and place it in the root as `louislam-sponsorships-all-time.csv`.
4. `npm run csv-to-json`
5. Commit and push `github-public-sponsors.json`.

## Layout

```
server.ts                 Node + Hono server (routes, static files)
src/sponsors.ts           Sponsors SVG generator (sharp image resize)
scripts/csv-to-json.ts    CSV export -> github-public-sponsors.json
scripts/fetch-sponsors.ts GraphQL -> github-public-sponsors.json
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
