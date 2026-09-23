import Phaser from "phaser";
import { BRICK_HP, TILE_SIZE, type WallCell } from "@tcc/shared";
import { PIXEL_KEYS } from "./PixelAtlas.js";

export type MapStaticPayload = {
  tileSize: number;
  mapTiles: number;
  walls: WallCell[];
  water: Array<[number, number]>;
  grass: Array<[number, number]>;
};

export type WallPatch = { tileX: number; tileY: number; hp: number };

/** World positions where a wall lost HP (for hit FX). */
export type WallHit = { x: number; y: number };

function wallKey(tx: number, ty: number): string {
  return `${tx},${ty}`;
}

/** Draws map tiles with procedural pixel textures; walls stay mutable via wallPatch. */
export class MapRenderer {
  private layer: Phaser.GameObjects.Container;
  private scene: Phaser.Scene;
  private tile: number;
  private wallSprites = new Map<string, Phaser.GameObjects.Image>();
  private wallMeta = new Map<string, { kind: "brick" | "steel"; hp: number }>();

  constructor(scene: Phaser.Scene, data: MapStaticPayload) {
    this.scene = scene;
    this.tile = data.tileSize || TILE_SIZE;
    this.layer = scene.add.container(0, 0);
    this.layer.setDepth(-10);
    scene.cameras.main.setBackgroundColor(0x2a2420);

    const mapPx = data.mapTiles * this.tile;
    // One TileSprite fills the whole map (avoids 4096 Image objects on a 64² grid).
    const ground = scene.add.tileSprite(
      mapPx / 2,
      mapPx / 2,
      mapPx,
      mapPx,
      PIXEL_KEYS.ground,
    );
    this.layer.add(ground);

    for (const [tx, ty] of data.water) {
      this.layer.add(this.makeTile(PIXEL_KEYS.water, tx, ty));
    }
    for (const [tx, ty] of data.grass) {
      this.layer.add(this.makeTile(PIXEL_KEYS.grass, tx, ty));
    }
    for (const w of data.walls) {
      this.upsertWall(w);
    }
  }

  private makeTile(key: string, tx: number, ty: number): Phaser.GameObjects.Image {
    const img = this.scene.add.image(
      tx * this.tile + this.tile / 2,
      ty * this.tile + this.tile / 2,
      key,
    );
    img.setDisplaySize(this.tile, this.tile);
    return img;
  }

  /**
   * Apply server wall HP patches (hp<=0 removes the brick visual).
   * Returns centers of tiles whose HP decreased (for hit FX).
   */
  applyWallPatches(patches: WallPatch[]): WallHit[] {
    const hits: WallHit[] = [];
    for (const p of patches) {
      const prev = this.wallMeta.get(wallKey(p.tileX, p.tileY));
      if (prev && p.hp < prev.hp) {
        hits.push({
          x: p.tileX * this.tile + this.tile / 2,
          y: p.tileY * this.tile + this.tile / 2,
        });
      }
      this.upsertWall({
        tileX: p.tileX,
        tileY: p.tileY,
        kind: prev?.kind ?? "brick",
        hp: p.hp,
      });
    }
    return hits;
  }

  private brickTexture(hp: number): string {
    return hp < BRICK_HP ? PIXEL_KEYS.brickDamaged : PIXEL_KEYS.brick;
  }

  private upsertWall(w: WallCell): void {
    const key = wallKey(w.tileX, w.tileY);
    const existing = this.wallSprites.get(key);
    if (w.hp <= 0) {
      existing?.destroy();
      this.wallSprites.delete(key);
      this.wallMeta.delete(key);
      return;
    }
    const meta = this.wallMeta.get(key);
    const kind = meta?.kind ?? w.kind;
    const tex = kind === "steel" ? PIXEL_KEYS.steel : this.brickTexture(w.hp);
    if (existing) {
      if (existing.texture.key !== tex) existing.setTexture(tex);
      this.wallMeta.set(key, { kind, hp: w.hp });
      return;
    }
    const img = this.makeTile(tex, w.tileX, w.tileY);
    this.layer.add(img);
    this.wallSprites.set(key, img);
    this.wallMeta.set(key, { kind, hp: w.hp });
  }

  destroy(): void {
    this.layer.destroy(true);
    this.wallSprites.clear();
    this.wallMeta.clear();
  }
}
