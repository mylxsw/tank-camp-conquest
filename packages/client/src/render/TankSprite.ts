import Phaser from "phaser";

const BODY_W = 26;
const BODY_H = 22;
const BARREL_LEN = 18;
const BARREL_W = 6;
/** Snap when teleport/respawn distance exceeds this. */
const SNAP_DIST = 80;
const LERP = 0.28;

export class TankSprite {
  readonly body: Phaser.GameObjects.Rectangle;
  readonly barrel: Phaser.GameObjects.Rectangle;
  readonly label: Phaser.GameObjects.Text;
  private targetX: number;
  private targetY: number;
  private displayX: number;
  private displayY: number;
  private dir = 0;

  constructor(
    scene: Phaser.Scene,
    player: { nickname: string; tank: { x: number; y: number; dir?: number } },
    color: number,
  ) {
    this.targetX = player.tank.x;
    this.targetY = player.tank.y;
    this.displayX = player.tank.x;
    this.displayY = player.tank.y;
    this.dir = player.tank.dir ?? 0;
    this.body = scene.add.rectangle(this.displayX, this.displayY, BODY_W, BODY_H, color);
    this.barrel = scene.add.rectangle(this.displayX, this.displayY, BARREL_LEN, BARREL_W, 0x222222);
    this.label = scene.add
      .text(this.displayX, this.displayY - 26, player.nickname, {
        fontSize: "12px",
        color: "#ffffff",
      })
      .setOrigin(0.5);
    this.applyDirVisual();
  }

  /** Apply latest server pose; visual catches up via updateLerp. */
  sync(player: {
    nickname: string;
    tank: { x: number; y: number; dir?: number; alive: boolean; invulnerable: boolean };
  }): void {
    this.targetX = player.tank.x;
    this.targetY = player.tank.y;
    if (player.tank.dir !== undefined) this.dir = player.tank.dir;
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

  /** Call each frame to smooth 20Hz state updates. */
  updateLerp(): void {
    this.displayX += (this.targetX - this.displayX) * LERP;
    this.displayY += (this.targetY - this.displayY) * LERP;
    this.place();
  }

  private place(): void {
    this.body.setPosition(this.displayX, this.displayY);
    this.label.setPosition(this.displayX, this.displayY - 26);
    this.applyDirVisual();
  }

  private applyDirVisual(): void {
    // 0 up, 1 right, 2 down, 3 left
    const angle = (this.dir * 90) * (Math.PI / 180);
    this.body.setRotation(angle);
    const ox = Math.sin(angle) * (BARREL_LEN * 0.35);
    const oy = -Math.cos(angle) * (BARREL_LEN * 0.35);
    this.barrel.setPosition(this.displayX + ox, this.displayY + oy);
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
