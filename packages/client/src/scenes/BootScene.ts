import Phaser from "phaser";
import { registerPixelAtlas } from "../render/PixelAtlas.js";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create(): void {
    registerPixelAtlas(this);

    const { width, height } = this.scale;
    this.add
      .text(width / 2, height / 2 - 40, "目标：用攻城弹拆掉敌方核心，占领营地；丢光营地出局", {
        fontSize: "18px",
        color: "#ffe08a",
        align: "center",
        wordWrap: { width: width - 80 },
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, height / 2 + 20, "操作: WASD移动 | 空格射击 | 1/2/3切弹 | Tab普通↔攻城", {
        fontSize: "14px",
        color: "#ddeeff",
        align: "center",
      })
      .setOrigin(0.5);

    const nickname = (window.prompt("输入昵称（游客）", "Guest") ?? "Guest").slice(0, 16);
    this.scene.start("GameScene", { nickname });
  }
}
