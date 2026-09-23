import { describe, expect, it } from "vitest";
import { NeutralKind } from "../constants.js";
import { createInitialMap } from "../map/createInitialMap.js";
import { tryPickupNeutral } from "../sim/resources.js";
import type { PlayerState, RoomSimState } from "../types.js";

describe("resources", () => {
  it("ammo depot grants normal and siege ammo then goes on cooldown", () => {
    const state = { ...createInitialMap(20), players: {} } as RoomSimState;
    const depot = state.neutralPoints.find((n) => n.kind === NeutralKind.AmmoDepot)!;
    state.players["P"] = {
      playerId: "P", nickname: "P", isAi: false, campIds: [0],
      tank: {
        playerId: "P", x: depot.x, y: depot.y, dir: 0, hp: 100, armorPlates: 0,
        invulnUntil: 0, fireCooldown: 0, alive: true, ammoNormal: 0, ammoSiege: 0,
        ammoHE: 0, selectedAmmo: 0,
      },
      eliminated: false, joinedAt: 0, maxCampsOwned: 1, tanksDestroyed: 0,
      campsCaptured: 0, sessionToken: "P",
    } satisfies PlayerState;
    expect(tryPickupNeutral(state, "P")).toBe(true);
    expect(state.players["P"]!.tank.ammoNormal).toBeGreaterThan(0);
    expect(state.players["P"]!.tank.ammoSiege).toBeGreaterThanOrEqual(1);
    expect(depot.cooldownRemaining).toBeGreaterThan(0);
    expect(tryPickupNeutral(state, "P")).toBe(false);
  });
});
