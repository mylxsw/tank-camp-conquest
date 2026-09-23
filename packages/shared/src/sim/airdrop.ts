import {
  AIRDROP_FALL_S, AIRDROP_INTERVAL_S, MAP_WORLD_SIZE, MAX_ARMOR_PLATES, TANK_RADIUS,
} from "../constants.js";
import type { RoomSimState } from "../types.js";
import { updateSoftPressure } from "./softPressure.js";

const CLAIM_RANGE = TANK_RADIUS + 24;

export function tickAirdrops(
  state: RoomSimState,
  _dt: number,
  now: number,
  rand: () => number,
): void {
  updateSoftPressure(state);
  if (now >= state.nextAirdropAt) {
    const siegeAmmo = state.softPressureActive
      ? 4 + Math.floor(rand() * 3)
      : 1 + Math.floor(rand() * 2);
    const armorPlates = 1;
    const heAmmo = state.softPressureActive ? 2 : rand() < 0.4 ? 1 : 0;
    state.airdrops.push({
      id: state.nextAirdropId++,
      x: 200 + rand() * (MAP_WORLD_SIZE - 400),
      y: 200 + rand() * (MAP_WORLD_SIZE - 400),
      landAt: now + AIRDROP_FALL_S,
      landed: false,
      siegeAmmo,
      armorPlates,
      heAmmo,
      claimed: false,
    });
    state.nextAirdropAt = now + AIRDROP_INTERVAL_S;
  }
  for (const a of state.airdrops) {
    if (!a.landed && now >= a.landAt) a.landed = true;
  }
}

export function tryClaimAirdrop(state: RoomSimState, playerId: string): boolean {
  const p = state.players[playerId];
  if (!p || !p.tank.alive || p.eliminated) return false;
  for (const a of state.airdrops) {
    if (!a.landed || a.claimed) continue;
    const dx = p.tank.x - a.x;
    const dy = p.tank.y - a.y;
    if (dx * dx + dy * dy > CLAIM_RANGE * CLAIM_RANGE) continue;
    p.tank.ammoSiege += a.siegeAmmo;
    p.tank.ammoHE += a.heAmmo;
    p.tank.armorPlates = Math.min(MAX_ARMOR_PLATES, p.tank.armorPlates + a.armorPlates);
    a.claimed = true;
    return true;
  }
  return false;
}
