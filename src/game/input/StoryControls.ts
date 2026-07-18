import Phaser from "phaser";
import { TouchControls } from "./TouchControls";

export type StoryInput = { left: boolean; right: boolean; action: boolean };

export class StoryControls {
  private readonly cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly leftKey?: Phaser.Input.Keyboard.Key;
  private readonly rightKey?: Phaser.Input.Keyboard.Key;
  private readonly touch: TouchControls;
  private actionQueued = false;
  private tapDirection = 0;
  private tapUntil = 0;

  constructor(private readonly scene: Phaser.Scene, actionLabel: string) {
    this.cursors = scene.input.keyboard?.createCursorKeys();
    this.leftKey = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.rightKey = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.D);

    const queueAction = () => {
      this.actionQueued = true;
    };
    scene.input.keyboard?.on("keydown-SPACE", queueAction);
    scene.input.keyboard?.on("keydown-UP", queueAction);
    scene.input.keyboard?.on("keydown-W", queueAction);

    const queueDirection = (direction: number) => {
      this.tapDirection = direction;
      this.tapUntil = scene.time.now + 180;
    };
    scene.input.keyboard?.on("keydown-LEFT", () => queueDirection(-1));
    scene.input.keyboard?.on("keydown-A", () => queueDirection(-1));
    scene.input.keyboard?.on("keydown-RIGHT", () => queueDirection(1));
    scene.input.keyboard?.on("keydown-D", () => queueDirection(1));

    this.touch = new TouchControls(scene, actionLabel);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  read(): StoryInput {
    const tappedDirection = this.scene.time.now <= this.tapUntil ? this.tapDirection : 0;
    const action = this.actionQueued || this.touch.consumeAction();
    this.actionQueued = false;
    return {
      left: Boolean(this.cursors?.left.isDown || this.leftKey?.isDown || this.touch.left || tappedDirection < 0),
      right: Boolean(this.cursors?.right.isDown || this.rightKey?.isDown || this.touch.right || tappedDirection > 0),
      action
    };
  }

  setActionLabel(label: string) {
    this.touch.setActionLabel(label);
  }

  discardPending() {
    this.actionQueued = false;
    this.tapDirection = 0;
    this.tapUntil = 0;
    this.touch.consumeAction();
  }

  destroy() {
    this.touch.destroy();
  }
}
