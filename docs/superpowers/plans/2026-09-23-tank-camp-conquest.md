# 营地坦克割据 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现常驻房间的浏览器俯视坦克割据玩法：32 营固定槽位、权威服务器判定毁核易主与全丢出局、随机重生、中立点/空投/攻城弹驱动冲突、软加压、桌面+手机双端可完整一轮，游客昵称即玩。

**Architecture:** TypeScript pnpm monorepo。`packages/shared` 承载纯函数规则与模拟（Vitest 驱动）；`packages/server` 用 Colyseus 0.15 权威房间跑 tick、join、AI、广播；`packages/client` 用 Phaser 3 渲染、预测插值、双端输入与 HUD/结算。服务器对命中、核心伤害、所有权变更原子处理；客户端视野裁剪与本地 `localStorage` 存历史最佳。

**Tech Stack:** Node 20+、pnpm、TypeScript、Vitest、Colyseus 0.15、`@colyseus/schema`、Phaser 3、express（静态托管可选）、ws via Colyseus。

## Global Constraints

- **YAGNI / v1 MUST NOT：** 真·100 人单房、跨房战争、世界地图、账号/皮肤商城/支付、车型配件成长树、正式同盟/公会、精致观战录像、匹配段位赛季、毒圈缩图、手动选营重生、「公开标记占地第一」荣誉目标、永久局外成长、房间强制实时排行榜（v1 仅本轮面板+本地最佳）。
- **权威性：** 命中、核心伤害、所有权、出局只信服务器；客户端可预测移动射击但关键事件以广播校正。
- **房间：** 常驻开启，无全场统一倒计时；满员后开新房；人机垫场。
- **语言：** 计划与注释说明用中文；代码标识符、文件名、提交信息主题用英文。
- **提交：** 每个 Task 末尾有 commit 步骤；由执行代理按步提交。本计划撰写阶段 **不要** 提交。
- **TDD：** `packages/shared` 内模拟/规则逻辑必须先写失败测试再写实现。

---

## File Structure

```text
tank-camp-conquest/
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .gitignore
├── .nvmrc
├── README.md
├── packages/
│   ├── shared/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vitest.config.ts
│   │   └── src/
│   │       ├── index.ts
│   │       ├── constants.ts
│   │       ├── types.ts
│   │       ├── map/
│   │       │   ├── terrain.ts
│   │       │   ├── campLayout.ts
│   │       │   ├── walls.ts
│   │       │   └── createInitialMap.ts
│   │       ├── sim/
│   │       │   ├── ownership.ts
│   │       │   ├── respawn.ts
│   │       │   ├── combat.ts
│   │       │   ├── resources.ts
│   │       │   ├── airdrop.ts
│   │       │   ├── softPressure.ts
│   │       │   ├── joinAssign.ts
│   │       │   ├── ai.ts
│   │       │   └── tick.ts
│   │       └── __tests__/
│   │           ├── ownership.test.ts
│   │           ├── respawn.test.ts
│   │           ├── combat.test.ts
│   │           ├── resources.test.ts
│   │           ├── airdrop.test.ts
│   │           ├── softPressure.test.ts
│   │           ├── joinAssign.test.ts
│   │           ├── ai.test.ts
│   │           ├── campLayout.test.ts
│   │           └── tick.test.ts
│   ├── server/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── config.ts
│   │       ├── rooms/
│   │       │   ├── TankRoom.ts
│   │       │   └── schema.ts
│   │       └── systems/
│   │           ├── applyInput.ts
│   │           ├── visibility.ts
│   │           └── aiDriver.ts
│   └── client/
│       ├── package.json
│       ├── tsconfig.json
│       ├── index.html
│       ├── vite.config.ts
│       └── src/
│           ├── main.ts
│           ├── net/
│           │   ├── ColyseusClient.ts
│           │   └── roomName.ts
│           ├── scenes/
│           │   ├── BootScene.ts
│           │   ├── GameScene.ts
│           │   └── DeathScene.ts
│           ├── input/
│           │   ├── DesktopInput.ts
│           │   ├── TouchInput.ts
│           │   └── InputManager.ts
│           ├── ui/
│           │   ├── Hud.ts
│           │   ├── Minimap.ts
│           │   └── DeathPanel.ts
│           ├── render/
│           │   ├── TankSprite.ts
│           │   ├── CampRenderer.ts
│           │   └── ProjectileRenderer.ts
│           └── storage/
│               └── localStats.ts
└── docs/superpowers/
    ├── specs/2026-09-23-tank-camp-conquest-design.md
    └── plans/2026-09-23-tank-camp-conquest.md
```

**职责摘要**

| 路径 | 职责 |
|------|------|
| `packages/shared` | 无 I/O 规则与 tick；唯一真相来源，供 server 调用与 client 预测复用 |
| `packages/server` | Colyseus 房间生命周期、Schema 同步、tick 调度、视野消息、AI 驱动 |
| `packages/client` | Phaser 渲染、输入、HUD/结算、localStorage、连接房间 |

---

## Task 1: Monorepo 脚手架

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.gitignore`, `.nvmrc`, `README.md`
- Create: `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/shared/vitest.config.ts`, `packages/shared/src/index.ts`
- Create: `packages/server/package.json`, `packages/server/tsconfig.json`, `packages/server/src/index.ts`
- Create: `packages/client/package.json`, `packages/client/tsconfig.json`, `packages/client/vite.config.ts`, `packages/client/index.html`, `packages/client/src/main.ts`

- [ ] **Step 1: 写根 workspace 文件**

创建 `pnpm-workspace.yaml`:

```yaml
packages:
  - "packages/*"
```

创建 `.nvmrc`:

```text
20
```

创建 `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "sourceMap": true,
    "resolveJsonModule": true
  }
}
```

创建 `.gitignore`:

```text
node_modules
dist
coverage
.DS_Store
*.log
.env
.env.*
```

创建根 `package.json`:

```json
{
  "name": "tank-camp-conquest",
  "private": true,
  "packageManager": "pnpm@9.15.0",
  "engines": { "node": ">=20" },
  "scripts": {
    "build": "pnpm -r run build",
    "test": "pnpm --filter @tcc/shared test",
    "dev:server": "pnpm --filter @tcc/server dev",
    "dev:client": "pnpm --filter @tcc/client dev",
    "typecheck": "pnpm -r run typecheck"
  }
}
```

创建 `README.md`:

```markdown
# 营地坦克割据

浏览器俯视坦克割据（工作名）。pnpm monorepo：`shared` / `server` / `client`。

## 开发

```bash
pnpm install
pnpm test
pnpm dev:server
pnpm dev:client
```
```

- [ ] **Step 2: 写 shared 包骨架**

`packages/shared/package.json`:

```json
{
  "name": "@tcc/shared",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "typescript": "^5.7.2",
    "vitest": "^2.1.8"
  }
}
```

`packages/shared/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "composite": true
  },
  "include": ["src/**/*"]
}
```

`packages/shared/vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "src/__tests__/**/*.test.ts"],
    environment: "node",
  },
});
```

`packages/shared/src/index.ts`:

```typescript
export const TCC_VERSION = "0.0.1";
```

- [ ] **Step 3: 写 server / client 最小包**

`packages/server/package.json`:

```json
{
  "name": "@tcc/server",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@tcc/shared": "workspace:*",
    "@colyseus/schema": "^2.0.35",
    "colyseus": "^0.15.26",
    "express": "^4.21.2"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^22.10.2",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2"
  }
}
```

`packages/server/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "experimentalDecorators": true,
    "useDefineForClassFields": false
  },
  "include": ["src/**/*"],
  "references": [{ "path": "../shared" }]
}
```

`packages/server/src/index.ts`:

```typescript
console.log("[tcc-server] scaffold ready");
```

`packages/client/package.json`:

```json
{
  "name": "@tcc/client",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -p tsconfig.json && vite build",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "preview": "vite preview"
  },
  "dependencies": {
    "@tcc/shared": "workspace:*",
    "colyseus.js": "^0.15.25",
    "phaser": "^3.87.0"
  },
  "devDependencies": {
    "typescript": "^5.7.2",
    "vite": "^6.0.3"
  }
}
```

`packages/client/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM"]
  },
  "include": ["src/**/*"]
}
```

`packages/client/vite.config.ts`:

```typescript
import { defineConfig } from "vite";

export default defineConfig({
  server: { port: 5173, host: true },
  build: { outDir: "dist" },
});
```

`packages/client/index.html`:

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>营地坦克割据</title>
    <style>
      html, body, #game { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #111; }
    </style>
  </head>
  <body>
    <div id="game"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`packages/client/src/main.ts`:

```typescript
console.log("[tcc-client] scaffold ready");
```

- [ ] **Step 4: 安装并验证**

Run:

```bash
cd /workspace/tank-camp-conquest && pnpm install && pnpm --filter @tcc/shared test && pnpm --filter @tcc/shared build
```

Expected: 安装成功；Vitest 报告无测试文件或 0 tests；`shared` 产出 `dist/index.js`。

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "$(cat <<'EOF'
chore: scaffold pnpm monorepo with shared/server/client

EOF
)"
```

---

## Task 2: Shared 常量、类型与地图布局

**Files:**
- Create: `packages/shared/src/constants.ts`
- Create: `packages/shared/src/types.ts`
- Create: `packages/shared/src/map/terrain.ts`
- Create: `packages/shared/src/map/campLayout.ts`
- Create: `packages/shared/src/map/walls.ts`
- Create: `packages/shared/src/map/createInitialMap.ts`
- Create: `packages/shared/src/__tests__/campLayout.test.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: 写失败测试（营地数量与唯一性）**

创建 `packages/shared/src/__tests__/campLayout.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { CAMP_SLOT_COUNT, TILE_SIZE, MAP_TILES } from "../constants.js";
import { generateCampSlots } from "../map/campLayout.js";
import { createInitialMap } from "../map/createInitialMap.js";
import { Terrain } from "../map/terrain.js";

describe("campLayout", () => {
  it("generates exactly 32 unique camp slots inside map bounds", () => {
    const slots = generateCampSlots();
    expect(slots).toHaveLength(CAMP_SLOT_COUNT);
    const keys = new Set(slots.map((s) => `${s.tileX},${s.tileY}`));
    expect(keys.size).toBe(CAMP_SLOT_COUNT);
    for (const s of slots) {
      expect(s.tileX).toBeGreaterThanOrEqual(2);
      expect(s.tileY).toBeGreaterThanOrEqual(2);
      expect(s.tileX).toBeLessThan(MAP_TILES - 2);
      expect(s.tileY).toBeLessThan(MAP_TILES - 2);
      expect(s.worldX).toBe(s.tileX * TILE_SIZE + TILE_SIZE / 2);
      expect(s.worldY).toBe(s.tileY * TILE_SIZE + TILE_SIZE / 2);
    }
  });
});

describe("createInitialMap", () => {
  it("builds map with camps, terrain variety, and neutral points", () => {
    const map = createInitialMap(42);
    expect(map.camps).toHaveLength(CAMP_SLOT_COUNT);
    expect(map.terrain.length).toBe(MAP_TILES * MAP_TILES);
    expect(map.terrain.some((t) => t === Terrain.Water)).toBe(true);
    expect(map.terrain.some((t) => t === Terrain.Grass)).toBe(true);
    expect(map.terrain.some((t) => t === Terrain.Empty)).toBe(true);
    expect(map.neutralPoints.length).toBeGreaterThanOrEqual(1);
    expect(map.camps.every((c) => c.ownerPlayerId === null)).toBe(true);
    expect(map.camps.every((c) => c.coreHp === map.camps[0]!.coreHp)).toBe(true);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter @tcc/shared test`

Expected: FAIL（模块不存在或导出缺失）。

- [ ] **Step 3: 实现常量与类型**

`packages/shared/src/constants.ts`:

```typescript
export const CAMP_SLOT_COUNT = 32;
export const TILE_SIZE = 32;
export const MAP_TILES = 64;
export const MAP_WORLD_SIZE = MAP_TILES * TILE_SIZE;

export const TICK_HZ = 20;
export const TICK_DT = 1 / TICK_HZ;

export const TANK_SPEED = 120;
export const TANK_RADIUS = 14;
export const TANK_MAX_HP = 100;
export const TANK_FIRE_COOLDOWN = 0.35;

export const PROJECTILE_SPEED = 320;
export const PROJECTILE_RADIUS = 4;
export const NORMAL_DAMAGE_TANK = 25;
export const NORMAL_DAMAGE_BRICK = 1;
export const SIEGE_DAMAGE_CORE = 40;
export const SIEGE_DAMAGE_TANK = 10;
export const HE_DAMAGE_BRICK = 3;

export const CORE_MAX_HP = 200; // 与 SIEGE_DAMAGE_CORE=40 配比：约 2–3 名持攻城弹玩家数十秒可拆无保护核心
export const CORE_PROTECTION_MIN_S = 30;
export const CORE_PROTECTION_MAX_S = 60;
export const RESPAWN_INVULN_S = 1.5;

export const SOFT_PRESSURE_CAMP_THRESHOLD = 8;
export const AIRDROP_INTERVAL_S = 45;
export const AIRDROP_FALL_S = 8;

export const MAX_ARMOR_PLATES = 3;
export const ARMOR_PLATE_HP = 30;
export const REPAIR_AMOUNT = 40;

export const START_NORMAL_AMMO = 30;
export const START_SIEGE_AMMO = 0;

export const AI_FILL_TARGET_PLAYERS = 12;
export const VISIBILITY_RADIUS = 640;

export const BRICK_HP = 2;
export const STEEL_INDESTRUCTIBLE = true;

export enum AmmoType {
  Normal = 0,
  Siege = 1,
  HE = 2,
}

export enum NeutralKind {
  AmmoDepot = 0,
  RepairBay = 1,
  OilWell = 2,
}
```

`packages/shared/src/types.ts`:

```typescript
import type { AmmoType, NeutralKind } from "./constants.js";

export type Direction = 0 | 1 | 2 | 3; // up right down left

export interface Vec2 {
  x: number;
  y: number;
}

export interface CampSlot {
  campId: number;
  tileX: number;
  tileY: number;
  worldX: number;
  worldY: number;
}

export interface CampState {
  campId: number;
  ownerPlayerId: string | null;
  coreHp: number;
  coreMaxHp: number;
  protectionUntil: number;
  worldX: number;
  worldY: number;
  isAiOwner: boolean;
}

export interface TankState {
  playerId: string;
  x: number;
  y: number;
  dir: Direction;
  hp: number;
  armorPlates: number;
  invulnUntil: number;
  fireCooldown: number;
  alive: boolean;
  ammoNormal: number;
  ammoSiege: number;
  ammoHE: number;
  selectedAmmo: AmmoType;
}

export interface PlayerState {
  playerId: string;
  nickname: string;
  isAi: boolean;
  campIds: number[];
  tank: TankState;
  eliminated: boolean;
  joinedAt: number;
  maxCampsOwned: number;
  tanksDestroyed: number;
  campsCaptured: number;
  sessionToken: string;
}

export interface ProjectileState {
  id: number;
  ownerPlayerId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ammo: AmmoType;
  alive: boolean;
}

export interface WallCell {
  tileX: number;
  tileY: number;
  kind: "brick" | "steel";
  hp: number;
}

export interface NeutralPoint {
  id: number;
  kind: NeutralKind;
  x: number;
  y: number;
  cooldownRemaining: number;
}

export interface AirdropState {
  id: number;
  x: number;
  y: number;
  landAt: number;
  landed: boolean;
  siegeAmmo: number;
  armorPlates: number;
  heAmmo: number;
  claimed: boolean;
}

export interface RoomSimState {
  time: number;
  seed: number;
  camps: CampState[];
  players: Record<string, PlayerState>;
  projectiles: ProjectileState[];
  walls: WallCell[];
  terrain: number[];
  neutralPoints: NeutralPoint[];
  airdrops: AirdropState[];
  nextProjectileId: number;
  nextAirdropId: number;
  nextAirdropAt: number;
  softPressureActive: boolean;
}

export interface PlayerInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  fire: boolean;
  selectAmmo: AmmoType | null;
}

export interface DeathStats {
  survivedMs: number;
  maxCampsOwned: number;
  campsAtDeath: number;
  tanksDestroyed: number;
  campsCaptured: number;
  relativeStanding: string;
}
```

`packages/shared/src/map/terrain.ts`:

```typescript
export enum Terrain {
  Empty = 0,
  Water = 1,
  Grass = 2,
}

export function terrainIndex(tileX: number, tileY: number, mapTiles: number): number {
  return tileY * mapTiles + tileX;
}

export function isPassable(terrain: number[], tileX: number, tileY: number, mapTiles: number): boolean {
  if (tileX < 0 || tileY < 0 || tileX >= mapTiles || tileY >= mapTiles) return false;
  const t = terrain[terrainIndex(tileX, tileY, mapTiles)]!;
  return t !== Terrain.Water;
}

export function blocksVision(terrain: number[], tileX: number, tileY: number, mapTiles: number): boolean {
  if (tileX < 0 || tileY < 0 || tileX >= mapTiles || tileY >= mapTiles) return true;
  return terrain[terrainIndex(tileX, tileY, mapTiles)] === Terrain.Grass;
}
```

`packages/shared/src/map/campLayout.ts`:

```typescript
import { CAMP_SLOT_COUNT, MAP_TILES, TILE_SIZE } from "../constants.js";
import type { CampSlot } from "../types.js";

/** 浅网格：外圈与次外圈均匀散布 32 营，保证相邻可达。 */
export function generateCampSlots(): CampSlot[] {
  const slots: CampSlot[] = [];
  const cols = 8;
  const rows = 4;
  const margin = 4;
  const usable = MAP_TILES - margin * 2;
  let id = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tileX = margin + Math.round((c + 0.5) * (usable / cols));
      const tileY = margin + Math.round((r + 0.5) * (usable / rows));
      slots.push({
        campId: id,
        tileX,
        tileY,
        worldX: tileX * TILE_SIZE + TILE_SIZE / 2,
        worldY: tileY * TILE_SIZE + TILE_SIZE / 2,
      });
      id += 1;
    }
  }
  if (slots.length !== CAMP_SLOT_COUNT) {
    throw new Error(`expected ${CAMP_SLOT_COUNT} camps, got ${slots.length}`);
  }
  return slots;
}
```

`packages/shared/src/map/walls.ts`:

```typescript
import { BRICK_HP, MAP_TILES, TILE_SIZE } from "../constants.js";
import type { CampSlot, WallCell } from "../types.js";

/** 每座营核心内侧简易围墙：四面各留一个入口缺口。 */
export function buildCampWalls(slots: CampSlot[]): WallCell[] {
  const walls: WallCell[] = [];
  const seen = new Set<string>();
  const add = (tileX: number, tileY: number, kind: "brick" | "steel") => {
    if (tileX < 1 || tileY < 1 || tileX >= MAP_TILES - 1 || tileY >= MAP_TILES - 1) return;
    const key = `${tileX},${tileY}`;
    if (seen.has(key)) return;
    seen.add(key);
    walls.push({ tileX, tileY, kind, hp: kind === "brick" ? BRICK_HP : 999 });
  };

  for (const s of slots) {
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        if (Math.abs(dx) !== 2 && Math.abs(dy) !== 2) continue;
        if (dx === 0 && Math.abs(dy) === 2) continue;
        if (dy === 0 && Math.abs(dx) === 2) continue;
        add(s.tileX + dx, s.tileY + dy, "brick");
      }
    }
    add(s.tileX - 2, s.tileY - 2, "steel");
    add(s.tileX + 2, s.tileY + 2, "steel");
  }
  return walls;
}

export function wallAt(walls: WallCell[], worldX: number, worldY: number): WallCell | undefined {
  const tileX = Math.floor(worldX / TILE_SIZE);
  const tileY = Math.floor(worldY / TILE_SIZE);
  return walls.find((w) => w.tileX === tileX && w.tileY === tileY && w.hp > 0);
}
```

`packages/shared/src/map/createInitialMap.ts`:

```typescript
import { CORE_MAX_HP, MAP_TILES, NeutralKind, TILE_SIZE } from "../constants.js";
import type { CampState, NeutralPoint, RoomSimState, WallCell } from "../types.js";
import { generateCampSlots } from "./campLayout.js";
import { Terrain, terrainIndex } from "./terrain.js";
import { buildCampWalls } from "./walls.js";

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function createInitialMap(seed: number): Pick<
  RoomSimState,
  | "camps" | "terrain" | "walls" | "neutralPoints" | "airdrops" | "projectiles"
  | "nextProjectileId" | "nextAirdropId" | "nextAirdropAt" | "softPressureActive"
  | "seed" | "time" | "players"
> {
  const rand = mulberry32(seed);
  const slots = generateCampSlots();
  const terrain = new Array<number>(MAP_TILES * MAP_TILES).fill(Terrain.Empty);

  for (let y = 0; y < MAP_TILES; y++) {
    for (let x = 0; x < MAP_TILES; x++) {
      const cx = Math.abs(x - MAP_TILES / 2);
      const cy = Math.abs(y - MAP_TILES / 2);
      if (cx < 6 && cy < 6 && (cx > 3 || cy > 3) && rand() < 0.35) {
        terrain[terrainIndex(x, y, MAP_TILES)] = Terrain.Water;
      } else if (rand() < 0.08) {
        terrain[terrainIndex(x, y, MAP_TILES)] = Terrain.Grass;
      }
    }
  }

  for (const s of slots) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        terrain[terrainIndex(s.tileX + dx, s.tileY + dy, MAP_TILES)] = Terrain.Empty;
      }
    }
  }

  const camps: CampState[] = slots.map((s) => ({
    campId: s.campId,
    ownerPlayerId: null,
    coreHp: CORE_MAX_HP,
    coreMaxHp: CORE_MAX_HP,
    protectionUntil: 0,
    worldX: s.worldX,
    worldY: s.worldY,
    isAiOwner: false,
  }));

  const walls: WallCell[] = buildCampWalls(slots);

  const neutralPoints: NeutralPoint[] = [
    { id: 0, kind: NeutralKind.AmmoDepot, x: MAP_TILES * TILE_SIZE * 0.5, y: MAP_TILES * TILE_SIZE * 0.5, cooldownRemaining: 0 },
    { id: 1, kind: NeutralKind.RepairBay, x: MAP_TILES * TILE_SIZE * 0.35, y: MAP_TILES * TILE_SIZE * 0.5, cooldownRemaining: 0 },
    { id: 2, kind: NeutralKind.OilWell, x: MAP_TILES * TILE_SIZE * 0.65, y: MAP_TILES * TILE_SIZE * 0.5, cooldownRemaining: 0 },
    { id: 3, kind: NeutralKind.AmmoDepot, x: MAP_TILES * TILE_SIZE * 0.5, y: MAP_TILES * TILE_SIZE * 0.35, cooldownRemaining: 0 },
  ];

  return {
    seed, time: 0, camps, terrain, walls, neutralPoints,
    airdrops: [], projectiles: [], players: {},
    nextProjectileId: 1, nextAirdropId: 1, nextAirdropAt: 20, softPressureActive: false,
  };
}
```

更新 `packages/shared/src/index.ts`:

```typescript
export const TCC_VERSION = "0.0.1";
export * from "./constants.js";
export * from "./types.js";
export * from "./map/terrain.js";
export * from "./map/campLayout.js";
export * from "./map/walls.js";
export * from "./map/createInitialMap.js";
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm --filter @tcc/shared test`

Expected: `campLayout` / `createInitialMap` 相关测试 PASS。

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "$(cat <<'EOF'
feat(shared): map constants, terrain, 32-camp layout

EOF
)"
```

---

## Task 3: 所有权变更与出局（原子路径）

**Interfaces（供后续 Task 引用）:**

```typescript
// packages/shared/src/sim/ownership.ts
export interface OwnershipEvent {
  type: "capture" | "eliminate";
  campId: number;
  previousOwnerId: string | null;
  newOwnerId: string | null;
  eliminatedPlayerId?: string;
}

export function applyCoreDestroyed(
  state: RoomSimState,
  campId: number,
  attackerPlayerId: string,
  now: number,
): OwnershipEvent[];
```

**Files:**
- Create: `packages/shared/src/sim/ownership.ts`
- Create: `packages/shared/src/__tests__/ownership.test.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: 写失败测试**

```typescript
import { describe, expect, it } from "vitest";
import { CORE_MAX_HP } from "../constants.js";
import { createInitialMap } from "../map/createInitialMap.js";
import { applyCoreDestroyed } from "../sim/ownership.js";
import type { PlayerState, RoomSimState, TankState } from "../types.js";

function tank(playerId: string, overrides: Partial<TankState> = {}): TankState {
  return {
    playerId, x: 0, y: 0, dir: 0, hp: 100, armorPlates: 0, invulnUntil: 0,
    fireCooldown: 0, alive: true, ammoNormal: 30, ammoSiege: 0, ammoHE: 0, selectedAmmo: 0,
    ...overrides,
  };
}

function player(id: string, camps: number[], isAi = false): PlayerState {
  return {
    playerId: id, nickname: id, isAi, campIds: [...camps], tank: tank(id),
    eliminated: false, joinedAt: 0, maxCampsOwned: camps.length, tanksDestroyed: 0,
    campsCaptured: 0, sessionToken: id,
  };
}

function baseState(): RoomSimState {
  const map = createInitialMap(1);
  return { ...map, players: {} } as RoomSimState;
}

describe("applyCoreDestroyed", () => {
  it("transfers camp ownership to attacker and updates camp lists", () => {
    const state = baseState();
    state.players["A"] = player("A", [0]);
    state.players["B"] = player("B", [1, 2]);
    state.camps[1]!.ownerPlayerId = "B";
    state.camps[1]!.coreHp = 0;
    state.camps[0]!.ownerPlayerId = "A";
    state.camps[2]!.ownerPlayerId = "B";

    const events = applyCoreDestroyed(state, 1, "A", 10);
    expect(events).toEqual([{ type: "capture", campId: 1, previousOwnerId: "B", newOwnerId: "A" }]);
    expect(state.camps[1]!.ownerPlayerId).toBe("A");
    expect(state.camps[1]!.coreHp).toBe(CORE_MAX_HP);
    expect(state.camps[1]!.isAiOwner).toBe(false);
    expect(state.players["A"]!.campIds.sort()).toEqual([0, 1]);
    expect(state.players["B"]!.campIds).toEqual([2]);
    expect(state.players["A"]!.campsCaptured).toBe(1);
    expect(state.players["A"]!.maxCampsOwned).toBe(2);
    expect(state.players["B"]!.eliminated).toBe(false);
  });

  it("eliminates previous owner when last camp is lost", () => {
    const state = baseState();
    state.players["A"] = player("A", [0]);
    state.players["B"] = player("B", [1]);
    state.camps[0]!.ownerPlayerId = "A";
    state.camps[1]!.ownerPlayerId = "B";
    state.camps[1]!.coreHp = 0;

    const events = applyCoreDestroyed(state, 1, "A", 12);
    expect(events.map((e) => e.type)).toEqual(["capture", "eliminate"]);
    expect(state.players["B"]!.eliminated).toBe(true);
    expect(state.players["B"]!.campIds).toEqual([]);
    expect(state.players["B"]!.tank.alive).toBe(false);
    expect(events[1]).toMatchObject({
      type: "eliminate", eliminatedPlayerId: "B", previousOwnerId: "B", newOwnerId: "A", campId: 1,
    });
  });

  it("ignores destroy when core is under protection", () => {
    const state = baseState();
    state.players["A"] = player("A", [0]);
    state.players["B"] = player("B", [1]);
    state.camps[1]!.ownerPlayerId = "B";
    state.camps[1]!.protectionUntil = 100;
    state.camps[1]!.coreHp = 0;
    const events = applyCoreDestroyed(state, 1, "A", 50);
    expect(events).toEqual([]);
    expect(state.camps[1]!.ownerPlayerId).toBe("B");
    expect(state.camps[1]!.coreHp).toBe(CORE_MAX_HP);
  });

  it("does not allow owning zero camps without elimination (no nomad)", () => {
    const state = baseState();
    state.players["A"] = player("A", [0]);
    state.players["B"] = player("B", [1]);
    state.camps[1]!.ownerPlayerId = "B";
    applyCoreDestroyed(state, 1, "A", 1);
    expect(state.players["B"]!.campIds.length).toBe(0);
    expect(state.players["B"]!.eliminated).toBe(true);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm --filter @tcc/shared test`

Expected: FAIL — `ownership.js` 不存在。

- [ ] **Step 3: 实现 ownership.ts**

```typescript
import { CORE_MAX_HP } from "../constants.js";
import type { RoomSimState } from "../types.js";

export interface OwnershipEvent {
  type: "capture" | "eliminate";
  campId: number;
  previousOwnerId: string | null;
  newOwnerId: string | null;
  eliminatedPlayerId?: string;
}

/**
 * 原子路径：拆核 → 易主（重置核心满血、清保护）→ 若原主无营则出局。
 * 保护期内调用方应避免扣血；此处仍做防御性拒绝。
 */
export function applyCoreDestroyed(
  state: RoomSimState,
  campId: number,
  attackerPlayerId: string,
  now: number,
): OwnershipEvent[] {
  const camp = state.camps[campId];
  const attacker = state.players[attackerPlayerId];
  if (!camp || !attacker || attacker.eliminated) return [];
  if (camp.protectionUntil > now) {
    camp.coreHp = camp.coreMaxHp;
    return [];
  }
  if (camp.ownerPlayerId === attackerPlayerId) return [];

  const previousOwnerId = camp.ownerPlayerId;
  const events: OwnershipEvent[] = [];

  camp.ownerPlayerId = attackerPlayerId;
  camp.coreHp = CORE_MAX_HP;
  camp.coreMaxHp = CORE_MAX_HP;
  camp.protectionUntil = 0;
  camp.isAiOwner = attacker.isAi;

  if (previousOwnerId && state.players[previousOwnerId]) {
    const prev = state.players[previousOwnerId]!;
    prev.campIds = prev.campIds.filter((id) => id !== campId);
  }

  if (!attacker.campIds.includes(campId)) {
    attacker.campIds.push(campId);
  }
  attacker.campsCaptured += 1;
  attacker.maxCampsOwned = Math.max(attacker.maxCampsOwned, attacker.campIds.length);

  events.push({ type: "capture", campId, previousOwnerId, newOwnerId: attackerPlayerId });

  if (previousOwnerId && state.players[previousOwnerId]) {
    const prev = state.players[previousOwnerId]!;
    if (prev.campIds.length === 0 && !prev.eliminated) {
      prev.eliminated = true;
      prev.tank.alive = false;
      events.push({
        type: "eliminate",
        campId,
        previousOwnerId,
        newOwnerId: attackerPlayerId,
        eliminatedPlayerId: previousOwnerId,
      });
    }
  }

  return events;
}
```

在 `index.ts` 增加：`export * from "./sim/ownership.js";`

- [ ] **Step 4: 测试通过**

Run: `pnpm --filter @tcc/shared test`

Expected: ownership 测试全绿。

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "$(cat <<'EOF'
feat(shared): atomic core destroy ownership and elimination

EOF
)"
```

---

## Task 4: 重生与短无敌

**Interfaces:**

```typescript
// packages/shared/src/sim/respawn.ts
export function pickRespawnCampId(
  state: RoomSimState,
  playerId: string,
  rand: () => number,
): number | null;

export function respawnTank(
  state: RoomSimState,
  playerId: string,
  now: number,
  rand: () => number,
): boolean;
```

**Files:**
- Create: `packages/shared/src/sim/respawn.ts`
- Create: `packages/shared/src/__tests__/respawn.test.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: 写失败测试**

```typescript
import { describe, expect, it } from "vitest";
import { RESPAWN_INVULN_S, TANK_MAX_HP } from "../constants.js";
import { createInitialMap } from "../map/createInitialMap.js";
import { pickRespawnCampId, respawnTank } from "../sim/respawn.js";
import type { PlayerState, RoomSimState, TankState } from "../types.js";

function tank(playerId: string): TankState {
  return {
    playerId, x: 0, y: 0, dir: 0, hp: 0, armorPlates: 0, invulnUntil: 0,
    fireCooldown: 0, alive: false, ammoNormal: 10, ammoSiege: 1, ammoHE: 0, selectedAmmo: 0,
  };
}

function mk(): RoomSimState {
  const map = createInitialMap(2);
  const state = { ...map, players: {} } as RoomSimState;
  const p: PlayerState = {
    playerId: "P", nickname: "P", isAi: false, campIds: [3, 7, 11],
    tank: tank("P"), eliminated: false, joinedAt: 0, maxCampsOwned: 3,
    tanksDestroyed: 0, campsCaptured: 0, sessionToken: "P",
  };
  state.players["P"] = p;
  for (const id of p.campIds) {
    state.camps[id]!.ownerPlayerId = "P";
    state.camps[id]!.coreHp = state.camps[id]!.coreMaxHp;
  }
  return state;
}

describe("respawn", () => {
  it("picks uniformly among owned living camps (no manual/nearest bias)", () => {
    const state = mk();
    const counts = new Map<number, number>();
    let i = 0;
    const sequence = [0.0, 0.34, 0.67, 0.99, 0.1, 0.5, 0.8, 0.2, 0.6, 0.9];
    for (let n = 0; n < sequence.length; n++) {
      const id = pickRespawnCampId(state, "P", () => sequence[i++ % sequence.length]!);
      expect(id).not.toBeNull();
      counts.set(id!, (counts.get(id!) ?? 0) + 1);
    }
    expect([...counts.keys()].sort()).toEqual([3, 7, 11]);
  });

  it("respawns with full hp and invulnerability window", () => {
    const state = mk();
    const ok = respawnTank(state, "P", 100, () => 0.0);
    expect(ok).toBe(true);
    const t = state.players["P"]!.tank;
    expect(t.alive).toBe(true);
    expect(t.hp).toBe(TANK_MAX_HP);
    expect(t.invulnUntil).toBeCloseTo(100 + RESPAWN_INVULN_S);
    expect(t.x).toBe(state.camps[3]!.worldX);
    expect(t.y).toBe(state.camps[3]!.worldY);
  });

  it("returns false when player has no camps or eliminated", () => {
    const state = mk();
    state.players["P"]!.campIds = [];
    expect(respawnTank(state, "P", 1, () => 0)).toBe(false);
    state.players["P"]!.campIds = [3];
    state.players["P"]!.eliminated = true;
    expect(respawnTank(state, "P", 1, () => 0)).toBe(false);
  });
});
```

- [ ] **Step 2: 运行确认失败** → Expected FAIL。

- [ ] **Step 3: 实现**

```typescript
import { RESPAWN_INVULN_S, TANK_MAX_HP } from "../constants.js";
import type { RoomSimState } from "../types.js";

export function pickRespawnCampId(
  state: RoomSimState,
  playerId: string,
  rand: () => number,
): number | null {
  const player = state.players[playerId];
  if (!player || player.eliminated) return null;
  const living = player.campIds.filter((id) => {
    const c = state.camps[id];
    return c && c.ownerPlayerId === playerId && c.coreHp > 0;
  });
  if (living.length === 0) return null;
  const idx = Math.min(living.length - 1, Math.floor(rand() * living.length));
  return living[idx]!;
}

export function respawnTank(
  state: RoomSimState,
  playerId: string,
  now: number,
  rand: () => number,
): boolean {
  const player = state.players[playerId];
  if (!player || player.eliminated) return false;
  const campId = pickRespawnCampId(state, playerId, rand);
  if (campId === null) return false;
  const camp = state.camps[campId]!;
  const t = player.tank;
  t.alive = true;
  t.hp = TANK_MAX_HP;
  t.armorPlates = Math.min(t.armorPlates, 3);
  t.x = camp.worldX;
  t.y = camp.worldY;
  t.dir = 0;
  t.invulnUntil = now + RESPAWN_INVULN_S;
  t.fireCooldown = 0;
  return true;
}
```

在 `index.ts` 增加：`export * from "./sim/respawn.js";`

- [ ] **Step 4: 测试通过**

Run: `pnpm --filter @tcc/shared test`

Expected: respawn 测试全绿。

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "$(cat <<'EOF'
feat(shared): random owned-camp respawn with invuln

EOF
)"
```

---

## Task 5: 战斗（移动、射击、墙、命中）

**Interfaces:**

```typescript
// packages/shared/src/sim/combat.ts
export function directionFromInput(input: PlayerInput): Direction | null;
export function applyTankMovement(state: RoomSimState, playerId: string, input: PlayerInput, dt: number): void;
export function tryFire(state: RoomSimState, playerId: string, now: number): boolean;
export function advanceProjectiles(state: RoomSimState, dt: number, now: number): OwnershipEvent[];
export function damageTank(state: RoomSimState, targetId: string, amount: number, attackerId: string, now: number): void;
```

**Files:**
- Create: `packages/shared/src/sim/combat.ts`
- Create: `packages/shared/src/__tests__/combat.test.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: 写失败测试**

```typescript
import { describe, expect, it } from "vitest";
import {
  AmmoType, CORE_MAX_HP, MAP_TILES, NORMAL_DAMAGE_TANK, SIEGE_DAMAGE_CORE,
  SIEGE_DAMAGE_TANK, TANK_MAX_HP, TILE_SIZE,
} from "../constants.js";
import { createInitialMap } from "../map/createInitialMap.js";
import { Terrain, terrainIndex } from "../map/terrain.js";
import {
  advanceProjectiles, applyTankMovement, damageTank, directionFromInput, tryFire,
} from "../sim/combat.js";
import type { PlayerInput, PlayerState, RoomSimState, TankState } from "../types.js";

function tank(playerId: string, o: Partial<TankState> = {}): TankState {
  return {
    playerId, x: 200, y: 200, dir: 1, hp: TANK_MAX_HP, armorPlates: 0, invulnUntil: 0,
    fireCooldown: 0, alive: true, ammoNormal: 10, ammoSiege: 5, ammoHE: 2,
    selectedAmmo: AmmoType.Normal, ...o,
  };
}

function pl(id: string, camps: number[], t?: Partial<TankState>): PlayerState {
  return {
    playerId: id, nickname: id, isAi: false, campIds: camps, tank: tank(id, t),
    eliminated: false, joinedAt: 0, maxCampsOwned: camps.length, tanksDestroyed: 0,
    campsCaptured: 0, sessionToken: id,
  };
}

describe("directionFromInput", () => {
  it("keeps only one primary direction (classic 4-way)", () => {
    const input: PlayerInput = {
      up: true, down: false, left: true, right: false, fire: false, selectAmmo: null,
    };
    // 优先级：up > right > down > left
    expect(directionFromInput(input)).toBe(0);
  });
});

describe("combat", () => {
  it("fires normal projectile and damages enemy tank", () => {
    const state = { ...createInitialMap(3), players: {} } as RoomSimState;
    state.players["A"] = pl("A", [0], { x: 100, y: 100, dir: 1, selectedAmmo: AmmoType.Normal });
    state.players["B"] = pl("B", [1], { x: 180, y: 100 });
    expect(tryFire(state, "A", 0)).toBe(true);
    expect(state.projectiles).toHaveLength(1);
    for (let i = 0; i < 20; i++) advanceProjectiles(state, 0.05, i * 0.05);
    expect(state.players["B"]!.tank.hp).toBeLessThan(TANK_MAX_HP);
  });

  it("siege ammo can reduce core hp when unprotected", () => {
    const state = { ...createInitialMap(4), players: {} } as RoomSimState;
    const camp = state.camps[5]!;
    state.players["A"] = pl("A", [0], {
      x: camp.worldX - 40, y: camp.worldY, dir: 1,
      selectedAmmo: AmmoType.Siege, ammoSiege: 10,
    });
    state.players["B"] = pl("B", [5]);
    camp.ownerPlayerId = "B";
    camp.protectionUntil = 0;
    camp.coreHp = CORE_MAX_HP;
    // 清除核心附近墙，避免挡弹
    state.walls = state.walls.filter(
      (w) => Math.hypot(w.tileX * TILE_SIZE - camp.worldX, w.tileY * TILE_SIZE - camp.worldY) > 80,
    );
    state.players["A"]!.tank.x = camp.worldX - 30;
    state.players["A"]!.tank.y = camp.worldY;
    tryFire(state, "A", 0);
    advanceProjectiles(state, 0.2, 0.2);
    expect(camp.coreHp).toBeLessThan(CORE_MAX_HP);
  });

  it("invulnerable tank ignores damage", () => {
    const state = { ...createInitialMap(5), players: {} } as RoomSimState;
    state.players["B"] = pl("B", [1], { invulnUntil: 10, hp: TANK_MAX_HP });
    damageTank(state, "B", NORMAL_DAMAGE_TANK, "A", 5);
    expect(state.players["B"]!.tank.hp).toBe(TANK_MAX_HP);
  });

  it("siege deals reduced damage to tanks", () => {
    const state = { ...createInitialMap(6), players: {} } as RoomSimState;
    state.players["B"] = pl("B", [1]);
    damageTank(state, "B", SIEGE_DAMAGE_TANK, "A", 0);
    expect(state.players["B"]!.tank.hp).toBe(TANK_MAX_HP - SIEGE_DAMAGE_TANK);
  });

  it("movement is blocked by water", () => {
    const state = { ...createInitialMap(7), players: {} } as RoomSimState;
    let wx = 0;
    let wy = 0;
    outer: for (let y = 0; y < MAP_TILES; y++) {
      for (let x = 0; x < MAP_TILES; x++) {
        if (state.terrain[terrainIndex(x, y, MAP_TILES)] === Terrain.Water) {
          wx = x * TILE_SIZE + TILE_SIZE / 2;
          wy = y * TILE_SIZE + TILE_SIZE / 2;
          break outer;
        }
      }
    }
    state.players["A"] = pl("A", [0], { x: wx - 40, y: wy, dir: 1 });
    const beforeX = state.players["A"]!.tank.x;
    applyTankMovement(state, "A", {
      up: false, down: false, left: false, right: true, fire: false, selectAmmo: null,
    }, 1);
    // 不应进入水域格中心
    const afterTileX = Math.floor(state.players["A"]!.tank.x / TILE_SIZE);
    const afterTileY = Math.floor(state.players["A"]!.tank.y / TILE_SIZE);
    expect(state.terrain[terrainIndex(afterTileX, afterTileY, MAP_TILES)]).not.toBe(Terrain.Water);
    expect(state.players["A"]!.tank.x).toBeGreaterThanOrEqual(beforeX);
  });
});
```

- [ ] **Step 2: 运行确认失败** → Expected FAIL。

- [ ] **Step 3: 实现 combat.ts**

```typescript
import {
  AmmoType, HE_DAMAGE_BRICK, MAP_TILES, MAP_WORLD_SIZE, NORMAL_DAMAGE_BRICK,
  NORMAL_DAMAGE_TANK, PROJECTILE_RADIUS, PROJECTILE_SPEED, SIEGE_DAMAGE_CORE,
  SIEGE_DAMAGE_TANK, STEEL_INDESTRUCTIBLE, TANK_FIRE_COOLDOWN, TANK_RADIUS,
  TANK_SPEED, TILE_SIZE,
} from "../constants.js";
import type { Direction, PlayerInput, RoomSimState } from "../types.js";
import { isPassable } from "../map/terrain.js";
import { applyCoreDestroyed, type OwnershipEvent } from "./ownership.js";
import { respawnTank } from "./respawn.js";

const DIR_VEC: Record<Direction, { x: number; y: number }> = {
  0: { x: 0, y: -1 },
  1: { x: 1, y: 0 },
  2: { x: 0, y: 1 },
  3: { x: -1, y: 0 },
};

export function directionFromInput(input: PlayerInput): Direction | null {
  if (input.up) return 0;
  if (input.right) return 1;
  if (input.down) return 2;
  if (input.left) return 3;
  return null;
}

function circleHitsTile(x: number, y: number, radius: number, tileX: number, tileY: number): boolean {
  const left = tileX * TILE_SIZE;
  const top = tileY * TILE_SIZE;
  const closestX = Math.max(left, Math.min(x, left + TILE_SIZE));
  const closestY = Math.max(top, Math.min(y, top + TILE_SIZE));
  const dx = x - closestX;
  const dy = y - closestY;
  return dx * dx + dy * dy < radius * radius;
}

export function applyTankMovement(
  state: RoomSimState,
  playerId: string,
  input: PlayerInput,
  dt: number,
): void {
  const p = state.players[playerId];
  if (!p || p.eliminated || !p.tank.alive) return;
  if (input.selectAmmo !== null) p.tank.selectedAmmo = input.selectAmmo;
  const dir = directionFromInput(input);
  if (dir === null) return;
  p.tank.dir = dir;
  const v = DIR_VEC[dir];
  const nx = p.tank.x + v.x * TANK_SPEED * dt;
  const ny = p.tank.y + v.y * TANK_SPEED * dt;
  if (
    nx < TANK_RADIUS || ny < TANK_RADIUS ||
    nx > MAP_WORLD_SIZE - TANK_RADIUS || ny > MAP_WORLD_SIZE - TANK_RADIUS
  ) {
    return;
  }
  const tileX = Math.floor(nx / TILE_SIZE);
  const tileY = Math.floor(ny / TILE_SIZE);
  if (!isPassable(state.terrain, tileX, tileY, MAP_TILES)) return;
  const blockedWall = state.walls.some(
    (w) => w.hp > 0 && circleHitsTile(nx, ny, TANK_RADIUS, w.tileX, w.tileY),
  );
  if (blockedWall) return;
  p.tank.x = nx;
  p.tank.y = ny;
}

export function tryFire(state: RoomSimState, playerId: string, now: number): boolean {
  const p = state.players[playerId];
  if (!p || p.eliminated || !p.tank.alive) return false;
  const t = p.tank;
  if (t.fireCooldown > 0) return false;
  const ammo = t.selectedAmmo;
  if (ammo === AmmoType.Normal && t.ammoNormal <= 0) return false;
  if (ammo === AmmoType.Siege && t.ammoSiege <= 0) return false;
  if (ammo === AmmoType.HE && t.ammoHE <= 0) return false;
  if (ammo === AmmoType.Normal) t.ammoNormal -= 1;
  if (ammo === AmmoType.Siege) t.ammoSiege -= 1;
  if (ammo === AmmoType.HE) t.ammoHE -= 1;
  const v = DIR_VEC[t.dir];
  state.projectiles.push({
    id: state.nextProjectileId++,
    ownerPlayerId: playerId,
    x: t.x + v.x * (TANK_RADIUS + 4),
    y: t.y + v.y * (TANK_RADIUS + 4),
    vx: v.x * PROJECTILE_SPEED,
    vy: v.y * PROJECTILE_SPEED,
    ammo,
    alive: true,
  });
  t.fireCooldown = TANK_FIRE_COOLDOWN;
  return true;
}

export function damageTank(
  state: RoomSimState,
  targetId: string,
  amount: number,
  attackerId: string,
  now: number,
): void {
  const target = state.players[targetId];
  if (!target || !target.tank.alive || target.eliminated) return;
  if (target.tank.invulnUntil > now) return;
  let dmg = amount;
  while (dmg > 0 && target.tank.armorPlates > 0) {
    target.tank.armorPlates -= 1;
    dmg = Math.max(0, dmg - 30);
  }
  target.tank.hp -= dmg;
  if (target.tank.hp <= 0) {
    target.tank.hp = 0;
    target.tank.alive = false;
    const attacker = state.players[attackerId];
    if (attacker) attacker.tanksDestroyed += 1;
    respawnTank(state, targetId, now, Math.random);
  }
}

function damageCore(
  state: RoomSimState,
  campId: number,
  amount: number,
  attackerId: string,
  now: number,
): OwnershipEvent[] {
  const camp = state.camps[campId];
  if (!camp) return [];
  if (camp.protectionUntil > now) return [];
  if (camp.ownerPlayerId === attackerId) return [];
  camp.coreHp -= amount;
  if (camp.coreHp <= 0) {
    camp.coreHp = 0;
    return applyCoreDestroyed(state, campId, attackerId, now);
  }
  return [];
}

export function advanceProjectiles(
  state: RoomSimState,
  dt: number,
  now: number,
): OwnershipEvent[] {
  const events: OwnershipEvent[] = [];

  for (const player of Object.values(state.players)) {
    if (player.tank.fireCooldown > 0) {
      player.tank.fireCooldown = Math.max(0, player.tank.fireCooldown - dt);
    }
  }

  for (const proj of state.projectiles) {
    if (!proj.alive) continue;
    proj.x += proj.vx * dt;
    proj.y += proj.vy * dt;
    if (proj.x < 0 || proj.y < 0 || proj.x > MAP_WORLD_SIZE || proj.y > MAP_WORLD_SIZE) {
      proj.alive = false;
      continue;
    }

    const wall = state.walls.find(
      (w) => w.hp > 0 && circleHitsTile(proj.x, proj.y, PROJECTILE_RADIUS, w.tileX, w.tileY),
    );
    if (wall) {
      if (wall.kind === "steel" && STEEL_INDESTRUCTIBLE) {
        proj.alive = false;
        continue;
      }
      const brickDmg = proj.ammo === AmmoType.HE ? HE_DAMAGE_BRICK : NORMAL_DAMAGE_BRICK;
      wall.hp -= brickDmg;
      proj.alive = false;
      continue;
    }

    for (const camp of state.camps) {
      const dx = proj.x - camp.worldX;
      const dy = proj.y - camp.worldY;
      if (dx * dx + dy * dy <= (TILE_SIZE * 0.6) ** 2) {
        const dmg = proj.ammo === AmmoType.Siege ? SIEGE_DAMAGE_CORE : Math.floor(NORMAL_DAMAGE_TANK / 5);
        events.push(...damageCore(state, camp.campId, dmg, proj.ownerPlayerId, now));
        proj.alive = false;
        break;
      }
    }
    if (!proj.alive) continue;

    for (const other of Object.values(state.players)) {
      if (!other.tank.alive || other.playerId === proj.ownerPlayerId) continue;
      const dx = proj.x - other.tank.x;
      const dy = proj.y - other.tank.y;
      if (dx * dx + dy * dy <= (TANK_RADIUS + PROJECTILE_RADIUS) ** 2) {
        const dmg = proj.ammo === AmmoType.Siege ? SIEGE_DAMAGE_TANK : NORMAL_DAMAGE_TANK;
        damageTank(state, other.playerId, dmg, proj.ownerPlayerId, now);
        proj.alive = false;
        break;
      }
    }
  }

  state.projectiles = state.projectiles.filter((pr) => pr.alive);
  return events;
}
```

在 `index.ts` 增加：`export * from "./sim/combat.js";`

- [ ] **Step 4: 测试通过**

Run: `pnpm --filter @tcc/shared test`

Expected: combat 测试全绿。

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "$(cat <<'EOF'
feat(shared): combat movement fire walls cores

EOF
)"
```

---

## Task 6: 资源点、空投、软加压

**Interfaces:**

```typescript
export function tickNeutrals(state: RoomSimState, dt: number): void;
export function tryPickupNeutral(state: RoomSimState, playerId: string): boolean;
export function tickAirdrops(state: RoomSimState, dt: number, now: number, rand: () => number): void;
export function tryClaimAirdrop(state: RoomSimState, playerId: string): boolean;
export function updateSoftPressure(state: RoomSimState): void;
export function countOwnedCamps(state: RoomSimState): number;
```

**Files:**
- Create: `packages/shared/src/sim/resources.ts`, `airdrop.ts`, `softPressure.ts`
- Create: `packages/shared/src/__tests__/resources.test.ts`, `airdrop.test.ts`, `softPressure.test.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: 写失败测试 softPressure**

```typescript
import { describe, expect, it } from "vitest";
import { SOFT_PRESSURE_CAMP_THRESHOLD } from "../constants.js";
import { createInitialMap } from "../map/createInitialMap.js";
import { countOwnedCamps, updateSoftPressure } from "../sim/softPressure.js";
import type { RoomSimState } from "../types.js";

describe("softPressure", () => {
  it("activates when total remaining owned camps <= 8", () => {
    const state = { ...createInitialMap(8), players: {} } as RoomSimState;
    for (let i = 0; i < SOFT_PRESSURE_CAMP_THRESHOLD; i++) {
      state.camps[i]!.ownerPlayerId = "x";
    }
    updateSoftPressure(state);
    expect(countOwnedCamps(state)).toBe(SOFT_PRESSURE_CAMP_THRESHOLD);
    expect(state.softPressureActive).toBe(true);
  });

  it("deactivates above threshold", () => {
    const state = { ...createInitialMap(9), players: {} } as RoomSimState;
    for (let i = 0; i < SOFT_PRESSURE_CAMP_THRESHOLD + 1; i++) {
      state.camps[i]!.ownerPlayerId = "x";
    }
    updateSoftPressure(state);
    expect(state.softPressureActive).toBe(false);
  });
});
```

- [ ] **Step 2: 写失败测试 resources / airdrop**

`resources.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { NeutralKind } from "../constants.js";
import { createInitialMap } from "../map/createInitialMap.js";
import { tryPickupNeutral } from "../sim/resources.js";
import type { PlayerState, RoomSimState } from "../types.js";

describe("resources", () => {
  it("ammo depot grants normal and siege ammo then goes on cooldown", () => {
    const state = { ...createInitialMap(20), players: {} } as RoomSimState;
    const depot = state.neutralPoints.find((n) => n.kind === NeutralKind.AmmoDepot)!;
    state.players["P"] = {
      playerId: "P", nickname: "P", isAi: false, campIds: [0],
      tank: {
        playerId: "P", x: depot.x, y: depot.y, dir: 0, hp: 100, armorPlates: 0,
        invulnUntil: 0, fireCooldown: 0, alive: true, ammoNormal: 0, ammoSiege: 0,
        ammoHE: 0, selectedAmmo: 0,
      },
      eliminated: false, joinedAt: 0, maxCampsOwned: 1, tanksDestroyed: 0,
      campsCaptured: 0, sessionToken: "P",
    } satisfies PlayerState;
    expect(tryPickupNeutral(state, "P")).toBe(true);
    expect(state.players["P"]!.tank.ammoNormal).toBeGreaterThan(0);
    expect(state.players["P"]!.tank.ammoSiege).toBeGreaterThanOrEqual(1);
    expect(depot.cooldownRemaining).toBeGreaterThan(0);
    expect(tryPickupNeutral(state, "P")).toBe(false);
  });
});
```

`airdrop.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { createInitialMap } from "../map/createInitialMap.js";
import { tickAirdrops } from "../sim/airdrop.js";
import { updateSoftPressure } from "../sim/softPressure.js";
import type { RoomSimState } from "../types.js";

describe("airdrop", () => {
  it("spawns heavier siege ammo under soft pressure", () => {
    const state = { ...createInitialMap(21), players: {} } as RoomSimState;
    for (let i = 0; i < 8; i++) state.camps[i]!.ownerPlayerId = "x";
    updateSoftPressure(state);
    state.nextAirdropAt = 0;
    tickAirdrops(state, 0.05, 0, () => 0.5);
    expect(state.airdrops.length).toBe(1);
    expect(state.airdrops[0]!.siegeAmmo).toBeGreaterThanOrEqual(4);
  });

  it("spawns lighter siege ammo without soft pressure", () => {
    const state = { ...createInitialMap(22), players: {} } as RoomSimState;
    for (let i = 0; i < 16; i++) state.camps[i]!.ownerPlayerId = "x";
    updateSoftPressure(state);
    state.nextAirdropAt = 0;
    tickAirdrops(state, 0.05, 0, () => 0.5);
    expect(state.airdrops[0]!.siegeAmmo).toBeLessThan(4);
  });
});
```

- [ ] **Step 3: 运行确认失败** → Expected FAIL。

- [ ] **Step 4: 实现**

`softPressure.ts`:

```typescript
import { SOFT_PRESSURE_CAMP_THRESHOLD } from "../constants.js";
import type { RoomSimState } from "../types.js";

export function countOwnedCamps(state: RoomSimState): number {
  return state.camps.filter((c) => c.ownerPlayerId !== null).length;
}

export function updateSoftPressure(state: RoomSimState): void {
  state.softPressureActive = countOwnedCamps(state) <= SOFT_PRESSURE_CAMP_THRESHOLD;
}
```

`resources.ts`:

```typescript
import {
  AmmoType, MAX_ARMOR_PLATES, NeutralKind, REPAIR_AMOUNT, TANK_MAX_HP, TANK_RADIUS,
} from "../constants.js";
import type { RoomSimState } from "../types.js";

const PICKUP_RANGE = TANK_RADIUS + 20;
const NEUTRAL_COOLDOWN = 8;

export function tickNeutrals(state: RoomSimState, dt: number): void {
  for (const n of state.neutralPoints) {
    if (n.cooldownRemaining > 0) n.cooldownRemaining = Math.max(0, n.cooldownRemaining - dt);
  }
}

export function tryPickupNeutral(state: RoomSimState, playerId: string): boolean {
  const p = state.players[playerId];
  if (!p || !p.tank.alive || p.eliminated) return false;
  for (const n of state.neutralPoints) {
    if (n.cooldownRemaining > 0) continue;
    const dx = p.tank.x - n.x;
    const dy = p.tank.y - n.y;
    if (dx * dx + dy * dy > PICKUP_RANGE * PICKUP_RANGE) continue;
    if (n.kind === NeutralKind.AmmoDepot) {
      p.tank.ammoNormal += 15;
      p.tank.ammoSiege += 1;
    } else if (n.kind === NeutralKind.RepairBay) {
      p.tank.hp = Math.min(TANK_MAX_HP, p.tank.hp + REPAIR_AMOUNT);
    } else if (n.kind === NeutralKind.OilWell) {
      p.tank.armorPlates = Math.min(MAX_ARMOR_PLATES, p.tank.armorPlates + 1);
    }
    n.cooldownRemaining = NEUTRAL_COOLDOWN;
    return true;
  }
  return false;
}

export function applyAmmoSelect(state: RoomSimState, playerId: string, ammo: AmmoType): void {
  const p = state.players[playerId];
  if (!p) return;
  p.tank.selectedAmmo = ammo;
}
```

`airdrop.ts`:

```typescript
import {
  AIRDROP_FALL_S, AIRDROP_INTERVAL_S, MAP_WORLD_SIZE, MAX_ARMOR_PLATES, TANK_RADIUS,
} from "../constants.js";
import type { RoomSimState } from "../types.js";
import { updateSoftPressure } from "./softPressure.js";

const CLAIM_RANGE = TANK_RADIUS + 24;

export function tickAirdrops(
  state: RoomSimState,
  _dt: number,
  now: number,
  rand: () => number,
): void {
  updateSoftPressure(state);
  if (now >= state.nextAirdropAt) {
    const siegeAmmo = state.softPressureActive
      ? 4 + Math.floor(rand() * 3)
      : 1 + Math.floor(rand() * 2);
    const armorPlates = 1;
    const heAmmo = state.softPressureActive ? 2 : rand() < 0.4 ? 1 : 0;
    state.airdrops.push({
      id: state.nextAirdropId++,
      x: 200 + rand() * (MAP_WORLD_SIZE - 400),
      y: 200 + rand() * (MAP_WORLD_SIZE - 400),
      landAt: now + AIRDROP_FALL_S,
      landed: false,
      siegeAmmo,
      armorPlates,
      heAmmo,
      claimed: false,
    });
    state.nextAirdropAt = now + AIRDROP_INTERVAL_S;
  }
  for (const a of state.airdrops) {
    if (!a.landed && now >= a.landAt) a.landed = true;
  }
}

export function tryClaimAirdrop(state: RoomSimState, playerId: string): boolean {
  const p = state.players[playerId];
  if (!p || !p.tank.alive || p.eliminated) return false;
  for (const a of state.airdrops) {
    if (!a.landed || a.claimed) continue;
    const dx = p.tank.x - a.x;
    const dy = p.tank.y - a.y;
    if (dx * dx + dy * dy > CLAIM_RANGE * CLAIM_RANGE) continue;
    p.tank.ammoSiege += a.siegeAmmo;
    p.tank.ammoHE += a.heAmmo;
    p.tank.armorPlates = Math.min(MAX_ARMOR_PLATES, p.tank.armorPlates + a.armorPlates);
    a.claimed = true;
    return true;
  }
  return false;
}
```

`index.ts` 增加：

```typescript
export * from "./sim/resources.js";
export * from "./sim/airdrop.js";
export * from "./sim/softPressure.js";
```

- [ ] **Step 5: 测试通过**

Run: `pnpm --filter @tcc/shared test`

Expected: softPressure / resources / airdrop 全绿。

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "$(cat <<'EOF'
feat(shared): neutrals airdrops and soft pressure

EOF
)"
```

---

## Task 7: 入场分配与 tick 入口

**Interfaces:**

```typescript
export interface JoinResult {
  playerId: string;
  campId: number;
  protectionSeconds: number;
}

export function assignCampForJoin(
  state: RoomSimState,
  playerId: string,
  nickname: string,
  isAi: boolean,
  now: number,
  rand: () => number,
  sessionToken: string,
): JoinResult | null;

export function simulateTick(
  state: RoomSimState,
  inputs: Record<string, PlayerInput>,
  dt: number,
  rand: () => number,
): OwnershipEvent[];
```

**Files:**
- Create: `packages/shared/src/sim/joinAssign.ts`, `tick.ts`
- Create: `packages/shared/src/__tests__/joinAssign.test.ts`, `tick.test.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: 写失败测试 joinAssign**

```typescript
import { describe, expect, it } from "vitest";
import { CORE_PROTECTION_MAX_S, CORE_PROTECTION_MIN_S } from "../constants.js";
import { createInitialMap } from "../map/createInitialMap.js";
import { assignCampForJoin } from "../sim/joinAssign.js";
import type { PlayerState, RoomSimState } from "../types.js";

describe("assignCampForJoin", () => {
  it("prefers empty camps", () => {
    const state = { ...createInitialMap(10), players: {} } as RoomSimState;
    const r = assignCampForJoin(state, "u1", "Alice", false, 0, () => 0, "tok1");
    expect(r).not.toBeNull();
    expect(state.camps[r!.campId]!.ownerPlayerId).toBe("u1");
    expect(r!.protectionSeconds).toBeGreaterThanOrEqual(CORE_PROTECTION_MIN_S);
    expect(r!.protectionSeconds).toBeLessThanOrEqual(CORE_PROTECTION_MAX_S);
  });

  it("reclaims an AI camp when no empty camp remains", () => {
    const state = { ...createInitialMap(11), players: {} } as RoomSimState;
    for (let i = 0; i < state.camps.length; i++) {
      const id = `ai-${i}`;
      state.camps[i]!.ownerPlayerId = id;
      state.camps[i]!.isAiOwner = true;
      state.players[id] = {
        playerId: id, nickname: id, isAi: true, campIds: [i],
        tank: {
          playerId: id, x: state.camps[i]!.worldX, y: state.camps[i]!.worldY, dir: 0,
          hp: 100, armorPlates: 0, invulnUntil: 0, fireCooldown: 0, alive: true,
          ammoNormal: 10, ammoSiege: 0, ammoHE: 0, selectedAmmo: 0,
        },
        eliminated: false, joinedAt: 0, maxCampsOwned: 1, tanksDestroyed: 0,
        campsCaptured: 0, sessionToken: id,
      } satisfies PlayerState;
    }
    const r = assignCampForJoin(state, "human", "Bob", false, 5, () => 0.5, "tokH");
    expect(r).not.toBeNull();
    expect(state.camps[r!.campId]!.ownerPlayerId).toBe("human");
    expect(state.camps[r!.campId]!.isAiOwner).toBe(false);
  });

  it("returns null when room has no empty and no AI camps", () => {
    const state = { ...createInitialMap(12), players: {} } as RoomSimState;
    for (let i = 0; i < state.camps.length; i++) {
      const id = `h-${i}`;
      state.camps[i]!.ownerPlayerId = id;
      state.camps[i]!.isAiOwner = false;
      state.players[id] = {
        playerId: id, nickname: id, isAi: false, campIds: [i],
        tank: {
          playerId: id, x: 0, y: 0, dir: 0, hp: 100, armorPlates: 0, invulnUntil: 0,
          fireCooldown: 0, alive: true, ammoNormal: 10, ammoSiege: 0, ammoHE: 0, selectedAmmo: 0,
        },
        eliminated: false, joinedAt: 0, maxCampsOwned: 1, tanksDestroyed: 0,
        campsCaptured: 0, sessionToken: id,
      };
    }
    expect(assignCampForJoin(state, "x", "X", false, 0, () => 0, "t")).toBeNull();
  });
});
```

- [ ] **Step 2: tick 测试**

```typescript
import { describe, expect, it } from "vitest";
import { TICK_DT } from "../constants.js";
import { createInitialMap } from "../map/createInitialMap.js";
import { assignCampForJoin } from "../sim/joinAssign.js";
import { simulateTick } from "../sim/tick.js";
import type { RoomSimState } from "../types.js";

describe("simulateTick", () => {
  it("advances time and can spawn a projectile on fire", () => {
    const state = { ...createInitialMap(30), players: {} } as RoomSimState;
    assignCampForJoin(state, "p", "P", false, 0, () => 0, "tok");
    const before = state.time;
    simulateTick(
      state,
      {
        p: { up: false, down: false, left: false, right: false, fire: true, selectAmmo: null },
      },
      TICK_DT,
      () => 0.5,
    );
    expect(state.time).toBeCloseTo(before + TICK_DT);
    expect(state.projectiles.length).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 3: 实现 joinAssign.ts**

```typescript
import {
  AmmoType, CORE_MAX_HP, CORE_PROTECTION_MAX_S, CORE_PROTECTION_MIN_S,
  START_NORMAL_AMMO, START_SIEGE_AMMO, TANK_MAX_HP,
} from "../constants.js";
import type { RoomSimState } from "../types.js";

export interface JoinResult {
  playerId: string;
  campId: number;
  protectionSeconds: number;
}

function protectionSeconds(rand: () => number): number {
  return (
    CORE_PROTECTION_MIN_S +
    Math.floor(rand() * (CORE_PROTECTION_MAX_S - CORE_PROTECTION_MIN_S + 1))
  );
}

export function assignCampForJoin(
  state: RoomSimState,
  playerId: string,
  nickname: string,
  isAi: boolean,
  now: number,
  rand: () => number,
  sessionToken: string,
): JoinResult | null {
  let campId: number | null = null;
  const empty = state.camps.filter((c) => c.ownerPlayerId === null);
  if (empty.length > 0) {
    campId = empty[Math.floor(rand() * empty.length)]!.campId;
  } else {
    const aiCamps = state.camps.filter((c) => c.isAiOwner && c.ownerPlayerId);
    if (aiCamps.length === 0) return null;
    const victim = aiCamps[Math.floor(rand() * aiCamps.length)]!;
    const aiId = victim.ownerPlayerId!;
    const ai = state.players[aiId];
    if (ai) {
      ai.campIds = ai.campIds.filter((id) => id !== victim.campId);
      if (ai.campIds.length === 0) {
        ai.eliminated = true;
        ai.tank.alive = false;
        delete state.players[aiId];
      }
    }
    campId = victim.campId;
  }

  const camp = state.camps[campId]!;
  const prot = protectionSeconds(rand);
  camp.ownerPlayerId = playerId;
  camp.isAiOwner = isAi;
  camp.coreHp = CORE_MAX_HP;
  camp.coreMaxHp = CORE_MAX_HP;
  camp.protectionUntil = now + prot;

  state.players[playerId] = {
    playerId,
    nickname: nickname.slice(0, 16) || "Guest",
    isAi,
    campIds: [campId],
    tank: {
      playerId,
      x: camp.worldX,
      y: camp.worldY,
      dir: 0,
      hp: TANK_MAX_HP,
      armorPlates: 0,
      invulnUntil: now + 1.5,
      fireCooldown: 0,
      alive: true,
      ammoNormal: START_NORMAL_AMMO,
      ammoSiege: START_SIEGE_AMMO,
      ammoHE: 0,
      selectedAmmo: AmmoType.Normal,
    },
    eliminated: false,
    joinedAt: now,
    maxCampsOwned: 1,
    tanksDestroyed: 0,
    campsCaptured: 0,
    sessionToken,
  };

  return { playerId, campId, protectionSeconds: prot };
}
```

- [ ] **Step 4: 实现 tick.ts**

```typescript
import type { OwnershipEvent } from "./ownership.js";
import type { PlayerInput, RoomSimState } from "../types.js";
import { advanceProjectiles, applyTankMovement, tryFire } from "./combat.js";
import { tickAirdrops, tryClaimAirdrop } from "./airdrop.js";
import { tickNeutrals, tryPickupNeutral } from "./resources.js";
import { updateSoftPressure } from "./softPressure.js";

export function simulateTick(
  state: RoomSimState,
  inputs: Record<string, PlayerInput>,
  dt: number,
  rand: () => number,
): OwnershipEvent[] {
  state.time += dt;
  const now = state.time;
  const events: OwnershipEvent[] = [];

  for (const [playerId, input] of Object.entries(inputs)) {
    const p = state.players[playerId];
    if (!p || p.eliminated) continue;
    applyTankMovement(state, playerId, input, dt);
    if (input.fire) tryFire(state, playerId, now);
    tryPickupNeutral(state, playerId);
    tryClaimAirdrop(state, playerId);
  }

  events.push(...advanceProjectiles(state, dt, now));
  tickNeutrals(state, dt);
  tickAirdrops(state, dt, now, rand);
  updateSoftPressure(state);
  return events;
}
```

`index.ts` 增加：

```typescript
export * from "./sim/joinAssign.js";
export * from "./sim/tick.js";
```

- [ ] **Step 5: 测试通过 + Commit**

```bash
pnpm --filter @tcc/shared test
git add -A && git commit -m "$(cat <<'EOF'
feat(shared): join assignment and simulateTick

EOF
)"
```

Expected: 全部 shared 测试 PASS。

---

## Task 8: Colyseus 房间加入、Schema、游客昵称

满员行为：`maxClients = CAMP_SLOT_COUNT`（32）。客户端使用 `joinOrCreate(ROOM_NAME)`；Colyseus 在现有房间满员时自动创建同名新房间实例，满足「满员进新房」。

**Files:**
- Create: `packages/server/src/config.ts`
- Create: `packages/server/src/rooms/schema.ts`
- Create: `packages/server/src/rooms/TankRoom.ts`
- Modify: `packages/server/src/index.ts`

- [ ] **Step 1: Schema 与房间骨架**

`packages/server/src/config.ts`:

```typescript
export const SERVER_PORT = Number(process.env.PORT ?? 2567);
export const ROOM_NAME = "tank_camp";
```

`packages/server/src/rooms/schema.ts`:

```typescript
import { MapSchema, Schema, type } from "@colyseus/schema";

export class TankSchema extends Schema {
  @type("string") playerId: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("uint8") dir: number = 0;
  @type("number") hp: number = 100;
  @type("uint8") armorPlates: number = 0;
  @type("boolean") alive: boolean = true;
  @type("boolean") invulnerable: boolean = false;
  @type("uint8") selectedAmmo: number = 0;
  @type("uint16") ammoNormal: number = 0;
  @type("uint16") ammoSiege: number = 0;
  @type("uint16") ammoHE: number = 0;
}

export class CampSchema extends Schema {
  @type("uint16") campId: number = 0;
  @type("string") ownerPlayerId: string = "";
  @type("number") coreHp: number = 0;
  @type("number") worldX: number = 0;
  @type("number") worldY: number = 0;
  @type("number") protectionRemaining: number = 0;
}

export class PlayerSchema extends Schema {
  @type("string") playerId: string = "";
  @type("string") nickname: string = "";
  @type("boolean") isAi: boolean = false;
  @type("uint8") campCount: number = 0;
  @type("boolean") eliminated: boolean = false;
  @type(TankSchema) tank = new TankSchema();
}

export class TankRoomState extends Schema {
  @type("number") time: number = 0;
  @type("boolean") softPressureActive: boolean = false;
  @type({ map: PlayerSchema }) players = new MapSchema<PlayerSchema>();
  @type({ map: CampSchema }) camps = new MapSchema<CampSchema>();
}
```

`packages/server/src/rooms/TankRoom.ts`:

```typescript
import { Room, Client } from "colyseus";
import {
  AI_FILL_TARGET_PLAYERS,
  AmmoType,
  CAMP_SLOT_COUNT,
  TICK_DT,
  TICK_HZ,
  assignCampForJoin,
  createInitialMap,
  simulateTick,
  type PlayerInput,
  type RoomSimState,
} from "@tcc/shared";
import { CampSchema, PlayerSchema, TankRoomState, TankSchema } from "./schema.js";
import { idleInput, normalizeInput } from "../systems/applyInput.js";

export type JoinOptions = { nickname?: string };

export class TankRoom extends Room<TankRoomState> {
  maxClients = CAMP_SLOT_COUNT;
  private sim!: RoomSimState;
  private inputs: Record<string, PlayerInput> = {};
  private rand = Math.random;

  onCreate(): void {
    this.setState(new TankRoomState());
    this.sim = { ...createInitialMap(Date.now() % 1_000_000), players: {} } as RoomSimState;
    this.syncCamps();
    this.setSimulationInterval((_delta) => this.tick(), 1000 / TICK_HZ);
    this.onMessage("input", (client, message: Partial<PlayerInput>) => {
      this.inputs[client.sessionId] = normalizeInput(message);
    });
  }

  onJoin(client: Client, options: JoinOptions): void {
    const nickname = (options.nickname ?? "Guest").toString().slice(0, 16);
    const result = assignCampForJoin(
      this.sim,
      client.sessionId,
      nickname,
      false,
      this.sim.time,
      this.rand,
      client.sessionId,
    );
    if (!result) {
      client.leave(4000);
      return;
    }
    this.inputs[client.sessionId] = idleInput();
    this.syncPlayer(client.sessionId);
    this.syncCamps();
    this.fillAiIfNeeded();
  }

  onLeave(client: Client): void {
    const p = this.sim.players[client.sessionId];
    if (p && !p.eliminated) {
      for (const campId of [...p.campIds]) {
        const c = this.sim.camps[campId];
        if (c) {
          c.ownerPlayerId = null;
          c.isAiOwner = false;
          c.protectionUntil = 0;
        }
      }
      delete this.sim.players[client.sessionId];
    }
    delete this.inputs[client.sessionId];
    this.state.players.delete(client.sessionId);
    this.syncCamps();
    this.fillAiIfNeeded();
  }

  private tick(): void {
    const events = simulateTick(this.sim, this.inputs, TICK_DT, this.rand);
    for (const id of Object.keys(this.inputs)) {
      const inp = this.inputs[id]!;
      inp.fire = false;
      inp.selectAmmo = null;
    }
    this.state.time = this.sim.time;
    this.state.softPressureActive = this.sim.softPressureActive;
    for (const id of Object.keys(this.sim.players)) this.syncPlayer(id);
    this.syncCamps();
    for (const ev of events) {
      this.broadcast("ownership", ev);
      if (ev.type === "eliminate" && ev.eliminatedPlayerId) {
        const victim = this.sim.players[ev.eliminatedPlayerId];
        this.broadcast("eliminated", {
          playerId: ev.eliminatedPlayerId,
          stats: victim
            ? {
                survivedMs: Math.floor((this.sim.time - victim.joinedAt) * 1000),
                maxCampsOwned: victim.maxCampsOwned,
                campsAtDeath: 0,
                tanksDestroyed: victim.tanksDestroyed,
                campsCaptured: victim.campsCaptured,
                relativeStanding: this.standingText(victim.campsCaptured, victim.tanksDestroyed),
              }
            : null,
        });
      }
    }
  }

  private standingText(captures: number, kills: number): string {
    if (captures >= 5) return "割据新星";
    if (kills >= 8) return "战场猎手";
    if (captures >= 2) return "稳健扩张";
    return "初试锋芒";
  }

  private syncPlayer(id: string): void {
    const p = this.sim.players[id];
    if (!p) {
      this.state.players.delete(id);
      return;
    }
    let row = this.state.players.get(id);
    if (!row) {
      row = new PlayerSchema();
      this.state.players.set(id, row);
    }
    row.playerId = p.playerId;
    row.nickname = p.nickname;
    row.isAi = p.isAi;
    row.campCount = p.campIds.length;
    row.eliminated = p.eliminated;
    const t = row.tank ?? new TankSchema();
    t.playerId = p.tank.playerId;
    t.x = p.tank.x;
    t.y = p.tank.y;
    t.dir = p.tank.dir;
    t.hp = p.tank.hp;
    t.armorPlates = p.tank.armorPlates;
    t.alive = p.tank.alive;
    t.invulnerable = p.tank.invulnUntil > this.sim.time;
    t.selectedAmmo = p.tank.selectedAmmo;
    t.ammoNormal = p.tank.ammoNormal;
    t.ammoSiege = p.tank.ammoSiege;
    t.ammoHE = p.tank.ammoHE;
    row.tank = t;
  }

  private syncCamps(): void {
    for (const c of this.sim.camps) {
      const key = String(c.campId);
      let row = this.state.camps.get(key);
      if (!row) {
        row = new CampSchema();
        this.state.camps.set(key, row);
      }
      row.campId = c.campId;
      row.ownerPlayerId = c.ownerPlayerId ?? "";
      row.coreHp = c.coreHp;
      row.worldX = c.worldX;
      row.worldY = c.worldY;
      row.protectionRemaining = Math.max(0, c.protectionUntil - this.sim.time);
    }
  }

  private fillAiIfNeeded(): void {
    // Task 13 将在此按 AI_FILL_TARGET_PLAYERS 用 assignCampForJoin(..., isAi=true) 填空营。
    // 本 Task 保持空实现，保证房间可先跑真人加入。
  }
}
```

注：`applyInput.ts` 在 Task 9 创建；若先编译，可先在本 Task 内联 `normalizeInput`/`idleInput`，Task 9 再抽出。

`packages/server/src/index.ts`:

```typescript
import { Server } from "colyseus";
import { createServer } from "http";
import express from "express";
import { SERVER_PORT, ROOM_NAME } from "./config.js";
import { TankRoom } from "./rooms/TankRoom.js";

const app = express();
app.get("/health", (_req, res) => res.json({ ok: true }));

const httpServer = createServer(app);
const gameServer = new Server({ server: httpServer });
gameServer.define(ROOM_NAME, TankRoom);

httpServer.listen(SERVER_PORT, () => {
  console.log(`[tcc-server] listening on ${SERVER_PORT}, room=${ROOM_NAME}`);
});
```

- [ ] **Step 2: 构建验证**

Run:

```bash
pnpm --filter @tcc/shared build && pnpm --filter @tcc/server typecheck
```

Expected: 无 TS 错误。房间名锁定 `tank_camp`；消息名锁定 `input` / `ownership` / `eliminated`。

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "$(cat <<'EOF'
feat(server): Colyseus TankRoom join and schema sync

EOF
)"
```

---

## Task 9: 服务器输入缓冲与 tick 接线

**Files:**
- Create: `packages/server/src/systems/applyInput.ts`
- Modify: `packages/server/src/rooms/TankRoom.ts`（改为引用本文件）

- [ ] **Step 1: 抽出输入规范化**

```typescript
import { AmmoType, type PlayerInput } from "@tcc/shared";

export function normalizeInput(message: Partial<PlayerInput> | undefined): PlayerInput {
  const select =
    message?.selectAmmo === AmmoType.Normal ||
    message?.selectAmmo === AmmoType.Siege ||
    message?.selectAmmo === AmmoType.HE
      ? message.selectAmmo
      : null;
  return {
    up: !!message?.up,
    down: !!message?.down,
    left: !!message?.left,
    right: !!message?.right,
    fire: !!message?.fire,
    selectAmmo: select,
  };
}

export function idleInput(): PlayerInput {
  return { up: false, down: false, left: false, right: false, fire: false, selectAmmo: null };
}
```

- [ ] **Step 2: 冒烟**

Run: `pnpm --filter @tcc/server dev`

Expected: 控制台 `[tcc-server] listening on 2567, room=tank_camp`；另开终端：

```bash
curl -s localhost:2567/health
```

Expected: `{"ok":true}`

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "$(cat <<'EOF'
feat(server): normalize input buffer for tick

EOF
)"
```

---

## Task 10: Phaser 客户端渲染骨架

**Files:**
- Modify: `packages/client/src/main.ts`
- Create: `packages/client/src/net/ColyseusClient.ts`, `roomName.ts`
- Create: `packages/client/src/scenes/BootScene.ts`, `GameScene.ts`, `DeathScene.ts`
- Create: `packages/client/src/render/TankSprite.ts`, `CampRenderer.ts`, `ProjectileRenderer.ts`

- [ ] **Step 1: 网络与主入口**

`roomName.ts`:

```typescript
export const ROOM_NAME = "tank_camp";
```

`ColyseusClient.ts`:

```typescript
import { Client, Room } from "colyseus.js";
import { ROOM_NAME } from "./roomName.js";

export async function joinTankRoom(nickname: string): Promise<Room> {
  const endpoint = import.meta.env.VITE_COLYSEUS_URL ?? "ws://localhost:2567";
  const client = new Client(endpoint);
  return client.joinOrCreate(ROOM_NAME, { nickname });
}
```

`main.ts`:

```typescript
import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene.js";
import { GameScene } from "./scenes/GameScene.js";
import { DeathScene } from "./scenes/DeathScene.js";

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: 1280,
  height: 720,
  backgroundColor: "#1a1a1a",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, GameScene, DeathScene],
});

export default game;
```

`BootScene.ts`:

```typescript
import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create(): void {
    const nickname = (window.prompt("输入昵称（游客）", "Guest") ?? "Guest").slice(0, 16);
    this.scene.start("GameScene", { nickname });
  }
}
```

`TankSprite.ts`:

```typescript
import Phaser from "phaser";

export class TankSprite {
  readonly body: Phaser.GameObjects.Rectangle;
  readonly label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, player: { nickname: string; tank: { x: number; y: number } }, color: number) {
    this.body = scene.add.rectangle(player.tank.x, player.tank.y, 28, 28, color);
    this.label = scene.add.text(player.tank.x, player.tank.y - 24, player.nickname, {
      fontSize: "12px",
      color: "#ffffff",
    }).setOrigin(0.5);
  }

  sync(player: { nickname: string; tank: { x: number; y: number; alive: boolean; invulnerable: boolean } }): void {
    this.body.setPosition(player.tank.x, player.tank.y);
    this.body.setAlpha(player.tank.alive ? (player.tank.invulnerable ? 0.5 : 1) : 0.15);
    this.label.setPosition(player.tank.x, player.tank.y - 24);
    this.label.setText(player.nickname);
  }

  destroy(): void {
    this.body.destroy();
    this.label.destroy();
  }
}
```

`CampRenderer.ts`:

```typescript
import Phaser from "phaser";

export class CampRenderer {
  private cores = new Map<string, Phaser.GameObjects.Arc>();

  constructor(private scene: Phaser.Scene) {}

  sync(camps: Map<string, any> | { forEach: Function }, selfId: string): void {
    camps.forEach((c: any, key: string) => {
      let g = this.cores.get(key);
      const ownedBySelf = c.ownerPlayerId === selfId;
      const empty = !c.ownerPlayerId;
      const color = empty ? 0x888888 : ownedBySelf ? 0x33cc66 : 0xcc3333;
      if (!g) {
        g = this.scene.add.circle(c.worldX, c.worldY, 12, color);
        this.cores.set(key, g);
      } else {
        g.setPosition(c.worldX, c.worldY);
        g.setFillStyle(color);
      }
      g.setAlpha(c.protectionRemaining > 0 ? 0.55 : 1);
    });
  }
}
```

`ProjectileRenderer.ts`:

```typescript
import Phaser from "phaser";

export class ProjectileRenderer {
  private dots = new Map<number, Phaser.GameObjects.Arc>();

  constructor(private scene: Phaser.Scene) {}

  syncFromMessage(projectiles: Array<{ id: number; x: number; y: number }>): void {
    const seen = new Set<number>();
    for (const p of projectiles) {
      seen.add(p.id);
      let d = this.dots.get(p.id);
      if (!d) {
        d = this.scene.add.circle(p.x, p.y, 3, 0xffff66);
        this.dots.set(p.id, d);
      } else {
        d.setPosition(p.x, p.y);
      }
    }
    for (const [id, d] of this.dots) {
      if (!seen.has(id)) {
        d.destroy();
        this.dots.delete(id);
      }
    }
  }
}
```

`GameScene.ts`:

```typescript
import Phaser from "phaser";
import type { Room } from "colyseus.js";
import { joinTankRoom } from "../net/ColyseusClient.js";
import { CampRenderer } from "../render/CampRenderer.js";
import { TankSprite } from "../render/TankSprite.js";

export class GameScene extends Phaser.Scene {
  private room!: Room;
  private tanks = new Map<string, TankSprite>();
  private camps!: CampRenderer;
  private selfId = "";

  constructor() {
    super("GameScene");
  }

  async create(data: { nickname: string }): Promise<void> {
    this.room = await joinTankRoom(data.nickname || "Guest");
    this.selfId = this.room.sessionId;
    this.camps = new CampRenderer(this);
    this.cameras.main.setBounds(0, 0, 64 * 32, 64 * 32);

    this.room.state.players.onAdd((player: any, key: string) => {
      const color = key === this.selfId ? 0x44dd88 : 0xdd5555;
      this.tanks.set(key, new TankSprite(this, player, color));
    });
    this.room.state.players.onRemove((_p: any, key: string) => {
      this.tanks.get(key)?.destroy();
      this.tanks.delete(key);
    });
    this.room.onMessage("eliminated", (payload: any) => {
      if (payload.playerId === this.selfId) {
        this.scene.start("DeathScene", { stats: payload.stats });
      }
    });
  }

  update(): void {
    if (!this.room) return;
    for (const [id, sprite] of this.tanks) {
      const p = this.room.state.players.get(id);
      if (p) sprite.sync(p);
      if (id === this.selfId && p) {
        this.cameras.main.centerOn(p.tank.x, p.tank.y);
      }
    }
    this.camps?.sync(this.room.state.camps, this.selfId);
  }
}
```

`DeathScene.ts`（最小可编译版本；Task 12 用 DeathPanel 替换 create 内容）:

```typescript
import Phaser from "phaser";

export class DeathScene extends Phaser.Scene {
  constructor() {
    super("DeathScene");
  }

  create(data: { stats?: any }): void {
    this.add.text(640, 300, "出局", { fontSize: "48px", color: "#ffffff" }).setOrigin(0.5);
    this.add.text(640, 380, JSON.stringify(data.stats ?? {}), {
      fontSize: "16px",
      color: "#cccccc",
      wordWrap: { width: 800 },
    }).setOrigin(0.5);
  }
}
```

- [ ] **Step 2: 双进程冒烟**

Run: `pnpm --filter @tcc/server dev` 与 `pnpm --filter @tcc/client dev`

Expected: 浏览器打开后输入昵称可进房，看到己方绿色坦克方块与营地圆点。

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "$(cat <<'EOF'
feat(client): Phaser game scene and Colyseus join

EOF
)"
```

---

## Task 11: 双端输入（桌面键盘 + 手机触控）

**Interfaces:**

```typescript
export interface ClientInputState {
  up: boolean; down: boolean; left: boolean; right: boolean;
  fire: boolean; selectAmmo: 0 | 1 | 2 | null;
}
export class DesktopInput {
  attach(scene: Phaser.Scene): void;
  sample(): ClientInputState;
}
export class TouchInput {
  attach(scene: Phaser.Scene): void;
  sample(): ClientInputState;
  destroy(): void;
}
export class InputManager {
  constructor(scene: Phaser.Scene, preferTouch: boolean);
  sample(): ClientInputState;
  destroy(): void;
}
```

**Files:**
- Create: `packages/client/src/input/DesktopInput.ts`
- Create: `packages/client/src/input/TouchInput.ts`
- Create: `packages/client/src/input/InputManager.ts`
- Modify: `packages/client/src/scenes/GameScene.ts`

- [ ] **Step 1: DesktopInput**

```typescript
import Phaser from "phaser";
import type { ClientInputState } from "./InputManager.js";

export class DesktopInput {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private space!: Phaser.Input.Keyboard.Key;
  private keyJ!: Phaser.Input.Keyboard.Key;
  private keyTab!: Phaser.Input.Keyboard.Key;
  private key1!: Phaser.Input.Keyboard.Key;
  private key2!: Phaser.Input.Keyboard.Key;
  private pendingAmmo: 0 | 1 | 2 | null = null;

  attach(scene: Phaser.Scene): void {
    const kb = scene.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.wasd = kb.addKeys("W,A,S,D") as DesktopInput["wasd"];
    this.space = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyJ = kb.addKey(Phaser.Input.Keyboard.KeyCodes.J);
    this.keyTab = kb.addKey(Phaser.Input.Keyboard.KeyCodes.TAB);
    this.key1 = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
    this.key2 = kb.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
    this.keyTab.on("down", () => {
      this.pendingAmmo = this.pendingAmmo === 1 ? 0 : 1;
    });
    this.key1.on("down", () => {
      this.pendingAmmo = 0;
    });
    this.key2.on("down", () => {
      this.pendingAmmo = 1;
    });
  }

  sample(): ClientInputState {
    const ammo = this.pendingAmmo;
    this.pendingAmmo = null;
    return {
      up: this.cursors.up.isDown || this.wasd.W.isDown,
      down: this.cursors.down.isDown || this.wasd.S.isDown,
      left: this.cursors.left.isDown || this.wasd.A.isDown,
      right: this.cursors.right.isDown || this.wasd.D.isDown,
      fire: this.space.isDown || this.keyJ.isDown,
      selectAmmo: ammo,
    };
  }
}
```

- [ ] **Step 2: TouchInput（四向键 + 开火 + 切弹，半透明，避开中央）**

```typescript
import Phaser from "phaser";
import type { ClientInputState } from "./InputManager.js";

type PadKey = "up" | "down" | "left" | "right" | "fire" | "ammo";

export class TouchInput {
  private pressed: Record<PadKey, boolean> = {
    up: false, down: false, left: false, right: false, fire: false, ammo: false,
  };
  private pendingAmmo: 0 | 1 | 2 | null = null;
  private buttons: Phaser.GameObjects.Rectangle[] = [];
  private rotateHint?: Phaser.GameObjects.Text;

  attach(scene: Phaser.Scene): void {
    const mk = (x: number, y: number, label: string, key: PadKey, toggleAmmo = false) => {
      const btn = scene.add
        .rectangle(x, y, 64, 64, 0xffffff, 0.35)
        .setScrollFactor(0)
        .setInteractive();
      const text = scene.add
        .text(x, y, label, { fontSize: "14px", color: "#fff" })
        .setOrigin(0.5)
        .setScrollFactor(0);
      btn.on("pointerdown", () => {
        this.pressed[key] = true;
        if (toggleAmmo) this.pendingAmmo = this.pendingAmmo === 1 ? 0 : 1;
      });
      btn.on("pointerup", () => {
        this.pressed[key] = false;
      });
      btn.on("pointerout", () => {
        this.pressed[key] = false;
      });
      this.buttons.push(btn);
      void text;
    };

    const h = scene.scale.height;
    mk(80, h - 140, "↑", "up");
    mk(80, h - 60, "↓", "down");
    mk(20, h - 100, "←", "left");
    mk(140, h - 100, "→", "right");
    mk(scene.scale.width - 80, h - 80, "射", "fire");
    mk(scene.scale.width - 80, h - 160, "弹", "ammo", true);

    if (scene.scale.height > scene.scale.width) {
      this.rotateHint = scene.add
        .text(scene.scale.width / 2, 24, "建议横屏游玩", {
          fontSize: "16px",
          color: "#ffcc66",
          backgroundColor: "#00000088",
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setAlpha(0.85);
    }
  }

  sample(): ClientInputState {
    const ammo = this.pendingAmmo;
    this.pendingAmmo = null;
    return {
      up: this.pressed.up,
      down: this.pressed.down,
      left: this.pressed.left,
      right: this.pressed.right,
      fire: this.pressed.fire,
      selectAmmo: ammo,
    };
  }

  destroy(): void {
    for (const b of this.buttons) b.destroy();
    this.rotateHint?.destroy();
  }
}
```

- [ ] **Step 3: InputManager + GameScene 接线**

```typescript
import Phaser from "phaser";
import { DesktopInput } from "./DesktopInput.js";
import { TouchInput } from "./TouchInput.js";

export interface ClientInputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  fire: boolean;
  selectAmmo: 0 | 1 | 2 | null;
}

export class InputManager {
  private desktop = new DesktopInput();
  private touch: TouchInput | null = null;
  private useTouch: boolean;

  constructor(scene: Phaser.Scene, preferTouch: boolean) {
    this.useTouch = preferTouch || window.matchMedia("(pointer: coarse)").matches;
    this.desktop.attach(scene);
    if (this.useTouch) {
      this.touch = new TouchInput();
      this.touch.attach(scene);
    }
  }

  sample(): ClientInputState {
    if (this.useTouch && this.touch) return this.touch.sample();
    return this.desktop.sample();
  }

  destroy(): void {
    this.touch?.destroy();
  }
}
```

在 `GameScene.create` 末尾：

```typescript
this.inputManager = new InputManager(this, false);
```

在 `GameScene.update` 中：

```typescript
const sample = this.inputManager.sample();
this.room.send("input", sample);
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "$(cat <<'EOF'
feat(client): desktop keyboard and mobile touch input

EOF
)"
```

---

## Task 12: HUD、出局面板、localStorage

**Interfaces:**

```typescript
export interface LocalBestStats {
  bestSurviveMs: number;
  bestMaxCamps: number;
  totalCampsCaptured: number;
  totalTanksDestroyed: number;
  recentRuns: Array<{
    at: number;
    survivedMs: number;
    maxCampsOwned: number;
    tanksDestroyed: number;
    campsCaptured: number;
  }>;
}
export function loadLocalStats(): LocalBestStats;
export function recordRun(run: LocalBestStats["recentRuns"][number]): LocalBestStats;
```

**Files:**
- Create: `packages/client/src/storage/localStats.ts`
- Create: `packages/client/src/ui/Hud.ts`, `Minimap.ts`, `DeathPanel.ts`
- Modify: `packages/client/src/scenes/DeathScene.ts`, `GameScene.ts`

- [ ] **Step 1: localStats**

```typescript
const KEY = "tcc.localStats.v1";

export interface LocalBestStats {
  bestSurviveMs: number;
  bestMaxCamps: number;
  totalCampsCaptured: number;
  totalTanksDestroyed: number;
  recentRuns: Array<{
    at: number;
    survivedMs: number;
    maxCampsOwned: number;
    tanksDestroyed: number;
    campsCaptured: number;
  }>;
}

function empty(): LocalBestStats {
  return {
    bestSurviveMs: 0,
    bestMaxCamps: 0,
    totalCampsCaptured: 0,
    totalTanksDestroyed: 0,
    recentRuns: [],
  };
}

export function loadLocalStats(): LocalBestStats {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    return { ...empty(), ...JSON.parse(raw) } as LocalBestStats;
  } catch {
    return empty();
  }
}

export function recordRun(run: LocalBestStats["recentRuns"][number]): LocalBestStats {
  const cur = loadLocalStats();
  cur.bestSurviveMs = Math.max(cur.bestSurviveMs, run.survivedMs);
  cur.bestMaxCamps = Math.max(cur.bestMaxCamps, run.maxCampsOwned);
  cur.totalCampsCaptured += run.campsCaptured;
  cur.totalTanksDestroyed += run.tanksDestroyed;
  cur.recentRuns = [run, ...cur.recentRuns].slice(0, 10);
  localStorage.setItem(KEY, JSON.stringify(cur));
  return cur;
}
```

- [ ] **Step 2: Hud 最小集**

```typescript
import Phaser from "phaser";

export class Hud {
  private ammoText: Phaser.GameObjects.Text;
  private campText: Phaser.GameObjects.Text;
  private protectText: Phaser.GameObjects.Text;
  private pressureText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    const style = { fontSize: "16px", color: "#ffffff", backgroundColor: "#00000066" };
    this.ammoText = scene.add.text(12, 12, "", style).setScrollFactor(0);
    this.campText = scene.add.text(12, 36, "", style).setScrollFactor(0);
    this.protectText = scene.add.text(12, 60, "", style).setScrollFactor(0);
    this.pressureText = scene.add.text(12, 84, "", { ...style, color: "#ffaa55" }).setScrollFactor(0);
  }

  sync(opts: {
    selectedAmmo: number;
    ammoSiege: number;
    ammoNormal: number;
    campCount: number;
    protectionRemaining: number;
    softPressureActive: boolean;
  }): void {
    const ammoName = opts.selectedAmmo === 1 ? "攻城" : opts.selectedAmmo === 2 ? "高爆" : "普通";
    this.ammoText.setText(`弹药: ${ammoName} | 普通 ${opts.ammoNormal} | 攻城 ${opts.ammoSiege}`);
    this.campText.setText(`营地: ${opts.campCount}`);
    this.protectText.setText(
      opts.protectionRemaining > 0 ? `核心保护: ${opts.protectionRemaining.toFixed(0)}s` : "",
    );
    this.pressureText.setText(opts.softPressureActive ? "软加压：空投攻城弹增加" : "");
  }
}
```

- [ ] **Step 3: Minimap（200×200）**

```typescript
import Phaser from "phaser";

const SIZE = 200;
const MAP = 64 * 32;

export class Minimap {
  private g: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.g = scene.add.graphics().setScrollFactor(0).setPosition(scene.scale.width - SIZE - 12, 12);
  }

  sync(opts: {
    camps: Iterable<{ worldX: number; worldY: number; ownerPlayerId: string }>;
    neutrals: Iterable<{ x: number; y: number }>;
    airdrops: Iterable<{ x: number; y: number; claimed: boolean }>;
    selfId: string;
  }): void {
    this.g.clear();
    this.g.fillStyle(0x000000, 0.45);
    this.g.fillRect(0, 0, SIZE, SIZE);
    const sx = SIZE / MAP;
    for (const c of opts.camps) {
      const empty = !c.ownerPlayerId;
      const self = c.ownerPlayerId === opts.selfId;
      this.g.fillStyle(empty ? 0x888888 : self ? 0x33cc66 : 0xcc3333, 1);
      this.g.fillCircle(c.worldX * sx, c.worldY * sx, 3);
    }
    for (const n of opts.neutrals) {
      this.g.fillStyle(0xffdd33, 1);
      this.g.fillCircle(n.x * sx, n.y * sx, 2);
    }
    for (const a of opts.airdrops) {
      if (a.claimed) continue;
      this.g.fillStyle(0xffffff, 1);
      this.g.fillCircle(a.x * sx, a.y * sx, 2);
    }
  }
}
```

注：中立点与空投若未进 Schema，由服务器 `visor`/`worldMeta` 消息附带数组；Task 14 的 `visor` 可扩展 `neutrals`/`airdrops` 字段。v1 允许 GameScene 用 `room.onMessage("worldMeta", ...)` 缓存。

- [ ] **Step 4: DeathPanel + DeathScene**

```typescript
import Phaser from "phaser";
import { loadLocalStats, recordRun } from "../storage/localStats.js";

export class DeathPanel {
  constructor(scene: Phaser.Scene, stats: {
    survivedMs: number;
    maxCampsOwned: number;
    tanksDestroyed: number;
    campsCaptured: number;
    relativeStanding: string;
  }) {
    const best = recordRun({
      at: Date.now(),
      survivedMs: stats.survivedMs,
      maxCampsOwned: stats.maxCampsOwned,
      tanksDestroyed: stats.tanksDestroyed,
      campsCaptured: stats.campsCaptured,
    });
    const lines = [
      "本轮结束",
      `存活: ${(stats.survivedMs / 1000).toFixed(0)}s`,
      `最大占地: ${stats.maxCampsOwned}`,
      `击毁坦克: ${stats.tanksDestroyed}`,
      `攻占营地: ${stats.campsCaptured}`,
      `评价: ${stats.relativeStanding}`,
      "",
      `历史最长存活: ${(best.bestSurviveMs / 1000).toFixed(0)}s`,
      `历史最大占地: ${best.bestMaxCamps}`,
      "",
      "点击「再开一局」将刷新页面，以新玩家重新加入",
    ];
    scene.add
      .rectangle(640, 360, 640, 480, 0x000000, 0.82)
      .setScrollFactor(0);
    scene.add
      .text(640, 200, lines.join("\n"), {
        fontSize: "20px",
        color: "#ffffff",
        align: "center",
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0);

    const btn = scene.add
      .rectangle(640, 560, 200, 48, 0x3388ff)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    scene.add
      .text(640, 560, "再开一局", { fontSize: "22px", color: "#ffffff" })
      .setOrigin(0.5)
      .setScrollFactor(0);
    btn.on("pointerdown", () => {
      window.location.reload();
    });
  }
}
```

`DeathScene.create` 改为实例化 `DeathPanel`。

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "$(cat <<'EOF'
feat(client): HUD minimap death panel localStorage

EOF
)"
```

---

## Task 13: AI 垫场

**Interfaces:**

```typescript
// packages/shared/src/sim/ai.ts
export function decideAiInput(
  state: RoomSimState,
  playerId: string,
  now: number,
  rand: () => number,
): PlayerInput;
```

**Files:**
- Create: `packages/shared/src/sim/ai.ts`, `__tests__/ai.test.ts`
- Create: `packages/server/src/systems/aiDriver.ts`
- Modify: `packages/server/src/rooms/TankRoom.ts`（实现 `fillAiIfNeeded`）

- [ ] **Step 1: 失败测试**

```typescript
import { describe, expect, it } from "vitest";
import { AmmoType } from "../constants.js";
import { createInitialMap } from "../map/createInitialMap.js";
import { assignCampForJoin } from "../sim/joinAssign.js";
import { decideAiInput } from "../sim/ai.js";
import type { RoomSimState } from "../types.js";

describe("decideAiInput", () => {
  it("returns some movement near home camp", () => {
    const state = { ...createInitialMap(40), players: {} } as RoomSimState;
    assignCampForJoin(state, "ai1", "Bot", true, 0, () => 0, "ai1");
    const input = decideAiInput(state, "ai1", 0, () => 0.1);
    expect(input.up || input.down || input.left || input.right || input.fire).toBe(true);
  });

  it("selects siege when holding siege ammo near enemy core", () => {
    const state = { ...createInitialMap(41), players: {} } as RoomSimState;
    assignCampForJoin(state, "ai1", "Bot", true, 0, () => 0, "ai1");
    assignCampForJoin(state, "enemy", "E", false, 0, () => 0.9, "enemy");
    const ai = state.players["ai1"]!;
    const enemyCampId = state.players["enemy"]!.campIds[0]!;
    const enemyCamp = state.camps[enemyCampId]!;
    ai.tank.ammoSiege = 3;
    ai.tank.x = enemyCamp.worldX + 40;
    ai.tank.y = enemyCamp.worldY;
    const input = decideAiInput(state, "ai1", 1, () => 0.01);
    expect(input.selectAmmo === AmmoType.Siege || ai.tank.selectedAmmo === AmmoType.Siege || input.fire).toBe(true);
  });
});
```

- [ ] **Step 2: 实现 ai.ts**

```typescript
import { AmmoType } from "../constants.js";
import type { PlayerInput, RoomSimState } from "../types.js";

function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function steerToward(x: number, y: number, tx: number, ty: number): PlayerInput {
  const dx = tx - x;
  const dy = ty - y;
  const absx = Math.abs(dx);
  const absy = Math.abs(dy);
  return {
    up: absy >= absx && dy < 0,
    down: absy >= absx && dy > 0,
    left: absx > absy && dx < 0,
    right: absx > absy && dx > 0,
    fire: false,
    selectAmmo: null,
  };
}

export function decideAiInput(
  state: RoomSimState,
  playerId: string,
  now: number,
  rand: () => number,
): PlayerInput {
  const p = state.players[playerId];
  if (!p || p.eliminated || !p.tank.alive) {
    return { up: false, down: false, left: false, right: false, fire: false, selectAmmo: null };
  }
  const home = state.camps[p.campIds[0]!];
  const roll = rand();

  // 有攻城弹且靠近敌核：切攻城并开火
  if (p.tank.ammoSiege > 0) {
    let nearestEnemy: { x: number; y: number } | null = null;
    let best = Infinity;
    for (const c of state.camps) {
      if (!c.ownerPlayerId || c.ownerPlayerId === playerId) continue;
      const d = dist2(p.tank.x, p.tank.y, c.worldX, c.worldY);
      if (d < best) {
        best = d;
        nearestEnemy = { x: c.worldX, y: c.worldY };
      }
    }
    if (nearestEnemy && best < 120 * 120) {
      const input = steerToward(p.tank.x, p.tank.y, nearestEnemy.x, nearestEnemy.y);
      input.selectAmmo = AmmoType.Siege;
      input.fire = true;
      return input;
    }
  }

  if (roll < 0.7 && home) {
    const tx = home.worldX + (rand() - 0.5) * 400;
    const ty = home.worldY + (rand() - 0.5) * 400;
    const input = steerToward(p.tank.x, p.tank.y, tx, ty);
    input.fire = rand() < 0.05;
    return input;
  }

  if (roll < 0.9 && state.neutralPoints.length > 0) {
    let bestN = state.neutralPoints[0]!;
    let best = Infinity;
    for (const n of state.neutralPoints) {
      const d = dist2(p.tank.x, p.tank.y, n.x, n.y);
      if (d < best) {
        best = d;
        bestN = n;
      }
    }
    return steerToward(p.tank.x, p.tank.y, bestN.x, bestN.y);
  }

  // 10%：朝最近敌营
  let target = home;
  let best = Infinity;
  for (const c of state.camps) {
    if (!c.ownerPlayerId || c.ownerPlayerId === playerId) continue;
    const d = dist2(p.tank.x, p.tank.y, c.worldX, c.worldY);
    if (d < best) {
      best = d;
      target = c;
    }
  }
  if (!target) {
    return { up: false, down: false, left: false, right: false, fire: false, selectAmmo: null };
  }
  const input = steerToward(p.tank.x, p.tank.y, target.worldX, target.worldY);
  input.fire = rand() < 0.1;
  return input;
}
```

导出：`export * from "./sim/ai.js";`

- [ ] **Step 3: aiDriver + fillAiIfNeeded**

`aiDriver.ts`:

```typescript
import { decideAiInput, type PlayerInput, type RoomSimState } from "@tcc/shared";

export function refreshAiInputs(
  state: RoomSimState,
  inputs: Record<string, PlayerInput>,
  now: number,
  rand: () => number,
): void {
  for (const p of Object.values(state.players)) {
    if (!p.isAi || p.eliminated) continue;
    inputs[p.playerId] = decideAiInput(state, p.playerId, now, rand);
  }
}
```

在 `TankRoom`：

```typescript
private aiAccMs = 0;

// tick 内：
this.aiAccMs += 1000 / TICK_HZ;
if (this.aiAccMs >= 200) {
  this.aiAccMs = 0;
  refreshAiInputs(this.sim, this.inputs, this.sim.time, this.rand);
}

private fillAiIfNeeded(): void {
  const living = Object.values(this.sim.players).filter((p) => !p.eliminated);
  let guard = 0;
  while (living.length + guard < AI_FILL_TARGET_PLAYERS) {
    const empty = this.sim.camps.some((c) => c.ownerPlayerId === null);
    if (!empty) break;
    const id = `ai-${this.sim.time.toFixed(3)}-${Math.floor(this.rand() * 1e6)}`;
    const result = assignCampForJoin(this.sim, id, `Bot${guard}`, true, this.sim.time, this.rand, id);
    if (!result) break;
    this.inputs[id] = idleInput();
    this.syncPlayer(id);
    guard += 1;
  }
  this.syncCamps();
}
```

- [ ] **Step 4: 测试 + Commit**

```bash
pnpm --filter @tcc/shared test
git add -A && git commit -m "$(cat <<'EOF'
feat: weak AI fillers with reclaimable camps

EOF
)"
```

---

## Task 14: 视野裁剪

**Interfaces:**

```typescript
export interface VisibleSnapshot {
  playerIds: string[];
  projectileIds: number[];
  airdropIds: number[];
  neutrals: Array<{ id: number; x: number; y: number; kind: number }>;
  airdrops: Array<{ id: number; x: number; y: number; claimed: boolean; landed: boolean }>;
}

export function computeVisibility(
  state: RoomSimState,
  viewerId: string,
  radius?: number,
): VisibleSnapshot;
```

**Files:**
- Create: `packages/server/src/systems/visibility.ts`
- Create: `packages/shared/src/sim/visibility.ts`（纯函数便于测）
- Create: `packages/shared/src/__tests__/visibility.test.ts`
- Modify: `TankRoom.ts`, `GameScene.ts`

- [ ] **Step 1: 测试**

```typescript
import { describe, expect, it } from "vitest";
import { VISIBILITY_RADIUS } from "../constants.js";
import { createInitialMap } from "../map/createInitialMap.js";
import { assignCampForJoin } from "../sim/joinAssign.js";
import { computeVisibility } from "../sim/visibility.js";
import type { RoomSimState } from "../types.js";

describe("computeVisibility", () => {
  it("includes nearby tanks and always lists neutrals", () => {
    const state = { ...createInitialMap(50), players: {} } as RoomSimState;
    assignCampForJoin(state, "self", "S", false, 0, () => 0, "self");
    assignCampForJoin(state, "far", "F", false, 0, () => 0.99, "far");
    const self = state.players["self"]!;
    state.players["near"] = {
      ...structuredClone(self),
      playerId: "near",
      nickname: "N",
      campIds: [],
      tank: { ...self.tank, playerId: "near", x: self.tank.x + 50, y: self.tank.y },
      sessionToken: "near",
    };
    const snap = computeVisibility(state, "self", VISIBILITY_RADIUS);
    expect(snap.playerIds).toContain("self");
    expect(snap.playerIds).toContain("near");
    expect(snap.neutrals.length).toBe(state.neutralPoints.length);
  });
});
```

- [ ] **Step 2: 实现**

```typescript
import { VISIBILITY_RADIUS } from "../constants.js";
import type { RoomSimState } from "../types.js";

export interface VisibleSnapshot {
  playerIds: string[];
  projectileIds: number[];
  airdropIds: number[];
  neutrals: Array<{ id: number; x: number; y: number; kind: number }>;
  airdrops: Array<{ id: number; x: number; y: number; claimed: boolean; landed: boolean }>;
}

export function computeVisibility(
  state: RoomSimState,
  viewerId: string,
  radius: number = VISIBILITY_RADIUS,
): VisibleSnapshot {
  const viewer = state.players[viewerId];
  const ox = viewer?.tank.x ?? 0;
  const oy = viewer?.tank.y ?? 0;
  const r2 = radius * radius;
  const playerIds: string[] = [];
  for (const p of Object.values(state.players)) {
    if (p.eliminated || !p.tank.alive) continue;
    if (p.playerId === viewerId || dist2(ox, oy, p.tank.x, p.tank.y) <= r2) {
      playerIds.push(p.playerId);
    }
  }
  const projectileIds = state.projectiles
    .filter((pr) => dist2(ox, oy, pr.x, pr.y) <= r2)
    .map((pr) => pr.id);
  const airdropIds = state.airdrops
    .filter((a) => !a.claimed && dist2(ox, oy, a.x, a.y) <= r2)
    .map((a) => a.id);
  return {
    playerIds,
    projectileIds,
    airdropIds,
    neutrals: state.neutralPoints.map((n) => ({ id: n.id, x: n.x, y: n.y, kind: n.kind })),
    airdrops: state.airdrops.map((a) => ({
      id: a.id, x: a.x, y: a.y, claimed: a.claimed, landed: a.landed,
    })),
  };
}

function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}
```

`TankRoom`：每 100ms（`visorAcc`）对每个 client：

```typescript
client.send("visor", computeVisibility(this.sim, client.sessionId));
```

`GameScene`：缓存 `visor`，仅渲染 `playerIds` 内非己坦克；营地仍全量；小地图用 `visor.neutrals/airdrops`。

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "$(cat <<'EOF'
feat(server): visibility culling for tanks and projectiles

EOF
)"
```

---

## Task 15: 端到端玩法验收清单

**Files:**
- Create: `docs/superpowers/plans/playtest-checklist-v1.md`

- [ ] **Step 1: 写下清单**

```markdown
# v1 Playtest Checklist

- [ ] 游客输入昵称可进房，分到空营，核心有 30–60s 保护
- [ ] WASD/方向键四向移动，空格/J 射击，Tab/1/2 切弹
- [ ] 手机横屏：左移右射，按钮半透明且不挡中央
- [ ] 砖墙可毁、钢墙不可毁、水域不可进、草可见掩体
- [ ] 坦克被毁后在己方多营中随机重生并有 ~1.5s 无敌
- [ ] 攻城弹拆无保护核心 → 易主；最后一营丢失 → 出局面板
- [ ] 出局写入 localStorage；刷新后为新玩家且历史最佳保留
- [ ] 中立点可补给；空投可见可拾取；营总数 ≤8 时空投攻城弹明显变多
- [ ] 房间人少时有 AI；新真人优先空营否则回收 AI 营
- [ ] 满房后 joinOrCreate 进入另一房间实例
- [ ] 32 营同房下主流设备操作可接受（视野裁剪开启）
- [ ] 无毒圈、无手动选营、无账号强制
```

- [ ] **Step 2: 按清单手工过一轮，失败项记入 PR 描述（若有）**

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "$(cat <<'EOF'
docs: add v1 playtest checklist

EOF
)"
```

---

## Spec coverage self-check

| 设计说明章节 | 覆盖 Task |
|--------------|-----------|
| 1 一句话 / 2 设计目标 | Goal、Architecture、Task 15 |
| 3.1 营地与胜负（毁核易主、全丢出局、无游牧） | Task 3, 5, 7 |
| 3.2 重生随机 + 1–2s 无敌、无手动选营 | Task 4 |
| 3.3 新人空营 + 30–60s 核心保护 | Task 7, 8 |
| 3.4 不缩圈；中立 / 空投 / 攻城补给 | Task 6（无毒圈代码） |
| 3.5 轻量物资表（普通弹、维修、护甲、攻城、可选 HE） | Task 5, 6 |
| 3.6 常驻房、8–12 分钟体感、≤8 营软加压 | Task 6 softPressure；房间无统一倒计时 Task 8 |
| 3.7 结算面板 + localStorage + 刷新新玩家 | Task 12 |
| 3.8 本轮成绩 / 本地最佳为主（房间实时榜可选，v1 不做） | Task 12；实时榜列入 YAGNI |
| 4.1 32 营、满员新房、AI 垫场、空营优先否则回收 AI | Task 2, 7, 8, 13 |
| 4.2 必做清单 | Tasks 2–14 |
| 4.3 明确不做 | Global Constraints YAGNI |
| 4.4 成功标准 | Task 15 |
| 5.1–5.3 桌面/手机/HUD | Task 11, 12 |
| 6 地图结构 | Task 2 |
| 7 / 7.1 技术骨架与关键状态 | Architecture、File Structure、Task 8–9 |
| 8 人机行为与回收策略 | Task 13, 7 |
| 9 风险缓解 | 随机重生/保护/裁剪/软加压 → Task 4,7,14,6 |
| 10–11 非 v1 / 工作名 | YAGNI；文档标题工作名 |

---

## 任务间契约速查

| From → To | 契约 |
|-----------|------|
| shared `simulateTick` → server `TankRoom.tick` | `(state, inputs, TICK_DT, rand) => OwnershipEvent[]` |
| client `input` message → server | `PlayerInput` 布尔字段 + `selectAmmo: 0\|1\|2\|null` |
| server `ownership` / `eliminated` → client | Task 3 事件形状；`eliminated.stats: DeathStats` |
| shared `assignCampForJoin` → server `onJoin` / AI fill | `JoinResult \| null`；null 则拒绝入房 |
| `computeVisibility` → client `visor` | `VisibleSnapshot`（含 neutrals/airdrops 供小地图） |

---

## YAGNI 复核（实现时禁止偷偷加入）

- 毒圈、手动选营、账号系统、商城、车型树、同盟、观战录像、段位赛季、跨房、100 营单房、荣誉「占地第一」标记、房间强制实时段位榜。
