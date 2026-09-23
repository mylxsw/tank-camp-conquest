import { describe, expect, it } from "vitest";
import { SOFT_PRESSURE_CAMP_THRESHOLD } from "../constants.js";
import { createInitialMap } from "../map/createInitialMap.js";
import { countOwnedCamps, updateSoftPressure } from "../sim/softPressure.js";
import type { RoomSimState } from "../types.js";

describe("softPressure", () => {
  it("activates when total remaining owned camps <= 8", () => {
    const state = { ...createInitialMap(8), players: {} } as RoomSimState;
    for (let i = 0; i < SOFT_PRESSURE_CAMP_THRESHOLD; i++) {
      state.camps[i]!.ownerPlayerId = "x";
    }
    updateSoftPressure(state);
    expect(countOwnedCamps(state)).toBe(SOFT_PRESSURE_CAMP_THRESHOLD);
    expect(state.softPressureActive).toBe(true);
  });

  it("deactivates above threshold", () => {
    const state = { ...createInitialMap(9), players: {} } as RoomSimState;
    for (let i = 0; i < SOFT_PRESSURE_CAMP_THRESHOLD + 1; i++) {
      state.camps[i]!.ownerPlayerId = "x";
    }
    updateSoftPressure(state);
    expect(state.softPressureActive).toBe(false);
  });
});
