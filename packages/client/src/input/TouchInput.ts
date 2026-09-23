import Phaser from "phaser";
import { AmmoType } from "@tcc/shared";
import type { ClientInputState } from "./InputManager.js";

type PadKey = "up" | "down" | "left" | "right" | "fire" | "ammo";

export class TouchInput {
  private pressed: Record<PadKey, boolean> = {
    up: false,
    down: false,
    left: false,
    right: false,
    fire: false,
    ammo: false,
  };
  private pendingAmmo: AmmoType | null = null;
  private lastAmmo: AmmoType = AmmoType.Normal;
  private buttons: Phaser.GameObjects.Rectangle[] = [];
  private labels: Phaser.GameObjects.Text[] = [];
  private rotateHint?: Phaser.GameObjects.Text;

  attach(scene: Phaser.Scene): void {
    const mk = (x: number, y: number, label: string, key: PadKey, toggleAmmo = false) => {
      const btn = scene.add
        .rectangle(x, y, 64, 64, 0xffffff, 0.35)
        .setScrollFactor(0)
        .setDepth(1000)
        .setInteractive();
      const text = scene.add
        .text(x, y, label, { fontSize: "14px", color: "#fff" })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(1001);
      btn.on("pointerdown", () => {
        this.pressed[key] = true;
        if (toggleAmmo) {
          this.lastAmmo =
            this.lastAmmo === AmmoType.Siege ? AmmoType.Normal : AmmoType.Siege;
          this.pendingAmmo = this.lastAmmo;
        }
      });
      btn.on("pointerup", () => {
        this.pressed[key] = false;
      });
      btn.on("pointerout", () => {
        this.pressed[key] = false;
      });
      this.buttons.push(btn);
      this.labels.push(text);
    };

    const h = scene.scale.height;
    const w = scene.scale.width;
    // D-pad bottom-left; fire/ammo bottom-right — center play area clear
    mk(80, h - 140, "↑", "up");
    mk(80, h - 60, "↓", "down");
    mk(20, h - 100, "←", "left");
    mk(140, h - 100, "→", "right");
    mk(w - 80, h - 80, "射", "fire");
    mk(w - 80, h - 160, "弹", "ammo", true);

    if (h > w) {
      this.rotateHint = scene.add
        .text(w / 2, 24, "建议横屏游玩", {
          fontSize: "16px",
          color: "#ffcc66",
          backgroundColor: "#00000088",
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setAlpha(0.85)
        .setDepth(1001);
    }
  }

  sample(): ClientInputState {
    const ammo = this.pendingAmmo;
    this.pendingAmmo = null;
    return {
      up: this.pressed.up,
      down: this.pressed.down,
      left: this.pressed.left,
      right: this.pressed.right,
      fire: this.pressed.fire,
      selectAmmo: ammo,
    };
  }

  destroy(): void {
    for (const b of this.buttons) b.destroy();
    for (const t of this.labels) t.destroy();
    this.rotateHint?.destroy();
  }
}
