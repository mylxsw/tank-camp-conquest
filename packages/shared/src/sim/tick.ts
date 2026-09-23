import type { OwnershipEvent } from "./ownership.js";
import type { PlayerInput, RoomSimState } from "../types.js";
import { advanceProjectiles, applyTankMovement, tryFire } from "./combat.js";
import { tickAirdrops, tryClaimAirdrop } from "./airdrop.js";
import { tickNeutrals, tryPickupNeutral } from "./resources.js";
import { updateSoftPressure } from "./softPressure.js";

export function simulateTick(
  state: RoomSimState,
  inputs: Record<string, PlayerInput>,
  dt: number,
  rand: () => number,
): OwnershipEvent[] {
  state.time += dt;
  const now = state.time;
  const events: OwnershipEvent[] = [];

  for (const [playerId, input] of Object.entries(inputs)) {
    const p = state.players[playerId];
    if (!p || p.eliminated) continue;
    applyTankMovement(state, playerId, input, dt);
    if (input.fire) tryFire(state, playerId, now);
    tryPickupNeutral(state, playerId);
    tryClaimAirdrop(state, playerId);
  }

  events.push(...advanceProjectiles(state, dt, now));
  tickNeutrals(state, dt);
  tickAirdrops(state, dt, now, rand);
  updateSoftPressure(state);
  return events;
}
