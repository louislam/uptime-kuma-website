# ---- Stage 1: build the frontend with Vite+ (Node-based) ----
FROM node:26-trixie-slim AS frontend

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# Emits /app/dist
RUN npm run build

# ---- Stage 2: Node runtime serving the built site ----
FROM node:26-trixie-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server.ts version.json github-public-sponsors.json ./
COPY src/ ./src/
RUN mkdir -p cache

COPY --from=frontend /app/dist ./dist

ENV PORT=80
EXPOSE 80

CMD ["node", "server.ts"]
