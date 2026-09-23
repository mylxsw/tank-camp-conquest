import { SOFT_PRESSURE_CAMP_THRESHOLD } from "../constants.js";
import type { RoomSimState } from "../types.js";

export function countOwnedCamps(state: RoomSimState): number {
  return state.camps.filter((c) => c.ownerPlayerId !== null).length;
}

export function updateSoftPressure(state: RoomSimState): void {
  state.softPressureActive = countOwnedCamps(state) <= SOFT_PRESSURE_CAMP_THRESHOLD;
}
