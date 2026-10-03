import { defineConfig } from "vite";

// Vite+ (https://viteplus.dev) is Node-based by design.
// Run with `npm run dev` / `npm run build` inside ./frontend,
// or from the repo root via `deno task build` (which shells out to npm).
export default defineConfig({
    build: {
        // Emit the production site into ./dist, which the Deno server serves.
        outDir: "../dist",
        emptyOutDir: true,
    },
    server: {
        port: 5173,
        // Forward backend routes to the Deno server during development.
        proxy: {
            "/version": "http://localhost:8000",
            "/sponsors": "http://localhost:8000",
            "/docs": "http://localhost:8000",
        },
    },
});
