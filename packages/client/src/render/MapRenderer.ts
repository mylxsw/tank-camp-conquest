import Phaser from "phaser";
import { BRICK_HP, TILE_SIZE, type WallCell } from "@tcc/shared";

export type MapStaticPayload = {
  tileSize: number;
  mapTiles: number;
  walls: WallCell[];
  water: Array<[number, number]>;
  grass: Array<[number, number]>;
};

export type WallPatch = { tileX: number; tileY: number; hp: number };

/** Distinct terrain palette so brick ≠ steel ≠ water ≠ grass. */
const COLOR_STEEL = 0xa0a8b0;
const COLOR_BRICK = 0xc45c26;
const COLOR_WATER = 0x2a6fbf;
const COLOR_GRASS = 0x3aa84a;

function wallKey(tx: number, ty: number): string {
  return `${tx},${ty}`;
}

/** Draws map tiles; wall rects stay mutable so brick destruction can sync. */
export class MapRenderer {
  private layer: Phaser.GameObjects.Container;
  private scene: Phaser.Scene;
  private tile: number;
  private wallRects = new Map<string, Phaser.GameObjects.Rectangle>();
  private wallMeta = new Map<string, { kind: "brick" | "steel"; hp: number }>();

  constructor(scene: Phaser.Scene, data: MapStaticPayload) {
    this.scene = scene;
    this.tile = data.tileSize || TILE_SIZE;
    this.layer = scene.add.container(0, 0);
    this.layer.setDepth(-10);

    for (const [tx, ty] of data.water) {
      this.layer.add(
        scene.add.rectangle(
          tx * this.tile + this.tile / 2,
          ty * this.tile + this.tile / 2,
          this.tile,
          this.tile,
          COLOR_WATER,
        ),
      );
    }
    for (const [tx, ty] of data.grass) {
      this.layer.add(
        scene.add.rectangle(
          tx * this.tile + this.tile / 2,
          ty * this.tile + this.tile / 2,
          this.tile,
          this.tile,
          COLOR_GRASS,
        ),
      );
    }
    for (const w of data.walls) {
      this.upsertWall(w);
    }
  }

  /** Apply server wall HP patches (hp<=0 removes the brick visual). */
  applyWallPatches(patches: WallPatch[]): void {
    for (const p of patches) {
      const prev = this.wallMeta.get(wallKey(p.tileX, p.tileY));
      this.upsertWall({
        tileX: p.tileX,
        tileY: p.tileY,
        kind: prev?.kind ?? "brick",
        hp: p.hp,
      });
    }
  }

  private upsertWall(w: WallCell): void {
    const key = wallKey(w.tileX, w.tileY);
    const existing = this.wallRects.get(key);
    if (w.hp <= 0) {
      existing?.destroy();
      this.wallRects.delete(key);
      this.wallMeta.delete(key);
      return;
    }
    const meta = this.wallMeta.get(key);
    const kind = meta?.kind ?? w.kind;
    if (existing) {
      const maxHp = kind === "steel" ? 999 : BRICK_HP;
      existing.setAlpha(Math.max(0.35, Math.min(1, w.hp / Math.max(1, maxHp))));
      this.wallMeta.set(key, { kind, hp: w.hp });
      return;
    }
    const color = kind === "steel" ? COLOR_STEEL : COLOR_BRICK;
    const rect = this.scene.add.rectangle(
      w.tileX * this.tile + this.tile / 2,
      w.tileY * this.tile + this.tile / 2,
      this.tile - 1,
      this.tile - 1,
      color,
    );
    if (kind === "steel") {
      rect.setStrokeStyle(1, 0xffffff, 0.35);
    }
    this.layer.add(rect);
    this.wallRects.set(key, rect);
    this.wallMeta.set(key, { kind, hp: w.hp });
  }

  destroy(): void {
    this.layer.destroy(true);
    this.wallRects.clear();
    this.wallMeta.clear();
  }
}
