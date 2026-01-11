import { gameState } from "../game/state/gameState";
import { BaseScene } from "./BaseScene";

export class BootScene extends BaseScene {
  constructor() {
    super("BootScene");
  }

  create() {
    super.create();
    const { width, height } = this.scale;

    const backdrop = this.add
      .rectangle(0, 0, width, height, 0x050505, 0.9)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(10);

    const prompt = this.add
      .text(width / 2, height / 2, "Click or press any key to begin", {
        fontFamily: "Courier New, monospace",
        fontSize: "12px",
        color: "#f2f2f2"
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(11);

    let unlocked = false;
    const unlock = async () => {
      if (unlocked) {
        return;
      }
      unlocked = true;

      if (this.sound?.context?.state === "suspended") {
        await this.sound.context.resume();
      }

      gameState.hasUnlockedAudio = true;
      backdrop.destroy();
      prompt.destroy();
      this.scene.start("PreloadScene");
    };

    this.input.once("pointerdown", () => {
      void unlock();
    });

    this.input.keyboard?.once("keydown", () => {
      void unlock();
    });
  }
}
