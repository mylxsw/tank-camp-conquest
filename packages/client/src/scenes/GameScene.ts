import Phaser from "phaser";
import type { Room } from "colyseus.js";
import { joinTankRoom } from "../net/ColyseusClient.js";
import { CampRenderer } from "../render/CampRenderer.js";
import { TankSprite } from "../render/TankSprite.js";

export class GameScene extends Phaser.Scene {
  private room!: Room;
  private tanks = new Map<string, TankSprite>();
  private camps!: CampRenderer;
  private selfId = "";

  constructor() {
    super("GameScene");
  }

  async create(data: { nickname: string }): Promise<void> {
    this.room = await joinTankRoom(data.nickname || "Guest");
    this.selfId = this.room.sessionId;
    this.camps = new CampRenderer(this);
    this.cameras.main.setBounds(0, 0, 64 * 32, 64 * 32);

    this.room.state.players.onAdd((player: any, key: string) => {
      const color = key === this.selfId ? 0x44dd88 : 0xdd5555;
      this.tanks.set(key, new TankSprite(this, player, color));
    });
    this.room.state.players.onRemove((_p: any, key: string) => {
      this.tanks.get(key)?.destroy();
      this.tanks.delete(key);
    });
    this.room.onMessage("eliminated", (payload: any) => {
      if (payload.playerId === this.selfId) {
        this.scene.start("DeathScene", { stats: payload.stats });
      }
    });
  }

  update(): void {
    if (!this.room) return;
    for (const [id, sprite] of this.tanks) {
      const p = this.room.state.players.get(id);
      if (p) sprite.sync(p);
      if (id === this.selfId && p) {
        this.cameras.main.centerOn(p.tank.x, p.tank.y);
      }
    }
    this.camps?.sync(this.room.state.camps, this.selfId);
  }
}
