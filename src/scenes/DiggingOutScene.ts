import Phaser from "phaser";
import { audioManager } from "../game/audio/AudioManager";
import { fadeToScene } from "../game/fx/fade";
import { StoryControls } from "../game/input/StoryControls";
import { gameHud } from "../game/ui/GameHud";
import {
  createDustField,
  createShovel,
  createUndergroundBackdrop,
  ensureStoryTextures,
  playFirstAvailable
} from "../game/visuals/StoryVisuals";
import { BaseScene } from "./BaseScene";

const OUT_BEATS = [
  { status: "Move · before thought", objective: "Aim  ← →   ·   drive the shovel  Space", title: "Up", story: "Up is not hope yet. It is only the next direction." },
  { status: "Reach · make a foothold", objective: "Strike the bright side before it falls", title: "Do not look down", story: "Up is not a feeling yet. It is the next foothold." },
  { status: "Resist · sliding earth", objective: "Correct strikes build Drive", title: "The hole pulls back", story: "Everything you built presses back as you climb through it." },
  { status: "Transform · pale air", objective: "Keep the chain alive", title: "Air reaches the shaft", story: "The first pale air feels impossible—and then it reaches you." },
  { status: "Commit · the ledge", objective: "One foothold. Then another.", title: "The surface is close", story: "The surface is close enough to hurt." }
] as const;

type OutState = "climbing" | "pulling" | "leaving";

export class DiggingOutScene extends BaseScene {
  private controls?: StoryControls;
  private player?: Phaser.GameObjects.Sprite;
  private shovel?: Phaser.GameObjects.Image;
  private leftCrack?: Phaser.GameObjects.Image;
  private rightCrack?: Phaser.GameObjects.Image;
  private driveFill?: Phaser.GameObjects.Rectangle;
  private paleAir?: Phaser.GameObjects.Rectangle;
  private stage = -1;
  private targetSide: -1 | 1 = -1;
  private aimSide: -1 | 1 = -1;
  private drive = 0;
  private slidePenalty = 0;
  private lastStrikeAt = -1000;
  private lastDriveDecayAt = 0;
  private state: OutState = "climbing";

  constructor() {
    super("DiggingOutScene");
  }

  create() {
    console.log("[JOC] scene:digging-out");
    super.create();
    this.state = "climbing";
    this.cameras.main.setBackgroundColor("#09080b");
    this.cameras.main.fadeIn(480, 8, 7, 9);
    const { image, veil } = createUndergroundBackdrop(this, 0.14);
    image.setTint(0xc2aaa4);
    veil.setFillStyle(0x0b090c, 0.12);
    createDustField(this, 0xb28b73, 34, 6);
    ensureStoryTextures(this);

    this.paleAir = this.add
      .rectangle(160, 22, 320, 48, 0xcbd2d0, 0)
      .setBlendMode(Phaser.BlendModes.SCREEN)
      .setDepth(4);
    this.player = this.add.sprite(160, 145, "player").setTint(0xd2c0bb).setDepth(13);
    this.shovel = createShovel(this, 168, 143, -0.4).setTint(0xc7b6ad);
    this.leftCrack = this.add.image(135, 141, "story_crack").setDepth(12);
    this.rightCrack = this.add.image(185, 141, "story_crack").setFlipX(true).setDepth(12);
    this.createDriveMeter();
    this.controls = new StoryControls(this, "DRIVE");

    gameHud.showHud({
      chapter: "VI · Digging Out",
      objective: OUT_BEATS[0].objective,
      trackLabel: "Digging Out",
      tone: "ash",
      status: OUT_BEATS[0].status
    });
    audioManager.play("06_digging_out");
    this.time.delayedCall(360, () => this.showToast("No energy. Move anyway.", "#d2c4bc", 720));
  }

  update(_time: number, delta: number) {
    if (this.gameplayPaused || !this.player || !this.shovel || !this.controls || this.state !== "climbing") {
      return;
    }
    const progress = audioManager.getPlaybackProgress();
    const nextStage = audioManager.getInSilence() ? 4 : Math.min(4, Math.floor(progress * 5));
    this.syncBeat(nextStage, progress);
    const input = this.controls.read();
    if (input.left !== input.right) {
      this.aimSide = input.left ? -1 : 1;
    }
    if (input.action) {
      if (audioManager.getInSilence()) {
        this.finalPull();
        return;
      }
      this.tryStrike();
    }

    if (this.time.now - this.lastDriveDecayAt > 1100) {
      this.lastDriveDecayAt = this.time.now;
      this.drive = Math.max(0, this.drive - 0.35);
    }
    this.slidePenalty = Math.max(0, this.slidePenalty - Math.min(delta / 1000, 0.034) * (1 + this.drive * 0.15));
    this.updatePresentation(progress);
  }

  protected prepareOutroForDebug() {
    if (this.state !== "climbing") {
      return;
    }
    this.drive = 5;
    this.slidePenalty = 0;
    this.aimSide = this.targetSide;
    this.driveFill?.setDisplaySize(94, 3);
  }

  protected onStoryBreakComplete() {
    this.controls?.discardPending();
  }

  private createDriveMeter() {
    this.add
      .rectangle(160, 18, 96, 5, 0x0d0c0f, 0.86)
      .setStrokeStyle(1, 0x8c8581, 0.72)
      .setScrollFactor(0)
      .setDepth(1798);
    this.driveFill = this.add
      .rectangle(113, 18, 0, 3, 0xd4c7b8, 1)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(1800);
  }

  private syncBeat(nextStage: number, progress: number) {
    gameHud.setProgress(progress, audioManager.getInSilence() ? "The song is quiet" : "Digging Out");
    if (nextStage === this.stage) {
      if (audioManager.getInSilence()) {
        gameHud.setStatus("Silence · the last ledge");
        gameHud.setObjective("Space · pull yourself out");
      }
      return;
    }
    this.stage = nextStage;
    const beat = OUT_BEATS[nextStage];
    gameHud.setStatus(beat.status);
    gameHud.setObjective(beat.objective);
    if (nextStage === 0) {
      return;
    }
    this.showStoryBeat(beat.title, beat.story, {
      duration: nextStage >= 3 ? 3900 : 2900,
      letterbox: nextStage >= 3
    });
  }

  private tryStrike() {
    if (!this.player || !this.shovel || this.time.now - this.lastStrikeAt < 260) {
      return;
    }
    this.lastStrikeAt = this.time.now;
    const useful = this.aimSide === this.targetSide;
    this.shovel.setFlipX(this.aimSide < 0);
    this.shovel.setRotation(this.aimSide < 0 ? 0.54 : -0.54);
    this.tweens.add({
      targets: this.shovel,
      rotation: this.aimSide < 0 ? -1.06 : 1.06,
      duration: 115,
      yoyo: true,
      ease: "Quad.easeIn",
      onYoyo: () => this.spawnRubble(this.aimSide)
    });
    if (useful) {
      this.drive = Math.min(5, this.drive + 1);
      this.slidePenalty = Math.max(0, this.slidePenalty - 2.2);
      this.targetSide = (this.targetSide * -1) as -1 | 1;
      this.showToast(this.drive >= 4 ? "Drive · keep climbing" : "Foothold", "#e2d4c6", 300);
      this.cameras.main.shake(65, 0.0018);
    } else {
      this.drive = Math.max(0, this.drive - 1.5);
      this.slidePenalty = Math.min(13, this.slidePenalty + 4.5);
      this.showToast("It gives way", "#c4aca3", 320);
      this.cameras.main.shake(120, 0.0055);
    }
    playFirstAvailable(this, this.player, ["player:success", "player:idle"]);
  }

  private spawnRubble(side: number) {
    if (!this.player) {
      return;
    }
    for (let index = 0; index < 7; index += 1) {
      const rubble = this.add
        .rectangle(this.player.x + side * 18, this.player.y, 2, 2, 0x92715f, 0.9)
        .setDepth(15);
      this.tweens.add({
        targets: rubble,
        x: rubble.x - side * Phaser.Math.Between(2, 9),
        y: rubble.y + Phaser.Math.Between(10, 28),
        alpha: 0,
        duration: Phaser.Math.Between(280, 560),
        onComplete: () => rubble.destroy()
      });
    }
  }

  private updatePresentation(progress: number) {
    if (!this.player || !this.shovel || !this.leftCrack || !this.rightCrack) {
      return;
    }
    const y = Phaser.Math.Linear(145, 48, progress) + this.slidePenalty;
    const desperation = 1 + Math.sin(this.time.now * 0.015) * 0.015 * (1 - progress);
    this.player.setPosition(160, y).setScale(desperation).setRotation((this.aimSide * -0.045) + this.slidePenalty * 0.004);
    this.shovel.setPosition(160 + this.aimSide * 9, y - 1);
    if (!this.tweens.isTweening(this.shovel)) {
      this.shovel.setRotation(this.aimSide < 0 ? 0.45 : -0.45).setFlipX(this.aimSide < 0);
    }
    this.leftCrack.setPosition(136, y + 7).setAlpha(this.targetSide < 0 ? 1 : 0.18);
    this.rightCrack.setPosition(184, y + 7).setAlpha(this.targetSide > 0 ? 1 : 0.18);
    this.driveFill?.setDisplaySize(94 * (this.drive / 5), 3);
    this.paleAir?.setAlpha(Math.max(0, progress - 0.45) * 0.42);
    this.cameras.main.setZoom(1.03 + Math.sin(this.time.now * 0.004) * 0.006);
    gameHud.setStatus(`${OUT_BEATS[Math.max(0, this.stage)].status}${this.drive ? ` · Drive ×${Math.ceil(this.drive)}` : ""}`);
  }

  private finalPull() {
    if (!this.player || !this.shovel || this.state !== "climbing") {
      return;
    }
    this.state = "pulling";
    this.leftCrack?.setVisible(false);
    this.rightCrack?.setVisible(false);
    gameHud.setObjective("");
    gameHud.setLetterbox(true);
    this.tweens.add({
      targets: [this.player, this.shovel],
      y: "-=42",
      duration: 820,
      ease: "Back.easeIn",
      onComplete: () => {
        this.cameras.main.flash(500, 218, 222, 218, false);
        gameHud.showCinematic(
          "Out",
          "The body reaches the surface before it understands that it has.",
          "",
          true
        );
        this.time.delayedCall(3400, () => {
          this.state = "leaving";
          gameHud.hideCinematic();
          fadeToScene(this, "ByShovelScene", 760);
        });
      }
    });
  }
}
