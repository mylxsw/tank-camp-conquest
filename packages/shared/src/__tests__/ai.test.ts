import { describe, expect, it } from "vitest";
import { AmmoType } from "../constants.js";
import { createInitialMap } from "../map/createInitialMap.js";
import { assignCampForJoin } from "../sim/joinAssign.js";
import { decideAiInput } from "../sim/ai.js";
import type { RoomSimState } from "../types.js";

describe("decideAiInput", () => {
  it("returns some movement near home camp", () => {
    const state = { ...createInitialMap(40), players: {} } as RoomSimState;
    assignCampForJoin(state, "ai1", "Bot", true, 0, () => 0, "ai1");
    const input = decideAiInput(state, "ai1", 0, () => 0.1);
    expect(input.up || input.down || input.left || input.right || input.fire).toBe(true);
  });

  it("selects siege when holding siege ammo near enemy core", () => {
    const state = { ...createInitialMap(41), players: {} } as RoomSimState;
    assignCampForJoin(state, "ai1", "Bot", true, 0, () => 0, "ai1");
    assignCampForJoin(state, "enemy", "E", false, 0, () => 0.9, "enemy");
    const ai = state.players["ai1"]!;
    const enemyCampId = state.players["enemy"]!.campIds[0]!;
    const enemyCamp = state.camps[enemyCampId]!;
    ai.tank.ammoSiege = 3;
    ai.tank.x = enemyCamp.worldX + 40;
    ai.tank.y = enemyCamp.worldY;
    const input = decideAiInput(state, "ai1", 1, () => 0.01);
    expect(
      input.selectAmmo === AmmoType.Siege ||
        ai.tank.selectedAmmo === AmmoType.Siege ||
        input.fire,
    ).toBe(true);
  });

  it("returns idle when player missing or dead", () => {
    const state = { ...createInitialMap(42), players: {} } as RoomSimState;
    expect(decideAiInput(state, "ghost", 0, () => 0).fire).toBe(false);
    assignCampForJoin(state, "ai1", "Bot", true, 0, () => 0, "ai1");
    state.players["ai1"]!.tank.alive = false;
    const input = decideAiInput(state, "ai1", 0, () => 0.1);
    expect(input.up || input.down || input.left || input.right || input.fire).toBe(false);
  });
});
