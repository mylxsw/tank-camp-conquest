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
import { spawnHit, spawnMuzzle } from "../render/FxSprites.js";
import { MapRenderer, type MapStaticPayload, type WallPatch } from "../render/MapRenderer.js";
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
  private disconnected = false;
  private wasFire = false;

  constructor() {
    super("GameScene");
  }

  async create(data: { nickname: string }): Promise<void> {
    this.camps = new CampRenderer(this);
    this.projectiles = new ProjectileRenderer(this);
    this.hud = new Hud(this);
    this.minimap = new Minimap(this);
    this.cameras.main.setBounds(0, 0, MAP_WORLD_SIZE, MAP_WORLD_SIZE);
    this.cameras.main.setBackgroundColor(0x2a2420);

    try {
      this.room = await joinTankRoom(data.nickname || "Guest");
    } catch (err) {
      console.error(err);
      this.hud.showToast("连接断开，刷新重进");
      return;
    }
    this.selfId = this.room.sessionId;

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
      if (this.mapRenderer) {
        this.mapRenderer.destroy();
        this.mapRenderer = null;
      }
      this.mapRenderer = new MapRenderer(this, msg);
    });
    this.room.onMessage("wallPatch", (msg: { walls?: WallPatch[] } | WallPatch[]) => {
      const patches = Array.isArray(msg) ? msg : (msg.walls ?? []);
      const hits = this.mapRenderer?.applyWallPatches(patches) ?? [];
      for (const h of hits) spawnHit(this, h.x, h.y);
    });
    this.room.onMessage("visor", (msg: VisibleSnapshot) => {
      this.visor = msg;
      this.neutrals = msg.neutrals ?? [];
      this.airdrops = msg.airdrops ?? [];
      const removed = this.projectiles?.syncFromMessage(msg.projectiles ?? []) ?? [];
      for (const r of removed) spawnHit(this, r.x, r.y);
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

    this.room.onLeave(() => {
      if (this.disconnected) return;
      this.disconnected = true;
      this.hud?.showToast("连接断开，刷新重进");
    });
    this.room.onError((_code, _message) => {
      if (this.disconnected) return;
      this.disconnected = true;
      this.hud?.showToast("连接断开，刷新重进");
    });

    this.inputManager = new InputManager(this, false);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.inputManager?.destroy();
      this.mapRenderer?.destroy();
      this.mapRenderer = null;
    });
  }

  update(): void {
    if (!this.room || this.disconnected) return;
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
      if (sample.fire && !this.wasFire) {
        const self = this.tanks.get(this.selfId);
        if (self) spawnMuzzle(this, self.x, self.y, self.dir);
      }
      this.wasFire = sample.fire;
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
    const campList: Array<{
      worldX: number;
      worldY: number;
      ownerPlayerId: string;
      protectionRemaining: number;
    }> = [];
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
