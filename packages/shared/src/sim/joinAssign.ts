import {
  AmmoType, CORE_MAX_HP, CORE_PROTECTION_MAX_S, CORE_PROTECTION_MIN_S,
  START_NORMAL_AMMO, START_SIEGE_AMMO, TANK_MAX_HP,
} from "../constants.js";
import type { RoomSimState } from "../types.js";

export interface JoinResult {
  playerId: string;
  campId: number;
  protectionSeconds: number;
}

function protectionSeconds(rand: () => number): number {
  return (
    CORE_PROTECTION_MIN_S +
    Math.floor(rand() * (CORE_PROTECTION_MAX_S - CORE_PROTECTION_MIN_S + 1))
  );
}

export function assignCampForJoin(
  state: RoomSimState,
  playerId: string,
  nickname: string,
  isAi: boolean,
  now: number,
  rand: () => number,
  sessionToken: string,
): JoinResult | null {
  let campId: number | null = null;
  const empty = state.camps.filter((c) => c.ownerPlayerId === null);
  if (empty.length > 0) {
    campId = empty[Math.floor(rand() * empty.length)]!.campId;
  } else {
    const aiCamps = state.camps.filter((c) => c.isAiOwner && c.ownerPlayerId);
    if (aiCamps.length === 0) return null;
    const victim = aiCamps[Math.floor(rand() * aiCamps.length)]!;
    const aiId = victim.ownerPlayerId!;
    const ai = state.players[aiId];
    if (ai) {
      ai.campIds = ai.campIds.filter((id) => id !== victim.campId);
      if (ai.campIds.length === 0) {
        ai.eliminated = true;
        ai.tank.alive = false;
        delete state.players[aiId];
      }
    }
    campId = victim.campId;
  }

  const camp = state.camps[campId]!;
  const prot = protectionSeconds(rand);
  camp.ownerPlayerId = playerId;
  camp.isAiOwner = isAi;
  camp.coreHp = CORE_MAX_HP;
  camp.coreMaxHp = CORE_MAX_HP;
  camp.protectionUntil = now + prot;

  state.players[playerId] = {
    playerId,
    nickname: nickname.slice(0, 16) || "Guest",
    isAi,
    campIds: [campId],
    tank: {
      playerId,
      x: camp.worldX,
      y: camp.worldY,
      dir: 0,
      hp: TANK_MAX_HP,
      armorPlates: 0,
      invulnUntil: now + 1.5,
      fireCooldown: 0,
      alive: true,
      ammoNormal: START_NORMAL_AMMO,
      ammoSiege: START_SIEGE_AMMO,
      ammoHE: 0,
      selectedAmmo: AmmoType.Normal,
    },
    eliminated: false,
    joinedAt: now,
    maxCampsOwned: 1,
    tanksDestroyed: 0,
    campsCaptured: 0,
    sessionToken,
  };

  return { playerId, campId, protectionSeconds: prot };
}
