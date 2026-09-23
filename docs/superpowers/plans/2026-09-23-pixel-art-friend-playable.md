# Pixel-Art Friend-Playable Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace color-block Phaser rectangles/circles with procedurally generated classic pixel textures so friends can read tanks, walls, water, grass, shells, and camp cores at a glance, plus minimal muzzle/hit FX.

**Architecture:** A `PixelAtlas` module registers textures once at boot via Phaser `textures.generate` (or canvas putImageData). `MapRenderer`, `TankSprite`, `CampRenderer`, and `ProjectileRenderer` switch to `Image`/`Sprite` using those keys. `GameScene` triggers short-lived FX on fire and on projectile/wall removal. No gameplay rule changes; no new npm art deps.

**Tech Stack:** Phaser 3, TypeScript, existing pnpm monorepo `@tcc/client` + `@tcc/shared` (`TILE_SIZE = 32`).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-23-pixel-art-friend-playable-design.md`
- Procedural pixel atlas only (no hand-PNG pack, no Spine/3D)
- Keep Chinese onboarding copy; keep `wallPatch` sync
- Do not change Colyseus rules, camp count, ammo economy, or operate VPS
- Git author for commits: `-c user.email=mylxsw@gulu.ai -c user.name=mylxsw`
- Repo root: `/workspace/tank-camp-conquest`; push to `origin/master` when complete
- Verify: `corepack pnpm` / package scripts for shared tests + client typecheck

---

### Task 1: PixelAtlas texture generator

**Files:**
- Create: `packages/client/src/render/PixelAtlas.ts`
- Modify: `packages/client/src/scenes/BootScene.ts`

**Interfaces:**
- Produces: `export const PIXEL_KEYS = { ground, brick, brickDamaged, steel, water, grass, tankBody, tankBarrel, shellNormal, shellSiege, coreEmpty, coreSelf, coreEnemy, fxMuzzle, fxHit } as const`
- Produces: `export function registerPixelAtlas(scene: Phaser.Scene): void` — idempotent; generates all keys if missing
- Produces: `export function tintTankKey unused` — tanks use one body texture + `setTint(color)` OR separate tint at draw time

**Pixel design notes (must look like classic Tank Battle, not flat rects):**
- Tile size **32×32** to match `TILE_SIZE`
- Brick: reddish mortar grid; damaged: darker + missing corner pixels
- Steel: blue-gray with rivet dots
- Water: deep blue with lighter wave pixels (static OK)
- Grass: green speckles on transparent or dark green
- Ground: dark brown/gray noise fill for empty cells (optional full-map ground layer)
- Tank body: treads on sides, cabin block; barrel separate thin rectangle texture, origin near base
- Core: small fort/flag pixel emblem (not a plain circle)
- Shells: normal = yellow 6×6; siege = orange diamond-ish 8×8
- FX: white/yellow spark clusters

- [ ] **Step 1:** Implement `registerPixelAtlas` using `scene.textures.generate(key, { data: string[], pixelWidth: 1 })` (Phaser generate from string arrays of color codes) OR canvas. Prefer Phaser generate for simplicity.

- [ ] **Step 2:** Call `registerPixelAtlas(this)` at start of `BootScene.create` before UI text / nickname prompt.

- [ ] **Step 3:** Commit `feat(client): procedural pixel atlas for Stage A`

---

### Task 2: MapRenderer uses tile images

**Files:**
- Modify: `packages/client/src/render/MapRenderer.ts`

**Interfaces:**
- Consumes: `PIXEL_KEYS` from PixelAtlas
- Keep: `MapStaticPayload`, `WallPatch`, `applyWallPatches`

- [ ] **Step 1:** Draw optional ground tiles for all map cells OR at least under water/grass/walls (if expensive, only place ground under empty walkable area from water/grass/walls sets — simplest: fill container with repeated `ground` for mapTiles² is too heavy; instead set scene background color dark and only sprite water/grass/walls).

- [ ] **Step 2:** Replace wall `rectangle` with `image` using `brick`/`steel`; on upsert if brick and `hp < BRICK_HP` use `brickDamaged`; if `hp <= 0` destroy image and delete maps.

- [ ] **Step 3:** Water/grass as images with `PIXEL_KEYS.water` / `grass`, origin center, display size `tile`×`tile`.

- [ ] **Step 4:** Commit `feat(client): pixel map tiles for walls water grass`

---

### Task 3: Tank, camp core, projectile sprites

**Files:**
- Modify: `packages/client/src/render/TankSprite.ts`
- Modify: `packages/client/src/render/CampRenderer.ts`
- Modify: `packages/client/src/render/ProjectileRenderer.ts`
- Modify: `packages/client/src/scenes/GameScene.ts` (only if tank color/tint wiring needs tweak)

**Interfaces:**
- TankSprite: keep `sync`, `updateLerp`, `setVisible`, `destroy`, `x`/`y` getters; replace Rectangle body/barrel with Images; `setTint` on body for player color; barrel untinted dark
- CampRenderer: swap arcs for core images by ownership (`coreEmpty`/`coreSelf`/`coreEnemy`); keep 「核心」/「核心(护)」 labels
- ProjectileRenderer: use `shellNormal` vs `shellSiege` if projectile schema has kind/type; else all `shellNormal`

- [ ] **Step 1:** TankSprite images + rotation as today (dir 0..3)

- [ ] **Step 2:** CampRenderer images + alpha for protection

- [ ] **Step 3:** ProjectileRenderer images

- [ ] **Step 4:** Commit `feat(client): pixel tanks camps shells`

---

### Task 4: Muzzle / hit FX + README

**Files:**
- Create (optional small helper): `packages/client/src/render/FxSprites.ts` with `spawnMuzzle(scene, x, y, dir)` and `spawnHit(scene, x, y)` — fades out ~150–250ms then destroy
- Modify: `packages/client/src/scenes/GameScene.ts` — on local fire rising edge call spawnMuzzle at self tank; when projectile map entry removed call spawnHit at last position; when wallPatch reduces hp call spawnHit at tile center
- Modify: `README.md` — one line that Stage A client uses procedural pixel art

- [ ] **Step 1:** Implement FX helpers

- [ ] **Step 2:** Wire GameScene

- [ ] **Step 3:** Commit `feat(client): muzzle and hit pixel FX`

---

### Task 5: Verify and push

- [ ] Run shared tests (e.g. `corepack pnpm --filter @tcc/shared test` or repo root script — discover from package.json)
- [ ] Run client typecheck
- [ ] Fix any TS errors
- [ ] Push all commits to `origin/master`
- [ ] Report: commit SHAs, files changed, how user retests (`git pull`, local `pnpm dev` or VPS rebuild)

---

## Spec coverage checklist

| Spec item | Task |
| --- | --- |
| Procedural atlas | 1 |
| Terrain readability | 2 |
| Tank/core/shell readable | 3 |
| Brick damaged state | 2 |
| Muzzle/hit FX | 4 |
| Onboarding kept | BootScene unchanged copy (Task 1 only inserts atlas) |
| Push master | 5 |
