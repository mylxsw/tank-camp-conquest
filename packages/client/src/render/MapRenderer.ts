import Phaser from "phaser";
import { TILE_SIZE, type WallCell } from "@tcc/shared";

export type MapStaticPayload = {
  tileSize: number;
  mapTiles: number;
  walls: WallCell[];
  water: Array<[number, number]>;
  grass: Array<[number, number]>;
};

/** Distinct terrain palette so brick ≠ steel ≠ water ≠ grass. */
const COLOR_STEEL = 0xa0a8b0;
const COLOR_BRICK = 0xc45c26;
const COLOR_WATER = 0x2a6fbf;
const COLOR_GRASS = 0x3aa84a;

/** Draws static map tiles (walls, water, grass) once from a mapStatic payload. */
export class MapRenderer {
  private layer: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, data: MapStaticPayload) {
    const tile = data.tileSize || TILE_SIZE;
    this.layer = scene.add.container(0, 0);
    this.layer.setDepth(-10);

    for (const [tx, ty] of data.water) {
      this.layer.add(
        scene.add.rectangle(tx * tile + tile / 2, ty * tile + tile / 2, tile, tile, COLOR_WATER),
      );
    }
    for (const [tx, ty] of data.grass) {
      this.layer.add(
        scene.add.rectangle(tx * tile + tile / 2, ty * tile + tile / 2, tile, tile, COLOR_GRASS),
      );
    }
    for (const w of data.walls) {
      if (w.hp <= 0) continue;
      const color = w.kind === "steel" ? COLOR_STEEL : COLOR_BRICK;
      const rect = scene.add.rectangle(
        w.tileX * tile + tile / 2,
        w.tileY * tile + tile / 2,
        tile - 1,
        tile - 1,
        color,
      );
      if (w.kind === "steel") {
        rect.setStrokeStyle(1, 0xffffff, 0.35);
      }
      this.layer.add(rect);
    }
  }

  destroy(): void {
    this.layer.destroy(true);
  }
}
