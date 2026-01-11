import Phaser from "phaser";
import { trackKeys } from "../game/assets/assetConfig";
import { audioManager } from "../game/audio/AudioManager";
import { gameState } from "../game/state/gameState";

export class BaseScene extends Phaser.Scene {
  private debugText?: Phaser.GameObjects.Text;

  constructor(key: string) {
    super(key);
  }

  create() {
    audioManager.init(this.sound);
    this.registerDevHotkeys();
    this.createDebugOverlay();
  }

  private registerDevHotkeys() {
    const keyboard = this.input.keyboard;
    if (!keyboard) {
      return;
    }

    keyboard.on("keydown-R", () => {
      this.scene.restart();
    });

    keyboard.on("keydown-ONE", () => {
      this.scene.start("SwingScene");
    });

    keyboard.on("keydown-TWO", () => {
      this.scene.start("CoalsScene");
    });

    keyboard.on("keydown-P", () => {
      this.togglePhysicsDebug();
    });

    keyboard.on("keydown-N", () => {
      const current = audioManager.getTrackKey();
      const index = current ? trackKeys.indexOf(current) : -1;
      const nextKey = trackKeys[index >= 0 ? (index + 1) % trackKeys.length : 0];
      audioManager.play(nextKey);
    });
  }

  private createDebugOverlay() {
    this.debugText = this.add
      .text(6, 4, "", {
        fontFamily: "Courier New, monospace",
        fontSize: "10px",
        color: "#f5f5f5",
        backgroundColor: "rgba(0,0,0,0.4)",
        padding: { left: 4, right: 4, top: 2, bottom: 2 }
      })
      .setScrollFactor(0)
      .setDepth(1000);

    this.events.on(Phaser.Scenes.Events.POST_UPDATE, () => {
      if (!this.debugText) {
        return;
      }
      const fps = this.game.loop.actualFps.toFixed(0);
      const trackKey = audioManager.getTrackKey() ?? "--";
      const audioState = audioManager.isPlaying() ? "playing" : "silence";
      const assetsStatus = gameState.assetsMissing
        ? "Assets: Missing (placeholders)"
        : "Assets: OK";
      this.debugText.setText([
        `FPS ${fps}`,
        `Scene ${this.scene.key}`,
        `Track ${trackKey}`,
        `Audio ${audioState}`,
        assetsStatus
      ]);
    });
  }

  private togglePhysicsDebug() {
    if (!this.physics?.world) {
      return;
    }

    const world = this.physics.world;
    world.drawDebug = !world.drawDebug;

    if (world.drawDebug) {
      if (!world.debugGraphic) {
        world.createDebugGraphic();
      }
      world.debugGraphic?.setDepth(999).setVisible(true);
    } else {
      world.debugGraphic?.clear();
      world.debugGraphic?.setVisible(false);
    }
  }
}
