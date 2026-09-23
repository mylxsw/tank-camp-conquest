import Colyseus from "colyseus";
import {
  AI_FILL_TARGET_PLAYERS,
  CAMP_SLOT_COUNT,
  TICK_DT,
  TICK_HZ,
  assignCampForJoin,
  createInitialMap,
  simulateTick,
  type PlayerInput,
  type RoomSimState,
} from "@tcc/shared";
import { CampSchema, PlayerSchema, TankRoomState, TankSchema } from "./schema.js";

import { idleInput, normalizeInput } from "../systems/applyInput.js";

export type JoinOptions = { nickname?: string };

export class TankRoom extends Colyseus.Room<TankRoomState> {
  maxClients = CAMP_SLOT_COUNT;
  private sim!: RoomSimState;
  private inputs: Record<string, PlayerInput> = {};
  private rand = Math.random;

  onCreate(): void {
    this.setState(new TankRoomState());
    this.sim = { ...createInitialMap(Date.now() % 1_000_000), players: {} } as RoomSimState;
    this.syncCamps();
    this.setSimulationInterval((_delta) => this.tick(), 1000 / TICK_HZ);
    this.onMessage("input", (client, message: Partial<PlayerInput>) => {
      this.inputs[client.sessionId] = normalizeInput(message);
    });
  }

  onJoin(client: Colyseus.Client, options: JoinOptions): void {
    const nickname = (options.nickname ?? "Guest").toString().slice(0, 16);
    const result = assignCampForJoin(
      this.sim,
      client.sessionId,
      nickname,
      false,
      this.sim.time,
      this.rand,
      client.sessionId,
    );
    if (!result) {
      client.leave(4000);
      return;
    }
    this.inputs[client.sessionId] = idleInput();
    this.syncPlayer(client.sessionId);
    this.syncCamps();
    this.fillAiIfNeeded();
  }

  onLeave(client: Colyseus.Client): void {
    const p = this.sim.players[client.sessionId];
    if (p && !p.eliminated) {
      for (const campId of [...p.campIds]) {
        const c = this.sim.camps[campId];
        if (c) {
          c.ownerPlayerId = null;
          c.isAiOwner = false;
          c.protectionUntil = 0;
        }
      }
      delete this.sim.players[client.sessionId];
    }
    delete this.inputs[client.sessionId];
    this.state.players.delete(client.sessionId);
    this.syncCamps();
    this.fillAiIfNeeded();
  }

  private tick(): void {
    const events = simulateTick(this.sim, this.inputs, TICK_DT, this.rand);
    for (const id of Object.keys(this.inputs)) {
      const inp = this.inputs[id]!;
      inp.fire = false;
      inp.selectAmmo = null;
    }
    this.state.time = this.sim.time;
    this.state.softPressureActive = this.sim.softPressureActive;
    for (const id of Object.keys(this.sim.players)) this.syncPlayer(id);
    this.syncCamps();
    for (const ev of events) {
      this.broadcast("ownership", ev);
      if (ev.type === "eliminate" && ev.eliminatedPlayerId) {
        const victim = this.sim.players[ev.eliminatedPlayerId];
        this.broadcast("eliminated", {
          playerId: ev.eliminatedPlayerId,
          stats: victim
            ? {
                survivedMs: Math.floor((this.sim.time - victim.joinedAt) * 1000),
                maxCampsOwned: victim.maxCampsOwned,
                campsAtDeath: 0,
                tanksDestroyed: victim.tanksDestroyed,
                campsCaptured: victim.campsCaptured,
                relativeStanding: this.standingText(victim.campsCaptured, victim.tanksDestroyed),
              }
            : null,
        });
      }
    }
  }

  private standingText(captures: number, kills: number): string {
    if (captures >= 5) return "割据新星";
    if (kills >= 8) return "战场猎手";
    if (captures >= 2) return "稳健扩张";
    return "初试锋芒";
  }

  private syncPlayer(id: string): void {
    const p = this.sim.players[id];
    if (!p) {
      this.state.players.delete(id);
      return;
    }
    let row = this.state.players.get(id);
    if (!row) {
      row = new PlayerSchema();
      this.state.players.set(id, row);
    }
    row.playerId = p.playerId;
    row.nickname = p.nickname;
    row.isAi = p.isAi;
    row.campCount = p.campIds.length;
    row.eliminated = p.eliminated;
    const t = row.tank ?? new TankSchema();
    t.playerId = p.tank.playerId;
    t.x = p.tank.x;
    t.y = p.tank.y;
    t.dir = p.tank.dir;
    t.hp = p.tank.hp;
    t.armorPlates = p.tank.armorPlates;
    t.alive = p.tank.alive;
    t.invulnerable = p.tank.invulnUntil > this.sim.time;
    t.selectedAmmo = p.tank.selectedAmmo;
    t.ammoNormal = p.tank.ammoNormal;
    t.ammoSiege = p.tank.ammoSiege;
    t.ammoHE = p.tank.ammoHE;
    row.tank = t;
  }

  private syncCamps(): void {
    for (const c of this.sim.camps) {
      const key = String(c.campId);
      let row = this.state.camps.get(key);
      if (!row) {
        row = new CampSchema();
        this.state.camps.set(key, row);
      }
      row.campId = c.campId;
      row.ownerPlayerId = c.ownerPlayerId ?? "";
      row.coreHp = c.coreHp;
      row.worldX = c.worldX;
      row.worldY = c.worldY;
      row.protectionRemaining = Math.max(0, c.protectionUntil - this.sim.time);
    }
  }

  private fillAiIfNeeded(): void {
    // Task 13: fill empty camps toward AI_FILL_TARGET_PLAYERS via assignCampForJoin(..., isAi=true).
    void AI_FILL_TARGET_PLAYERS;
  }
}
