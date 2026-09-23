import Phaser from "phaser";
import { AmmoType } from "@tcc/shared";
import { PIXEL_KEYS } from "./PixelAtlas.js";

export type ProjectileView = {
  id: number;
  x: number;
  y: number;
  ammo?: number;
};

export type RemovedProjectile = { x: number; y: number };

export class ProjectileRenderer {
  private dots = new Map<number, Phaser.GameObjects.Image>();

  constructor(private scene: Phaser.Scene) {}

  /**
   * Sync projectile sprites from visor snapshot.
   * Returns last positions of projectiles that disappeared (for hit FX).
   */
  syncFromMessage(projectiles: ProjectileView[]): RemovedProjectile[] {
    const seen = new Set<number>();
    for (const p of projectiles) {
      seen.add(p.id);
      const tex =
        p.ammo === AmmoType.Siege ? PIXEL_KEYS.shellSiege : PIXEL_KEYS.shellNormal;
      let d = this.dots.get(p.id);
      if (!d) {
        d = this.scene.add.image(p.x, p.y, tex);
        if (p.ammo === AmmoType.Siege) d.setDisplaySize(10, 10);
        else d.setDisplaySize(8, 8);
        this.dots.set(p.id, d);
      } else {
        d.setPosition(p.x, p.y);
        if (d.texture.key !== tex) d.setTexture(tex);
      }
    }
    const removed: RemovedProjectile[] = [];
    for (const [id, d] of this.dots) {
      if (!seen.has(id)) {
        removed.push({ x: d.x, y: d.y });
        d.destroy();
        this.dots.delete(id);
      }
    }
    return removed;
  }
}
