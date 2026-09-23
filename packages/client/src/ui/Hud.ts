import Phaser from "phaser";

export class Hud {
  private goalText: Phaser.GameObjects.Text;
  private ammoText: Phaser.GameObjects.Text;
  private campText: Phaser.GameObjects.Text;
  private protectText: Phaser.GameObjects.Text;
  private pressureText: Phaser.GameObjects.Text;
  private hintText: Phaser.GameObjects.Text;
  private legendText: Phaser.GameObjects.Text;
  private toastText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    const style = { fontSize: "16px", color: "#ffffff", backgroundColor: "#00000066" };

    this.goalText = scene.add
      .text(12, 8, "目标：用攻城弹拆掉敌方核心，占领营地；丢光营地出局", {
        fontSize: "14px",
        color: "#ffe08a",
        backgroundColor: "#00000099",
      })
      .setScrollFactor(0)
      .setDepth(1000);

    this.ammoText = scene.add.text(12, 36, "", style).setScrollFactor(0).setDepth(1000);
    this.campText = scene.add.text(12, 60, "", style).setScrollFactor(0).setDepth(1000);
    this.protectText = scene.add.text(12, 84, "", style).setScrollFactor(0).setDepth(1000);
    this.pressureText = scene.add
      .text(12, 108, "", { ...style, color: "#ffaa55" })
      .setScrollFactor(0)
      .setDepth(1000);

    this.hintText = scene.add
      .text(
        12,
        136,
        "操作: WASD/方向键移动 | 空格/J射击 | 1普通 2攻城 3高爆 | Tab切换普通↔攻城\n手机: 左下方向 右下射击/切弹",
        { fontSize: "13px", color: "#ddeeff", backgroundColor: "#00000088" },
      )
      .setScrollFactor(0)
      .setDepth(1000)
      .setAlpha(0.92);

    this.legendText = scene.add
      .text(
        12,
        scene.scale.height - 52,
        "图例: 绿己方坦克 | 红敌方 | 靶心=核心 | 橙砖墙 | 银灰钢墙 | 蓝水 | 绿草",
        { fontSize: "12px", color: "#eeeeee", backgroundColor: "#00000088" },
      )
      .setScrollFactor(0)
      .setDepth(1000);

    this.toastText = scene.add
      .text(scene.scale.width / 2, scene.scale.height / 2, "", {
        fontSize: "22px",
        color: "#ffffff",
        backgroundColor: "#880000cc",
        padding: { x: 16, y: 10 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2000)
      .setVisible(false);

    // Fade the long control hint after a short intro (keep readable).
    scene.time.delayedCall(18000, () => {
      scene.tweens.add({ targets: this.hintText, alpha: 0.45, duration: 800 });
    });
  }

  showToast(message: string): void {
    this.toastText.setText(message).setVisible(true);
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
