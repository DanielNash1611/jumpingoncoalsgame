import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { PreloadScene } from "./scenes/PreloadScene";
import { SwingScene } from "./scenes/SwingScene";
import { CoalsScene } from "./scenes/CoalsScene";

const INTERNAL_WIDTH = 320;
const INTERNAL_HEIGHT = 180;
const GRAVITY_Y = 700;

export function createGame() {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: "app",
    width: INTERNAL_WIDTH,
    height: INTERNAL_HEIGHT,
    backgroundColor: "#111114",
    physics: {
      default: "arcade",
      arcade: {
        gravity: { y: GRAVITY_Y },
        debug: false
      }
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: INTERNAL_WIDTH,
      height: INTERNAL_HEIGHT,
      autoRound: true
    },
    render: {
      pixelArt: true,
      antialias: false,
      roundPixels: true
    },
    scene: [BootScene, PreloadScene, SwingScene, CoalsScene]
  });
}
