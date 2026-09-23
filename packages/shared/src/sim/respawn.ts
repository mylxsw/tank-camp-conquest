import { MAX_ARMOR_PLATES, RESPAWN_INVULN_S, TANK_MAX_HP } from "../constants.js";
import type { RoomSimState } from "../types.js";

export function pickRespawnCampId(
  state: RoomSimState,
  playerId: string,
  rand: () => number,
): number | null {
  const player = state.players[playerId];
  if (!player || player.eliminated) return null;

  const living = player.campIds.filter((campId) => {
    const camp = state.camps[campId];
    return camp !== undefined && camp.ownerPlayerId === playerId && camp.coreHp > 0;
  });
  if (living.length === 0) return null;

  const sample = rand();
  const index = Math.min(living.length - 1, Math.max(0, Math.floor(sample * living.length)));
  return living[index]!;
}

export function respawnTank(
  state: RoomSimState,
  playerId: string,
  now: number,
  rand: () => number,
): boolean {
  const player = state.players[playerId];
  if (!player || player.eliminated) return false;

  const campId = pickRespawnCampId(state, playerId, rand);
  if (campId === null) return false;

  const camp = state.camps[campId]!;
  const tank = player.tank;
  tank.alive = true;
  tank.hp = TANK_MAX_HP;
  tank.armorPlates = Math.min(tank.armorPlates, MAX_ARMOR_PLATES);
  tank.x = camp.worldX;
  tank.y = camp.worldY;
  tank.dir = 0;
  tank.invulnUntil = now + RESPAWN_INVULN_S;
  tank.fireCooldown = 0;
  return true;
}
