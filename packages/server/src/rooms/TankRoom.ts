import Colyseus from "colyseus";
import {
  AI_FILL_TARGET_PLAYERS,
  CAMP_SLOT_COUNT,
  MAP_TILES,
  TILE_SIZE,
  TICK_DT,
  TICK_HZ,
  Terrain,
  assignCampForJoin,
  createInitialMap,
  simulateTick,
  terrainIndex,
  type PlayerInput,
  type RoomSimState,
  type WallCell,
} from "@tcc/shared";
import { CampSchema, PlayerSchema, TankRoomState, TankSchema } from "./schema.js";

import { idleInput, normalizeInput } from "../systems/applyInput.js";
import { refreshAiInputs } from "../systems/aiDriver.js";
import { computeVisibility } from "../systems/visibility.js";

export type JoinOptions = { nickname?: string };

export type MapStaticMessage = {
  tileSize: number;
  mapTiles: number;
  walls: WallCell[];
  water: Array<[number, number]>;
  grass: Array<[number, number]>;
};

export class TankRoom extends Colyseus.Room<TankRoomState> {
  maxClients = CAMP_SLOT_COUNT;
  private sim!: RoomSimState;
  private inputs: Record<string, PlayerInput> = {};
  private rand = Math.random;
  private aiAccMs = 0;
  private visorAccMs = 0;
  private mapStatic!: MapStaticMessage;

  onCreate(): void {
    this.setState(new TankRoomState());
    this.sim = { ...createInitialMap(Date.now() % 1_000_000), players: {} } as RoomSimState;
    this.mapStatic = this.buildMapStatic();
    this.syncCamps();
    this.setSimulationInterval((_delta) => this.tick(), 1000 / TICK_HZ);
    this.onMessage("input", (client, message: Partial<PlayerInput>) => {
      const prev = this.inputs[client.sessionId];
      const next = normalizeInput(message);
      if (next.selectAmmo == null && prev?.selectAmmo != null) {
        next.selectAmmo = prev.selectAmmo;
      }
      this.inputs[client.sessionId] = next;
    });
  }

  onJoin(client: Colyseus.Client, options: JoinOptions): void {
    const nickname = (options.nickname ?? "Guest").toString().slice(0, 16);
    const beforeIds = new Set(Object.keys(this.sim.players));
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
    // Reclaim may delete an AI from sim — drop its schema row + input.
    for (const id of beforeIds) {
      if (!this.sim.players[id]) {
        this.state.players.delete(id);
        delete this.inputs[id];
      }
    }
    this.inputs[client.sessionId] = idleInput();
    this.syncPlayer(client.sessionId);
    this.syncCamps();
    this.fillAiIfNeeded();
    client.send("mapStatic", this.mapStatic);
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
    this.aiAccMs += 1000 / TICK_HZ;
    if (this.aiAccMs >= 200) {
      this.aiAccMs = 0;
      refreshAiInputs(this.sim, this.inputs, this.sim.time, this.rand);
    }
    const wallHpBefore = new Map<string, number>();
    for (const w of this.sim.walls) {
      wallHpBefore.set(`${w.tileX},${w.tileY}`, w.hp);
    }
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
        const victimId = ev.eliminatedPlayerId;
        const victim = this.sim.players[victimId];
        this.broadcast("eliminated", {
          playerId: victimId,
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
        this.state.players.delete(victimId);
        delete this.inputs[victimId];
      }
    }
    const wallPatches: Array<{ tileX: number; tileY: number; hp: number }> = [];
    for (const w of this.sim.walls) {
      const key = `${w.tileX},${w.tileY}`;
      const prev = wallHpBefore.get(key);
      if (prev === undefined || prev !== w.hp) {
        wallPatches.push({ tileX: w.tileX, tileY: w.tileY, hp: w.hp });
        // Keep join-time mapStatic in sync for late joiners
        const cached = this.mapStatic.walls.find((x) => x.tileX === w.tileX && x.tileY === w.tileY);
        if (cached) cached.hp = w.hp;
      }
    }
    if (wallPatches.length > 0) {
      this.broadcast("wallPatch", { walls: wallPatches });
    }

    this.visorAccMs += 1000 / TICK_HZ;
    if (this.visorAccMs >= 100) {
      this.visorAccMs = 0;
      for (const client of this.clients) {
        client.send("visor", computeVisibility(this.sim, client.sessionId));
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
    if (p.eliminated) {
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
    // Mutate nested TankSchema in place — reassignment can drop field patches.
    if (!row.tank) row.tank = new TankSchema();
    const t = row.tank;
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
    const living = Object.values(this.sim.players).filter((p) => !p.eliminated);
    let guard = 0;
    while (living.length + guard < AI_FILL_TARGET_PLAYERS) {
      const empty = this.sim.camps.some((c) => c.ownerPlayerId === null);
      if (!empty) break;
      const id = `ai-${this.sim.time.toFixed(3)}-${Math.floor(this.rand() * 1e6)}`;
      const result = assignCampForJoin(this.sim, id, `Bot${guard}`, true, this.sim.time, this.rand, id);
      if (!result) break;
      this.inputs[id] = idleInput();
      this.syncPlayer(id);
      guard += 1;
    }
    this.syncCamps();
  }

  private buildMapStatic(): MapStaticMessage {
    const water: Array<[number, number]> = [];
    const grass: Array<[number, number]> = [];
    for (let ty = 0; ty < MAP_TILES; ty++) {
      for (let tx = 0; tx < MAP_TILES; tx++) {
        const t = this.sim.terrain[terrainIndex(tx, ty, MAP_TILES)]!;
        if (t === Terrain.Water) water.push([tx, ty]);
        else if (t === Terrain.Grass) grass.push([tx, ty]);
      }
    }
    return {
      tileSize: TILE_SIZE,
      mapTiles: MAP_TILES,
      walls: this.sim.walls.map((w) => ({ ...w })),
      water,
      grass,
    };
  }
}
