import { CORE_MAX_HP } from "../constants.js";
import type { RoomSimState } from "../types.js";

export interface OwnershipEvent {
  type: "capture" | "eliminate";
  campId: number;
  previousOwnerId: string | null;
  newOwnerId: string | null;
  eliminatedPlayerId?: string;
}

/**
 * Atomically transfers a destroyed camp and eliminates its former owner when
 * that was their last camp. Protection is checked defensively here as well as
 * at the damage application call site.
 */
export function applyCoreDestroyed(
  state: RoomSimState,
  campId: number,
  attackerPlayerId: string,
  now: number,
): OwnershipEvent[] {
  const camp = state.camps[campId];
  const attacker = state.players[attackerPlayerId];
  if (!camp || !attacker || attacker.eliminated) return [];
  if (camp.protectionUntil > now) {
    camp.coreHp = camp.coreMaxHp;
    return [];
  }
  if (camp.ownerPlayerId === attackerPlayerId) return [];

  const previousOwnerId = camp.ownerPlayerId;
  const events: OwnershipEvent[] = [];

  camp.ownerPlayerId = attackerPlayerId;
  camp.coreHp = CORE_MAX_HP;
  camp.coreMaxHp = CORE_MAX_HP;
  camp.protectionUntil = 0;
  camp.isAiOwner = attacker.isAi;

  if (previousOwnerId && state.players[previousOwnerId]) {
    const previousOwner = state.players[previousOwnerId]!;
    previousOwner.campIds = previousOwner.campIds.filter((id) => id !== campId);
  }

  if (!attacker.campIds.includes(campId)) {
    attacker.campIds.push(campId);
  }
  attacker.campsCaptured += 1;
  attacker.maxCampsOwned = Math.max(attacker.maxCampsOwned, attacker.campIds.length);

  events.push({ type: "capture", campId, previousOwnerId, newOwnerId: attackerPlayerId });

  if (previousOwnerId && state.players[previousOwnerId]) {
    const previousOwner = state.players[previousOwnerId]!;
    if (previousOwner.campIds.length === 0 && !previousOwner.eliminated) {
      previousOwner.eliminated = true;
      previousOwner.tank.alive = false;
      events.push({
        type: "eliminate",
        campId,
        previousOwnerId,
        newOwnerId: attackerPlayerId,
        eliminatedPlayerId: previousOwnerId,
      });
    }
  }

  return events;
}
