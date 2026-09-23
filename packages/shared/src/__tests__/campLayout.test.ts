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
