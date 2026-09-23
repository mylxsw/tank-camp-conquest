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

/** Face cardinal toward target; fire if roughly aligned on an axis. */
function engagePoint(
  x: number,
  y: number,
  tx: number,
  ty: number,
  selectAmmo: AmmoType | null,
  fireChance: number,
  rand: () => number,
): PlayerInput {
  const input = steerToward(x, y, tx, ty);
  input.selectAmmo = selectAmmo;
  const aligned =
    (Math.abs(tx - x) < 18 && Math.abs(ty - y) > 8) ||
    (Math.abs(ty - y) < 18 && Math.abs(tx - x) > 8);
  input.fire = aligned || rand() < fireChance;
  return input;
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

  // Nearby enemy tank: switch to normal (or keep siege if empty normals) and shoot.
  let nearestTank: { x: number; y: number } | null = null;
  let bestTank = 220 * 220;
  for (const other of Object.values(state.players)) {
    if (other.playerId === playerId || other.eliminated || !other.tank.alive) continue;
    const d = dist2(p.tank.x, p.tank.y, other.tank.x, other.tank.y);
    if (d < bestTank) {
      bestTank = d;
      nearestTank = { x: other.tank.x, y: other.tank.y };
    }
  }
  if (nearestTank && bestTank < 200 * 200) {
    const ammo = p.tank.ammoNormal > 0 ? AmmoType.Normal : p.tank.ammoSiege > 0 ? AmmoType.Siege : null;
    return engagePoint(p.tank.x, p.tank.y, nearestTank.x, nearestTank.y, ammo, 0.35, rand);
  }

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
      return engagePoint(
        p.tank.x, p.tank.y, nearestEnemy.x, nearestEnemy.y, AmmoType.Siege, 0.5, rand,
      );
    }
  }

  // ~70%: patrol near home camp (explicitly return to Normal so siege doesn't stick)
  if (roll < 0.7 && home) {
    const tx = home.worldX + (rand() - 0.5) * 400;
    const ty = home.worldY + (rand() - 0.5) * 400;
    const input = steerToward(p.tank.x, p.tank.y, tx, ty);
    input.selectAmmo = AmmoType.Normal;
    input.fire = rand() < 0.08;
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
    const input = steerToward(p.tank.x, p.tank.y, bestN.x, bestN.y);
    input.selectAmmo = AmmoType.Normal;
    return input;
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
  input.selectAmmo = p.tank.ammoSiege > 0 ? AmmoType.Siege : AmmoType.Normal;
  input.fire = rand() < 0.15;
  return input;
}
