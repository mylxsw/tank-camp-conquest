import Phaser from "phaser";

export class DeathScene extends Phaser.Scene {
  constructor() {
    super("DeathScene");
  }

  create(data: { stats?: any }): void {
    this.add.text(640, 300, "出局", { fontSize: "48px", color: "#ffffff" }).setOrigin(0.5);
    this.add
      .text(640, 380, JSON.stringify(data.stats ?? {}), {
        fontSize: "16px",
        color: "#cccccc",
        wordWrap: { width: 800 },
      })
      .setOrigin(0.5);
  }
}
