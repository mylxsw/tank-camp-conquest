import { describe, expect, it } from "vitest";
import { VISIBILITY_RADIUS } from "../constants.js";
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
});
