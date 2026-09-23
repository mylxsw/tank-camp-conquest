import { describe, expect, it } from "vitest";
import { createInitialMap } from "../map/createInitialMap.js";
import { tickAirdrops } from "../sim/airdrop.js";
import { updateSoftPressure } from "../sim/softPressure.js";
import type { RoomSimState } from "../types.js";

describe("airdrop", () => {
  it("spawns heavier siege ammo under soft pressure", () => {
    const state = { ...createInitialMap(21), players: {} } as RoomSimState;
    for (let i = 0; i < 8; i++) state.camps[i]!.ownerPlayerId = "x";
    updateSoftPressure(state);
    state.nextAirdropAt = 0;
    tickAirdrops(state, 0.05, 0, () => 0.5);
    expect(state.airdrops.length).toBe(1);
    expect(state.airdrops[0]!.siegeAmmo).toBeGreaterThanOrEqual(4);
  });

  it("spawns lighter siege ammo without soft pressure", () => {
    const state = { ...createInitialMap(22), players: {} } as RoomSimState;
    for (let i = 0; i < 16; i++) state.camps[i]!.ownerPlayerId = "x";
    updateSoftPressure(state);
    state.nextAirdropAt = 0;
    tickAirdrops(state, 0.05, 0, () => 0.5);
    expect(state.airdrops[0]!.siegeAmmo).toBeLessThan(4);
  });
});
