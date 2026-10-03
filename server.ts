import { Hono } from "jsr:@hono/hono@4";
import { serveStatic } from "jsr:@hono/hono@4/deno";
import { renderSponsorsSvg } from "./src/sponsors.ts";

const PORT = Number(Deno.env.get("PORT") ?? 8000);
const DIST = Deno.env.get("DIST_DIR") ?? "./dist";
const WIKI = "https://github.com/louislam/uptime-kuma/wiki";

const app = new Hono();

// Home page. Built by Vite+ (see frontend/) into ./dist/index.html.
app.get("/", async (c) => {
    try {
        return c.html(await Deno.readTextFile(`${DIST}/index.html`));
    } catch {
        return c.text("Frontend not built yet. Run `npm --prefix frontend run build`.", 503);
    }
});

// Latest / slow / beta versions.
app.get("/version", async (c) => {
    const raw = await Deno.readTextFile("./version.json");
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

Deno.serve({ port: PORT }, app.fetch);
