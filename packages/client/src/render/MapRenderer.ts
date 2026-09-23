import Phaser from "phaser";
import { TILE_SIZE, type WallCell } from "@tcc/shared";

export type MapStaticPayload = {
  tileSize: number;
  mapTiles: number;
  walls: WallCell[];
  water: Array<[number, number]>;
  grass: Array<[number, number]>;
};

const COLOR_STEEL = 0x888888;
const COLOR_BRICK = 0x8b5a2b;
const COLOR_WATER = 0x3388cc;
const COLOR_GRASS = 0x3d9e4f;

/** Draws static map tiles (walls, water, grass) once from a mapStatic payload. */
export class MapRenderer {
  private layer: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, data: MapStaticPayload) {
    const tile = data.tileSize || TILE_SIZE;
    this.layer = scene.add.container(0, 0);
    this.layer.setDepth(-10);

    for (const [tx, ty] of data.water) {
      this.layer.add(scene.add.rectangle(tx * tile + tile / 2, ty * tile + tile / 2, tile, tile, COLOR_WATER));
    }
    for (const [tx, ty] of data.grass) {
      this.layer.add(scene.add.rectangle(tx * tile + tile / 2, ty * tile + tile / 2, tile, tile, COLOR_GRASS));
    }
    for (const w of data.walls) {
      if (w.hp <= 0) continue;
      const color = w.kind === "steel" ? COLOR_STEEL : COLOR_BRICK;
      this.layer.add(
        scene.add.rectangle(w.tileX * tile + tile / 2, w.tileY * tile + tile / 2, tile, tile, color),
      );
    }
  }

  destroy(): void {
    this.layer.destroy(true);
  }
}
