import { describe, expect, it } from "vitest";
import { RESPAWN_INVULN_S, TANK_MAX_HP } from "../constants.js";
import { createInitialMap } from "../map/createInitialMap.js";
import { pickRespawnCampId, respawnTank } from "../sim/respawn.js";
import type { PlayerState, RoomSimState, TankState } from "../types.js";

function tank(playerId: string): TankState {
  return {
    playerId, x: 0, y: 0, dir: 0, hp: 0, armorPlates: 0, invulnUntil: 0,
    fireCooldown: 0, alive: false, ammoNormal: 10, ammoSiege: 1, ammoHE: 0, selectedAmmo: 0,
  };
}

function mk(): RoomSimState {
  const map = createInitialMap(2);
  const state = { ...map, players: {} } as RoomSimState;
  const p: PlayerState = {
    playerId: "P", nickname: "P", isAi: false, campIds: [3, 7, 11],
    tank: tank("P"), eliminated: false, joinedAt: 0, maxCampsOwned: 3,
    tanksDestroyed: 0, campsCaptured: 0, sessionToken: "P",
  };
  state.players["P"] = p;
  for (const id of p.campIds) {
    state.camps[id]!.ownerPlayerId = "P";
    state.camps[id]!.coreHp = state.camps[id]!.coreMaxHp;
  }
  return state;
}

describe("respawn", () => {
  it("picks uniformly among owned living camps (no manual/nearest bias)", () => {
    const state = mk();
    const counts = new Map<number, number>();
    let i = 0;
    const sequence = [0.0, 0.34, 0.67, 0.99, 0.1, 0.5, 0.8, 0.2, 0.6, 0.9];
    for (let n = 0; n < sequence.length; n++) {
      const id = pickRespawnCampId(state, "P", () => sequence[i++ % sequence.length]!);
      expect(id).not.toBeNull();
      counts.set(id!, (counts.get(id!) ?? 0) + 1);
    }
    expect([...counts.keys()].sort((a, b) => a - b)).toEqual([3, 7, 11]);
  });

  it("respawns with full hp and invulnerability window", () => {
    const state = mk();
    const ok = respawnTank(state, "P", 100, () => 0.0);
    expect(ok).toBe(true);
    const t = state.players["P"]!.tank;
    expect(t.alive).toBe(true);
    expect(t.hp).toBe(TANK_MAX_HP);
    expect(t.invulnUntil).toBeCloseTo(100 + RESPAWN_INVULN_S);
    expect(t.x).toBe(state.camps[3]!.worldX);
    expect(t.y).toBe(state.camps[3]!.worldY);
  });

  it("returns false when player has no camps or eliminated", () => {
    const state = mk();
    state.players["P"]!.campIds = [];
    expect(respawnTank(state, "P", 1, () => 0)).toBe(false);
    state.players["P"]!.campIds = [3];
    state.players["P"]!.eliminated = true;
    expect(respawnTank(state, "P", 1, () => 0)).toBe(false);
  });
});
