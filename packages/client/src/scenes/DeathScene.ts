import Phaser from "phaser";
import type { DeathStats } from "@tcc/shared";
import { DeathPanel } from "../ui/DeathPanel.js";

const EMPTY_STATS: DeathStats = {
  survivedMs: 0,
  maxCampsOwned: 0,
  campsAtDeath: 0,
  tanksDestroyed: 0,
  campsCaptured: 0,
  relativeStanding: "初试锋芒",
};

export class DeathScene extends Phaser.Scene {
  constructor() {
    super("DeathScene");
  }

  create(data: { stats?: DeathStats | null }): void {
    const stats: DeathStats = { ...EMPTY_STATS, ...(data.stats ?? {}) };
    new DeathPanel(this, stats);
  }
}
