import Phaser from "phaser";
import { trackKeys, type TrackKey } from "../assets/assetConfig";
import { gameState } from "../state/gameState";

type CompleteCallback = () => void;

class AudioManager {
  private soundManager?: Phaser.Sound.BaseSoundManager;
  private currentSound?: Phaser.Sound.BaseSound;
  private fallbackTimerId?: number;
  private fallbackDurationMs = 45000;
  private fallbackRemainingMs = 0;
  private fallbackStartedAtMs?: number;
  private startTimeMs?: number;
  private currentDurationMs?: number;
  private lastProgress = 0;
  private pausedAtMs?: number;
  private totalPausedMs = 0;
  private completeCallbacks: CompleteCallback[] = [];
  private debugOutroTimerId?: number;

  init(soundManager: Phaser.Sound.BaseSoundManager) {
    this.soundManager = soundManager;
    this.soundManager.mute = gameState.muted;
  }

  play(trackKey: TrackKey): void {
    if (!trackKeys.includes(trackKey)) {
      return;
    }
    this.stop();
    gameState.currentTrackKey = trackKey;
    gameState.inSilence = false;
    this.lastProgress = 0;
    this.totalPausedMs = 0;
    this.pausedAtMs = undefined;

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
    this.clearDebugOutroTimer();
    if (this.currentSound) {
      this.currentSound.stop();
      this.currentSound.destroy();
      this.currentSound = undefined;
    }

    if (this.fallbackTimerId !== undefined) {
      window.clearTimeout(this.fallbackTimerId);
      this.fallbackTimerId = undefined;
    }
    this.fallbackRemainingMs = 0;
    this.fallbackStartedAtMs = undefined;

    this.startTimeMs = undefined;
    this.currentDurationMs = undefined;
    this.pausedAtMs = undefined;
    this.totalPausedMs = 0;
    this.lastProgress = 0;
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
      return this.lastProgress;
    }
    const now = this.pausedAtMs ?? performance.now();
    const elapsed = now - this.startTimeMs - this.totalPausedMs;
    this.lastProgress = Phaser.Math.Clamp(elapsed / this.currentDurationMs, 0, 1);
    return this.lastProgress;
  }

  getDurationMs(): number {
    return this.currentDurationMs ?? 0;
  }

  toggleMute(): boolean {
    gameState.muted = !gameState.muted;
    if (this.soundManager) {
      this.soundManager.mute = gameState.muted;
    }
    return gameState.muted;
  }

  pause(): void {
    if (this.pausedAtMs === undefined && this.startTimeMs !== undefined) {
      this.pausedAtMs = performance.now();
    }
    this.currentSound?.pause();
    if (this.fallbackTimerId !== undefined && this.fallbackStartedAtMs !== undefined) {
      window.clearTimeout(this.fallbackTimerId);
      this.fallbackTimerId = undefined;
      this.fallbackRemainingMs = Math.max(
        0,
        this.fallbackRemainingMs - (performance.now() - this.fallbackStartedAtMs)
      );
      this.fallbackStartedAtMs = undefined;
    }
  }

  resume(): void {
    if (this.pausedAtMs !== undefined) {
      this.totalPausedMs += performance.now() - this.pausedAtMs;
      this.pausedAtMs = undefined;
    }
    this.currentSound?.resume();
    if (
      !this.currentSound &&
      this.fallbackTimerId === undefined &&
      this.fallbackRemainingMs > 0 &&
      !gameState.inSilence
    ) {
      this.scheduleFallback(this.fallbackRemainingMs);
    }
  }

  debugSetProgress(value: number): void {
    if (!import.meta.env.DEV || this.currentDurationMs === undefined) {
      return;
    }
    const progress = Phaser.Math.Clamp(value, 0, 1);
    this.lastProgress = progress;
    this.startTimeMs = performance.now() - progress * this.currentDurationMs;
    this.totalPausedMs = 0;
    this.pausedAtMs = undefined;
    if (this.fallbackTimerId !== undefined) {
      window.clearTimeout(this.fallbackTimerId);
      this.fallbackTimerId = undefined;
      this.scheduleFallback(this.currentDurationMs * (1 - progress));
    }
    if (progress >= 1) {
      this.debugCompleteTrack();
    }
  }

  debugSkipToOutro(seconds = 2): boolean {
    if (!import.meta.env.DEV || this.currentDurationMs === undefined || gameState.inSilence) {
      return false;
    }
    const remainingMs = Phaser.Math.Clamp(seconds * 1000, 250, this.currentDurationMs);
    const progress = 1 - remainingMs / this.currentDurationMs;
    this.lastProgress = progress;
    this.startTimeMs = performance.now() - progress * this.currentDurationMs;
    this.totalPausedMs = 0;
    this.pausedAtMs = undefined;

    if (this.currentSound) {
      const seekableSound = this.currentSound as Phaser.Sound.BaseSound & {
        setSeek: (value: number) => Phaser.Sound.BaseSound;
      };
      seekableSound.setSeek(Math.max(0, this.currentSound.duration - remainingMs / 1000));
    }
    if (this.fallbackTimerId !== undefined) {
      window.clearTimeout(this.fallbackTimerId);
      this.fallbackTimerId = undefined;
      this.scheduleFallback(remainingMs);
    }
    this.clearDebugOutroTimer();
    this.debugOutroTimerId = window.setTimeout(() => {
      this.debugOutroTimerId = undefined;
      this.debugCompleteTrack();
    }, remainingMs + 60);
    return true;
  }

  debugCompleteTrack(): void {
    if (!import.meta.env.DEV) {
      return;
    }
    if (this.currentSound) {
      this.currentSound.stop();
    }
    if (this.fallbackTimerId !== undefined) {
      window.clearTimeout(this.fallbackTimerId);
      this.fallbackTimerId = undefined;
    }
    this.handleComplete();
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
    this.scheduleFallback(this.fallbackDurationMs);
  }

  private scheduleFallback(durationMs: number) {
    this.fallbackRemainingMs = durationMs;
    this.fallbackStartedAtMs = performance.now();
    this.fallbackTimerId = window.setTimeout(() => {
      this.fallbackTimerId = undefined;
      this.fallbackRemainingMs = 0;
      this.fallbackStartedAtMs = undefined;
      this.handleComplete();
    }, durationMs);
  }

  private handleComplete() {
    this.clearDebugOutroTimer();
    gameState.inSilence = true;
    this.lastProgress = 1;
    this.startTimeMs = undefined;
    this.currentDurationMs = undefined;
    this.pausedAtMs = undefined;
    this.totalPausedMs = 0;
    this.fallbackRemainingMs = 0;
    this.fallbackStartedAtMs = undefined;
    if (this.currentSound) {
      this.currentSound.destroy();
      this.currentSound = undefined;
    }
    for (const cb of this.completeCallbacks) {
      cb();
    }
  }

  private clearDebugOutroTimer() {
    if (this.debugOutroTimerId === undefined) {
      return;
    }
    window.clearTimeout(this.debugOutroTimerId);
    this.debugOutroTimerId = undefined;
  }
}

export const audioManager = new AudioManager();
