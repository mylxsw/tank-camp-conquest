import Phaser from "phaser";
import { TANK_SPEED } from "@tcc/shared";
import { PIXEL_KEYS } from "./PixelAtlas.js";

const BARREL_LEN = 22;
/** Snap when teleport/respawn distance exceeds this. */
const SNAP_DIST = 80;
/** Other tanks: smooth catch-up toward 20Hz authority. */
const LERP_OTHER = 0.32;
/** Self: slightly snappier so authority corrections don't lag hard. */
const LERP_SELF = 0.45;
/** Soft local prediction scale (under-drive so we don't overshoot walls). */
const PREDICT_SCALE = 0.85;

const DIR_VEC: Record<number, { x: number; y: number }> = {
  0: { x: 0, y: -1 },
  1: { x: 1, y: 0 },
  2: { x: 0, y: 1 },
  3: { x: -1, y: 0 },
};

export class TankSprite {
  readonly body: Phaser.GameObjects.Image;
  readonly barrel: Phaser.GameObjects.Image;
  readonly label: Phaser.GameObjects.Text;
  private targetX: number;
  private targetY: number;
  private displayX: number;
  private displayY: number;
  private _dir = 0;
  private isSelf = false;

  constructor(
    scene: Phaser.Scene,
    player: { nickname: string; tank: { x: number; y: number; dir?: number } },
    color: number,
    opts?: { isSelf?: boolean },
  ) {
    this.isSelf = !!opts?.isSelf;
    this.targetX = player.tank.x;
    this.targetY = player.tank.y;
    this.displayX = player.tank.x;
    this.displayY = player.tank.y;
    this._dir = player.tank.dir ?? 0;
    this.body = scene.add.image(this.displayX, this.displayY, PIXEL_KEYS.tankBody);
    this.body.setDisplaySize(30, 30);
    this.body.setTint(color);
    this.barrel = scene.add.image(this.displayX, this.displayY, PIXEL_KEYS.tankBarrel);
    this.barrel.setDisplaySize(7, BARREL_LEN);
    this.barrel.setOrigin(0.5, 1);
    this.label = scene.add
      .text(this.displayX, this.displayY - 26, player.nickname, {
        fontSize: "12px",
        color: "#ffffff",
      })
      .setOrigin(0.5);
    this.applyDirVisual();
  }

  /** Facing: 0 up, 1 right, 2 down, 3 left. */
  get dir(): number {
    return this._dir;
  }

  /** Apply latest server pose; visual catches up via updateLerp. */
  sync(player: {
    nickname: string;
    tank: { x: number; y: number; dir?: number; alive: boolean; invulnerable: boolean };
  }): void {
    this.targetX = player.tank.x;
    this.targetY = player.tank.y;
    if (player.tank.dir !== undefined) this._dir = player.tank.dir;
    const dx = this.targetX - this.displayX;
    const dy = this.targetY - this.displayY;
    if (dx * dx + dy * dy > SNAP_DIST * SNAP_DIST) {
      this.displayX = this.targetX;
      this.displayY = this.targetY;
    }
    const alpha = player.tank.alive ? (player.tank.invulnerable ? 0.5 : 1) : 0.15;
    this.body.setAlpha(alpha);
    this.barrel.setAlpha(alpha);
    this.label.setText(player.nickname);
    this.applyDirVisual();
    this.place();
  }

  /**
   * Weak local prediction for the local tank: nudge display along held cardinal
   * while still reconciling to server target. Stage A — no full physics clone.
   */
  predictMove(dir: number | null, dt: number): void {
    if (!this.isSelf) return;
    if (dir !== null) {
      this._dir = dir;
      const v = DIR_VEC[dir];
      if (v) {
        const step = TANK_SPEED * PREDICT_SCALE * dt;
        this.displayX += v.x * step;
        this.displayY += v.y * step;
      }
    }
    // Soft authority rubber-band (always), stronger when idle so we settle.
    const correct = dir === null ? 0.35 : 0.12;
    this.displayX += (this.targetX - this.displayX) * correct;
    this.displayY += (this.targetY - this.displayY) * correct;
    const dx = this.displayX - this.targetX;
    const dy = this.displayY - this.targetY;
    const maxLead = 48;
    const d2 = dx * dx + dy * dy;
    if (d2 > maxLead * maxLead) {
      const s = maxLead / Math.sqrt(d2);
      this.displayX = this.targetX + dx * s;
      this.displayY = this.targetY + dy * s;
    }
    this.applyDirVisual();
    this.place();
  }

  /** Call each frame to smooth 20Hz state updates. */
  updateLerp(dt: number): void {
    const rate = this.isSelf ? LERP_SELF : LERP_OTHER;
    // Frame-rate independent exponential blend toward authority.
    const a = 1 - Math.exp(-rate * 60 * dt);
    this.displayX += (this.targetX - this.displayX) * a;
    this.displayY += (this.targetY - this.displayY) * a;
    this.place();
  }

  private place(): void {
    this.body.setPosition(this.displayX, this.displayY);
    this.label.setPosition(this.displayX, this.displayY - 26);
    this.applyDirVisual();
  }

  private applyDirVisual(): void {
    // 0 up, 1 right, 2 down, 3 left — barrel origin at base, tip toward facing.
    const angle = this._dir * 90 * (Math.PI / 180);
    this.body.setRotation(angle);
    this.barrel.setPosition(this.displayX, this.displayY);
    this.barrel.setRotation(angle);
  }

  setVisible(show: boolean): void {
    this.body.setVisible(show);
    this.barrel.setVisible(show);
    this.label.setVisible(show);
  }

  get x(): number {
    return this.displayX;
  }

  get y(): number {
    return this.displayY;
  }

  destroy(): void {
    this.body.destroy();
    this.barrel.destroy();
    this.label.destroy();
  }
}
