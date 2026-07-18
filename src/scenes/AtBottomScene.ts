import Phaser from "phaser";
import { audioManager } from "../game/audio/AudioManager";
import { fadeToScene } from "../game/fx/fade";
import { BreathPacer } from "../game/input/BreathPacer";
import { StoryControls } from "../game/input/StoryControls";
import { gameHud } from "../game/ui/GameHud";
import {
  createDustField,
  createShovel,
  createUndergroundBackdrop,
  playFirstAvailable
} from "../game/visuals/StoryVisuals";
import { BaseScene } from "./BaseScene";

const BOTTOM_BEATS = [
  { status: "Stillness · no answer", objective: "The body does not move", title: "At the bottom", story: "All that motion ends here: one body, one breath, no applause. Above you, the world keeps going without asking what the work cost." },
  { status: "Memory · look around", objective: "Look  ← →   ·   remember  Space", title: "What was all that for?", story: "The work is far above you now. Its reasons did not follow you down, only the weight of having believed them." },
  { status: "Realize · trapped", objective: "Space · take one slow breath", title: "The way down is not a way out", story: "You built a way down so carefully that it became a trap. Every useful strike made the walls a little higher." },
  { status: "Recover · piece by piece", objective: "Breathe without hurrying", title: "A little weight returns", story: "Recovery begins with less than action: air, then weight, then choice. Nothing here needs to become a triumph." },
  { status: "Commit · the shovel", objective: "Gather enough to reach the shovel", title: "The tool is still here", story: "The same tool is waiting beside you. It cannot tell digging from escape; only your hands can change the direction." }
] as const;

const FOCUSES = [
  { label: "the opening", thought: "It is farther away than it looked from above, but it has not disappeared." },
  { label: "the swing", thought: "The first motion felt effortless. That did not make every motion harmless." },
  { label: "the beam", thought: "You called every correction progress because stopping felt worse." },
  { label: "the coals", thought: "Moving helped. Moving also made it easier not to ask where you were going." },
  { label: "the shovel", thought: "It did exactly what your hands asked. Tools do not decide what the work means." }
] as const;

const BOTTOM_BREATH_STORIES = [
  {
    count: 1,
    title: "The body answers",
    story: "Not with strength. With the smaller proof that you are still here."
  },
  {
    count: 3,
    title: "The dark has edges",
    story: "When the breath slows, the hole becomes a place—not the whole world."
  },
  {
    count: 5,
    title: "Enough for one choice",
    story: "You do not have to feel restored. You only need one honest direction."
  }
] as const;

type BottomState = "resting" | "rising" | "leaving";

export class AtBottomScene extends BaseScene {
  private controls?: StoryControls;
  private player?: Phaser.GameObjects.Sprite;
  private shovel?: Phaser.GameObjects.Image;
  private energyFill?: Phaser.GameObjects.Rectangle;
  private focusGlow?: Phaser.GameObjects.Arc;
  private stage = -1;
  private focusIndex = 0;
  private lastFocusAt = -1000;
  private lastBreathAt = -1000;
  private breaths = 0;
  private steadyBreaths = 0;
  private breathStoryIndex = 0;
  private energy = 0;
  private state: BottomState = "resting";
  private readonly breathPacer = new BreathPacer();

  constructor() {
    super("AtBottomScene");
  }

  create() {
    console.log("[JOC] scene:at-bottom");
    super.create();
    this.state = "resting";
    this.stage = -1;
    this.focusIndex = 0;
    this.lastFocusAt = -1000;
    this.lastBreathAt = -1000;
    this.breaths = 0;
    this.steadyBreaths = 0;
    this.breathStoryIndex = 0;
    this.energy = 0;
    this.breathPacer.reset();
    this.cameras.main.setBackgroundColor("#09070a");
    this.cameras.main.fadeIn(850, 8, 6, 8);
    const { image, veil } = createUndergroundBackdrop(this, 0.34);
    image.setTint(0xa98d88);
    veil.setFillStyle(0x09070a, 0.28);
    createDustField(this, 0x8f7568, 12, 5);

    this.add.ellipse(160, 157, 124, 20, 0x080609, 0.52).setDepth(6);
    this.player = this.add
      .sprite(145, 146, "player")
      .setRotation(Math.PI / 2)
      .setTint(0xb8a6a1)
      .setAlpha(0.82)
      .setDepth(12);
    this.shovel = createShovel(this, 204, 146, 1.3).setTint(0xaaa1a0).setAlpha(0.74);
    this.focusGlow = this.add
      .circle(160, 57, 12, 0xd4b38c, 0)
      .setStrokeStyle(1, 0xd9c1a6, 0.45)
      .setDepth(8);
    this.tweens.add({
      targets: this.focusGlow,
      alpha: { from: 0.12, to: 0.35 },
      scale: { from: 0.85, to: 1.16 },
      duration: 1600,
      yoyo: true,
      repeat: -1
    });
    this.createEnergyMeter();
    this.controls = new StoryControls(this, "BREATHE");

    gameHud.showHud({
      chapter: "V · At the Bottom",
      objective: BOTTOM_BEATS[0].objective,
      trackLabel: "At the Bottom",
      tone: "ash",
      status: BOTTOM_BEATS[0].status
    });
    audioManager.play("05_at_the_bottom");
    this.time.delayedCall(900, () => this.showToast("Even the air feels heavy", "#c7b8b4", 900));
    this.time.delayedCall(1900, () => {
      if (this.state === "resting" && this.stage <= 0) {
        this.showStoryBeat(BOTTOM_BEATS[0].title, BOTTOM_BEATS[0].story, {
          duration: 4600,
          letterbox: true
        });
      }
    });
  }

  update() {
    if (this.gameplayPaused || !this.player || !this.shovel || !this.controls || this.state !== "resting") {
      return;
    }
    const progress = audioManager.getPlaybackProgress();
    const nextStage = audioManager.getInSilence() ? 4 : Math.min(4, Math.floor(progress * 5));
    this.syncBeat(nextStage, progress);
    const input = this.controls.read();

    if (input.left !== input.right && this.time.now - this.lastFocusAt > 430) {
      this.lastFocusAt = this.time.now;
      const direction = input.left ? -1 : 1;
      this.focusIndex = (this.focusIndex + direction + FOCUSES.length) % FOCUSES.length;
      this.showFocus();
    }
    if (input.action) {
      if (audioManager.getInSilence() && this.energy >= 0.34) {
        this.pickUpShovel();
        return;
      }
      if (progress < 0.38) {
        const focus = FOCUSES[this.focusIndex];
        gameHud.setObjective(focus.thought);
        this.showToast(`Remembering ${focus.label}`, "#c8b5ad", 620);
      } else {
        this.breathe(progress);
      }
    }
    this.updatePosture(progress);
  }

  protected prepareOutroForDebug() {
    if (this.state !== "resting") {
      return;
    }
    this.energy = Math.max(this.energy, 0.45);
    this.breaths = Math.max(this.breaths, 5);
    this.energyFill?.setDisplaySize(94 * (this.energy / 0.56), 3);
    this.focusIndex = 4;
    this.showFocus();
  }

  protected onStoryBreakComplete() {
    this.controls?.discardPending();
  }

  private createEnergyMeter() {
    this.add
      .rectangle(160, 18, 96, 5, 0x100d11, 0.82)
      .setStrokeStyle(1, 0x75686e, 0.68)
      .setScrollFactor(0)
      .setDepth(1798);
    this.energyFill = this.add
      .rectangle(113, 18, 0, 3, 0xbba58d, 1)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(1800);
  }

  private syncBeat(nextStage: number, progress: number) {
    gameHud.setProgress(progress, audioManager.getInSilence() ? "The song is quiet" : "At the Bottom");
    if (nextStage === this.stage) {
      if (audioManager.getInSilence()) {
        gameHud.setObjective(
          this.energy >= 0.34
            ? "Space · pick up the shovel"
            : "Breathe until your hands can reach it"
        );
      }
      return;
    }
    this.stage = nextStage;
    const beat = BOTTOM_BEATS[nextStage];
    gameHud.setStatus(beat.status);
    gameHud.setObjective(beat.objective);
    if (nextStage === 0) {
      return;
    }
    this.showStoryBeat(beat.title, beat.story, {
      duration: nextStage >= 2 ? 4200 : 3100,
      letterbox: nextStage >= 2
    });
  }

  private showFocus() {
    const focus = FOCUSES[this.focusIndex];
    const positions = [
      { x: 160, y: 48 },
      { x: 76, y: 74 },
      { x: 106, y: 104 },
      { x: 242, y: 106 },
      { x: 204, y: 143 }
    ];
    this.focusGlow?.setPosition(positions[this.focusIndex].x, positions[this.focusIndex].y);
    gameHud.setStatus(`${BOTTOM_BEATS[Math.max(0, this.stage)].status} · ${focus.label}`);
    gameHud.setObjective(focus.thought);
  }

  private breathe(progress: number) {
    if (!this.player || this.time.now - this.lastBreathAt < 680) {
      return;
    }
    this.lastBreathAt = this.time.now;
    this.breaths += 1;
    const pace = this.breathPacer.register(this.time.now);
    if (pace.healthy) {
      this.steadyBreaths += 1;
    }
    const paceBonus = pace.healthy ? 0.024 + Math.min(0.012, pace.streak * 0.004) : 0;
    const recovery = Phaser.Math.Linear(0.045, 0.095, progress) + paceBonus;
    this.energy = Phaser.Math.Clamp(this.energy + recovery, 0, 0.56);
    const ring = this.add
      .ellipse(this.player.x, this.player.y, 18, 8, 0xc9b8ac, 0)
      .setStrokeStyle(1, 0xd6c7bd, 0.62)
      .setDepth(11);
    this.tweens.add({
      targets: ring,
      scale: 3,
      alpha: 0,
      duration: 2800,
      ease: "Sine.easeOut",
      onComplete: () => ring.destroy()
    });
    this.tweens.add({
      targets: this.player,
      scaleY: 1.05,
      duration: 360,
      yoyo: true,
      ease: "Sine.easeInOut"
    });
    this.energyFill?.setDisplaySize(94 * (this.energy / 0.56), 3);
    if (pace.healthy) {
      this.rewardSteadyBreath(pace.streak);
      this.presentBreathStory();
    } else {
      this.showToast(this.breaths < 3 ? "One breath" : "A little weight returns", "#c9b8aa", 460);
    }
    if (audioManager.getInSilence()) {
      gameHud.setObjective(
        this.energy >= 0.34 ? "Space · pick up the shovel" : "Breathe until your hands can reach it"
      );
    }
  }

  private rewardSteadyBreath(streak: number) {
    if (!this.player) {
      return;
    }
    const glow = this.add
      .circle(this.player.x, this.player.y - 2, 5, 0xe6d2ae, 0.2)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(10);
    this.tweens.add({
      targets: glow,
      scale: 5.2,
      alpha: 0,
      duration: 1450,
      ease: "Sine.easeOut",
      onComplete: () => glow.destroy()
    });
    for (let index = 0; index < 6; index += 1) {
      const mote = this.add
        .circle(
          this.player.x + Phaser.Math.Between(-8, 8),
          this.player.y + Phaser.Math.Between(-3, 5),
          0.7,
          0xf0d9aa,
          0.62
        )
        .setDepth(12);
      this.tweens.add({
        targets: mote,
        x: mote.x + Phaser.Math.Between(-7, 7),
        y: mote.y - Phaser.Math.Between(10, 22),
        alpha: 0,
        duration: Phaser.Math.Between(900, 1450),
        onComplete: () => mote.destroy()
      });
    }
    gameHud.showWhisper(streak > 1 ? `Good breathing pace · ${streak}` : "Good breathing pace.", 2100);
  }

  private presentBreathStory() {
    const reward = BOTTOM_BREATH_STORIES[this.breathStoryIndex];
    if (!reward || this.steadyBreaths < reward.count) {
      return;
    }
    this.breathStoryIndex += 1;
    gameHud.setStatus(
      `${BOTTOM_BEATS[Math.max(0, this.stage)].status} · steady breaths ${this.steadyBreaths}`
    );
    this.showStoryBeat(reward.title, reward.story, {
      duration: 3900,
      letterbox: this.steadyBreaths >= 5
    });
  }

  private updatePosture(progress: number) {
    if (!this.player) {
      return;
    }
    const readiness = Phaser.Math.Clamp((progress - 0.48) * 1.5 + this.energy * 1.25, 0, 1);
    const rotation = Phaser.Math.Linear(Math.PI / 2, 0, readiness);
    const y = Phaser.Math.Linear(146, 132, readiness);
    const x = Phaser.Math.Linear(145, 181, Math.max(0, readiness - 0.5) * 2);
    this.player
      .setPosition(x, y)
      .setRotation(rotation)
      .setAlpha(Phaser.Math.Linear(0.82, 1, readiness))
      .setTint(Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(0xb8a6a1),
        Phaser.Display.Color.ValueToColor(0xffffff),
        100,
        Math.round(readiness * 100)
      ).color);
    if (readiness > 0.72) {
      playFirstAvailable(this, this.player, ["player:idle"]);
    }
  }

  private pickUpShovel() {
    if (!this.player || !this.shovel || this.state !== "resting") {
      return;
    }
    this.state = "rising";
    gameHud.setObjective("");
    gameHud.setLetterbox(true);
    this.tweens.add({
      targets: this.player,
      x: 194,
      y: 132,
      rotation: 0,
      duration: 640,
      ease: "Sine.easeInOut"
    });
    this.tweens.add({
      targets: this.shovel,
      x: 202,
      y: 130,
      rotation: -0.28,
      alpha: 1,
      duration: 760,
      ease: "Sine.easeInOut",
      onComplete: () => {
        gameHud.showCinematic(
          "Not rested. Ready.",
          "There is enough energy for one direction: up.",
          "",
          true
        );
        this.time.delayedCall(3400, () => {
          this.state = "leaving";
          gameHud.hideCinematic();
          fadeToScene(this, "DiggingOutScene", 620);
        });
      }
    });
  }
}
