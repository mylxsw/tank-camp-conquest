import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene.js";
import { GameScene } from "./scenes/GameScene.js";
import { DeathScene } from "./scenes/DeathScene.js";

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: 1280,
  height: 720,
  backgroundColor: "#1a1a1a",
  // Nearest-neighbor scaling so procedural pixels stay sharp when FIT-scaled.
  pixelArt: true,
  antialias: false,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, GameScene, DeathScene],
  render: {
    antialias: false,
    pixelArt: true,
    roundPixels: true,
  },
});

export default game;
