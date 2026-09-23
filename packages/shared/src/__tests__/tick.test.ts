import { describe, expect, it } from "vitest";
import { TICK_DT } from "../constants.js";
import { createInitialMap } from "../map/createInitialMap.js";
import { assignCampForJoin } from "../sim/joinAssign.js";
import { simulateTick } from "../sim/tick.js";
import type { RoomSimState } from "../types.js";

describe("simulateTick", () => {
  it("advances time and can spawn a projectile on fire", () => {
    const state = { ...createInitialMap(30), players: {} } as RoomSimState;
    assignCampForJoin(state, "p", "P", false, 0, () => 0, "tok");
    const before = state.time;
    simulateTick(
      state,
      {
        p: { up: false, down: false, left: false, right: false, fire: true, selectAmmo: null },
      },
      TICK_DT,
      () => 0.5,
    );
    expect(state.time).toBeCloseTo(before + TICK_DT);
    expect(state.projectiles.length).toBeGreaterThanOrEqual(1);
  });
});
