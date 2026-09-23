# syntax=docker/dockerfile:1
# Multi-stage: build shared+client+server; server = Colyseus; web = nginx static + /colyseus proxy.

FROM node:20-bookworm AS build
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json .nvmrc ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/
RUN pnpm install --frozen-lockfile
COPY packages/shared packages/shared
COPY packages/server packages/server
COPY packages/client packages/client
RUN pnpm --filter @tcc/shared build \
 && pnpm --filter @tcc/server build \
 && pnpm --filter @tcc/client build

# --- Colyseus game server ---
FROM node:20-bookworm-slim AS server
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/
# Install workspace deps (shared+server runtime); skip scripts to avoid client prepare
RUN pnpm install --frozen-lockfile --ignore-scripts \
 && pnpm --filter @tcc/shared --filter @tcc/server rebuild 2>/dev/null || true
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/packages/server/dist packages/server/dist
EXPOSE 2567
WORKDIR /app/packages/server
CMD ["node", "dist/index.js"]

# --- nginx static + reverse proxy (behind Caddy) ---
FROM nginx:1.27-alpine AS web
COPY --from=build /app/packages/client/dist /usr/share/nginx/html
COPY deploy/nginx.conf /etc/nginx/templates/default.conf.template
COPY deploy/web-entrypoint.sh /docker-entrypoint.d/99-tcc-config.sh
RUN chmod +x /docker-entrypoint.d/99-tcc-config.sh
ENV PUBLIC_HOST=localhost \
    COLYSEUS_PATH=/colyseus \
    COLYSEUS_URL= \
    SERVER_HOST=server \
    SERVER_PORT=2567
EXPOSE 80
