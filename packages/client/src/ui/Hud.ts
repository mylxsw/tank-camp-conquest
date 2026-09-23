import Phaser from "phaser";

export class Hud {
  private ammoText: Phaser.GameObjects.Text;
  private campText: Phaser.GameObjects.Text;
  private protectText: Phaser.GameObjects.Text;
  private pressureText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    const style = { fontSize: "16px", color: "#ffffff", backgroundColor: "#00000066" };
    this.ammoText = scene.add.text(12, 12, "", style).setScrollFactor(0).setDepth(1000);
    this.campText = scene.add.text(12, 36, "", style).setScrollFactor(0).setDepth(1000);
    this.protectText = scene.add.text(12, 60, "", style).setScrollFactor(0).setDepth(1000);
    this.pressureText = scene.add
      .text(12, 84, "", { ...style, color: "#ffaa55" })
      .setScrollFactor(0)
      .setDepth(1000);
  }

  sync(opts: {
    selectedAmmo: number;
    ammoSiege: number;
    ammoNormal: number;
    campCount: number;
    protectionRemaining: number;
    softPressureActive: boolean;
  }): void {
    const ammoName = opts.selectedAmmo === 1 ? "攻城" : opts.selectedAmmo === 2 ? "高爆" : "普通";
    this.ammoText.setText(`弹药: ${ammoName} | 普通 ${opts.ammoNormal} | 攻城 ${opts.ammoSiege}`);
    this.campText.setText(`营地: ${opts.campCount}`);
    this.protectText.setText(
      opts.protectionRemaining > 0 ? `核心保护: ${opts.protectionRemaining.toFixed(0)}s` : "",
    );
    this.pressureText.setText(opts.softPressureActive ? "软加压：空投攻城弹增加" : "");
  }
}
