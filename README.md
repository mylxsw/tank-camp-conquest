# 营地坦克割据

浏览器俯视坦克割据（工作名）。pnpm monorepo：`shared` / `server` / `client`。

## 开发

需要 Node.js ≥ 20。建议用 corepack 提供的 pnpm：

```bash
corepack enable
corepack pnpm install
corepack pnpm test
# 终端 1：会先编译 @tcc/shared 再启动 Colyseus（默认 :2567）
corepack pnpm --filter @tcc/server dev
# 终端 2：Vite 客户端（默认 :5173）
corepack pnpm --filter @tcc/client dev
```

浏览器打开 http://localhost:5173/ 。

若只装依赖、忘了编 shared，直接跑 server 会报找不到 `@tcc/shared/dist`。`pnpm install` 的 postinstall 与 `dev` 脚本都会自动 `build` shared；也可手动：

```bash
corepack pnpm --filter @tcc/shared build
```

## 部署（VPS / 好友）

见 [docs/deploy-vps.md](docs/deploy-vps.md)：域名 DNS → `.env` → `docker compose up -d --build`（Caddy 自动 HTTPS；也可 IP+HTTP）。
