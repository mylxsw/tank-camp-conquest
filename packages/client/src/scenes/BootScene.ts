import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create(): void {
    const nickname = (window.prompt("输入昵称（游客）", "Guest") ?? "Guest").slice(0, 16);
    this.scene.start("GameScene", { nickname });
  }
}
