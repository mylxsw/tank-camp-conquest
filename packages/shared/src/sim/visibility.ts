import { VISIBILITY_RADIUS } from "../constants.js";
import type { RoomSimState } from "../types.js";

export interface VisibleSnapshot {
  playerIds: string[];
  /** @deprecated prefer `projectiles` for client rendering */
  projectileIds: number[];
  projectiles: Array<{ id: number; x: number; y: number; vx: number; vy: number; ammo: number }>;
  airdropIds: number[];
  neutrals: Array<{ id: number; x: number; y: number; kind: number }>;
  airdrops: Array<{ id: number; x: number; y: number; claimed: boolean; landed: boolean }>;
}

export function computeVisibility(
  state: RoomSimState,
  viewerId: string,
  radius: number = VISIBILITY_RADIUS,
): VisibleSnapshot {
  const viewer = state.players[viewerId];
  const ox = viewer?.tank.x ?? 0;
  const oy = viewer?.tank.y ?? 0;
  const r2 = radius * radius;
  const playerIds: string[] = [];
  for (const p of Object.values(state.players)) {
    if (p.eliminated || !p.tank.alive) continue;
    if (p.playerId === viewerId || dist2(ox, oy, p.tank.x, p.tank.y) <= r2) {
      playerIds.push(p.playerId);
    }
  }
  const projectiles = state.projectiles
    .filter((pr) => dist2(ox, oy, pr.x, pr.y) <= r2)
    .map((pr) => ({ id: pr.id, x: pr.x, y: pr.y, vx: pr.vx, vy: pr.vy, ammo: pr.ammo }));
  const projectileIds = projectiles.map((pr) => pr.id);
  const airdropIds = state.airdrops
    .filter((a) => !a.claimed && dist2(ox, oy, a.x, a.y) <= r2)
    .map((a) => a.id);
  return {
    playerIds,
    projectileIds,
    projectiles,
    airdropIds,
    neutrals: state.neutralPoints.map((n) => ({ id: n.id, x: n.x, y: n.y, kind: n.kind })),
    airdrops: state.airdrops.map((a) => ({
      id: a.id,
      x: a.x,
      y: a.y,
      claimed: a.claimed,
      landed: a.landed,
    })),
  };
}

function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}
