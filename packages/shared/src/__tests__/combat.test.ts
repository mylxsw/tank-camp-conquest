import { describe, expect, it } from "vitest";
import {
  AmmoType, CORE_MAX_HP, MAP_TILES, NORMAL_DAMAGE_TANK, SIEGE_DAMAGE_CORE,
  SIEGE_DAMAGE_TANK, START_NORMAL_AMMO, START_SIEGE_AMMO, TANK_MAX_HP, TILE_SIZE,
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
    // small steps so discrete projectile motion does not overshoot the core hit radius
    for (let i = 0; i < 20; i++) advanceProjectiles(state, 0.02, i * 0.02);
    expect(camp.coreHp).toBeLessThan(CORE_MAX_HP);
  });


  it("core hit wins over nearby camp walls when projectile is near center", () => {
    const state = { ...createInitialMap(8), players: {} } as RoomSimState;
    const camp = state.camps[3]!;
    state.players["A"] = pl("A", [0], {
      x: camp.worldX - 28, y: camp.worldY, dir: 1,
      selectedAmmo: AmmoType.Siege, ammoSiege: 5,
    });
    state.players["B"] = pl("B", [3]);
    camp.ownerPlayerId = "B";
    camp.protectionUntil = 0;
    camp.coreHp = CORE_MAX_HP;
    // Keep walls — core-first collision must still register
    tryFire(state, "A", 0);
    for (let i = 0; i < 10; i++) advanceProjectiles(state, 0.05, i * 0.05);
    expect(camp.coreHp).toBeLessThan(CORE_MAX_HP);
  });

  it("starting ammo constants allow first siege attack", () => {
    expect(START_NORMAL_AMMO).toBeGreaterThanOrEqual(40);
    expect(START_SIEGE_AMMO).toBeGreaterThanOrEqual(5);
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
