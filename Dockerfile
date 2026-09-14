# syntax=docker/dockerfile:1
# ============================================================================
# Imagen de producción — Generador de invitaciones (frontend Vite + server Express)
# ============================================================================
# Motivo de un Dockerfile propio (en lugar de nixpacks):
#   1. El paso nix de nixpacks descarga nixpkgs desde GitHub en cada build y
#      falla (exit 255) cuando el builder tiene red lenta/bloqueada a GitHub.
#   2. puppeteer necesita Chromium en runtime (screenshots og:image): se usa
#      el del sistema (PUPPETEER_SKIP_DOWNLOAD evita ~170MB en npm install).
#
# Datos (server/database.sqlite, server/storage) NO se hornean: se crean al
# arrancar o llegan por volumen montado (rutas idénticas a nixpacks: /app/...).
# ============================================================================

# ---------- Builder: dependencias nativas (better-sqlite3) + frontend ----------
FROM node:22-bookworm-slim AS builder
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package.json package-lock.json ./
# Chromium llega por apt en runtime: saltar la descarga de puppeteer
RUN PUPPETEER_SKIP_DOWNLOAD=1 npm ci

COPY . .
RUN npm run build

# ---------- Runtime: Node + Chromium para el screenshot service ----------
FROM node:22-bookworm-slim
ENV NODE_ENV=production \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

RUN apt-get update \
 && apt-get install -y --no-install-recommends chromium fonts-liberation \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app ./
RUN mkdir -p server/storage/og server/storage/historico server/storage/users server/data

EXPOSE 3001
CMD ["node", "server/index.js"]
