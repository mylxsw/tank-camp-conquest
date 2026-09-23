import Phaser from "phaser";
import { PIXEL_KEYS } from "./PixelAtlas.js";

/** Camp cores: fort/flag pixel emblems so they are not confused with walls. */
export class CampRenderer {
  private cores = new Map<
    string,
    { img: Phaser.GameObjects.Image; label: Phaser.GameObjects.Text; tex: string }
  >();

  constructor(private scene: Phaser.Scene) {}

  sync(camps: Map<string, any> | { forEach: Function }, selfId: string): void {
    camps.forEach((c: any, key: string) => {
      let g = this.cores.get(key);
      const ownedBySelf = c.ownerPlayerId === selfId;
      const empty = !c.ownerPlayerId;
      const tex = empty
        ? PIXEL_KEYS.coreEmpty
        : ownedBySelf
          ? PIXEL_KEYS.coreSelf
          : PIXEL_KEYS.coreEnemy;
      if (!g) {
        const img = this.scene.add.image(c.worldX, c.worldY, tex);
        img.setDisplaySize(32, 32);
        const label = this.scene.add
          .text(c.worldX, c.worldY + 20, "核心", {
            fontSize: "10px",
            color: "#ffeebb",
            backgroundColor: "#00000066",
          })
          .setOrigin(0.5);
        g = { img, label, tex };
        this.cores.set(key, g);
      } else {
        g.img.setPosition(c.worldX, c.worldY);
        g.label.setPosition(c.worldX, c.worldY + 20);
        if (g.tex !== tex) {
          g.img.setTexture(tex);
          g.tex = tex;
        }
      }
      const alpha = c.protectionRemaining > 0 ? 0.55 : 1;
      g.img.setAlpha(alpha);
      g.label.setAlpha(alpha);
      g.label.setText(c.protectionRemaining > 0 ? "核心(护)" : "核心");
    });
  }
}
