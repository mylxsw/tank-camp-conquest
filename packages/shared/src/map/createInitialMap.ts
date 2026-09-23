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
