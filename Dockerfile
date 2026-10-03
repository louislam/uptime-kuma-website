# ---- Stage 1: build the frontend with Vite+ (Node-based) ----
FROM node:24-bookworm-slim AS frontend

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# Emits /app/dist
RUN npm run build

# ---- Stage 2: Deno runtime serving the built site ----
FROM denoland/deno:2.9.7

WORKDIR /app

COPY deno.jsonc server.ts ./
COPY src/ ./src/
COPY version.json github-public-sponsors.json ./
RUN mkdir -p cache && deno cache server.ts

COPY --from=frontend /app/dist ./dist

ENV PORT=80
EXPOSE 80

CMD ["deno", "run", "--allow-all", "server.ts"]
