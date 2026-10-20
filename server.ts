import { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";
import { serve } from "@hono/node-server";
import { readFile } from "node:fs/promises";
import { renderSponsorsSvg } from "./src/sponsors.ts";

const PORT = Number(process.env.PORT ?? 8000);
const DIST = process.env.DIST_DIR ?? "./dist";
const WIKI = "https://github.com/louislam/uptime-kuma/wiki";

const app = new Hono();

// Home page. Built by Vite+ (see frontend/) into ./dist/index.html.
app.get("/", async (c) => {
    try {
        return c.html(await readFile(`${DIST}/index.html`, "utf8"));
    } catch {
        return c.text("Frontend not built yet. Run `npm run build`.", 503);
    }
});

// Latest / slow / beta versions.
app.get("/version", async (c) => {
    const raw = await readFile("./version.json", "utf8");
    return c.body(raw, 200, { "content-type": "application/json" });
});

// Sponsors SVG (fetches OpenCollective, merges GitHub sponsors, resizes avatars).
app.get("/sponsors", async (c) => {
    c.header("cache-control", "max-age=7200, s-maxage=7200");
    return c.body(await renderSponsorsSvg(), 200, { "content-type": "image/svg+xml" });
});

// Docs redirects to the wiki.
app.get("/docs", (c) => c.redirect(WIKI, 302));
app.get("/docs/*", (c) => c.redirect(WIKI, 302));

// Static assets: Vite+ build output (hashed assets) + frontend/public/ copies.
app.use("*", serveStatic({ root: DIST }));

serve({ fetch: app.fetch, port: PORT }, (info) => {
    console.log(`Listening on http://localhost:${info.port}`);
});
