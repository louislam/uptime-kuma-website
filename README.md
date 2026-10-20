# Uptime Kuma Website

https://uptime.kuma.pet

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
