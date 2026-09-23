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
