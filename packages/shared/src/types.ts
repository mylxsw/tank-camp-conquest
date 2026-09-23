import type { AmmoType, NeutralKind } from "./constants.js";

export type Direction = 0 | 1 | 2 | 3; // up right down left

export interface Vec2 {
  x: number;
  y: number;
}

export interface CampSlot {
  campId: number;
  tileX: number;
  tileY: number;
  worldX: number;
  worldY: number;
}

export interface CampState {
  campId: number;
  ownerPlayerId: string | null;
  coreHp: number;
  coreMaxHp: number;
  protectionUntil: number;
  worldX: number;
  worldY: number;
  isAiOwner: boolean;
}

export interface TankState {
  playerId: string;
  x: number;
  y: number;
  dir: Direction;
  hp: number;
  armorPlates: number;
  invulnUntil: number;
  fireCooldown: number;
  alive: boolean;
  ammoNormal: number;
  ammoSiege: number;
  ammoHE: number;
  selectedAmmo: AmmoType;
}

export interface PlayerState {
  playerId: string;
  nickname: string;
  isAi: boolean;
  campIds: number[];
  tank: TankState;
  eliminated: boolean;
  joinedAt: number;
  maxCampsOwned: number;
  tanksDestroyed: number;
  campsCaptured: number;
  sessionToken: string;
}

export interface ProjectileState {
  id: number;
  ownerPlayerId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ammo: AmmoType;
  alive: boolean;
}

export interface WallCell {
  tileX: number;
  tileY: number;
  kind: "brick" | "steel";
  hp: number;
}

export interface NeutralPoint {
  id: number;
  kind: NeutralKind;
  x: number;
  y: number;
  cooldownRemaining: number;
}

export interface AirdropState {
  id: number;
  x: number;
  y: number;
  landAt: number;
  landed: boolean;
  siegeAmmo: number;
  armorPlates: number;
  heAmmo: number;
  claimed: boolean;
}

export interface RoomSimState {
  time: number;
  seed: number;
  camps: CampState[];
  players: Record<string, PlayerState>;
  projectiles: ProjectileState[];
  walls: WallCell[];
  terrain: number[];
  neutralPoints: NeutralPoint[];
  airdrops: AirdropState[];
  nextProjectileId: number;
  nextAirdropId: number;
  nextAirdropAt: number;
  softPressureActive: boolean;
}

export interface PlayerInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  fire: boolean;
  selectAmmo: AmmoType | null;
}

export interface DeathStats {
  survivedMs: number;
  maxCampsOwned: number;
  campsAtDeath: number;
  tanksDestroyed: number;
  campsCaptured: number;
  relativeStanding: string;
}
