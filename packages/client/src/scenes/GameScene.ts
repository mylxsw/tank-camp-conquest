import Phaser from "phaser";
import type { Room } from "colyseus.js";
import {
  MAP_WORLD_SIZE,
  type DeathStats,
  type PlayerInput,
  type VisibleSnapshot,
} from "@tcc/shared";
import { InputManager } from "../input/InputManager.js";
import { joinTankRoom } from "../net/ColyseusClient.js";
import { CampRenderer } from "../render/CampRenderer.js";
import { MapRenderer, type MapStaticPayload } from "../render/MapRenderer.js";
import { ProjectileRenderer } from "../render/ProjectileRenderer.js";
import { TankSprite } from "../render/TankSprite.js";
import { Hud } from "../ui/Hud.js";
import { Minimap } from "../ui/Minimap.js";

type WorldNeutral = { x: number; y: number };
type WorldAirdrop = { x: number; y: number; claimed: boolean };

export class GameScene extends Phaser.Scene {
  private room!: Room;
  private tanks = new Map<string, TankSprite>();
  private camps!: CampRenderer;
  private mapRenderer: MapRenderer | null = null;
  private projectiles!: ProjectileRenderer;
  private selfId = "";
  private inputManager!: InputManager;
  private hud!: Hud;
  private minimap!: Minimap;
  private neutrals: WorldNeutral[] = [];
  private airdrops: WorldAirdrop[] = [];
  private visor: VisibleSnapshot | null = null;

  constructor() {
    super("GameScene");
  }

  async create(data: { nickname: string }): Promise<void> {
    this.room = await joinTankRoom(data.nickname || "Guest");
    this.selfId = this.room.sessionId;
    this.camps = new CampRenderer(this);
    this.projectiles = new ProjectileRenderer(this);
    this.hud = new Hud(this);
    this.minimap = new Minimap(this);
    this.cameras.main.setBounds(0, 0, MAP_WORLD_SIZE, MAP_WORLD_SIZE);

    this.room.state.players.onAdd((player: any, key: string) => {
      const color = key === this.selfId ? 0x44dd88 : 0xdd5555;
      this.tanks.set(key, new TankSprite(this, player, color));
    });
    this.room.state.players.onRemove((_p: any, key: string) => {
      this.tanks.get(key)?.destroy();
      this.tanks.delete(key);
    });
    this.room.onMessage("eliminated", (payload: { playerId: string; stats: DeathStats | null }) => {
      if (payload.playerId === this.selfId) {
        this.scene.start("DeathScene", { stats: payload.stats });
      }
    });
    this.room.onMessage("mapStatic", (msg: MapStaticPayload) => {
      if (this.mapRenderer) return;
      this.mapRenderer = new MapRenderer(this, msg);
    });
    this.room.onMessage("visor", (msg: VisibleSnapshot) => {
      this.visor = msg;
      this.neutrals = msg.neutrals ?? [];
      this.airdrops = msg.airdrops ?? [];
      this.projectiles?.syncFromMessage(msg.projectiles ?? []);
    });
    // Legacy fallback if server still emits worldMeta (minimap neutrals/airdrops).
    this.room.onMessage(
      "worldMeta",
      (msg: { neutrals?: WorldNeutral[]; airdrops?: WorldAirdrop[] }) => {
        if (this.visor) return;
        this.neutrals = msg.neutrals ?? [];
        this.airdrops = msg.airdrops ?? [];
      },
    );

    this.inputManager = new InputManager(this, false);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.inputManager?.destroy();
      this.mapRenderer?.destroy();
      this.mapRenderer = null;
    });
  }

  update(): void {
    if (!this.room) return;
    if (this.inputManager) {
      const sample = this.inputManager.sample();
      const payload: PlayerInput = {
        up: sample.up,
        down: sample.down,
        left: sample.left,
        right: sample.right,
        fire: sample.fire,
        selectAmmo: sample.selectAmmo,
      };
      this.room.send("input", payload);
    }
    const visibleIds = this.visor ? new Set(this.visor.playerIds) : null;
    for (const [id, sprite] of this.tanks) {
      const p = this.room.state.players.get(id);
      if (p) sprite.sync(p);
      sprite.updateLerp();
      const show = id === this.selfId || visibleIds === null || visibleIds.has(id);
      sprite.setVisible(show);
      if (id === this.selfId) {
        this.cameras.main.centerOn(sprite.x, sprite.y);
      }
    }
    this.camps?.sync(this.room.state.camps, this.selfId);
    this.syncHudAndMinimap();
  }

  private syncHudAndMinimap(): void {
    const self = this.room.state.players.get(this.selfId);
    const campList: Array<{ worldX: number; worldY: number; ownerPlayerId: string; protectionRemaining: number }> =
      [];
    this.room.state.camps.forEach((c: any) => {
      campList.push({
        worldX: c.worldX,
        worldY: c.worldY,
        ownerPlayerId: c.ownerPlayerId ?? "",
        protectionRemaining: c.protectionRemaining ?? 0,
      });
    });

    let protectionRemaining = 0;
    for (const c of campList) {
      if (c.ownerPlayerId === this.selfId) {
        protectionRemaining = Math.max(protectionRemaining, c.protectionRemaining);
      }
    }

    const tank = self?.tank;
    this.hud?.sync({
      selectedAmmo: tank?.selectedAmmo ?? 0,
      ammoSiege: tank?.ammoSiege ?? 0,
      ammoNormal: tank?.ammoNormal ?? 0,
      campCount: self?.campCount ?? 0,
      protectionRemaining,
      softPressureActive: !!this.room.state.softPressureActive,
    });
    this.minimap?.sync({
      camps: campList,
      neutrals: this.neutrals,
      airdrops: this.airdrops,
      selfId: this.selfId,
    });
  }
}
