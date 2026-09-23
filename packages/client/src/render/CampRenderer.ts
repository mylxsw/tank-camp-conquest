import Phaser from "phaser";

export class CampRenderer {
  private cores = new Map<string, Phaser.GameObjects.Arc>();

  constructor(private scene: Phaser.Scene) {}

  sync(camps: Map<string, any> | { forEach: Function }, selfId: string): void {
    camps.forEach((c: any, key: string) => {
      let g = this.cores.get(key);
      const ownedBySelf = c.ownerPlayerId === selfId;
      const empty = !c.ownerPlayerId;
      const color = empty ? 0x888888 : ownedBySelf ? 0x33cc66 : 0xcc3333;
      if (!g) {
        g = this.scene.add.circle(c.worldX, c.worldY, 12, color);
        this.cores.set(key, g);
      } else {
        g.setPosition(c.worldX, c.worldY);
        g.setFillStyle(color);
      }
      g.setAlpha(c.protectionRemaining > 0 ? 0.55 : 1);
    });
  }
}
