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

const DIGGING_BEATS = [
  { status: "Learn · good earth", objective: "Aim  ← →   ·   dig  Space", title: "The work feels clean", story: "The first strike feels useful enough to excuse the second." },
  { status: "Reach · weak seams", objective: "Read the bright crack before each strike", title: "There is always more", story: "Each clean strike makes the next one easier to justify." },
  { status: "Resist · falling soil", objective: "Rest when your arms stop answering", title: "The hole keeps some of it", story: "The hole takes your effort and answers by asking for more." },
  { status: "Transform · heavy hands", objective: "Slow down. A missed strike costs more now.", title: "The shovel gains weight", story: "You are no longer moving the shovel. The shovel is moving you." },
  { status: "Commit · one more", objective: "Choose each final strike carefully", title: "Enough never arrives", story: "One more has become the only number you know." }
] as const;

type DigState = "digging" | "collapsed" | "ready" | "leaving";

export class DiggingInScene extends BaseScene {
  private controls?: StoryControls;
  private player?: Phaser.GameObjects.Sprite;
  private shovel?: Phaser.GameObjects.Image;
  private leftCrack?: Phaser.GameObjects.Image;
  private rightCrack?: Phaser.GameObjects.Image;
  private staminaFill?: Phaser.GameObjects.Rectangle;
  private vignette?: Phaser.GameObjects.Rectangle;
  private weakSide: -1 | 1 = 1;
  private aimSide: -1 | 1 = 1;
  private stage = -1;
  private fatigue = 0;
  private extraFatigue = 0;
  private lastDigAt = -1000;
  private lastActionAt = 0;
  private usefulStrikes = 0;
  private missedStrikes = 0;
  private state: DigState = "digging";

  constructor() {
    super("DiggingInScene");
  }

  create() {
    console.log("[JOC] scene:digging-in");
    super.create();
    this.state = "digging";
    this.cameras.main.setBackgroundColor("#100b0d");
    this.cameras.main.fadeIn(600, 12, 7, 8);
    const { image } = createUndergroundBackdrop(this, 0.04);
    image.setTint(0xffd4b6);
    createDustField(this, 0xb77852, 28, 5);
    ensureStoryTextures(this);

    this.add
      .ellipse(160, 42, 82, 20, 0x180f12, 0.68)
      .setStrokeStyle(1, 0xe49a5e, 0.45)
      .setDepth(4);
    this.player = this.add.sprite(160, 57, "player").setDepth(12);
    this.shovel = createShovel(this, 169, 59, -0.42);
    this.leftCrack = this.add.image(138, 79, "story_crack").setDepth(11);
    this.rightCrack = this.add.image(182, 79, "story_crack").setFlipX(true).setDepth(11);
    this.createFatigueMeter();
    this.vignette = this.add
      .rectangle(160, 90, 320, 180, 0x0a0608, 0)
      .setScrollFactor(0)
      .setDepth(1000);
    this.controls = new StoryControls(this, "DIG");

    gameHud.showHud({
      chapter: "IV · Digging In",
      objective: DIGGING_BEATS[0].objective,
      trackLabel: "Digging In",
      tone: "earth",
      status: DIGGING_BEATS[0].status
    });
    audioManager.play("04_digging_in");
    this.time.delayedCall(600, () => this.showToast("The first strike comes easily"));
  }

  update(_time: number, delta: number) {
    if (this.gameplayPaused || !this.player || !this.shovel || !this.controls) {
      return;
    }
    const input = this.controls.read();
    if (this.state === "ready" && input.action) {
      this.state = "leaving";
      gameHud.hideCinematic();
      fadeToScene(this, "AtBottomScene", 650);
      return;
    }
    if (this.state !== "digging") {
      return;
    }

    const progress = audioManager.getPlaybackProgress();
    const nextStage = audioManager.getInSilence() ? 4 : Math.min(4, Math.floor(progress * 5));
    this.syncBeat(nextStage, progress);

    if (input.left !== input.right) {
      this.aimSide = input.left ? -1 : 1;
    }
    if (input.action) {
      this.tryDig();
    }

    const dt = Math.min(delta / 1000, 0.034);
    const baseFatigue = Phaser.Math.Clamp(Math.pow(progress, 1.17) * 0.88, 0, 0.9);
    const resting = this.time.now - this.lastActionAt > 950;
    const recovery = resting ? Phaser.Math.Linear(0.035, 0.005, progress) * dt : 0;
    this.extraFatigue = Math.max(0, this.extraFatigue - recovery);
    this.fatigue = Phaser.Math.Clamp(Math.max(baseFatigue, baseFatigue + this.extraFatigue), 0, 1);
    this.updatePresentation(progress);

    if (audioManager.getInSilence()) {
      this.collapse();
    }
  }

  protected prepareOutroForDebug() {
    if (this.state !== "digging") {
      return;
    }
    this.fatigue = 0.94;
    this.extraFatigue = 0;
    this.usefulStrikes = Math.max(this.usefulStrikes, 24);
    this.aimSide = this.weakSide;
  }

  protected onStoryBreakComplete() {
    this.controls?.discardPending();
  }

  private createFatigueMeter() {
    this.add
      .rectangle(160, 18, 96, 5, 0x160e11, 0.88)
      .setStrokeStyle(1, 0x9b6750, 0.72)
      .setScrollFactor(0)
      .setDepth(1798);
    this.staminaFill = this.add
      .rectangle(113, 18, 94, 3, 0xd89a63, 1)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(1800);
  }

  private syncBeat(nextStage: number, progress: number) {
    gameHud.setProgress(progress, audioManager.getInSilence() ? "The song is quiet" : "Digging In");
    if (nextStage === this.stage) {
      return;
    }
    this.stage = nextStage;
    const beat = DIGGING_BEATS[nextStage];
    gameHud.setStatus(beat.status);
    gameHud.setObjective(beat.objective);
    if (nextStage === 0) {
      return;
    }
    this.showStoryBeat(beat.title, beat.story, {
      duration: nextStage >= 3 ? 4100 : 3000,
      letterbox: nextStage >= 3
    });
  }

  private tryDig() {
    if (!this.player || !this.shovel) {
      return;
    }
    const cooldown = Phaser.Math.Linear(230, 1050, this.fatigue);
    if (this.time.now - this.lastDigAt < cooldown) {
      if (this.fatigue > 0.58) {
        this.showToast("Your arms have not caught up", "#dcb18f", 420);
      }
      return;
    }
    this.lastDigAt = this.time.now;
    this.lastActionAt = this.time.now;
    const useful = this.aimSide === this.weakSide;
    if (useful) {
      this.usefulStrikes += 1;
      this.extraFatigue += 0.012 + this.stage * 0.002;
      this.showToast(this.fatigue > 0.7 ? "Some earth gives" : "A clean strike", "#e5b17b", 360);
    } else {
      this.missedStrikes += 1;
      this.extraFatigue += 0.035 + this.stage * 0.006;
      this.cameras.main.shake(110, 0.0035);
      this.showToast("Packed earth · wasted effort", "#c99075", 420);
    }

    this.shovel.setFlipX(this.aimSide < 0);
    const startRotation = this.aimSide < 0 ? 0.48 : -0.48;
    this.shovel.setRotation(startRotation);
    this.tweens.add({
      targets: this.shovel,
      rotation: this.aimSide < 0 ? -1.05 : 1.05,
      duration: Phaser.Math.Linear(130, 430, this.fatigue),
      yoyo: true,
      ease: "Quad.easeIn",
      onYoyo: () => this.spawnDirt(this.aimSide)
    });
    this.player.setScale(1, 0.94);
    this.tweens.add({ targets: this.player, scaleY: 1, duration: 220 });
    playFirstAvailable(this, this.player, ["player:success", "player:idle"]);
    this.weakSide = Phaser.Math.RND.frac() > 0.22 ? (this.weakSide * -1) as -1 | 1 : this.weakSide;
  }

  private spawnDirt(side: number) {
    if (!this.player) {
      return;
    }
    for (let index = 0; index < 8; index += 1) {
      const dirt = this.add
        .rectangle(this.player.x + side * 16, this.player.y + 13, 2, 2, 0xa96743, 0.9)
        .setDepth(16);
      this.tweens.add({
        targets: dirt,
        x: dirt.x + side * Phaser.Math.Between(8, 18),
        y: dirt.y - Phaser.Math.Between(3, 14),
        alpha: 0,
        duration: Phaser.Math.Between(300, 620),
        onComplete: () => dirt.destroy()
      });
    }
  }

  private updatePresentation(progress: number) {
    if (!this.player || !this.shovel || !this.leftCrack || !this.rightCrack) {
      return;
    }
    const depth = Phaser.Math.Clamp(progress * 0.9 + Math.min(0.1, this.usefulStrikes * 0.002), 0, 1);
    const y = Phaser.Math.Linear(56, 145, depth);
    const sway = Math.sin(this.time.now * 0.0022) * this.fatigue * 1.8;
    this.player.setPosition(160 + sway, y).setRotation(this.fatigue * 0.12);
    this.shovel.setPosition(160 + this.aimSide * 9 + sway, y + 1);
    if (!this.tweens.isTweening(this.shovel)) {
      this.shovel.setRotation(this.aimSide < 0 ? 0.42 : -0.42).setFlipX(this.aimSide < 0);
    }
    this.leftCrack.setPosition(137, Math.min(158, y + 20));
    this.rightCrack.setPosition(183, Math.min(158, y + 20));
    this.leftCrack.setAlpha(this.weakSide < 0 ? 0.95 : 0.2).setScale(this.aimSide < 0 ? 1.25 : 1);
    this.rightCrack.setAlpha(this.weakSide > 0 ? 0.95 : 0.2).setScale(this.aimSide > 0 ? 1.25 : 1);
    this.staminaFill?.setDisplaySize(94 * (1 - this.fatigue), 3);
    this.staminaFill?.setFillStyle(this.fatigue > 0.78 ? 0xb86e59 : 0xd89a63, 1);
    this.vignette?.setAlpha(Math.max(0, this.fatigue - 0.45) * 0.48);
    this.cameras.main.setZoom(1 + progress * 0.055);
    this.cameras.main.setScroll(0, progress * 2.5);
    gameHud.setStatus(
      `${DIGGING_BEATS[Math.max(0, this.stage)].status} · ${Math.round(this.fatigue * 100)}% spent`
    );
  }

  private collapse() {
    if (!this.player || !this.shovel || this.state !== "digging") {
      return;
    }
    this.state = "collapsed";
    this.fatigue = 1;
    this.staminaFill?.setDisplaySize(0, 3);
    this.leftCrack?.setVisible(false);
    this.rightCrack?.setVisible(false);
    gameHud.setProgress(1, "The song is quiet");
    gameHud.setObjective("");
    gameHud.setLetterbox(true);
    this.tweens.killTweensOf(this.shovel);
    this.tweens.add({
      targets: this.shovel,
      x: 184,
      y: 154,
      rotation: 1.34,
      duration: 560,
      ease: "Bounce.easeOut"
    });
    this.tweens.add({
      targets: this.player,
      y: 151,
      rotation: Math.PI / 2,
      alpha: 0.82,
      duration: 780,
      ease: "Quad.easeIn",
      onComplete: () => {
        this.state = "ready";
        gameHud.showCinematic(
          "Nothing left",
          "The hole is deep now. The shovel falls first.",
          "Space · let the weight go",
          true
        );
      }
    });
  }
}
