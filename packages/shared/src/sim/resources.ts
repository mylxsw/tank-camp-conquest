import {
  AmmoType, MAX_ARMOR_PLATES, NeutralKind, REPAIR_AMOUNT, TANK_MAX_HP, TANK_RADIUS,
} from "../constants.js";
import type { RoomSimState } from "../types.js";

const PICKUP_RANGE = TANK_RADIUS + 20;
const NEUTRAL_COOLDOWN = 8;

export function tickNeutrals(state: RoomSimState, dt: number): void {
  for (const n of state.neutralPoints) {
    if (n.cooldownRemaining > 0) n.cooldownRemaining = Math.max(0, n.cooldownRemaining - dt);
  }
}

export function tryPickupNeutral(state: RoomSimState, playerId: string): boolean {
  const p = state.players[playerId];
  if (!p || !p.tank.alive || p.eliminated) return false;
  for (const n of state.neutralPoints) {
    if (n.cooldownRemaining > 0) continue;
    const dx = p.tank.x - n.x;
    const dy = p.tank.y - n.y;
    if (dx * dx + dy * dy > PICKUP_RANGE * PICKUP_RANGE) continue;
    if (n.kind === NeutralKind.AmmoDepot) {
      p.tank.ammoNormal += 15;
      p.tank.ammoSiege += 1;
    } else if (n.kind === NeutralKind.RepairBay) {
      p.tank.hp = Math.min(TANK_MAX_HP, p.tank.hp + REPAIR_AMOUNT);
    } else if (n.kind === NeutralKind.OilWell) {
      p.tank.armorPlates = Math.min(MAX_ARMOR_PLATES, p.tank.armorPlates + 1);
    }
    n.cooldownRemaining = NEUTRAL_COOLDOWN;
    return true;
  }
  return false;
}

export function applyAmmoSelect(state: RoomSimState, playerId: string, ammo: AmmoType): void {
  const p = state.players[playerId];
  if (!p) return;
  p.tank.selectedAmmo = ammo;
}
