import Phaser from "phaser";

export class ProjectileRenderer {
  private dots = new Map<number, Phaser.GameObjects.Arc>();

  constructor(private scene: Phaser.Scene) {}

  syncFromMessage(projectiles: Array<{ id: number; x: number; y: number }>): void {
    const seen = new Set<number>();
    for (const p of projectiles) {
      seen.add(p.id);
      let d = this.dots.get(p.id);
      if (!d) {
        d = this.scene.add.circle(p.x, p.y, 3, 0xffff66);
        this.dots.set(p.id, d);
      } else {
        d.setPosition(p.x, p.y);
      }
    }
    for (const [id, d] of this.dots) {
      if (!seen.has(id)) {
        d.destroy();
        this.dots.delete(id);
      }
    }
  }
}
