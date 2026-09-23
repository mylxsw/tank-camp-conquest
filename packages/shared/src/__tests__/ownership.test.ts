import { describe, expect, it } from "vitest";
import { CORE_MAX_HP } from "../constants.js";
import { createInitialMap } from "../map/createInitialMap.js";
import { applyCoreDestroyed } from "../sim/ownership.js";
import type { PlayerState, RoomSimState, TankState } from "../types.js";

function tank(playerId: string, overrides: Partial<TankState> = {}): TankState {
  return {
    playerId, x: 0, y: 0, dir: 0, hp: 100, armorPlates: 0, invulnUntil: 0,
    fireCooldown: 0, alive: true, ammoNormal: 30, ammoSiege: 0, ammoHE: 0, selectedAmmo: 0,
    ...overrides,
  };
}

function player(id: string, camps: number[], isAi = false): PlayerState {
  return {
    playerId: id, nickname: id, isAi, campIds: [...camps], tank: tank(id),
    eliminated: false, joinedAt: 0, maxCampsOwned: camps.length, tanksDestroyed: 0,
    campsCaptured: 0, sessionToken: id,
  };
}

function baseState(): RoomSimState {
  const map = createInitialMap(1);
  return { ...map, players: {} } as RoomSimState;
}

describe("applyCoreDestroyed", () => {
  it("transfers camp ownership to attacker and updates camp lists", () => {
    const state = baseState();
    state.players["A"] = player("A", [0]);
    state.players["B"] = player("B", [1, 2]);
    state.camps[1]!.ownerPlayerId = "B";
    state.camps[1]!.coreHp = 0;
    state.camps[0]!.ownerPlayerId = "A";
    state.camps[2]!.ownerPlayerId = "B";

    const events = applyCoreDestroyed(state, 1, "A", 10);
    expect(events).toEqual([{ type: "capture", campId: 1, previousOwnerId: "B", newOwnerId: "A" }]);
    expect(state.camps[1]!.ownerPlayerId).toBe("A");
    expect(state.camps[1]!.coreHp).toBe(CORE_MAX_HP);
    expect(state.camps[1]!.isAiOwner).toBe(false);
    expect(state.players["A"]!.campIds.sort()).toEqual([0, 1]);
    expect(state.players["B"]!.campIds).toEqual([2]);
    expect(state.players["A"]!.campsCaptured).toBe(1);
    expect(state.players["A"]!.maxCampsOwned).toBe(2);
    expect(state.players["B"]!.eliminated).toBe(false);
  });

  it("eliminates previous owner when last camp is lost", () => {
    const state = baseState();
    state.players["A"] = player("A", [0]);
    state.players["B"] = player("B", [1]);
    state.camps[0]!.ownerPlayerId = "A";
    state.camps[1]!.ownerPlayerId = "B";
    state.camps[1]!.coreHp = 0;

    const events = applyCoreDestroyed(state, 1, "A", 12);
    expect(events.map((e) => e.type)).toEqual(["capture", "eliminate"]);
    expect(state.players["B"]!.eliminated).toBe(true);
    expect(state.players["B"]!.campIds).toEqual([]);
    expect(state.players["B"]!.tank.alive).toBe(false);
    expect(events[1]).toMatchObject({
      type: "eliminate", eliminatedPlayerId: "B", previousOwnerId: "B", newOwnerId: "A", campId: 1,
    });
  });

  it("ignores destroy when core is under protection", () => {
    const state = baseState();
    state.players["A"] = player("A", [0]);
    state.players["B"] = player("B", [1]);
    state.camps[1]!.ownerPlayerId = "B";
    state.camps[1]!.protectionUntil = 100;
    state.camps[1]!.coreHp = 0;
    const events = applyCoreDestroyed(state, 1, "A", 50);
    expect(events).toEqual([]);
    expect(state.camps[1]!.ownerPlayerId).toBe("B");
    expect(state.camps[1]!.coreHp).toBe(CORE_MAX_HP);
  });

  it("does not allow owning zero camps without elimination (no nomad)", () => {
    const state = baseState();
    state.players["A"] = player("A", [0]);
    state.players["B"] = player("B", [1]);
    state.camps[1]!.ownerPlayerId = "B";
    applyCoreDestroyed(state, 1, "A", 1);
    expect(state.players["B"]!.campIds.length).toBe(0);
    expect(state.players["B"]!.eliminated).toBe(true);
  });
});
