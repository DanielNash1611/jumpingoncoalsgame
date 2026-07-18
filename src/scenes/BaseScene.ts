import Phaser from "phaser";
import { trackKeys } from "../game/assets/assetConfig";
import { audioManager } from "../game/audio/AudioManager";
import { gameState } from "../game/state/gameState";
import { gameHud } from "../game/ui/GameHud";

export class BaseScene extends Phaser.Scene {
  protected gameplayPaused = false;
  private debugText?: Phaser.GameObjects.Text;
  private debugVisible = false;
  private pauseObjects: Phaser.GameObjects.GameObject[] = [];
  private manualPauseActive = false;
  private storyBreakActive = false;
  private storyBreakToken = 0;

  constructor(key: string) {
    super(key);
  }

  create() {
    this.gameplayPaused = false;
    this.manualPauseActive = false;
    this.storyBreakActive = false;
    this.storyBreakToken += 1;
    this.pauseObjects = [];
    this.physics.world.resume();
    audioManager.init(this.sound);
    this.registerGlobalHotkeys();
    this.createDebugOverlay();
  }

  protected showToast(message: string, _color = "#fff0cc", duration = 1150) {
    gameHud.showToast(message, duration);
  }

  protected showStoryBeat(
    title: string,
    body: string,
    options: {
      duration?: number;
      letterbox?: boolean;
      pauseGameplay?: boolean;
    } = {}
  ) {
    const {
      duration = options.letterbox ? 4000 : 3000,
      letterbox = false,
      pauseGameplay = false
    } = options;
    const token = ++this.storyBreakToken;

    if (pauseGameplay) {
      this.storyBreakActive = true;
      this.syncGameplayPause();
    }
    gameHud.showCinematic(title, body, "", letterbox);

    this.time.delayedCall(duration, () => {
      if (token !== this.storyBreakToken) {
        return;
      }
      if (pauseGameplay) {
        this.storyBreakActive = false;
        this.syncGameplayPause();
        this.input.keyboard?.resetKeys();
        this.onStoryBreakComplete();
      }
      if (!this.manualPauseActive) {
        gameHud.hideCinematic();
      }
    });
  }

  protected onStoryBreakComplete(): void {
    // Scenes with queued one-shot input can clear it here before play resumes.
  }

  protected prepareOutroForDebug(): void {
    // Individual chapters override this to place their mechanic at its natural final gate.
  }

  private registerGlobalHotkeys() {
    const keyboard = this.input.keyboard;
    if (!keyboard) {
      return;
    }

    keyboard.on("keydown-R", () => this.scene.restart());
    keyboard.on("keydown-ONE", () => this.scene.start("SwingScene"));
    keyboard.on("keydown-TWO", () => this.scene.start("CoalsScene"));
    keyboard.on("keydown-FOUR", () => this.scene.start("DiggingInScene"));
    keyboard.on("keydown-FIVE", () => this.scene.start("AtBottomScene"));
    keyboard.on("keydown-SIX", () => this.scene.start("DiggingOutScene"));
    keyboard.on("keydown-SEVEN", () => this.scene.start("ByShovelScene"));
    keyboard.on("keydown-EIGHT", () => this.scene.start("ReturnSwingScene"));
    keyboard.on("keydown-P", () => this.togglePhysicsDebug());
    keyboard.on("keydown-ESC", () => this.togglePause());
    keyboard.on("keydown-BACKTICK", () => {
      this.debugVisible = !this.debugVisible;
      this.debugText?.setVisible(this.debugVisible);
    });
    keyboard.on("keydown-M", () => {
      const muted = audioManager.toggleMute();
      this.showToast(muted ? "SOUND OFF" : "SOUND ON");
    });
    keyboard.on("keydown-N", () => {
      const current = audioManager.getTrackKey();
      const index = current ? trackKeys.indexOf(current) : -1;
      const nextKey = trackKeys[(index + 1) % trackKeys.length];
      audioManager.play(nextKey);
    });
    if (import.meta.env.DEV) {
      keyboard.on("keydown-OPEN_BRACKET", () => {
        audioManager.debugSetProgress(audioManager.getPlaybackProgress() - 0.2);
        this.showToast("DEV · TRACK -20%", undefined, 500);
      });
      keyboard.on("keydown-CLOSED_BRACKET", () => {
        audioManager.debugSetProgress(audioManager.getPlaybackProgress() + 0.2);
        this.showToast("DEV · TRACK +20%", undefined, 500);
      });
      keyboard.on("keydown-K", () => {
        audioManager.debugCompleteTrack();
        this.showToast("DEV · TRACK SILENCE", undefined, 500);
      });
      keyboard.on("keydown-F9", (event: KeyboardEvent) => {
        if (!event.shiftKey || !audioManager.debugSkipToOutro(2)) {
          return;
        }
        this.prepareOutroForDebug();
        this.showToast("DEV · OUTRO READY", undefined, 650);
      });
    }
  }

  private createDebugOverlay() {
    this.debugText = this.add
      .text(5, 4, "", {
        fontFamily: "Courier New, monospace",
        fontSize: "7px",
        color: "#f5f5f5",
        backgroundColor: "rgba(0,0,0,0.72)",
        padding: { left: 3, right: 3, top: 2, bottom: 2 }
      })
      .setScrollFactor(0)
      .setDepth(3000)
      .setVisible(false);

    this.events.on(Phaser.Scenes.Events.POST_UPDATE, () => {
      if (!this.debugText || !this.debugVisible) {
        return;
      }
      const fps = this.game.loop.actualFps.toFixed(0);
      const trackKey = audioManager.getTrackKey() ?? "--";
      const audioState = audioManager.isPlaying() ? "playing" : "silence";
      this.debugText.setText([
        `FPS ${fps}  ${this.scene.key}`,
        `${trackKey}  ${audioState}`,
        gameState.assetsMissing ? "fallback assets" : "assets ok"
      ]);
    });
  }

  private togglePause() {
    if (this.storyBreakActive) {
      return;
    }
    this.manualPauseActive = !this.manualPauseActive;
    this.syncGameplayPause();
    if (this.manualPauseActive) {
      this.physics.world.pause();
      this.tweens.pauseAll();
      audioManager.pause();
      const veil = this.add
        .rectangle(160, 90, 320, 180, 0x100b12, 0.72)
        .setScrollFactor(0)
        .setDepth(2800);
      gameHud.showCinematic("Paused", "The music is waiting with you.", "Esc to return", false);
      this.pauseObjects = [veil];
      return;
    }

    for (const object of this.pauseObjects) {
      object.destroy();
    }
    this.pauseObjects = [];
    this.tweens.resumeAll();
    audioManager.resume();
    this.syncGameplayPause();
    gameHud.hideCinematic();
  }

  private syncGameplayPause() {
    this.gameplayPaused = this.manualPauseActive || this.storyBreakActive;
    if (this.gameplayPaused) {
      this.physics.world.pause();
    } else {
      this.physics.world.resume();
    }
  }

  private togglePhysicsDebug() {
    const world = this.physics?.world;
    if (!world) {
      return;
    }
    world.drawDebug = !world.drawDebug;
    if (world.drawDebug) {
      if (!world.debugGraphic) {
        world.createDebugGraphic();
      }
      world.debugGraphic?.setDepth(2999).setVisible(true);
    } else {
      world.debugGraphic?.clear();
      world.debugGraphic?.setVisible(false);
    }
  }
}
