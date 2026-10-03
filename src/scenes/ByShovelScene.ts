import Phaser from "phaser";
import { audioManager } from "../game/audio/AudioManager";
import { fadeToScene } from "../game/fx/fade";
import { BreathPacer } from "../game/input/BreathPacer";
import { StoryControls } from "../game/input/StoryControls";
import { LeaveAnxiety } from "../game/narrative/LeaveAnxiety";
import { gameState } from "../game/state/gameState";
import { gameHud, type ChoiceSide } from "../game/ui/GameHud";
import { createDustField, createShovel, playFirstAvailable } from "../game/visuals/StoryVisuals";
import { BaseScene } from "./BaseScene";

const SHOVEL_BEATS = [
  { status: "Stillness · open sky", objective: "Breathe  Space", title: "By the shovel", story: "Morning finds you beside the thing that buried you and brought you back." },
  { status: "Look · what remains", objective: "Look  ← →   ·   breathe  Space", title: "The same tool", story: "The tool is quiet now. Your hands remember what it asked of them." },
  { status: "Question · no verdict", objective: "Turn toward what you cannot answer", title: "Did you choose the hole?", story: "No verdict arrives with the morning." },
  { status: "Recover · sit with it", objective: "Nothing needs to be solved yet", title: "Or did it happen around you?", story: "You survived the hole. That does not make the hole necessary." },
  { status: "Commit · stand", objective: "Look at the swing. Look at the gate.", title: "Both can be directions", story: "Familiarity waits behind you. An open gate waits ahead." }
] as const;

const SURFACE_FOCUSES = [
  { label: "the shovel", thought: "The same weight made the hole and opened it." },
  { label: "the hole", thought: "Did every strike feel like a choice, or only the first?" },
  { label: "the swing", thought: "Familiar does not mean harmless. It does not mean wrong." },
  { label: "the gate", thought: "Leaving is also a direction." },
  { label: "the sky", thought: "Rest does not answer the question. It makes room for it." }
] as const;

type ShovelState = "contemplating" | "choosing" | "leaving" | "leave-complete" | "returning";

export class ByShovelScene extends BaseScene {
  private controls?: StoryControls;
  private player?: Phaser.GameObjects.Sprite;
  private sunrise?: Phaser.GameObjects.Image;
  private dawnVeil?: Phaser.GameObjects.Rectangle;
  private skyWonderLayer?: Phaser.GameObjects.Container;
  private focusGlow?: Phaser.GameObjects.Arc;
  private stage = -1;
  private focusIndex = 4;
  private lastFocusAt = -1000;
  private lastBreathAt = -1000;
  private choice: ChoiceSide = "left";
  private state: ShovelState = "contemplating";
  private leaveAnxiety?: LeaveAnxiety;
  private readonly breathPacer = new BreathPacer();
  private successfulBreaths = 0;
  private fireflyStringSerial = 0;
  private breathGardenUnlocked = false;
  private autoBreathing = false;
  private nextAutoBreathAt = 0;

  constructor() {
    super("ByShovelScene");
  }

  create() {
    console.log("[JOC] scene:by-the-shovel");
    super.create();
    this.state = "contemplating";
    this.leaveAnxiety = undefined;
    this.stage = -1;
    this.focusIndex = 4;
    this.lastFocusAt = -1000;
    this.lastBreathAt = -1000;
    this.breathPacer.reset();
    this.successfulBreaths = 0;
    this.fireflyStringSerial = 0;
    this.breathGardenUnlocked = false;
    this.autoBreathing = false;
    this.nextAutoBreathAt = 0;
    this.cameras.main.setBackgroundColor("#100d14");
    this.cameras.main.fadeIn(900, 205, 211, 212);
    this.add.image(160, 90, "by_the_shovel").setDisplaySize(320, 180).setDepth(0);
    this.sunrise = this.add
      .image(160, 90, "by_the_shovel_sunrise")
      .setDisplaySize(320, 180)
      .setAlpha(0)
      .setDepth(1);
    this.dawnVeil = this.add
      .rectangle(160, 90, 320, 180, 0xf0c59d, 0)
      .setBlendMode(Phaser.BlendModes.SCREEN)
      .setDepth(2);
    this.skyWonderLayer = this.add.container(0, 0).setDepth(3);
    this.createSkyWonders();
    createDustField(this, 0xc8c5bd, 20, 5);

    const hole = this.add.graphics().setDepth(7);
    hole.fillStyle(0x070609, 0.96).fillEllipse(183, 149, 64, 18);
    hole.lineStyle(1, 0x6e5146, 0.65).strokeEllipse(183, 149, 66, 20);
    this.player = this.add
      .sprite(142, 143, "player")
      .setRotation(Math.PI / 2)
      .setTint(0xc4b8b4)
      .setDepth(12);
    createShovel(this, 171, 145, 1.36).setTint(0xbdb8b5);
    this.focusGlow = this.add
      .circle(160, 44, 12, 0xe3d2b8, 0)
      .setStrokeStyle(1, 0xe8d6bd, 0.52)
      .setDepth(8);
    this.tweens.add({
      targets: this.focusGlow,
      alpha: { from: 0.1, to: 0.32 },
      scale: { from: 0.85, to: 1.18 },
      duration: 1800,
      yoyo: true,
      repeat: -1
    });
    this.controls = new StoryControls(this, "BREATHE");

    gameHud.showHud({
      chapter: "VII · By the Shovel",
      objective: SHOVEL_BEATS[0].objective,
      trackLabel: "By the Shovel",
      tone: "dawn",
      status: SHOVEL_BEATS[0].status
    });
    audioManager.play("07_by_the_shovel");
    if (import.meta.env.DEV) {
      this.input.keyboard?.on("keydown-G", () => {
        if (this.successfulBreaths < 10) {
          this.successfulBreaths = 10;
          this.spawnFireflyString();
        } else if (this.successfulBreaths < 25) {
          this.successfulBreaths = 25;
        } else if (this.successfulBreaths < 50) {
          this.successfulBreaths = 50;
        } else {
          this.successfulBreaths += 1;
          this.spawnFireflyString();
        }
        this.applyBreathMilestones();
        gameHud.setStatus(this.getBreathStatus(SHOVEL_BEATS[Math.max(0, this.stage)].status));
      });
    }
    this.time.delayedCall(1000, () => this.showToast("Nothing is asking you to move", "#d5c9c3", 950));
  }

  update() {
    if (this.gameplayPaused || !this.player || !this.controls) {
      return;
    }
    const input = this.controls.read();
    if (this.state === "leave-complete" && input.action) {
      this.cameras.main.fadeOut(620, 9, 8, 11);
      this.time.delayedCall(650, () => {
        gameHud.hideCinematic();
        audioManager.stop();
        this.scene.start("BootScene");
      });
      this.state = "leaving";
      return;
    }
    if (this.state === "choosing") {
      if (this.leaveAnxiety) {
        this.updateLeaveAnxiety(input.left, input.right, input.action);
      } else {
        this.updateChoice(input.left, input.right, input.action);
      }
      return;
    }
    if (this.state !== "contemplating") {
      return;
    }

    const progress = audioManager.getPlaybackProgress();
    const nextStage = audioManager.getInSilence() ? 4 : Math.min(4, Math.floor(progress * 5));
    this.syncBeat(nextStage, progress);
    if (input.left !== input.right && this.time.now - this.lastFocusAt > 430) {
      this.lastFocusAt = this.time.now;
      const direction = input.left ? -1 : 1;
      this.focusIndex = (this.focusIndex + direction + SURFACE_FOCUSES.length) % SURFACE_FOCUSES.length;
      this.showFocus();
    }
    if (this.autoBreathing) {
      if (this.time.now >= this.nextAutoBreathAt) {
        this.breathe(true);
      }
    } else if (input.action) {
      this.breathe(false);
    }
    this.updatePosture(progress);
    if (audioManager.getInSilence()) {
      this.beginChoice();
    }
  }

  protected prepareOutroForDebug() {
    if (this.state !== "contemplating") {
      return;
    }
    this.focusIndex = 2;
    this.showFocus();
  }

  protected onStoryBreakComplete() {
    this.controls?.discardPending();
  }

  private syncBeat(nextStage: number, progress: number) {
    gameHud.setProgress(progress, audioManager.getInSilence() ? "The song is quiet" : "By the Shovel");
    const dawn = smoothstep(progress, 0.08, 0.94);
    this.sunrise?.setAlpha(dawn);
    this.dawnVeil?.setAlpha(Math.sin(dawn * Math.PI) * 0.08);
    this.skyWonderLayer?.setAlpha(Phaser.Math.Linear(1, 0.24, dawn));
    if (nextStage === this.stage) {
      return;
    }
    this.stage = nextStage;
    const beat = SHOVEL_BEATS[nextStage];
    gameHud.setStatus(this.getBreathStatus(beat.status));
    gameHud.setObjective(beat.objective);
    if (nextStage === 0) {
      return;
    }
    this.showStoryBeat(beat.title, beat.story, {
      duration: nextStage >= 2 ? 4300 : 3100,
      letterbox: nextStage >= 2
    });
  }

  private showFocus() {
    const positions = [
      { x: 171, y: 143 },
      { x: 185, y: 147 },
      { x: 90, y: 91 },
      { x: 267, y: 101 },
      { x: 160, y: 44 }
    ];
    const focus = SURFACE_FOCUSES[this.focusIndex];
    this.focusGlow?.setPosition(positions[this.focusIndex].x, positions[this.focusIndex].y);
    gameHud.setStatus(
      this.getBreathStatus(`${SHOVEL_BEATS[Math.max(0, this.stage)].status} · ${focus.label}`)
    );
    gameHud.setObjective(this.autoBreathing ? "Breathing continues on its own" : focus.thought);
  }

  private breathe(automatic: boolean) {
    if (!this.player || this.time.now - this.lastBreathAt < 820) {
      return;
    }
    this.lastBreathAt = this.time.now;
    if (automatic) {
      this.nextAutoBreathAt = this.time.now + 4200;
    }
    const pace = automatic
      ? { healthy: true, streak: Math.max(1, this.successfulBreaths - 49) }
      : this.breathPacer.register(this.time.now);
    const focus = SURFACE_FOCUSES[this.focusIndex];
    if (pace.healthy) {
      this.successfulBreaths += 1;
      this.applyBreathMilestones();
    }
    gameHud.setStatus(this.getBreathStatus(SHOVEL_BEATS[Math.max(0, this.stage)].status));
    gameHud.setObjective(this.autoBreathing ? "Breathing continues on its own" : focus.thought);
    const ring = this.add
      .ellipse(this.player.x, this.player.y, 19, 7, 0xe1d5c8, 0)
      .setStrokeStyle(1, 0xe1d5c8, 0.62)
      .setDepth(11);
    this.tweens.add({
      targets: ring,
      scale: 3.1,
      alpha: 0,
      duration: 3000,
      ease: "Sine.easeOut",
      onComplete: () => ring.destroy()
    });
    if (pace.healthy) {
      this.rewardSteadyBreath(pace.streak, automatic);
      if (this.successfulBreaths >= 10) {
        this.spawnFireflyString();
      }
    }
  }

  private getBreathStatus(base: string) {
    if (this.autoBreathing) {
      return `${base} · breathing on its own · ${this.successfulBreaths}`;
    }
    const nextMilestone = this.successfulBreaths < 10 ? 10 : this.successfulBreaths < 25 ? 25 : 50;
    return `${base} · steady breaths ${this.successfulBreaths} / ${nextMilestone}`;
  }

  private spawnFireflyString() {
    const serial = this.fireflyStringSerial;
    this.fireflyStringSerial += 1;
    const direction = serial % 2 === 0 ? 1 : -1;
    const baseY = 32 + (serial % 3) * 18;
    const startX = direction > 0 ? -26 : 346;
    const travel = { progress: 0 };
    const fireflies: Phaser.GameObjects.Container[] = [];
    const string = this.add.container(startX, baseY).setDepth(6);

    for (let index = 0; index < 11; index += 1) {
      const warm = (index + serial) % 3 === 0;
      const halo = this.add
        .circle(0, 0, index % 4 === 0 ? 2.6 : 2, warm ? 0xffb55f : 0xffdb82, 0.14)
        .setBlendMode(Phaser.BlendModes.ADD);
      const core = this.add
        .circle(0, 0, index % 5 === 0 ? 1.05 : 0.72, warm ? 0xffc66f : 0xffeaa3, 0.88)
        .setBlendMode(Phaser.BlendModes.ADD);
      const firefly = this.add.container(0, 0, [halo, core]);
      fireflies.push(firefly);
      string.add(firefly);
      this.tweens.add({
        targets: core,
        alpha: { from: 0.42, to: 1 },
        scale: { from: 0.76, to: 1.28 },
        duration: 520 + (index % 4) * 130,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });
    }

    this.tweens.add({
      targets: travel,
      progress: 1,
      duration: 8800 + (serial % 3) * 900,
      ease: "Sine.easeInOut",
      onUpdate: () => {
        const travelPhase = travel.progress * Math.PI * 5;
        string.x = Phaser.Math.Linear(startX, direction > 0 ? 458 : -138, travel.progress);
        fireflies.forEach((firefly, index) => {
          const trailX = direction * -index * 10;
          const waveY = Math.sin(travelPhase + index * 0.58) * 6;
          const orbiting = index % 4 === serial % 4;
          const orbitPhase = travelPhase * 1.55 + index * 0.8;
          const orbitRadius = orbiting
            ? Math.max(0, Math.sin(travel.progress * Math.PI * 6 + index * 0.45)) * 4.5
            : 0;
          firefly.setPosition(
            trailX + Math.cos(orbitPhase) * orbitRadius,
            waveY + Math.sin(orbitPhase) * orbitRadius
          );
        });
      },
      onComplete: () => string.destroy(true)
    });
  }

  private applyBreathMilestones() {
    if (this.successfulBreaths >= 25 && !this.breathGardenUnlocked) {
      this.breathGardenUnlocked = true;
      this.unlockBreathGarden();
    }
    if (this.successfulBreaths >= 50 && !this.autoBreathing) {
      this.autoBreathing = true;
      this.nextAutoBreathAt = this.time.now + 4200;
      this.unlockAutoBreathing();
    }
  }

  private unlockBreathGarden() {
    if (!this.player) {
      return;
    }
    for (let index = 0; index < 22; index += 1) {
      const warm = index % 4 === 0;
      const halo = this.add
        .circle(0, 0, index % 5 === 0 ? 3.2 : 2.3, warm ? 0xffb65e : 0xbde8c7, 0.12)
        .setBlendMode(Phaser.BlendModes.ADD);
      const core = this.add
        .circle(0, 0, index % 6 === 0 ? 1.1 : 0.72, warm ? 0xffe09a : 0xe5ffe8, 0.9)
        .setBlendMode(Phaser.BlendModes.ADD);
      const firefly = this.add
        .container(this.player.x, this.player.y - 5, [halo, core])
        .setAlpha(0)
        .setDepth(6);
      const targetX = 24 + ((index * 53) % 276);
      const targetY = 34 + ((index * 31) % 112);
      this.tweens.add({
        targets: firefly,
        x: targetX,
        y: targetY,
        alpha: 0.74,
        duration: 1500 + (index % 6) * 180,
        delay: index * 65,
        ease: "Sine.easeOut",
        onComplete: () => {
          this.tweens.add({
            targets: firefly,
            x: targetX + Phaser.Math.Between(-7, 7),
            y: targetY + Phaser.Math.Between(-5, 5),
            duration: 1800 + (index % 5) * 330,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
          });
        }
      });
      this.tweens.add({
        targets: core,
        alpha: { from: 0.38, to: 1 },
        scale: { from: 0.72, to: 1.3 },
        duration: 560 + (index % 5) * 150,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });
    }
    this.showStoryBeat(
      "The quiet gathers",
      "Twenty-five steady breaths, and the dark begins to answer with light.",
      { duration: 4200, letterbox: false }
    );
  }

  private unlockAutoBreathing() {
    const ringColors = [0xf7d9a8, 0xbce6cf, 0xd6c5ee];
    ringColors.forEach((color, index) => {
      const ring = this.add
        .ellipse(160, 92, 112 + index * 54, 42 + index * 24, color, 0)
        .setStrokeStyle(1, color, 0.26 - index * 0.045)
        .setDepth(5);
      this.tweens.add({
        targets: ring,
        scaleX: { from: 0.88, to: 1.1 },
        scaleY: { from: 0.82, to: 1.16 },
        alpha: { from: 0.18, to: 0.68 },
        duration: 4200,
        delay: index * 520,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });
    });
    this.tweens.add({
      targets: this.dawnVeil,
      alpha: 0.16,
      duration: 1300,
      yoyo: true,
      ease: "Sine.easeInOut"
    });
    this.spawnFireflyString();
    this.time.delayedCall(850, () => this.spawnFireflyString());
    this.time.delayedCall(1700, () => this.spawnFireflyString());
    gameHud.setObjective("Breathing continues on its own");
    this.showStoryBeat(
      "The breath carries itself",
      "Fifty steady breaths. The body keeps the rhythm now, without being asked.",
      { duration: 5200, letterbox: true }
    );
  }

  private createSkyWonders() {
    if (!this.skyWonderLayer) {
      return;
    }
    const constellationPoints = [
      { x: 44, y: 28 },
      { x: 62, y: 22 },
      { x: 78, y: 31 },
      { x: 95, y: 20 },
      { x: 108, y: 35 }
    ];
    const constellation = this.add.graphics();
    constellation.lineStyle(1, 0xdde7e8, 0.12);
    constellationPoints.slice(1).forEach((point, index) => {
      const previous = constellationPoints[index];
      constellation.lineBetween(previous.x, previous.y, point.x, point.y);
    });
    this.skyWonderLayer.add(constellation);

    const starPoints = [
      ...constellationPoints,
      { x: 25, y: 52 }, { x: 126, y: 43 }, { x: 144, y: 24 }, { x: 171, y: 35 },
      { x: 196, y: 19 }, { x: 218, y: 47 }, { x: 243, y: 28 }, { x: 267, y: 17 },
      { x: 288, y: 42 }, { x: 306, y: 26 }, { x: 153, y: 58 }, { x: 232, y: 61 }
    ];
    starPoints.forEach((point, index) => {
      const star = this.add
        .circle(point.x, point.y, index % 6 === 0 ? 1 : 0.65, 0xe9f0eb, 0.5)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.skyWonderLayer?.add(star);
      this.tweens.add({
        targets: star,
        alpha: { from: 0.18, to: index % 4 === 0 ? 0.86 : 0.58 },
        scale: { from: 0.78, to: 1.28 },
        duration: 1700 + (index % 7) * 330,
        delay: (index % 5) * 210,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });
    });

    this.queueShootingStar(1800);
    this.queueShootingStar(5200);
    this.queueShootingStar(9100);
  }

  private queueShootingStar(delay: number, breathReward = false) {
    this.time.delayedCall(delay, () => {
      if (!this.skyWonderLayer) {
        return;
      }
      const startX = breathReward ? Phaser.Math.Between(34, 118) : Phaser.Math.Between(-18, 236);
      const startY = breathReward ? Phaser.Math.Between(18, 36) : Phaser.Math.Between(8, 58);
      const trail = this.add.graphics();
      trail.lineStyle(breathReward ? 2 : 1, 0xf4e8c8, breathReward ? 0.72 : 0.48);
      trail.lineBetween(-22, -7, 0, 0);
      const head = this.add
        .circle(0, 0, breathReward ? 1.25 : 0.85, 0xfff3d2, 0.9)
        .setBlendMode(Phaser.BlendModes.ADD);
      const star = this.add.container(startX, startY, [trail, head]).setAlpha(0);
      this.skyWonderLayer.add(star);
      const flightDuration = breathReward ? 1050 : Phaser.Math.Between(850, 1250);
      this.tweens.add({
        targets: star,
        x: startX + (breathReward ? 108 : Phaser.Math.Between(72, 124)),
        y: startY + (breathReward ? 34 : Phaser.Math.Between(22, 40)),
        duration: flightDuration,
        ease: "Quad.easeOut",
        onComplete: () => {
          star.destroy(true);
          if (!breathReward) {
            this.queueShootingStar(Phaser.Math.Between(4800, 11800));
          }
        }
      });
      this.tweens.add({
        targets: star,
        alpha: breathReward ? 0.95 : 0.7,
        duration: 150,
        hold: flightDuration - 300,
        yoyo: true,
        ease: "Sine.easeInOut"
      });
    });
  }

  private rewardSteadyBreath(streak: number, automatic: boolean) {
    if (!this.player) {
      return;
    }
    const halo = this.add
      .circle(this.player.x, this.player.y - 4, 5, 0xf1d7ad, 0.18)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(10);
    this.tweens.add({
      targets: halo,
      scale: 5.6,
      alpha: 0,
      duration: 1650,
      ease: "Sine.easeOut",
      onComplete: () => halo.destroy()
    });
    this.queueShootingStar(0, true);
    gameHud.showWhisper(
      automatic
        ? "Breathing continues."
        : streak > 1
          ? `Good breathing pace · ${streak}`
          : "Good breathing pace.",
      2300
    );
  }

  private updatePosture(progress: number) {
    if (!this.player) {
      return;
    }
    const readiness = Phaser.Math.Clamp((progress - 0.42) * 1.72, 0, 1);
    this.player
      .setPosition(Phaser.Math.Linear(142, 154, readiness), Phaser.Math.Linear(143, 132, readiness))
      .setRotation(Phaser.Math.Linear(Math.PI / 2, 0, readiness))
      .setTint(Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(0xc4b8b4),
        Phaser.Display.Color.ValueToColor(0xffffff),
        100,
        Math.round(readiness * 100)
      ).color);
    if (readiness > 0.72) {
      playFirstAvailable(this, this.player, ["player:idle"]);
    }
  }

  private beginChoice() {
    if (this.state !== "contemplating") {
      return;
    }
    this.state = "choosing";
    this.choice = "left";
    this.controls?.setActionLabel("CHOOSE");
    this.sunrise?.setAlpha(1);
    this.dawnVeil?.setAlpha(0);
    gameHud.setProgress(1, "The song is quiet");
    gameHud.setStatus("Sunrise · choose");
    gameHud.setObjective("");
    this.renderChoice();
  }

  private renderChoice() {
    gameHud.showChoice(
      "Where now?",
      "The swing is still moving. The gate is open in first light.",
      "Return to the swing",
      "Leave the playground",
      this.choice
    );
  }

  private updateChoice(left: boolean, right: boolean, action: boolean) {
    const previous = this.choice;
    if (left !== right) {
      this.choice = left ? "left" : "right";
    }
    if (previous !== this.choice) {
      this.renderChoice();
      this.showToast(this.choice === "left" ? "Return" : "Leave", "#e1d0bd", 320);
    }
    if (!action) {
      return;
    }
    if (this.choice === "left") {
      this.returnToSwing();
    } else {
      this.leaveAnxiety = new LeaveAnxiety("by-shovel", "Return to the swing");
      this.leaveAnxiety.begin();
    }
  }

  private updateLeaveAnxiety(left: boolean, right: boolean, action: boolean) {
    const result = this.leaveAnxiety?.update(left, right, action);
    if (!result) {
      return;
    }
    this.leaveAnxiety = undefined;
    if (result === "return") {
      this.returnToSwing();
    } else {
      this.leavePlayground();
    }
  }

  private returnToSwing() {
    if (this.state !== "choosing") {
      return;
    }
    this.state = "returning";
    gameState.endingChoice = "return";
    gameHud.showCinematic(
      "Back, then.",
      "The choice feels like comfort. It also feels like motion.",
      "",
      true
    );
    this.time.delayedCall(3200, () => {
      gameHud.hideCinematic();
      fadeToScene(this, "ReturnSwingScene", 760);
    });
  }

  private leavePlayground() {
    if (!this.player || this.state !== "choosing") {
      return;
    }
    this.state = "leaving";
    gameState.endingChoice = "leave";
    gameHud.hideCinematic();
    this.player.setFlipX(false);
    playFirstAvailable(this, this.player, ["player:walk", "player:swing", "player:idle"]);
    this.tweens.add({
      targets: this.player,
      x: 335,
      duration: 1700,
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.state = "leave-complete";
        void analytics.track("game_completed");
        gameHud.showCinematic(
          "You leave the playground",
          "Nothing says whether it was escape, surrender, or simply enough.",
          "Space · let the evening end",
          true
        );
      }
    });
  }
}

function smoothstep(value: number, start: number, end: number) {
  const t = Phaser.Math.Clamp((value - start) / (end - start), 0, 1);
  return t * t * (3 - 2 * t);
}
import { analytics } from "../analytics";
