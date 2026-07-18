import { environmentImages } from "../game/assets/assetConfig";
import { audioManager } from "../game/audio/AudioManager";
import { gameState, resetRunState } from "../game/state/gameState";
import { gameHud } from "../game/ui/GameHud";
import { BaseScene } from "./BaseScene";

export class BootScene extends BaseScene {
  constructor() {
    super("BootScene");
  }

  preload() {
    if (!this.textures.exists("playground_sunset")) {
      this.load.image("playground_sunset", environmentImages.playground_sunset);
    }
  }

  create() {
    console.log("[JOC] scene:boot");
    audioManager.init(this.sound);
    this.cameras.main.setBackgroundColor("#120c12");

    this.add
      .image(160, 90, "playground_sunset")
      .setDisplaySize(320, 180)
      .setDepth(0);
    this.add.rectangle(160, 90, 320, 180, 0x140d13, 0.42).setDepth(1);
    this.add.rectangle(160, 154, 320, 52, 0x0b0910, 0.46).setDepth(2);
    gameHud.showTitle(gameState.muted);

    let started = false;
    const start = () => {
      if (started) {
        return;
      }
      started = true;
      console.log("[JOC] start requested");
      const context = "context" in this.sound ? this.sound.context : undefined;
      if (context?.state === "suspended") {
        void context.resume();
      }
      console.log("[JOC] entering preload");
      gameState.hasUnlockedAudio = true;
      resetRunState();
      this.cameras.main.fadeOut(360, 13, 8, 12);
      this.time.delayedCall(384, () => this.scene.start("PreloadScene"));
    };

    this.input.once("pointerdown", start);
    this.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "m") {
        const muted = audioManager.toggleMute();
        gameHud.updateTitleSound(muted);
        return;
      }
      start();
    });
  }
}
