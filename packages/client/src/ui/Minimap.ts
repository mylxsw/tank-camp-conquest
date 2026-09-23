import Phaser from "phaser";
import { MAP_WORLD_SIZE } from "@tcc/shared";

const SIZE = 200;

export class Minimap {
  private g: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.g = scene.add
      .graphics()
      .setScrollFactor(0)
      .setPosition(scene.scale.width - SIZE - 12, 12)
      .setDepth(1000);
  }

  sync(opts: {
    camps: Iterable<{ worldX: number; worldY: number; ownerPlayerId: string }>;
    neutrals: Iterable<{ x: number; y: number }>;
    airdrops: Iterable<{ x: number; y: number; claimed: boolean }>;
    selfId: string;
  }): void {
    this.g.clear();
    this.g.fillStyle(0x000000, 0.45);
    this.g.fillRect(0, 0, SIZE, SIZE);
    const sx = SIZE / MAP_WORLD_SIZE;
    for (const c of opts.camps) {
      const empty = !c.ownerPlayerId;
      const self = c.ownerPlayerId === opts.selfId;
      this.g.fillStyle(empty ? 0x888888 : self ? 0x33cc66 : 0xcc3333, 1);
      this.g.fillCircle(c.worldX * sx, c.worldY * sx, 3);
    }
    for (const n of opts.neutrals) {
      this.g.fillStyle(0xffdd33, 1);
      this.g.fillCircle(n.x * sx, n.y * sx, 2);
    }
    for (const a of opts.airdrops) {
      if (a.claimed) continue;
      this.g.fillStyle(0xffffff, 1);
      this.g.fillCircle(a.x * sx, a.y * sx, 2);
    }
  }
}
