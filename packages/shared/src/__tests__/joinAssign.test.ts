import { describe, expect, it } from "vitest";
import { CORE_PROTECTION_MAX_S, CORE_PROTECTION_MIN_S, START_NORMAL_AMMO, START_SIEGE_AMMO } from "../constants.js";
import { createInitialMap } from "../map/createInitialMap.js";
import { assignCampForJoin } from "../sim/joinAssign.js";
import type { PlayerState, RoomSimState } from "../types.js";

describe("assignCampForJoin", () => {
  it("prefers empty camps", () => {
    const state = { ...createInitialMap(10), players: {} } as RoomSimState;
    const r = assignCampForJoin(state, "u1", "Alice", false, 0, () => 0, "tok1");
    expect(r).not.toBeNull();
    expect(state.camps[r!.campId]!.ownerPlayerId).toBe("u1");
    expect(r!.protectionSeconds).toBeGreaterThanOrEqual(CORE_PROTECTION_MIN_S);
    expect(r!.protectionSeconds).toBeLessThanOrEqual(CORE_PROTECTION_MAX_S);
    expect(state.players["u1"]!.tank.ammoNormal).toBe(START_NORMAL_AMMO);
    expect(state.players["u1"]!.tank.ammoSiege).toBe(START_SIEGE_AMMO);
  });

  it("reclaims an AI camp when no empty camp remains", () => {
    const state = { ...createInitialMap(11), players: {} } as RoomSimState;
    for (let i = 0; i < state.camps.length; i++) {
      const id = `ai-${i}`;
      state.camps[i]!.ownerPlayerId = id;
      state.camps[i]!.isAiOwner = true;
      state.players[id] = {
        playerId: id, nickname: id, isAi: true, campIds: [i],
        tank: {
          playerId: id, x: state.camps[i]!.worldX, y: state.camps[i]!.worldY, dir: 0,
          hp: 100, armorPlates: 0, invulnUntil: 0, fireCooldown: 0, alive: true,
          ammoNormal: 10, ammoSiege: 0, ammoHE: 0, selectedAmmo: 0,
        },
        eliminated: false, joinedAt: 0, maxCampsOwned: 1, tanksDestroyed: 0,
        campsCaptured: 0, sessionToken: id,
      } satisfies PlayerState;
    }
    const r = assignCampForJoin(state, "human", "Bob", false, 5, () => 0.5, "tokH");
    expect(r).not.toBeNull();
    expect(state.camps[r!.campId]!.ownerPlayerId).toBe("human");
    expect(state.camps[r!.campId]!.isAiOwner).toBe(false);
  });

  it("returns null when room has no empty and no AI camps", () => {
    const state = { ...createInitialMap(12), players: {} } as RoomSimState;
    for (let i = 0; i < state.camps.length; i++) {
      const id = `h-${i}`;
      state.camps[i]!.ownerPlayerId = id;
      state.camps[i]!.isAiOwner = false;
      state.players[id] = {
        playerId: id, nickname: id, isAi: false, campIds: [i],
        tank: {
          playerId: id, x: 0, y: 0, dir: 0, hp: 100, armorPlates: 0, invulnUntil: 0,
          fireCooldown: 0, alive: true, ammoNormal: 10, ammoSiege: 0, ammoHE: 0, selectedAmmo: 0,
        },
        eliminated: false, joinedAt: 0, maxCampsOwned: 1, tanksDestroyed: 0,
        campsCaptured: 0, sessionToken: id,
      };
    }
    expect(assignCampForJoin(state, "x", "X", false, 0, () => 0, "t")).toBeNull();
  });
});
