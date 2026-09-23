import {
  AmmoType, HE_DAMAGE_BRICK, MAP_TILES, MAP_WORLD_SIZE, NORMAL_DAMAGE_BRICK,
  NORMAL_DAMAGE_TANK, PROJECTILE_RADIUS, PROJECTILE_SPEED, SIEGE_DAMAGE_CORE,
  SIEGE_DAMAGE_TANK, STEEL_INDESTRUCTIBLE, TANK_FIRE_COOLDOWN, TANK_RADIUS,
  TANK_SPEED, TILE_SIZE,
} from "../constants.js";
import type { Direction, PlayerInput, RoomSimState } from "../types.js";
import { isPassable } from "../map/terrain.js";
import { applyCoreDestroyed, type OwnershipEvent } from "./ownership.js";
import { respawnTank } from "./respawn.js";

const DIR_VEC: Record<Direction, { x: number; y: number }> = {
  0: { x: 0, y: -1 },
  1: { x: 1, y: 0 },
  2: { x: 0, y: 1 },
  3: { x: -1, y: 0 },
};

export function directionFromInput(input: PlayerInput): Direction | null {
  if (input.up) return 0;
  if (input.right) return 1;
  if (input.down) return 2;
  if (input.left) return 3;
  return null;
}

function circleHitsTile(x: number, y: number, radius: number, tileX: number, tileY: number): boolean {
  const left = tileX * TILE_SIZE;
  const top = tileY * TILE_SIZE;
  const closestX = Math.max(left, Math.min(x, left + TILE_SIZE));
  const closestY = Math.max(top, Math.min(y, top + TILE_SIZE));
  const dx = x - closestX;
  const dy = y - closestY;
  return dx * dx + dy * dy < radius * radius;
}

export function applyTankMovement(
  state: RoomSimState,
  playerId: string,
  input: PlayerInput,
  dt: number,
): void {
  const p = state.players[playerId];
  if (!p || p.eliminated || !p.tank.alive) return;
  if (input.selectAmmo !== null) p.tank.selectedAmmo = input.selectAmmo;
  const dir = directionFromInput(input);
  if (dir === null) return;
  p.tank.dir = dir;
  const v = DIR_VEC[dir];
  const nx = p.tank.x + v.x * TANK_SPEED * dt;
  const ny = p.tank.y + v.y * TANK_SPEED * dt;
  if (
    nx < TANK_RADIUS || ny < TANK_RADIUS ||
    nx > MAP_WORLD_SIZE - TANK_RADIUS || ny > MAP_WORLD_SIZE - TANK_RADIUS
  ) {
    return;
  }
  const tileX = Math.floor(nx / TILE_SIZE);
  const tileY = Math.floor(ny / TILE_SIZE);
  if (!isPassable(state.terrain, tileX, tileY, MAP_TILES)) return;
  const blockedWall = state.walls.some(
    (w) => w.hp > 0 && circleHitsTile(nx, ny, TANK_RADIUS, w.tileX, w.tileY),
  );
  if (blockedWall) return;
  p.tank.x = nx;
  p.tank.y = ny;
}

export function tryFire(state: RoomSimState, playerId: string, now: number): boolean {
  const p = state.players[playerId];
  if (!p || p.eliminated || !p.tank.alive) return false;
  const t = p.tank;
  if (t.fireCooldown > 0) return false;
  const ammo = t.selectedAmmo;
  if (ammo === AmmoType.Normal && t.ammoNormal <= 0) return false;
  if (ammo === AmmoType.Siege && t.ammoSiege <= 0) return false;
  if (ammo === AmmoType.HE && t.ammoHE <= 0) return false;
  if (ammo === AmmoType.Normal) t.ammoNormal -= 1;
  if (ammo === AmmoType.Siege) t.ammoSiege -= 1;
  if (ammo === AmmoType.HE) t.ammoHE -= 1;
  const v = DIR_VEC[t.dir];
  state.projectiles.push({
    id: state.nextProjectileId++,
    ownerPlayerId: playerId,
    x: t.x + v.x * (TANK_RADIUS + 4),
    y: t.y + v.y * (TANK_RADIUS + 4),
    vx: v.x * PROJECTILE_SPEED,
    vy: v.y * PROJECTILE_SPEED,
    ammo,
    alive: true,
  });
  t.fireCooldown = TANK_FIRE_COOLDOWN;
  void now;
  return true;
}

export function damageTank(
  state: RoomSimState,
  targetId: string,
  amount: number,
  attackerId: string,
  now: number,
): void {
  const target = state.players[targetId];
  if (!target || !target.tank.alive || target.eliminated) return;
  if (target.tank.invulnUntil > now) return;
  let dmg = amount;
  while (dmg > 0 && target.tank.armorPlates > 0) {
    target.tank.armorPlates -= 1;
    dmg = Math.max(0, dmg - 30);
  }
  target.tank.hp -= dmg;
  if (target.tank.hp <= 0) {
    target.tank.hp = 0;
    target.tank.alive = false;
    const attacker = state.players[attackerId];
    if (attacker) attacker.tanksDestroyed += 1;
    respawnTank(state, targetId, now, Math.random);
  }
}

function damageCore(
  state: RoomSimState,
  campId: number,
  amount: number,
  attackerId: string,
  now: number,
): OwnershipEvent[] {
  const camp = state.camps[campId];
  if (!camp) return [];
  if (camp.protectionUntil > now) return [];
  if (camp.ownerPlayerId === attackerId) return [];
  camp.coreHp -= amount;
  if (camp.coreHp <= 0) {
    camp.coreHp = 0;
    return applyCoreDestroyed(state, campId, attackerId, now);
  }
  return [];
}

export function advanceProjectiles(
  state: RoomSimState,
  dt: number,
  now: number,
): OwnershipEvent[] {
  const events: OwnershipEvent[] = [];

  for (const player of Object.values(state.players)) {
    if (player.tank.fireCooldown > 0) {
      player.tank.fireCooldown = Math.max(0, player.tank.fireCooldown - dt);
    }
  }

  for (const proj of state.projectiles) {
    if (!proj.alive) continue;
    proj.x += proj.vx * dt;
    proj.y += proj.vy * dt;
    if (proj.x < 0 || proj.y < 0 || proj.x > MAP_WORLD_SIZE || proj.y > MAP_WORLD_SIZE) {
      proj.alive = false;
      continue;
    }

    const wall = state.walls.find(
      (w) => w.hp > 0 && circleHitsTile(proj.x, proj.y, PROJECTILE_RADIUS, w.tileX, w.tileY),
    );
    if (wall) {
      if (wall.kind === "steel" && STEEL_INDESTRUCTIBLE) {
        proj.alive = false;
        continue;
      }
      const brickDmg = proj.ammo === AmmoType.HE ? HE_DAMAGE_BRICK : NORMAL_DAMAGE_BRICK;
      wall.hp -= brickDmg;
      proj.alive = false;
      continue;
    }

    for (const camp of state.camps) {
      const dx = proj.x - camp.worldX;
      const dy = proj.y - camp.worldY;
      if (dx * dx + dy * dy <= (TILE_SIZE * 0.6) ** 2) {
        const dmg = proj.ammo === AmmoType.Siege ? SIEGE_DAMAGE_CORE : Math.floor(NORMAL_DAMAGE_TANK / 5);
        events.push(...damageCore(state, camp.campId, dmg, proj.ownerPlayerId, now));
        proj.alive = false;
        break;
      }
    }
    if (!proj.alive) continue;

    for (const other of Object.values(state.players)) {
      if (!other.tank.alive || other.playerId === proj.ownerPlayerId) continue;
      const dx = proj.x - other.tank.x;
      const dy = proj.y - other.tank.y;
      if (dx * dx + dy * dy <= (TANK_RADIUS + PROJECTILE_RADIUS) ** 2) {
        const dmg = proj.ammo === AmmoType.Siege ? SIEGE_DAMAGE_TANK : NORMAL_DAMAGE_TANK;
        damageTank(state, other.playerId, dmg, proj.ownerPlayerId, now);
        proj.alive = false;
        break;
      }
    }
  }

  state.projectiles = state.projectiles.filter((pr) => pr.alive);
  return events;
}
