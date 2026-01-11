import Phaser from "phaser";
import { trackKeys, type TrackKey } from "../assets/assetConfig";
import { gameState } from "../state/gameState";

type CompleteCallback = () => void;

class AudioManager {
  private soundManager?: Phaser.Sound.BaseSoundManager;
  private currentSound?: Phaser.Sound.BaseSound;
  private fallbackTimerId?: number;
  private fallbackDurationMs = 45000;
  private startTimeMs?: number;
  private currentDurationMs?: number;
  private completeCallbacks: CompleteCallback[] = [];

  init(soundManager: Phaser.Sound.BaseSoundManager) {
    this.soundManager = soundManager;
  }

  play(trackKey: TrackKey): void {
    if (!trackKeys.includes(trackKey)) {
      return;
    }
    this.stop();
    gameState.currentTrackKey = trackKey;
    gameState.inSilence = false;
    if (trackKey === "01_back_in_the_swing" || trackKey === "02_losing_balance") {
      gameState.balanceLoss = 0;
    }

    const soundManager = this.soundManager;
    if (!soundManager) {
      this.startFallback();
      return;
    }

    const audioCache = soundManager.game.cache.audio;
    if (!audioCache.exists(trackKey)) {
      this.startFallback();
      return;
    }

    this.currentSound = soundManager.add(trackKey);
    if (!this.currentSound) {
      this.startFallback();
      return;
    }

    this.currentSound.once(Phaser.Sound.Events.COMPLETE, () => {
      this.handleComplete();
    });
    this.startTimeMs = performance.now();
    this.currentDurationMs =
      this.currentSound.duration > 0
        ? this.currentSound.duration * 1000
        : this.fallbackDurationMs;
    this.currentSound.play({ loop: false });
  }

  stop(): void {
    if (this.currentSound) {
      this.currentSound.stop();
      this.currentSound.destroy();
      this.currentSound = undefined;
    }

    if (this.fallbackTimerId !== undefined) {
      window.clearTimeout(this.fallbackTimerId);
      this.fallbackTimerId = undefined;
    }

    this.startTimeMs = undefined;
    this.currentDurationMs = undefined;
    gameState.inSilence = true;
  }

  isPlaying(): boolean {
    return Boolean(this.currentSound?.isPlaying || this.fallbackTimerId !== undefined);
  }

  getTrackKey(): TrackKey | null {
    return gameState.currentTrackKey;
  }

  getInSilence(): boolean {
    return gameState.inSilence;
  }

  getPlaybackProgress(): number {
    if (!this.startTimeMs || !this.currentDurationMs) {
      return 0;
    }
    const elapsed = performance.now() - this.startTimeMs;
    return Phaser.Math.Clamp(elapsed / this.currentDurationMs, 0, 1);
  }

  onComplete(cb: () => void): void {
    this.completeCallbacks.push(cb);
  }

  private startFallback() {
    if (this.fallbackTimerId !== undefined) {
      window.clearTimeout(this.fallbackTimerId);
    }
    this.startTimeMs = performance.now();
    this.currentDurationMs = this.fallbackDurationMs;
    this.fallbackTimerId = window.setTimeout(() => {
      this.fallbackTimerId = undefined;
      this.handleComplete();
    }, this.fallbackDurationMs);
  }

  private handleComplete() {
    gameState.inSilence = true;
    this.startTimeMs = undefined;
    this.currentDurationMs = undefined;
    if (this.currentSound) {
      this.currentSound.destroy();
      this.currentSound = undefined;
    }
    for (const cb of this.completeCallbacks) {
      cb();
    }
  }
}

export const audioManager = new AudioManager();
