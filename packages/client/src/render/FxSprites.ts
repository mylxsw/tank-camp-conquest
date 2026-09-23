import Phaser from "phaser";
import { PIXEL_KEYS } from "./PixelAtlas.js";

const FX_MS = 300;

/** Brief muzzle flash offset toward facing (0 up .. 3 left). */
export function spawnMuzzle(scene: Phaser.Scene, x: number, y: number, dir: number): void {
  const ox = [0, 18, 0, -18][dir] ?? 0;
  const oy = [-18, 0, 18, 0][dir] ?? 0;
  const img = scene.add.image(x + ox, y + oy, PIXEL_KEYS.fxMuzzle);
  img.setDisplaySize(22, 22);
  img.setDepth(20);
  scene.tweens.add({
    targets: img,
    alpha: 0,
    scale: 1.7,
    duration: FX_MS,
    onComplete: () => img.destroy(),
  });
}

/** Hit spark + short radial particle burst + explode bloom. */
export function spawnHit(scene: Phaser.Scene, x: number, y: number): void {
  const img = scene.add.image(x, y, PIXEL_KEYS.fxHit);
  img.setDisplaySize(20, 20);
  img.setDepth(20);
  scene.tweens.add({
    targets: img,
    alpha: 0,
    scale: 1.9,
    duration: FX_MS,
    onComplete: () => img.destroy(),
  });

  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2 + Math.random() * 0.5;
    const dist = 8 + Math.random() * 10;
    const spark = scene.add.image(x, y, PIXEL_KEYS.fxHit);
    spark.setDisplaySize(8, 8);
    spark.setDepth(21);
    scene.tweens.add({
      targets: spark,
      x: x + Math.cos(ang) * dist,
      y: y + Math.sin(ang) * dist,
      alpha: 0,
      duration: FX_MS,
      onComplete: () => spark.destroy(),
    });
  }

  const boom = scene.add.image(x, y, PIXEL_KEYS.fxExplode);
  boom.setDisplaySize(28, 28);
  boom.setDepth(19);
  boom.setAlpha(0.85);
  scene.tweens.add({
    targets: boom,
    alpha: 0,
    scale: 2.2,
    duration: FX_MS + 40,
    onComplete: () => boom.destroy(),
  });
}
