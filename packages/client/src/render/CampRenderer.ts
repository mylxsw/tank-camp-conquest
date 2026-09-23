import Phaser from "phaser";

/** Camp cores: bullseye target look so they are not confused with walls. */
export class CampRenderer {
  private cores = new Map<
    string,
    { outer: Phaser.GameObjects.Arc; inner: Phaser.GameObjects.Arc; label: Phaser.GameObjects.Text }
  >();

  constructor(private scene: Phaser.Scene) {}

  sync(camps: Map<string, any> | { forEach: Function }, selfId: string): void {
    camps.forEach((c: any, key: string) => {
      let g = this.cores.get(key);
      const ownedBySelf = c.ownerPlayerId === selfId;
      const empty = !c.ownerPlayerId;
      const color = empty ? 0xbbbbbb : ownedBySelf ? 0x33cc66 : 0xee4444;
      if (!g) {
        const outer = this.scene.add.circle(c.worldX, c.worldY, 14, color, 0.35);
        outer.setStrokeStyle(2, color, 1);
        const inner = this.scene.add.circle(c.worldX, c.worldY, 6, color);
        const label = this.scene.add
          .text(c.worldX, c.worldY + 18, "核心", {
            fontSize: "10px",
            color: "#ffeebb",
            backgroundColor: "#00000066",
          })
          .setOrigin(0.5);
        g = { outer, inner, label };
        this.cores.set(key, g);
      } else {
        g.outer.setPosition(c.worldX, c.worldY);
        g.inner.setPosition(c.worldX, c.worldY);
        g.label.setPosition(c.worldX, c.worldY + 18);
        g.outer.setFillStyle(color, 0.35);
        g.outer.setStrokeStyle(2, color, 1);
        g.inner.setFillStyle(color);
      }
      const alpha = c.protectionRemaining > 0 ? 0.55 : 1;
      g.outer.setAlpha(alpha);
      g.inner.setAlpha(alpha);
      g.label.setAlpha(alpha);
      g.label.setText(c.protectionRemaining > 0 ? "核心(护)" : "核心");
    });
  }
}
