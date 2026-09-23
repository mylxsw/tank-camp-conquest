export const CAMP_SLOT_COUNT = 32;
export const TILE_SIZE = 32;
export const MAP_TILES = 64;
export const MAP_WORLD_SIZE = MAP_TILES * TILE_SIZE;

export const TICK_HZ = 20;
export const TICK_DT = 1 / TICK_HZ;

export const TANK_SPEED = 120;
export const TANK_RADIUS = 14;
export const TANK_MAX_HP = 100;
export const TANK_FIRE_COOLDOWN = 0.35;

export const PROJECTILE_SPEED = 320;
export const PROJECTILE_RADIUS = 4;
export const NORMAL_DAMAGE_TANK = 25;
export const NORMAL_DAMAGE_BRICK = 1;
export const SIEGE_DAMAGE_CORE = 40;
export const SIEGE_DAMAGE_TANK = 10;
export const HE_DAMAGE_BRICK = 3;

export const CORE_MAX_HP = 200; // 与 SIEGE_DAMAGE_CORE=40 配比：约 2–3 名持攻城弹玩家数十秒可拆无保护核心
export const CORE_PROTECTION_MIN_S = 30;
export const CORE_PROTECTION_MAX_S = 60;
export const RESPAWN_INVULN_S = 1.5;

export const SOFT_PRESSURE_CAMP_THRESHOLD = 8;
export const AIRDROP_INTERVAL_S = 45;
export const AIRDROP_FALL_S = 8;

export const MAX_ARMOR_PLATES = 3;
export const ARMOR_PLATE_HP = 30;
export const REPAIR_AMOUNT = 40;

export const START_NORMAL_AMMO = 30;
export const START_SIEGE_AMMO = 0;

export const AI_FILL_TARGET_PLAYERS = 12;
export const VISIBILITY_RADIUS = 640;

export const BRICK_HP = 2;
export const STEEL_INDESTRUCTIBLE = true;

export enum AmmoType {
  Normal = 0,
  Siege = 1,
  HE = 2,
}

export enum NeutralKind {
  AmmoDepot = 0,
  RepairBay = 1,
  OilWell = 2,
}
