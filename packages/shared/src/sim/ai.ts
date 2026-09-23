import { AmmoType } from "../constants.js";
import type { PlayerInput, RoomSimState } from "../types.js";

function dist2(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function idle(): PlayerInput {
  return { up: false, down: false, left: false, right: false, fire: false, selectAmmo: null };
}

function steerToward(x: number, y: number, tx: number, ty: number): PlayerInput {
  const dx = tx - x;
  const dy = ty - y;
  const absx = Math.abs(dx);
  const absy = Math.abs(dy);
  return {
    up: absy >= absx && dy < 0,
    down: absy >= absx && dy > 0,
    left: absx > absy && dx < 0,
    right: absx > absy && dx > 0,
    fire: false,
    selectAmmo: null,
  };
}

export function decideAiInput(
  state: RoomSimState,
  playerId: string,
  _now: number,
  rand: () => number,
): PlayerInput {
  const p = state.players[playerId];
  if (!p || p.eliminated || !p.tank.alive) {
    return idle();
  }
  const home = state.camps[p.campIds[0]!];
  const roll = rand();

  // Siege ammo and near an enemy core: switch to siege and fire.
  if (p.tank.ammoSiege > 0) {
    let nearestEnemy: { x: number; y: number } | null = null;
    let best = Infinity;
    for (const c of state.camps) {
      if (!c.ownerPlayerId || c.ownerPlayerId === playerId) continue;
      const d = dist2(p.tank.x, p.tank.y, c.worldX, c.worldY);
      if (d < best) {
        best = d;
        nearestEnemy = { x: c.worldX, y: c.worldY };
      }
    }
    if (nearestEnemy && best < 120 * 120) {
      const input = steerToward(p.tank.x, p.tank.y, nearestEnemy.x, nearestEnemy.y);
      input.selectAmmo = AmmoType.Siege;
      input.fire = true;
      return input;
    }
  }

  // ~70%: patrol near home camp
  if (roll < 0.7 && home) {
    const tx = home.worldX + (rand() - 0.5) * 400;
    const ty = home.worldY + (rand() - 0.5) * 400;
    const input = steerToward(p.tank.x, p.tank.y, tx, ty);
    input.fire = rand() < 0.05;
    return input;
  }

  // ~20%: visit nearest neutral
  if (roll < 0.9 && state.neutralPoints.length > 0) {
    let bestN = state.neutralPoints[0]!;
    let best = Infinity;
    for (const n of state.neutralPoints) {
      const d = dist2(p.tank.x, p.tank.y, n.x, n.y);
      if (d < best) {
        best = d;
        bestN = n;
      }
    }
    return steerToward(p.tank.x, p.tank.y, bestN.x, bestN.y);
  }

  // ~10%: approach nearest enemy camp
  let target = home;
  let best = Infinity;
  for (const c of state.camps) {
    if (!c.ownerPlayerId || c.ownerPlayerId === playerId) continue;
    const d = dist2(p.tank.x, p.tank.y, c.worldX, c.worldY);
    if (d < best) {
      best = d;
      target = c;
    }
  }
  if (!target) {
    return idle();
  }
  const input = steerToward(p.tank.x, p.tank.y, target.worldX, target.worldY);
  input.fire = rand() < 0.1;
  return input;
}
