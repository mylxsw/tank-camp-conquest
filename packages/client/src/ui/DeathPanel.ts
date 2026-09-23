import Phaser from "phaser";
import type { DeathStats } from "@tcc/shared";
import { recordRun } from "../storage/localStats.js";

export class DeathPanel {
  constructor(scene: Phaser.Scene, stats: DeathStats) {
    const best = recordRun({
      at: Date.now(),
      survivedMs: stats.survivedMs,
      maxCampsOwned: stats.maxCampsOwned,
      tanksDestroyed: stats.tanksDestroyed,
      campsCaptured: stats.campsCaptured,
    });
    const lines = [
      "本轮结束",
      `存活: ${(stats.survivedMs / 1000).toFixed(0)}s`,
      `最大占地: ${stats.maxCampsOwned}`,
      `击毁坦克: ${stats.tanksDestroyed}`,
      `攻占营地: ${stats.campsCaptured}`,
      `评价: ${stats.relativeStanding}`,
      "",
      `历史最长存活: ${(best.bestSurviveMs / 1000).toFixed(0)}s`,
      `历史最大占地: ${best.bestMaxCamps}`,
      "",
      "点击「再开一局」将刷新页面，以新玩家重新加入",
    ];
    scene.add.rectangle(640, 360, 640, 480, 0x000000, 0.82).setScrollFactor(0).setDepth(2000);
    scene.add
      .text(640, 200, lines.join("\n"), {
        fontSize: "20px",
        color: "#ffffff",
        align: "center",
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(2001);

    const btn = scene.add
      .rectangle(640, 560, 200, 48, 0x3388ff)
      .setScrollFactor(0)
      .setDepth(2001)
      .setInteractive({ useHandCursor: true });
    scene.add
      .text(640, 560, "再开一局", { fontSize: "22px", color: "#ffffff" })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2002);
    btn.on("pointerdown", () => {
      window.location.reload();
    });
  }
}
