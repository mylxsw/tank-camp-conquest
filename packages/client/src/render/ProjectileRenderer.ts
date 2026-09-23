import Phaser from "phaser";
import { AmmoType } from "@tcc/shared";
import { PIXEL_KEYS } from "./PixelAtlas.js";

export type ProjectileView = {
  id: number;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  ammo?: number;
};

export type RemovedProjectile = { x: number; y: number };

type DotState = {
  img: Phaser.GameObjects.Image;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ammo: number;
  /** Performance.now() when last server sample arrived. */
  syncedAt: number;
};

/**
 * Visor snapshots arrive at ~20Hz; extrapolate with vx/vy between samples so
 * shells don't teleport and siege ammo stays visually distinct.
 */
export class ProjectileRenderer {
  private dots = new Map<number, DotState>();

  constructor(private scene: Phaser.Scene) {}

  syncFromMessage(projectiles: ProjectileView[]): RemovedProjectile[] {
    const now = performance.now();
    const seen = new Set<number>();
    for (const p of projectiles) {
      seen.add(p.id);
      const ammo = p.ammo ?? AmmoType.Normal;
      const tex =
        ammo === AmmoType.Siege ? PIXEL_KEYS.shellSiege : PIXEL_KEYS.shellNormal;
      let d = this.dots.get(p.id);
      if (!d) {
        const img = this.scene.add.image(p.x, p.y, tex);
        if (ammo === AmmoType.Siege) img.setDisplaySize(10, 10);
        else img.setDisplaySize(8, 8);
        d = {
          img,
          x: p.x,
          y: p.y,
          vx: p.vx ?? 0,
          vy: p.vy ?? 0,
          ammo,
          syncedAt: now,
        };
        this.dots.set(p.id, d);
      } else {
        d.x = p.x;
        d.y = p.y;
        d.vx = p.vx ?? d.vx;
        d.vy = p.vy ?? d.vy;
        d.syncedAt = now;
        if (d.ammo !== ammo) {
          d.ammo = ammo;
          d.img.setTexture(tex);
          if (ammo === AmmoType.Siege) d.img.setDisplaySize(10, 10);
          else d.img.setDisplaySize(8, 8);
        }
        d.img.setPosition(d.x, d.y);
      }
    }
    const removed: RemovedProjectile[] = [];
    for (const [id, d] of this.dots) {
      if (!seen.has(id)) {
        removed.push({ x: d.img.x, y: d.img.y });
        d.img.destroy();
        this.dots.delete(id);
      }
    }
    return removed;
  }

  /** Call each frame to coast shells between visor packets. */
  update(): void {
    const now = performance.now();
    for (const d of this.dots.values()) {
      const age = Math.min(0.12, (now - d.syncedAt) / 1000);
      d.img.setPosition(d.x + d.vx * age, d.y + d.vy * age);
    }
  }
}
