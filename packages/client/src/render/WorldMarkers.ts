import Phaser from "phaser";
import { PIXEL_KEYS } from "./PixelAtlas.js";

type Marker = {
  img: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
};

/**
 * In-world markers for neutral depots and airdrops (minimap alone is too easy to miss).
 */
export class WorldMarkers {
  private neutrals = new Map<string, Marker>();
  private airdrops = new Map<string, Marker>();

  constructor(private scene: Phaser.Scene) {}

  sync(opts: {
    neutrals: Array<{ id?: number; x: number; y: number; kind?: number }>;
    airdrops: Array<{ id?: number; x: number; y: number; claimed: boolean; landed?: boolean }>;
  }): void {
    const nSeen = new Set<string>();
    for (const n of opts.neutrals) {
      const key = String(n.id ?? `${n.x},${n.y}`);
      nSeen.add(key);
      let m = this.neutrals.get(key);
      const label =
        n.kind === 1 ? "修" : n.kind === 2 ? "油" : "弹";
      if (!m) {
        const img = this.scene.add.image(n.x, n.y, PIXEL_KEYS.fxMuzzle);
        img.setDisplaySize(18, 18);
        img.setTint(0xffcc44);
        const text = this.scene.add
          .text(n.x, n.y - 16, label, {
            fontSize: "11px",
            color: "#ffe08a",
            backgroundColor: "#00000088",
          })
          .setOrigin(0.5);
        m = { img, label: text };
        this.neutrals.set(key, m);
      } else {
        m.img.setPosition(n.x, n.y);
        m.label.setPosition(n.x, n.y - 16).setText(label);
      }
    }
    for (const [k, m] of this.neutrals) {
      if (!nSeen.has(k)) {
        m.img.destroy();
        m.label.destroy();
        this.neutrals.delete(k);
      }
    }

    const aSeen = new Set<string>();
    for (const a of opts.airdrops) {
      if (a.claimed) continue;
      const key = String(a.id ?? `${a.x},${a.y}`);
      aSeen.add(key);
      let m = this.airdrops.get(key);
      const label = a.landed === false ? "空投↓" : "空投";
      if (!m) {
        const img = this.scene.add.image(a.x, a.y, PIXEL_KEYS.shellSiege);
        img.setDisplaySize(14, 14);
        img.setTint(0x66ddff);
        const text = this.scene.add
          .text(a.x, a.y - 18, label, {
            fontSize: "11px",
            color: "#aaffff",
            backgroundColor: "#00000088",
          })
          .setOrigin(0.5);
        m = { img, label: text };
        this.airdrops.set(key, m);
      } else {
        m.img.setPosition(a.x, a.y);
        m.label.setPosition(a.x, a.y - 18).setText(label);
      }
    }
    for (const [k, m] of this.airdrops) {
      if (!aSeen.has(k)) {
        m.img.destroy();
        m.label.destroy();
        this.airdrops.delete(k);
      }
    }
  }

  destroy(): void {
    for (const m of this.neutrals.values()) {
      m.img.destroy();
      m.label.destroy();
    }
    for (const m of this.airdrops.values()) {
      m.img.destroy();
      m.label.destroy();
    }
    this.neutrals.clear();
    this.airdrops.clear();
  }
}
