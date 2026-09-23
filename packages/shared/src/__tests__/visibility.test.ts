import { describe, expect, it } from "vitest";
import { AmmoType, VISIBILITY_RADIUS } from "../constants.js";
import { createInitialMap } from "../map/createInitialMap.js";
import { assignCampForJoin } from "../sim/joinAssign.js";
import { computeVisibility } from "../sim/visibility.js";
import type { RoomSimState } from "../types.js";

describe("computeVisibility", () => {
  it("includes nearby tanks and always lists neutrals", () => {
    const state = { ...createInitialMap(50), players: {} } as RoomSimState;
    assignCampForJoin(state, "self", "S", false, 0, () => 0, "self");
    assignCampForJoin(state, "far", "F", false, 0, () => 0.99, "far");
    const self = state.players["self"]!;
    state.players["near"] = {
      ...structuredClone(self),
      playerId: "near",
      nickname: "N",
      campIds: [],
      tank: { ...self.tank, playerId: "near", x: self.tank.x + 50, y: self.tank.y },
      sessionToken: "near",
    };
    const snap = computeVisibility(state, "self", VISIBILITY_RADIUS);
    expect(snap.playerIds).toContain("self");
    expect(snap.playerIds).toContain("near");
    expect(snap.neutrals.length).toBe(state.neutralPoints.length);
  });

  it("includes nearby projectiles with positions", () => {
    const state = { ...createInitialMap(50), players: {} } as RoomSimState;
    assignCampForJoin(state, "self", "S", false, 0, () => 0, "self");
    const self = state.players["self"]!;
    state.projectiles.push({
      id: 42,
      ownerPlayerId: "self",
      x: self.tank.x + 10,
      y: self.tank.y,
      vx: 1,
      vy: 0,
      ammo: AmmoType.Normal,
      alive: true,
    });
    state.projectiles.push({
      id: 99,
      ownerPlayerId: "self",
      x: self.tank.x + VISIBILITY_RADIUS + 100,
      y: self.tank.y,
      vx: 1,
      vy: 0,
      ammo: AmmoType.Normal,
      alive: true,
    });
    const snap = computeVisibility(state, "self", VISIBILITY_RADIUS);
    expect(snap.projectiles).toEqual([{
      id: 42, x: self.tank.x + 10, y: self.tank.y, vx: 1, vy: 0, ammo: AmmoType.Normal,
    }]);
    expect(snap.projectileIds).toEqual([42]);
  });
});
