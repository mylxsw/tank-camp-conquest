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
    add(s.tileX - 2, s.tileY - 2, "steel");
    add(s.tileX + 2, s.tileY + 2, "steel");
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        if (Math.abs(dx) !== 2 && Math.abs(dy) !== 2) continue;
        if (dx === 0 && Math.abs(dy) === 2) continue;
        if (dy === 0 && Math.abs(dx) === 2) continue;
        add(s.tileX + dx, s.tileY + dy, "brick");
      }
    }
  }
  return walls;
}

export function wallAt(walls: WallCell[], worldX: number, worldY: number): WallCell | undefined {
  const tileX = Math.floor(worldX / TILE_SIZE);
  const tileY = Math.floor(worldY / TILE_SIZE);
  return walls.find((w) => w.tileX === tileX && w.tileY === tileY && w.hp > 0);
}
