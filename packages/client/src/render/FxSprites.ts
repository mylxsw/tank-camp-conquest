import Phaser from "phaser";
import { PIXEL_KEYS } from "./PixelAtlas.js";

const FX_MS = 200;

/** Brief muzzle flash offset toward facing (0 up .. 3 left). */
export function spawnMuzzle(scene: Phaser.Scene, x: number, y: number, dir: number): void {
  const ox = [0, 16, 0, -16][dir] ?? 0;
  const oy = [-16, 0, 16, 0][dir] ?? 0;
  const img = scene.add.image(x + ox, y + oy, PIXEL_KEYS.fxMuzzle);
  img.setDisplaySize(14, 14);
  img.setDepth(20);
  scene.tweens.add({
    targets: img,
    alpha: 0,
    duration: FX_MS,
    onComplete: () => img.destroy(),
  });
}

/** Brief hit spark at world position. */
export function spawnHit(scene: Phaser.Scene, x: number, y: number): void {
  const img = scene.add.image(x, y, PIXEL_KEYS.fxHit);
  img.setDisplaySize(14, 14);
  img.setDepth(20);
  scene.tweens.add({
    targets: img,
    alpha: 0,
    scale: 1.4,
    duration: FX_MS,
    onComplete: () => img.destroy(),
  });
}
