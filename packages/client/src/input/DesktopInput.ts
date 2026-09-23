import Phaser from "phaser";
import { AmmoType } from "@tcc/shared";
import type { ClientInputState } from "./InputManager.js";

export class DesktopInput {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private space!: Phaser.Input.Keyboard.Key;
  private keyJ!: Phaser.Input.Keyboard.Key;
  private keyTab!: Phaser.Input.Keyboard.Key;
  private key1!: Phaser.Input.Keyboard.Key;
  private key2!: Phaser.Input.Keyboard.Key;
  private key3!: Phaser.Input.Keyboard.Key;
  private pendingAmmo: AmmoType | null = null;
  /** Last ammo chosen via keys (for Tab toggle Normal ↔ Siege). */
  private lastAmmo: AmmoType = AmmoType.Normal;

  attach(scene: Phaser.Scene): void {
    const kb = scene.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.wasd = kb.addKeys("W,A,S,D") as DesktopInput["wasd"];
    this.space = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyJ = kb.addKey(Phaser.Input.Keyboard.KeyCodes.J);
    this.keyTab = kb.addKey(Phaser.Input.Keyboard.KeyCodes.TAB);
    this.key1 = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
    this.key2 = kb.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
    this.key3 = kb.addKey(Phaser.Input.Keyboard.KeyCodes.THREE);
    this.keyTab.on("down", (event: KeyboardEvent) => {
      event.preventDefault();
      this.lastAmmo =
        this.lastAmmo === AmmoType.Siege ? AmmoType.Normal : AmmoType.Siege;
      this.pendingAmmo = this.lastAmmo;
    });
    this.key1.on("down", () => {
      this.lastAmmo = AmmoType.Normal;
      this.pendingAmmo = AmmoType.Normal;
    });
    this.key2.on("down", () => {
      this.lastAmmo = AmmoType.Siege;
      this.pendingAmmo = AmmoType.Siege;
    });
    this.key3.on("down", () => {
      this.lastAmmo = AmmoType.HE;
      this.pendingAmmo = AmmoType.HE;
    });
  }

  sample(): ClientInputState {
    const ammo = this.pendingAmmo;
    this.pendingAmmo = null;
    return {
      up: this.cursors.up.isDown || this.wasd.W.isDown,
      down: this.cursors.down.isDown || this.wasd.S.isDown,
      left: this.cursors.left.isDown || this.wasd.A.isDown,
      right: this.cursors.right.isDown || this.wasd.D.isDown,
      fire: this.space.isDown || this.keyJ.isDown,
      selectAmmo: ammo,
    };
  }
}
