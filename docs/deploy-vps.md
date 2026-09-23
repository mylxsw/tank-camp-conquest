# VPS 部署（Stage A · 好友可玩）

单机 Docker Compose：**Caddy**（对外 80/443，可自动 HTTPS）→ **nginx web**（静态 + `/colyseus` 反代）→ **Colyseus server**。

有域名优先 HTTPS（`wss://`）；没有域名可用公网 IP + HTTP。

## 前提

- 已有 VPS，已装 **Docker + Compose v2**
- 安全组/防火墙放行 **80**、**443**（HTTPS 时两者都要）
- 无需备案材料；本阶段好友用浏览器打开 URL 即可

---

## A. 有域名 · HTTPS（推荐）

### 1. DNS

在域名控制台添加 **A 记录**（或 AAAA）指向 VPS 公网 IP，等待生效：

```bash
# 本机或任意机器探测（应返回你的 VPS IP）
dig +short tank.example.com A
```

### 2. 克隆与配置

```bash
git clone https://github.com/mylxsw/tank-camp-conquest.git
cd tank-camp-conquest
cp .env.example .env
```

编辑 `.env`（域名三处一致）：

```env
DOMAIN=tank.example.com
PUBLIC_HOST=tank.example.com
SITE_ADDRESS=tank.example.com
ACME_EMAIL=you@example.com
COLYSEUS_URL=
```

### 3. 启动

```bash
docker compose up -d --build
docker compose ps
curl -sI https://tank.example.com/ | head -5
curl -s https://tank.example.com/config.json
```

Caddy 会自动申请 Let's Encrypt 证书；好友打开：

**`https://tank.example.com/`**

客户端自动用 **`wss://tank.example.com/colyseus`**（`COLYSEUS_URL` 留空即可）。

---

## B. 无域名 · HTTP 回退（IP）

`.env`：

```env
DOMAIN=
PUBLIC_HOST=YOUR_VPS_IP
SITE_ADDRESS=:80
ACME_EMAIL=
COLYSEUS_URL=
```

```bash
docker compose up -d --build
```

好友打开 **`http://YOUR_VPS_IP/`**（自动 `ws://IP/colyseus`）。

---

## 防火墙

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload
```

一般**不必**对外暴露 `2567`；WebSocket 走 Caddy → nginx 的 `/colyseus`。

---

## 环境变量摘要

| 变量 | 说明 |
|------|------|
| `DOMAIN` / `PUBLIC_HOST` | 展示与文档用主机名 |
| `SITE_ADDRESS` | Caddy 站点：`域名` = 自动 HTTPS；`:80` = 纯 HTTP |
| `ACME_EMAIL` | Let's Encrypt 通知邮箱（HTTPS 建议填） |
| `COLYSEUS_PATH` | 默认 `/colyseus` |
| `COLYSEUS_URL` | 可选写死 WS；空则按页面协议自动 `ws`/`wss` |
| `HTTP_PORT` / `HTTPS_PORT` | 宿主机映射，默认 80/443 |

---

## 更新

```bash
cd tank-camp-conquest
git pull
docker compose up -d --build
```

## 常见问题

- **HTTPS 证书失败**：确认 DNS A 已指到本机、80/443 对公网开放、`SITE_ADDRESS` 是域名不是 `:80`。
- **页面开得了但进不了房**：看浏览器控制台 WS 是否 `wss://域名/colyseus`；`curl /config.json`。
- **仍想直连 2567**：给 `server` 加 `ports`，并设 `COLYSEUS_URL=wss://域名:2567`（需自行证书面向该端口，一般不推荐）。
