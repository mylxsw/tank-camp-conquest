import Phaser from "phaser";

export class TankSprite {
  readonly body: Phaser.GameObjects.Rectangle;
  readonly label: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    player: { nickname: string; tank: { x: number; y: number } },
    color: number,
  ) {
    this.body = scene.add.rectangle(player.tank.x, player.tank.y, 28, 28, color);
    this.label = scene.add
      .text(player.tank.x, player.tank.y - 24, player.nickname, {
        fontSize: "12px",
        color: "#ffffff",
      })
      .setOrigin(0.5);
  }

  sync(player: {
    nickname: string;
    tank: { x: number; y: number; alive: boolean; invulnerable: boolean };
  }): void {
    this.body.setPosition(player.tank.x, player.tank.y);
    this.body.setAlpha(player.tank.alive ? (player.tank.invulnerable ? 0.5 : 1) : 0.15);
    this.label.setPosition(player.tank.x, player.tank.y - 24);
    this.label.setText(player.nickname);
  }

  destroy(): void {
    this.body.destroy();
    this.label.destroy();
  }
}
