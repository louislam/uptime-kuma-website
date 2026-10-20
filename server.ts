import { Hono, type Context } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";
import { serve } from "@hono/node-server";
import { readFile } from "node:fs/promises";

const PORT = Number(process.env.PORT ?? 8000);

const app = new Hono();

// Home page. Built by Vite+ (see frontend/) into ./dist/index.html.
app.get("/", async (c) => {
    try {
        return c.html(await readFile("./dist/index.html", "utf8"));
    } catch {
        return c.text("Frontend not built yet. Run `npm run build`.", 503);
    }
});

// Latest / slow / beta versions.
app.get("/version", async (c) => {
    const raw = await readFile("./version.json", "utf8");
    return c.body(raw, 200, { "content-type": "application/json" });
});

// Sponsors SVG, streamed from the committed file on GitHub.
app.get("/sponsors", async (c) => {
    try {
        const upstream = await fetch("https://raw.githubusercontent.com/louislam/uptime-kuma-website/master/sponsors.svg", {
            signal: AbortSignal.timeout(15000),
        });

        if (!upstream.ok || !upstream.body) {
            return c.text(`Sponsors SVG unavailable (${upstream.status})`, 502);
        }

        return new Response(upstream.body, {
            status: 200,
            headers: {
                "content-type": "image/svg+xml",
                "cache-control": "max-age=7200, s-maxage=7200",
            },
        });
    } catch (error) {
        console.error("Failed to fetch sponsors.svg:", error);
        return c.text("Sponsors SVG unavailable", 502);
    }
});

// Docs redirects to the wiki.
const docsRedirect = (c: Context) => {
    return c.redirect("https://github.com/louislam/uptime-kuma/wiki", 302);
};
app.get("/docs", docsRedirect);
app.get("/docs/*", docsRedirect);

// Static assets: Vite+ build output (hashed assets) + frontend/public/ copies.
app.use("*", serveStatic({ root: "./dist" }));

serve({ fetch: app.fetch, port: PORT }, (info) => {
    console.log(`Listening on http://localhost:${info.port}`);
});
