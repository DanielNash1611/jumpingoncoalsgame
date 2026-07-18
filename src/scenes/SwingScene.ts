import Phaser from "phaser";
import { audioManager } from "../game/audio/AudioManager";
import { fadeToScene } from "../game/fx/fade";
import { TouchControls } from "../game/input/TouchControls";
import { LeaveAnxiety } from "../game/narrative/LeaveAnxiety";
import { gameState } from "../game/state/gameState";
import { gameHud, type ChoiceSide } from "../game/ui/GameHud";
import { updateSwingKickPose } from "../game/visuals/StoryVisuals";
import { BaseScene } from "./BaseScene";
import { BALANCE_CONSTANTS, getSwingApexAcceleration, SWING_CONSTANTS } from "./constants";

type Phase =
  | "swing"
  | "launching"
  | "after-swing-choice"
  | "balance"
  | "balance-fall"
  | "balance-fall-choice"
  | "balance-complete";

const SWING_BEATS = [
  { status: "Learn · warm air", objective: "Lean with the swing  ←  →", title: "Find the rhythm", story: "For a moment, effort and joy are the same motion." },
  { status: "Reach · fireflies", objective: "Space · catch the light at each apex", title: "Something answers", story: "The first light answers because you reached for it." },
  { status: "Resist · crosswind", objective: "Keep the arc through the gusts", title: "The air begins to push", story: "The rhythm that lifted you begins to demand more." },
  { status: "Transform · twilight", objective: "Reach while the playground changes", title: "Evening lets go", story: "The playground stays the same. You are the thing being carried away." },
  { status: "Commit · last light", objective: "Hold the highest arc and wait for quiet", title: "One song remains", story: "Momentum keeps asking for one more arc—even after joy has left it." }
] as const;

const BALANCE_BEATS = [
  {
    status: "Learn · read the leaves",
    objective: "Lean against the wind  ←  →  · Space to set your step",
    title: "Read, set, step",
    story: "The beam is narrow. The first voice you hear is your own doubt."
  },
  {
    status: "Reach · follow the lamp",
    objective: "Watch the leaves and lamp · lean against them · Space",
    title: "The air leaves clues",
    story: "Doubt speaks first. The wind still tells the truth."
  },
  {
    status: "Resist · low leaves tell true",
    objective: "Ignore the high ash · follow the leaves near the beam",
    title: "Not every motion tells the truth",
    story: "Every false signal sounds certain when you are afraid to fall."
  },
  {
    status: "Transform · hold your choice",
    objective: "Read the low wind · set one stance · hold through the gust",
    title: "The beam keeps what you choose",
    story: "The beam narrows beneath every second guess."
  },
  {
    status: "Commit · watch the gate lamp",
    objective: "The leaves are gone · read the lamp · take the final steps",
    title: "Only one light still moves",
    story: "The way forward is real. So is the voice insisting you cannot take it."
  }
] as const;

const BALANCE_DOUBTS = [
  ["What if you read it wrong?", "Too soon?", "Was that the right way?"],
  ["You should be steadier by now.", "Everyone else would be across.", "Don't make this look difficult."],
  ["You're overthinking it.", "That clue meant nothing.", "You always hesitate here."],
  ["One bad step ruins the rest.", "You cannot trust your own read.", "Turn back before you fall."],
  ["You are going to miss it.", "The last step is where you fail.", "You do not belong on this beam."]
] as const;

type BalanceDirection = -1 | 0 | 1;

type GatheredLightPoint = {
  x: number;
  y: number;
  z: number;
};

const LIGHTS_PER_ORBIT = 6;
const LIGHT_ORBIT_REVEAL_MS = 900;
const LIGHT_ORBIT_SEGMENTS = 30;
const LIGHT_ORBIT_COLORS = [0xffd982, 0xffefb0, 0xf2ad65, 0xffd18a] as const;
const FIREFLY_AFFIRMATIONS = [
  "Nice catch.",
  "Good timing.",
  "Keep it up.",
  "That's the rhythm.",
  "Well done.",
  "You're getting the hang of it.",
  "Good work.",
  "Another clean reach.",
  "Stay with it.",
  "Keep up the good work.",
  "That was solid.",
  "You're building momentum.",
  "One more.",
  "Good read.",
  "You made that look easy.",
  "Right on time."
] as const;

export class SwingScene extends BaseScene {
  private startAtBalance = false;
  private phase: Phase = "swing";
  private player?: Phaser.Physics.Arcade.Sprite;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys?: { left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key };
  private touch?: TouchControls;
  private twilight?: Phaser.GameObjects.Image;
  private rope?: Phaser.GameObjects.Graphics;
  private seat?: Phaser.GameObjects.Rectangle;
  private releaseHalo?: Phaser.GameObjects.Arc;
  private reachLight?: Phaser.GameObjects.Arc;
  private reachSide = 1;
  private gatheredLights: Phaser.GameObjects.Arc[] = [];
  private gatheredLightTraceBack?: Phaser.GameObjects.Graphics;
  private gatheredLightTraceFront?: Phaser.GameObjects.Graphics;
  private gatheredLightOrbitAddedAt = 0;
  private windLines: Phaser.GameObjects.Rectangle[] = [];
  private arcPips: Phaser.GameObjects.Arc[] = [];
  private balanceWind?: Phaser.GameObjects.Graphics;
  private balanceAsh?: Phaser.GameObjects.Graphics;
  private balanceFooting?: Phaser.GameObjects.Ellipse;
  private balanceLampGlow?: Phaser.GameObjects.Arc;
  private balanceSupports: Phaser.GameObjects.Arc[] = [];
  private swingAngle = -0.12;
  private angularVelocity = 0;
  private previousVelocity = 0;
  private strongArcs = 0;
  private lastPeakAt = 0;
  private reachCount = 0;
  private swingStage = -1;
  private balanceStage = -1;
  private balanceSteps = 0;
  private balanceStumbles = 0;
  private balanceStance: BalanceDirection = 0;
  private balanceGustDirection: Exclude<BalanceDirection, 0> = 1;
  private balanceCommittedStance: BalanceDirection = 0;
  private balanceCueStartedAt = 0;
  private balanceCueLandsAt = 0;
  private balanceCueReadableAt = 0;
  private balanceCueActive = false;
  private balanceStepCommitted = false;
  private balanceResolving = false;
  private balanceChallengeCount = 0;
  private lastBalanceDoubtAt = -1000;
  private landingHandled = false;
  private isTransitioning = false;
  private actionQueued = false;
  private tapDirection = 0;
  private tapUntil = 0;
  private debugSwingReleaseReady = false;
  private swingKickBlend = 0;
  private choice: ChoiceSide = "left";
  private leaveAnxiety?: LeaveAnxiety;

  constructor() {
    super("SwingScene");
  }

  init(data?: { startAtBalance?: boolean }) {
    this.startAtBalance = data?.startAtBalance === true;
  }

  create() {
    console.log("[JOC] scene:swing");
    super.create();
    this.phase = "swing";
    this.strongArcs = 0;
    this.lastPeakAt = 0;
    this.reachCount = 0;
    this.swingStage = -1;
    this.balanceStage = -1;
    this.balanceSteps = 0;
    this.balanceStumbles = 0;
    this.balanceStance = 0;
    this.balanceCueActive = false;
    this.balanceStepCommitted = false;
    this.balanceResolving = false;
    this.balanceChallengeCount = 0;
    this.lastBalanceDoubtAt = -1000;
    this.landingHandled = false;
    this.isTransitioning = false;
    this.debugSwingReleaseReady = false;
    this.swingKickBlend = 0;
    this.leaveAnxiety = undefined;
    this.gatheredLights = [];
    this.gatheredLightOrbitAddedAt = 0;
    this.windLines = [];
    this.arcPips = [];
    this.balanceSupports = [];
    this.cameras.main.setBackgroundColor("#1a0f17");
    this.cameras.main.fadeIn(420, 14, 8, 12);

    this.add.image(160, 90, "playground_sunset").setDisplaySize(320, 180).setDepth(0);
    this.twilight = this.add
      .image(160, 90, "playground_twilight")
      .setDisplaySize(320, 180)
      .setDepth(1)
      .setAlpha(0);
    this.add.rectangle(160, 4, 320, 8, 0x0b0810, 0.46).setDepth(3);
    this.add.rectangle(160, 176, 320, 8, 0x0b0810, 0.5).setDepth(3);

    this.createAtmosphere();
    this.createPlayerAndSwing();
    this.createInput();
    this.createSwingPips();
    gameHud.showHud({
      chapter: "I · Back in the Swing",
      objective: SWING_BEATS[0].objective,
      trackLabel: "Back in the Swing",
      tone: "sunset",
      status: SWING_BEATS[0].status
    });

    this.input.keyboard?.on("keydown-B", () => this.enterBalance());
    this.input.keyboard?.on("keydown-L", () => {
      if (this.phase === "balance") {
        audioManager.debugCompleteTrack();
      }
    });
    if (import.meta.env.DEV) {
      const addDebugGatheredLight = () => {
        if (this.phase === "swing") {
          this.addGatheredLight();
        }
      };
      this.input.keyboard?.on("keydown-G", addDebugGatheredLight);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        this.input.keyboard?.off("keydown-G", addDebugGatheredLight);
      });
    }

    if (this.startAtBalance) {
      this.twilight.setAlpha(1);
      this.time.delayedCall(260, () => this.enterBalance());
    } else {
      audioManager.play("01_back_in_the_swing");
      this.time.delayedCall(700, () => this.showToast("Pump with the swing  ←  →"));
    }
  }

  update(_time: number, delta: number) {
    if (this.gameplayPaused || !this.player || !this.cursors) {
      return;
    }

    const dt = Math.min(delta / 1000, 0.034);
    const tappedDirection = this.time.now <= this.tapUntil ? this.tapDirection : 0;
    const left = Boolean(
      this.cursors.left.isDown || this.keys?.left.isDown || this.touch?.left || tappedDirection < 0
    );
    const right = Boolean(
      this.cursors.right.isDown || this.keys?.right.isDown || this.touch?.right || tappedDirection > 0
    );
    const action = this.consumeAction();

    if (this.phase === "swing") {
      this.syncSwingToTrack();
      if (this.debugSwingReleaseReady) {
        this.swingAngle = SWING_CONSTANTS.strongArcAngle;
        this.angularVelocity = 0;
        this.updateSwingPosition();
        this.updateReleaseCue();
      } else {
        this.updateSwing(dt, delta, left, right);
      }
      this.swingKickBlend = updateSwingKickPose(
        this.player,
        this.swingKickBlend,
        right && !left,
        dt
      );
      if (action) {
        if (audioManager.getInSilence()) {
          this.tryRelease();
        } else {
          this.reachForLight();
        }
      }
      return;
    }

    if (this.phase === "balance") {
      this.syncBalanceToTrack();
      this.updateBalance(left, right, action);
      return;
    }

    if (this.phase === "after-swing-choice" || this.phase === "balance-fall-choice") {
      if (this.leaveAnxiety) {
        this.updateLeaveAnxiety(left, right, action);
      } else {
        this.updateLeaveChoice(left, right, action);
      }
      return;
    }

    if (this.phase === "balance-complete" && action) {
      this.transitionToCoals();
    }
  }

  protected prepareOutroForDebug() {
    if (this.phase === "swing") {
      this.strongArcs = SWING_CONSTANTS.arcsToRelease;
      this.swingAngle = SWING_CONSTANTS.strongArcAngle;
      this.angularVelocity = 0;
      this.previousVelocity = 0;
      this.debugSwingReleaseReady = true;
      this.updateSwingPosition();
      this.updateReleaseCue();
      return;
    }
    if (this.phase === "balance") {
      this.balanceSteps = this.getTotalBalanceSteps() - 1;
      this.balanceStumbles = 0;
      this.balanceStance = 0;
      this.balanceCueActive = false;
      this.balanceStepCommitted = false;
      this.balanceResolving = false;
      this.player?.setPosition(this.getBalanceX(), BALANCE_CONSTANTS.beamY - 10);
    }
  }

  private createPlayerAndSwing() {
    this.rope = this.add.graphics().setDepth(8);
    this.seat = this.add
      .rectangle(SWING_CONSTANTS.anchorX, 108, 18, 3, 0x39252a, 1)
      .setStrokeStyle(1, 0xc7865e, 0.8)
      .setDepth(8);
    this.releaseHalo = this.add
      .circle(160, 100, 12, 0xffc46e, 0)
      .setStrokeStyle(1, 0xffd27b, 0.9)
      .setDepth(7)
      .setAlpha(0);
    this.reachLight = this.add
      .circle(216, 72, 4, 0xffdf83, 0.86)
      .setStrokeStyle(1, 0xfff2bd, 1)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(9)
      .setVisible(false);
    this.tweens.add({
      targets: this.reachLight,
      scale: { from: 0.8, to: 1.45 },
      alpha: { from: 0.55, to: 1 },
      duration: 760,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });

    this.gatheredLightTraceBack = this.add
      .graphics()
      .setBlendMode(Phaser.BlendModes.NORMAL)
      .setDepth(9);
    this.gatheredLightTraceFront = this.add
      .graphics()
      .setBlendMode(Phaser.BlendModes.NORMAL)
      .setDepth(11);

    this.player = this.physics.add.sprite(160, 106, "player").setDepth(10);
    this.swingKickBlend = updateSwingKickPose(this.player, 0, false, 0);
    this.player.setCollideWorldBounds(true);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setSize(12, 22).setOffset(10, 2);
    body.setAllowGravity(false);

    const ground = this.add.rectangle(160, 153, 340, 14, 0x000000, 0);
    this.physics.add.existing(ground, true);
    this.physics.add.collider(this.player, ground, () => this.handleLaunchLanding());
    this.updateSwingPosition();
  }

  private createInput() {
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.keys = this.input.keyboard
      ? {
          left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
          right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
        }
      : undefined;
    const queueAction = () => {
      this.actionQueued = true;
    };
    this.input.keyboard?.on("keydown-SPACE", queueAction);
    this.input.keyboard?.on("keydown-UP", queueAction);
    this.input.keyboard?.on("keydown-W", queueAction);
    const queueDirection = (direction: number) => {
      this.tapDirection = direction;
      this.tapUntil = this.time.now + 145;
    };
    this.input.keyboard?.on("keydown-LEFT", () => queueDirection(-1));
    this.input.keyboard?.on("keydown-A", () => queueDirection(-1));
    this.input.keyboard?.on("keydown-RIGHT", () => queueDirection(1));
    this.input.keyboard?.on("keydown-D", () => queueDirection(1));
    this.touch = new TouchControls(this, "REACH");
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.touch?.destroy());
  }

  private createSwingPips() {
    for (let index = 0; index < SWING_CONSTANTS.arcsToRelease; index += 1) {
      this.arcPips.push(
        this.add
          .circle(290 + index * 9, 30, 2.5, 0x2c1b24, 0.85)
          .setStrokeStyle(1, 0xffc87c, 0.76)
          .setScrollFactor(0)
          .setDepth(1800)
      );
    }
  }

  private createAtmosphere() {
    for (let index = 0; index < 18; index += 1) {
      const mote = this.add
        .circle(
          Phaser.Math.Between(14, 306),
          Phaser.Math.Between(48, 150),
          Phaser.Math.RND.pick([0.5, 0.7, 1]),
          Phaser.Math.RND.pick([0xffc86d, 0xffe4a8, 0xd98956]),
          Phaser.Math.FloatBetween(0.2, 0.55)
        )
        .setDepth(4);
      this.tweens.add({
        targets: mote,
        x: mote.x + Phaser.Math.Between(-18, 20),
        y: mote.y - Phaser.Math.Between(8, 20),
        alpha: { from: 0.15, to: 0.68 },
        duration: Phaser.Math.Between(2500, 5200),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 1600)
      });
    }
    for (let index = 0; index < 12; index += 1) {
      const line = this.add
        .rectangle(-20, 45 + index * 9, 16 + (index % 3) * 8, 1, 0xe7c7c4, 0)
        .setDepth(5);
      this.windLines.push(line);
    }
  }

  private syncSwingToTrack() {
    const progress = audioManager.getPlaybackProgress();
    gameHud.setProgress(progress, audioManager.getInSilence() ? "The song is quiet" : "Back in the Swing");
    this.twilight?.setAlpha(Phaser.Math.Clamp((progress - 0.28) * 1.05, 0, 0.82));
    const stage = audioManager.getInSilence() ? 4 : Math.min(4, Math.floor(progress * 5));
    if (stage !== this.swingStage) {
      this.swingStage = stage;
      const beat = SWING_BEATS[stage];
      gameHud.setStatus(beat.status);
      gameHud.setObjective(beat.objective);
      gameHud.setTone(stage >= 3 ? "twilight" : "sunset");
      this.reachLight?.setVisible(stage >= 1);
      this.presentBeat(beat.title, beat.story, stage);
    }
    if (audioManager.getInSilence()) {
      gameHud.setStatus("Silence · your choice");
      gameHud.setObjective(
        this.strongArcs >= SWING_CONSTANTS.arcsToRelease
          ? "Space at the glowing apex to release"
          : "Build three high arcs, then release"
      );
    }
    this.updateWindLines(progress, stage);
  }

  private presentBeat(title: string, body: string, stage: number) {
    if (stage === 0) {
      return;
    }
    this.showStoryBeat(title, body, {
      duration: stage >= 3 ? 3600 : 2600,
      letterbox: stage >= 3,
      pauseGameplay: false
    });
    this.tweens.add({
      targets: this.cameras.main,
      zoom: 1 + stage * 0.012,
      duration: 1350,
      ease: "Sine.easeInOut"
    });
  }

  private updateWindLines(progress: number, stage: number) {
    const windAlpha = stage < 2 ? 0 : 0.12 + stage * 0.07;
    for (let index = 0; index < this.windLines.length; index += 1) {
      const line = this.windLines[index];
      const speed = 0.045 + index * 0.001 + progress * 0.04;
      line.x = ((this.time.now * speed + index * 43) % 380) - 30;
      line.setAlpha(windAlpha * (0.55 + (index % 4) * 0.12));
    }
  }

  private updateSwing(dt: number, delta: number, left: boolean, right: boolean) {
    const direction = left === right ? 0 : left ? -1 : 1;
    if (direction !== 0) {
      const movingDirection = Math.sign(this.angularVelocity || direction);
      const torque = movingDirection === direction
        ? SWING_CONSTANTS.pumpTorque
        : SWING_CONSTANTS.counterTorque;
      this.angularVelocity += direction * torque * dt;
    }
    if (this.swingStage >= 2) {
      const gustStrength = 0.22 + (this.swingStage - 2) * 0.1;
      this.angularVelocity += Math.sin(this.time.now * 0.0017 + 0.8) * gustStrength * dt;
    }

    this.angularVelocity += -Math.sin(this.swingAngle) * SWING_CONSTANTS.gravity * dt;
    this.angularVelocity += getSwingApexAcceleration(this.swingAngle, this.angularVelocity) * dt;
    this.angularVelocity *= Math.pow(SWING_CONSTANTS.dampingPerFrame, delta / 16.667);
    this.angularVelocity = Phaser.Math.Clamp(
      this.angularVelocity,
      -SWING_CONSTANTS.maxAngularVelocity,
      SWING_CONSTANTS.maxAngularVelocity
    );
    const beforeStep = this.angularVelocity;
    this.swingAngle += this.angularVelocity * dt;

    if (
      Math.sign(this.previousVelocity) !== 0 &&
      Math.sign(this.previousVelocity) !== Math.sign(this.angularVelocity) &&
      Math.abs(this.swingAngle) >= SWING_CONSTANTS.strongArcAngle
    ) {
      this.registerStrongArc();
    } else if (
      Math.sign(beforeStep) !== Math.sign(this.angularVelocity) &&
      Math.abs(this.swingAngle) >= SWING_CONSTANTS.strongArcAngle
    ) {
      this.registerStrongArc();
    }
    this.previousVelocity = this.angularVelocity;
    this.updateSwingPosition();
    this.updateReleaseCue();
  }

  private updateSwingPosition() {
    if (!this.player) {
      return;
    }
    const x = SWING_CONSTANTS.anchorX + Math.sin(this.swingAngle) * SWING_CONSTANTS.ropeLength;
    const y = SWING_CONSTANTS.anchorY + Math.cos(this.swingAngle) * SWING_CONSTANTS.ropeLength;
    this.player.setPosition(x, y - 7).setRotation(-this.swingAngle * 0.12);
    (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);

    this.rope?.clear();
    this.rope?.lineStyle(1, 0x2a2024, 0.96);
    this.rope?.lineBetween(SWING_CONSTANTS.anchorX - 4, SWING_CONSTANTS.anchorY, x - 7, y);
    this.rope?.lineBetween(SWING_CONSTANTS.anchorX + 4, SWING_CONSTANTS.anchorY, x + 7, y);
    this.rope?.lineStyle(1, 0xd19969, 0.34);
    this.rope?.lineBetween(SWING_CONSTANTS.anchorX - 3, SWING_CONSTANTS.anchorY, x - 6, y);
    this.seat?.setPosition(x, y).setRotation(-this.swingAngle * 0.08);
    this.releaseHalo?.setPosition(x, y - 7);

    this.updateGatheredLightPattern(x, y - 7);
  }

  private updateGatheredLightPattern(centerX: number, centerY: number) {
    const count = this.gatheredLights.length;
    this.gatheredLightTraceBack?.clear();
    this.gatheredLightTraceFront?.clear();
    if (count === 0) {
      return;
    }

    const points = this.getGatheredLightPoints(count);
    const densityFade = 1 - Phaser.Math.Clamp((count - 30) / 90, 0, 0.24);

    this.gatheredLights.forEach((light, index) => {
      const point = points[index];
      const depth = Phaser.Math.Clamp((point.z + 1) * 0.5, 0, 1);
      const shimmer = Math.sin(this.time.now * 0.0045 + index * 1.7) * 0.06;
      light
        .setPosition(centerX + point.x, centerY + point.y)
        .setScale(0.72 + depth * 0.42 + shimmer)
        .setAlpha((0.5 + depth * 0.43) * densityFade)
        .setDepth(point.z < 0 ? 9.2 : 11.2);
    });

    this.drawGatheredLightOrbits(count, centerX, centerY);
  }

  private getGatheredLightPoints(count: number) {
    const orbitCount = Math.ceil(count / LIGHTS_PER_ORBIT);
    const newestOrbitReveal = this.getNewestOrbitReveal();

    return Array.from({ length: count }, (_, index) => {
      const orbitIndex = Math.floor(index / LIGHTS_PER_ORBIT);
      const orbitStart = orbitIndex * LIGHTS_PER_ORBIT;
      const lightsInOrbit = Math.min(LIGHTS_PER_ORBIT, count - orbitStart);
      const lightIndex = index - orbitStart;
      const angle = this.getOrbitRotation(orbitIndex)
        + (lightIndex / Math.max(1, lightsInOrbit)) * Math.PI * 2;
      const reveal = orbitIndex === orbitCount - 1 ? newestOrbitReveal : 1;
      return this.getOrbitPoint(orbitIndex, angle, reveal);
    });
  }

  private getNewestOrbitReveal() {
    if (this.gatheredLightOrbitAddedAt === 0) {
      return 1;
    }
    return Phaser.Math.Easing.Sine.Out(
      Phaser.Math.Clamp(
        (this.time.now - this.gatheredLightOrbitAddedAt) / LIGHT_ORBIT_REVEAL_MS,
        0,
        1
      )
    );
  }

  private getOrbitRotation(orbitIndex: number) {
    const pairIndex = Math.ceil(orbitIndex / 2);
    const direction = orbitIndex % 2 === 0 ? 1 : -1;
    const speed = 0.0014 / (1 + pairIndex * 0.14);
    const windLag = this.getGatheredLightWindLean() * 0.035 * (1 + orbitIndex * 0.24);
    return this.time.now * speed * direction + orbitIndex * Math.PI * 0.37 + windLag;
  }

  private getOrbitPoint(orbitIndex: number, angle: number, reveal = 1): GatheredLightPoint {
    const pairIndex = Math.ceil(orbitIndex / 2);
    const mirroredSide = orbitIndex % 2 === 1 ? -1 : 1;
    const radius = orbitIndex === 0 ? 12 : 14 + pairIndex * 3;
    const precession = this.time.now * 0.00022;
    const windLean = this.getGatheredLightWindLean();
    const pitch = (orbitIndex === 0
      ? 1.04
      : pairIndex === 1
        ? 0.76 + Math.sin(precession + orbitIndex * 1.7) * 0.06
        : 0.6 + Math.sin(precession + orbitIndex * 1.7) * 0.05)
      + windLean * (0.012 + orbitIndex * 0.004);
    const yaw = (orbitIndex === 0
      ? 0
      : mirroredSide * (
          (pairIndex === 1 ? 0.38 : 0.26)
          + Math.sin(precession * 0.7 + orbitIndex) * 0.04
        ))
      + windLean * (0.018 + orbitIndex * 0.006);
    const roll = (orbitIndex === 0
      ? 0
      : mirroredSide * (pairIndex === 1 ? 0.76 : 1.18))
      + windLean * (0.025 + orbitIndex * 0.008);
    const point = this.rotateLightPoint(
      { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, z: 0 },
      pitch,
      yaw,
      roll
    );
    const offsetX = (orbitIndex === 0 ? 0 : mirroredSide * pairIndex * 1.15)
      + windLean * (0.65 + orbitIndex * 0.34);
    const offsetY = (orbitIndex === 0 ? 0 : -pairIndex * 1.2)
      + Math.abs(windLean) * orbitIndex * 0.08;
    return {
      x: (point.x + offsetX) * reveal,
      y: (point.y + offsetY) * reveal,
      z: point.z
    };
  }

  private getGatheredLightWindLean() {
    if (this.swingStage < 2) {
      return 0;
    }
    const stageStrength = 0.62 + (this.swingStage - 2) * 0.12;
    return Math.sin(this.time.now * 0.0017 + 0.8) * stageStrength;
  }

  private rotateLightPoint(
    point: GatheredLightPoint,
    pitch: number,
    yaw: number,
    roll: number
  ): GatheredLightPoint {
    let x = point.x;
    let y = point.y;
    let z = point.z * 10;

    const cosPitch = Math.cos(pitch);
    const sinPitch = Math.sin(pitch);
    const pitchedY = y * cosPitch - z * sinPitch;
    const pitchedZ = y * sinPitch + z * cosPitch;
    y = pitchedY;
    z = pitchedZ;

    const cosYaw = Math.cos(yaw);
    const sinYaw = Math.sin(yaw);
    const yawedX = x * cosYaw + z * sinYaw;
    const yawedZ = -x * sinYaw + z * cosYaw;
    x = yawedX;
    z = yawedZ;

    const cosRoll = Math.cos(roll);
    const sinRoll = Math.sin(roll);
    const rolledX = x * cosRoll - y * sinRoll;
    const rolledY = x * sinRoll + y * cosRoll;
    const perspective = Phaser.Math.Clamp(1 + z * 0.012, 0.8, 1.2);

    return {
      x: rolledX * perspective,
      y: rolledY * perspective,
      z: Phaser.Math.Clamp(z / 20, -1, 1)
    };
  }

  private drawGatheredLightOrbits(
    count: number,
    centerX: number,
    centerY: number
  ) {
    if (!this.gatheredLightTraceBack || !this.gatheredLightTraceFront) {
      return;
    }
    const orbitCount = Math.ceil(count / LIGHTS_PER_ORBIT);
    const newestOrbitReveal = this.getNewestOrbitReveal();
    const densityFade = 1 - Phaser.Math.Clamp((count - 30) / 90, 0, 0.3);

    for (let orbitIndex = 0; orbitIndex < orbitCount; orbitIndex += 1) {
      const reveal = orbitIndex === orbitCount - 1 ? newestOrbitReveal : 1;
      const alpha = (0.18 - Math.min(orbitIndex, 5) * 0.015) * reveal * densityFade;
      const color = LIGHT_ORBIT_COLORS[orbitIndex % LIGHT_ORBIT_COLORS.length];
      for (let segment = 0; segment < LIGHT_ORBIT_SEGMENTS; segment += 1) {
        const angle = (segment / LIGHT_ORBIT_SEGMENTS) * Math.PI * 2;
        const nextAngle = ((segment + 1) / LIGHT_ORBIT_SEGMENTS) * Math.PI * 2;
        const point = this.getOrbitPoint(orbitIndex, angle, reveal);
        const next = this.getOrbitPoint(orbitIndex, nextAngle, reveal);
        const trace = (point.z + next.z) * 0.5 < 0
          ? this.gatheredLightTraceBack
          : this.gatheredLightTraceFront;
        trace.lineStyle(1, color, alpha * (point.z < 0 ? 0.5 : 1));
        trace.lineBetween(
          centerX + point.x,
          centerY + point.y,
          centerX + next.x,
          centerY + next.y
        );
      }
    }
  }

  private updateReleaseCue() {
    const ready = this.strongArcs >= SWING_CONSTANTS.arcsToRelease && audioManager.getInSilence();
    const inWindow = Math.abs(this.swingAngle) >= SWING_CONSTANTS.strongArcAngle * 0.88;
    const visible = ready && inWindow;
    this.releaseHalo?.setAlpha(visible ? 0.95 : 0);
    if (visible && this.releaseHalo) {
      this.releaseHalo.setScale(1 + Math.sin(this.time.now * 0.012) * 0.12);
    }
  }

  private registerStrongArc() {
    if (this.time.now - this.lastPeakAt < 420) {
      return;
    }
    this.lastPeakAt = this.time.now;
    if (this.strongArcs < SWING_CONSTANTS.arcsToRelease) {
      this.strongArcs += 1;
      const pip = this.arcPips[this.strongArcs - 1];
      pip?.setFillStyle(0xffbd63, 1);
      this.tweens.add({ targets: pip, scale: 1.8, duration: 120, yoyo: true });
      this.cameras.main.shake(70, 0.0012);
      this.showToast(`Momentum ${this.strongArcs} / ${SWING_CONSTANTS.arcsToRelease}`, "#ffd27f", 520);
    }
  }

  private reachForLight() {
    if (!this.player || this.swingStage < 1 || !this.reachLight?.visible) {
      this.showToast("First, find the rhythm", "#ffd3a1", 620);
      return;
    }
    const distance = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.reachLight.x,
      this.reachLight.y
    );
    if (distance > 25) {
      this.showToast("Reach at the glowing apex", "#ffd3a1", 560);
      return;
    }

    this.addGatheredLight();
    this.spawnReachBurst(this.reachLight.x, this.reachLight.y);
    this.reachSide *= -1;
    this.reachLight.setPosition(160 + this.reachSide * 56, Phaser.Math.Between(68, 77));
  }

  private addGatheredLight() {
    if (!this.player) {
      return;
    }
    this.reachCount += 1;
    if ((this.reachCount - 1) % LIGHTS_PER_ORBIT === 0) {
      this.gatheredLightOrbitAddedAt = this.time.now;
    }
    const gathered = this.add
      .circle(this.player.x, this.player.y, 1.35, 0xffe38c, 0.95)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(11);
    this.gatheredLights.push(gathered);
    this.showToast(`Light gathered · ${this.reachCount}`, "#ffe39a", 420);
    gameHud.showWhisper(
      FIREFLY_AFFIRMATIONS[(this.reachCount - 1) % FIREFLY_AFFIRMATIONS.length],
      2500
    );
  }

  private spawnReachBurst(x: number, y: number) {
    for (let index = 0; index < 9; index += 1) {
      const speck = this.add.circle(x, y, 0.8, 0xffeaaa, 0.9).setDepth(12);
      this.tweens.add({
        targets: speck,
        x: x + Phaser.Math.Between(-14, 14),
        y: y + Phaser.Math.Between(-12, 12),
        alpha: 0,
        duration: Phaser.Math.Between(260, 480),
        onComplete: () => speck.destroy()
      });
    }
  }

  private tryRelease() {
    const ready = this.strongArcs >= SWING_CONSTANTS.arcsToRelease;
    const inWindow = Math.abs(this.swingAngle) >= SWING_CONSTANTS.strongArcAngle * 0.82;
    if (!ready) {
      this.showToast("Build three high arcs first", "#ffd3a1", 620);
      return;
    }
    if (!inWindow) {
      this.showToast("Wait for the glowing apex", "#ffd3a1", 620);
      return;
    }
    this.launchFromSwing();
  }

  private launchFromSwing() {
    if (!this.player || this.phase !== "swing") {
      return;
    }
    this.phase = "launching";
    const direction = Math.sign(this.swingAngle) || 1;
    (this.player.body as Phaser.Physics.Arcade.Body).setAllowGravity(true);
    this.player.setVelocity(direction * (94 + Math.abs(this.swingAngle) * 54), -168);
    this.player.setRotation(0);
    this.rope?.setAlpha(0.3);
    this.seat?.setAlpha(0.35);
    this.releaseHalo?.setAlpha(0);
    this.reachLight?.setVisible(false);
    gameHud.setObjective("Let the ground find you");
    gameHud.setLetterbox(true);
    this.cameras.main.shake(130, 0.003);
    this.playFirstAvailable(["player:jump", "player:idle"]);
  }

  private handleLaunchLanding() {
    if (this.phase !== "launching" || this.landingHandled || !this.player) {
      return;
    }
    this.landingHandled = true;
    this.player.setVelocity(0, 0);
    this.playFirstAvailable(["player:success", "player:idle"]);
    this.cameras.main.shake(110, 0.004);
    this.time.delayedCall(520, () => this.offerChoiceAfterSwing());
  }

  private offerChoiceAfterSwing() {
    if (this.phase !== "launching") {
      return;
    }
    this.phase = "after-swing-choice";
    this.choice = "left";
    this.touch?.setActionLabel("CHOOSE");
    gameHud.setObjective("");
    this.renderLeaveChoice();
  }

  private enterBalance() {
    if (!this.player || this.phase === "balance") {
      return;
    }
    this.phase = "balance";
    this.balanceSteps = 0;
    this.balanceStumbles = 0;
    this.balanceStance = 0;
    this.balanceCueActive = false;
    this.balanceStepCommitted = false;
    this.balanceResolving = false;
    this.balanceChallengeCount = 0;
    (this.player.body as Phaser.Physics.Arcade.Body).enable = false;
    this.player.setPosition(BALANCE_CONSTANTS.startX, BALANCE_CONSTANTS.beamY - 10).setAlpha(1);
    this.rope?.setVisible(false);
    this.seat?.setVisible(false);
    this.releaseHalo?.setVisible(false);
    this.reachLight?.setVisible(false);
    this.gatheredLights.forEach((light) => light.setVisible(false));
    this.gatheredLightTraceBack?.clear();
    this.gatheredLightTraceFront?.clear();
    this.arcPips.forEach((pip) => pip.setVisible(false));
    for (let index = 0; index <= BALANCE_CONSTANTS.stages; index += 1) {
      const x = Phaser.Math.Linear(
        BALANCE_CONSTANTS.startX,
        BALANCE_CONSTANTS.endX,
        index / BALANCE_CONSTANTS.stages
      );
      const support = this.add
        .circle(x, BALANCE_CONSTANTS.beamY - 1, index === 0 ? 2 : 1.5, 0x5b3948, 0.78)
        .setStrokeStyle(1, 0xf0b0c1, index === 0 ? 0.9 : 0.42)
        .setDepth(8);
      this.balanceSupports.push(support);
    }
    this.balanceWind = this.add.graphics().setDepth(6);
    this.balanceAsh = this.add.graphics().setDepth(5);
    this.createBalanceEmbers();
    this.balanceFooting = this.add
      .ellipse(BALANCE_CONSTANTS.startX, BALANCE_CONSTANTS.beamY - 1, 5, 1, 0xf2c5d7, 0.12)
      .setDepth(9);
    this.balanceLampGlow = this.add
      .circle(260, 96, 8, 0xffd28a, 0.11)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(4);
    this.twilight?.setAlpha(1);
    this.cameras.main.setZoom(1).setRotation(0).setScroll(0, 0);
    gameHud.showHud({
      chapter: "II · Losing Balance",
      objective: BALANCE_BEATS[0].objective,
      trackLabel: "Losing Balance",
      tone: "twilight",
      status: BALANCE_BEATS[0].status
    });
    this.touch?.setActionLabel("STEP");
    audioManager.play("02_losing_balance");
    this.showToast("Read the leaves · lean against them · Space");
    this.time.delayedCall(520, () => this.beginBalanceCue());
  }

  private createBalanceEmbers() {
    for (let index = 0; index < 22; index += 1) {
      const halo = this.add
        .circle(0, 0, index % 4 === 0 ? 2.4 : 1.7, 0xff7a32, 0.12)
        .setBlendMode(Phaser.BlendModes.ADD);
      const core = this.add
        .circle(
          0,
          0,
          index % 5 === 0 ? 1.05 : 0.7,
          index % 3 === 0 ? 0xffd078 : 0xff8b3d,
          0.78
        )
        .setBlendMode(Phaser.BlendModes.ADD);
      const ember = this.add
        .container(
          Phaser.Math.Between(8, 312),
          Phaser.Math.Between(124, 184),
          [halo, core]
        )
        .setDepth(5)
        .setAlpha(Phaser.Math.FloatBetween(0.35, 0.9));
      this.tweens.add({
        targets: ember,
        x: ember.x + Phaser.Math.Between(-28, 28),
        y: Phaser.Math.Between(28, 106),
        alpha: 0,
        rotation: Phaser.Math.FloatBetween(-0.4, 0.4),
        duration: Phaser.Math.Between(3000, 6200),
        delay: Phaser.Math.Between(0, 3200),
        repeat: -1,
        ease: "Sine.easeInOut",
        onRepeat: () => {
          ember.setPosition(Phaser.Math.Between(8, 312), Phaser.Math.Between(144, 184));
          ember.setAlpha(Phaser.Math.FloatBetween(0.38, 0.88));
        }
      });
    }
  }

  private syncBalanceToTrack() {
    const progress = audioManager.getPlaybackProgress();
    gameHud.setProgress(progress, audioManager.getInSilence() ? "The song is quiet" : "Losing Balance");
    const stage = audioManager.getInSilence() ? 4 : Math.min(4, Math.floor(progress * 5));
    if (stage !== this.balanceStage) {
      const changingStage = this.balanceStage >= 0;
      if (changingStage && this.balanceCueActive && !this.balanceResolving) {
        this.balanceCueActive = false;
        this.balanceStepCommitted = false;
        this.balanceCommittedStance = 0;
        this.balanceStance = 0;
        this.balanceWind?.clear();
        this.balanceAsh?.clear();
      }
      this.balanceStage = stage;
      const beat = BALANCE_BEATS[stage];
      gameHud.setStatus(beat.status);
      gameHud.setObjective(beat.objective);
      this.presentBeat(beat.title, beat.story, stage);
      this.updateBalanceSupports();
      if (!this.balanceCueActive && !this.balanceResolving && !this.isAtBalanceStageLimit()) {
        const cueDelay = stage === 0 ? 420 : stage >= 3 ? 3900 : 2900;
        this.time.delayedCall(cueDelay, () => this.beginBalanceCue());
      }
    }
    if (audioManager.getInSilence() && this.balanceSteps >= this.getTotalBalanceSteps()) {
      this.completeBalance();
    }
  }

  private updateBalance(left: boolean, right: boolean, action: boolean) {
    if (!this.player) {
      return;
    }
    const stage = Math.max(0, this.balanceStage);
    const direction: BalanceDirection = left === right ? 0 : left ? -1 : 1;
    if (!this.balanceStepCommitted && !this.balanceResolving && direction !== 0) {
      this.balanceStance = direction;
    }
    if (action) {
      this.commitBalanceStep();
    }

    const cueProgress = this.balanceCueActive
      ? Phaser.Math.Clamp(
          (this.time.now - this.balanceCueStartedAt) /
            Math.max(1, this.balanceCueLandsAt - this.balanceCueStartedAt),
          0,
          1
        )
      : 0;
    this.drawBalanceWind(cueProgress, stage);
    this.updateBalancePose(cueProgress);

    if (this.balanceCueActive && this.time.now >= this.balanceCueLandsAt) {
      this.resolveBalanceCue();
    }
  }

  private drawBalanceWind(cueProgress: number, stage: number) {
    this.balanceWind?.clear();
    this.balanceAsh?.clear();
    if (!this.balanceWind || !this.balanceAsh || !this.balanceCueActive) {
      return;
    }
    const direction = this.balanceGustDirection;
    const gathering = Phaser.Math.Easing.Sine.InOut(cueProgress);
    const lowAlpha = (0.25 + stage * 0.04) * (0.55 + gathering * 0.7);
    const travel = ((this.time.now * (0.018 + stage * 0.002)) % 64) * direction;
    this.balanceWind.lineStyle(1, 0xe9c7d6, lowAlpha);
    for (let index = 0; index < (stage === 4 ? 0 : 6); index += 1) {
      const y = 112 + (index % 3) * 6;
      const origin = direction > 0 ? -34 + index * 52 : 354 - index * 52;
      const x = Phaser.Math.Wrap(origin + travel, -36, 356);
      this.balanceWind.lineBetween(x, y, x + direction * (13 + stage * 3), y - 1);
      this.balanceWind.fillStyle(0xd9a5b8, lowAlpha * 1.45);
      this.balanceWind.fillEllipse(x + direction * 4, y - 1, 4 + (index % 2), 2);
    }

    if (stage >= 2 && stage < 4) {
      const falseDirection = direction * -1;
      this.balanceAsh.lineStyle(1, 0x8f8297, 0.08 + stage * 0.025);
      for (let index = 0; index < 5; index += 1) {
        const y = 55 + index * 9;
        const x = Phaser.Math.Wrap(
          (falseDirection > 0 ? -20 : 340) + falseDirection * ((this.time.now * 0.012 + index * 41) % 360),
          -24,
          344
        );
        this.balanceAsh.lineBetween(x, y, x + falseDirection * 8, y - 2);
      }
    }

    const lampLean = direction * (stage === 4 ? 4.2 : 2.4) * (0.6 + gathering * 0.4);
    this.balanceLampGlow
      ?.setX(260 + lampLean * 0.45)
      .setScale(1 + gathering * 0.18, 1 - gathering * 0.08)
      .setAlpha(stage === 4 ? 0.2 + gathering * 0.12 : 0.1 + gathering * 0.08);
    if (stage === 4) {
      this.balanceWind.lineStyle(1, 0xffd28a, 0.34 + gathering * 0.2);
      this.balanceWind.lineBetween(
        260,
        96,
        260 + direction * (5 + gathering * 5),
        96 - gathering * 1.5
      );
    }
  }

  private getTotalBalanceSteps() {
    return BALANCE_CONSTANTS.stages * BALANCE_CONSTANTS.stepsPerStage;
  }

  private getBalanceX() {
    return Phaser.Math.Linear(
      BALANCE_CONSTANTS.startX,
      BALANCE_CONSTANTS.endX,
      this.balanceSteps / this.getTotalBalanceSteps()
    );
  }

  private getUnlockedBalanceSteps() {
    if (audioManager.getInSilence()) {
      return this.getTotalBalanceSteps();
    }
    return Math.min(
      this.getTotalBalanceSteps(),
      (Math.max(0, this.balanceStage) + 1) * BALANCE_CONSTANTS.stepsPerStage
    );
  }

  private isAtBalanceStageLimit() {
    return this.balanceSteps >= this.getUnlockedBalanceSteps();
  }

  private beginBalanceCue() {
    if (
      this.phase !== "balance" ||
      this.balanceCueActive ||
      this.balanceResolving ||
      this.balanceSteps >= this.getTotalBalanceSteps()
    ) {
      if (
        this.phase === "balance" &&
        this.balanceSteps >= this.getTotalBalanceSteps() &&
        audioManager.getInSilence()
      ) {
        this.completeBalance();
      }
      return;
    }
    if (this.isAtBalanceStageLimit()) {
      gameHud.setStatus("Support found · listen for the next change");
      gameHud.setObjective("Hold here · the next air has not arrived yet");
      return;
    }

    const pattern: Array<Exclude<BalanceDirection, 0>> = [-1, 1, 1, -1, 1, -1, -1, 1];
    const stage = Math.max(0, this.balanceStage);
    this.balanceGustDirection = pattern[(this.balanceChallengeCount + stage * 2) % pattern.length];
    this.balanceChallengeCount += 1;
    if (stage >= 1 && this.balanceChallengeCount % 2 === 0) {
      this.spawnBalanceDoubt(stage);
    }
    this.balanceCueStartedAt = this.time.now;
    this.balanceCueLandsAt = this.time.now + BALANCE_CONSTANTS.cueLeadMs[stage];
    this.balanceCueReadableAt = this.time.now + BALANCE_CONSTANTS.cueReadableMs[stage];
    this.balanceCueActive = true;
    this.balanceStepCommitted = false;
    this.balanceCommittedStance = 0;
    this.balanceStance = 0;
    this.playFirstAvailable(["player:idle"]);

    if (stage === 0) {
      const windName = this.balanceGustDirection > 0 ? "right" : "left";
      const leanName = this.balanceGustDirection > 0 ? "left" : "right";
      gameHud.setStatus(`Wind moves ${windName} · lean ${leanName}`);
    } else {
      gameHud.setStatus(BALANCE_BEATS[stage].status);
    }
  }

  private commitBalanceStep() {
    if (
      this.phase !== "balance" ||
      !this.balanceCueActive ||
      this.balanceResolving ||
      this.balanceStepCommitted
    ) {
      return;
    }
    if (this.time.now < this.balanceCueReadableAt) {
      this.showToast("Let the wind show itself", "#f1c7d7", 480);
      return;
    }
    if (this.balanceStance === 0) {
      this.showToast("Choose a lean first  ←  →", "#f1c7d7", 560);
      return;
    }

    this.balanceStepCommitted = true;
    this.balanceCommittedStance = this.balanceStance;
    const stanceName = this.balanceCommittedStance < 0 ? "left" : "right";
    gameHud.setStatus(`Set ${stanceName} · hold through the gust`);
    this.balanceFooting?.setFillStyle(0xf6d7e2, 0.2).setScale(1.14, 1.24);
    this.tweens.add({
      targets: this.balanceFooting,
      scaleX: 1,
      scaleY: 1,
      duration: 320,
      ease: "Sine.easeOut"
    });
  }

  private updateBalancePose(cueProgress: number) {
    if (!this.player || this.balanceResolving) {
      return;
    }
    const stance = this.balanceStepCommitted ? this.balanceCommittedStance : this.balanceStance;
    const windPush = this.balanceCueActive
      ? this.balanceGustDirection * Phaser.Math.Easing.Quadratic.In(cueProgress) * 0.07
      : 0;
    this.player.setRotation(stance * 0.14 + windPush);
    this.balanceFooting
      ?.setPosition(this.player.x + stance * 3, BALANCE_CONSTANTS.beamY - 1)
      .setAlpha(stance === 0 ? 0.16 : 0.3);
    this.cameras.main.setRotation(windPush * 0.045);
    this.cameras.main.setScroll(
      0,
      Math.sin(this.time.now * 0.006) * cueProgress * (1 + this.balanceStumbles * 0.45)
    );
  }

  private resolveBalanceCue() {
    if (!this.balanceCueActive || this.balanceResolving || this.phase !== "balance") {
      return;
    }
    this.balanceCueActive = false;
    this.balanceResolving = true;
    this.balanceWind?.clear();
    this.balanceAsh?.clear();
    const correctStance = this.balanceGustDirection * -1;
    if (this.balanceStepCommitted && this.balanceCommittedStance === correctStance) {
      this.secureBalanceStep();
      return;
    }
    this.stumbleBalance(this.balanceStepCommitted ? "The wind caught your stance" : "The gust arrived first");
  }

  private secureBalanceStep() {
    if (!this.player) {
      return;
    }
    this.balanceSteps = Math.min(this.getTotalBalanceSteps(), this.balanceSteps + 1);
    const reachedSupport = this.balanceSteps % BALANCE_CONSTANTS.stepsPerStage === 0;
    if (reachedSupport) {
      this.balanceStumbles = 0;
    }
    this.playFirstAvailable(["player:walk", "player:success", "player:idle"]);
    this.cameras.main.shake(65, 0.0015);
    const destinationX = this.getBalanceX();
    this.tweens.add({
      targets: this.player,
      x: destinationX,
      y: BALANCE_CONSTANTS.beamY - 11,
      rotation: 0,
      duration: 340,
      ease: "Sine.easeInOut",
      onUpdate: () => {
        this.balanceFooting?.setX(this.player?.x ?? destinationX);
      },
      onComplete: () => {
        if (!this.player || this.phase !== "balance") {
          return;
        }
        this.player.setPosition(destinationX, BALANCE_CONSTANTS.beamY - 10).setRotation(0);
        this.balanceFooting?.setPosition(destinationX, BALANCE_CONSTANTS.beamY - 1);
        this.balanceResolving = false;
        this.balanceStance = 0;
        this.balanceCommittedStance = 0;
        this.updateBalanceSupports();

        if (reachedSupport) {
          this.showToast("Support found", "#f5cfde", 620);
        } else {
          this.showToast("Secure step", "#f5cfde", 330);
        }
        if (this.balanceSteps >= this.getTotalBalanceSteps()) {
          if (audioManager.getInSilence()) {
            this.completeBalance();
          } else {
            gameHud.setStatus("At the gate · stay with the song");
            gameHud.setObjective("Hold here until the playground goes quiet");
          }
          return;
        }
        this.time.delayedCall(480, () => this.beginBalanceCue());
      }
    });
  }

  private stumbleBalance(message: string) {
    if (!this.player) {
      return;
    }
    this.balanceStumbles += 1;
    this.spawnBalanceDoubt(Math.max(0, this.balanceStage), true);
    this.playFirstAvailable(["player:fall", "player:idle"]);
    this.cameras.main.shake(155, 0.0055);
    if (this.balanceStumbles >= BALANCE_CONSTANTS.stumblesToFall) {
      this.showToast("Your footing gives way", "#f1c7d7", 430);
      this.failBalance();
      return;
    }

    const startX = this.player.x;
    const pushedX = startX + this.balanceGustDirection * (3 + this.balanceStumbles);
    this.tweens.add({
      targets: this.player,
      x: pushedX,
      y: BALANCE_CONSTANTS.beamY - 6,
      rotation: this.balanceGustDirection * 0.42,
      duration: 180,
      yoyo: true,
      ease: "Quad.easeOut",
      onComplete: () => {
        if (!this.player || this.phase !== "balance") {
          return;
        }
        this.player.setPosition(startX, BALANCE_CONSTANTS.beamY - 10).setRotation(0);
        this.balanceResolving = false;
        this.balanceStance = 0;
        this.balanceCommittedStance = 0;
        this.showToast(
          `${message} · footing ${this.balanceStumbles}/${BALANCE_CONSTANTS.stumblesToFall}`,
          "#f1c7d7",
          720
        );
        this.time.delayedCall(620, () => this.beginBalanceCue());
      }
    });
  }

  private spawnBalanceDoubt(stage: number, force = false) {
    if (!this.player || stage < 0 || (!force && this.time.now - this.lastBalanceDoubtAt < 1800)) {
      return;
    }
    this.lastBalanceDoubtAt = this.time.now;
    const doubts = BALANCE_DOUBTS[Math.min(BALANCE_DOUBTS.length - 1, stage)];
    const message = doubts[(this.balanceChallengeCount + this.balanceStumbles) % doubts.length];
    const side = (this.balanceChallengeCount + this.balanceStumbles) % 2 === 0 ? -1 : 1;
    const doubt = this.add
      .text(
        Phaser.Math.Clamp(this.player.x + side * Phaser.Math.Between(28, 48), 70, 250),
        Phaser.Math.Clamp(this.player.y - Phaser.Math.Between(20, 38), 38, 108),
        message,
        {
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: "8px",
          fontStyle: "italic",
          color: "#ffe7ef",
          backgroundColor: "rgba(22, 13, 21, 0.82)",
          padding: { left: 4, right: 4, top: 3, bottom: 3 },
          wordWrap: { width: 118, useAdvancedWrap: true },
          align: "center",
          stroke: "#160d15",
          strokeThickness: 2
        }
      )
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(9)
      .setRotation(Phaser.Math.FloatBetween(-0.035, 0.035));
    this.tweens.add({
      targets: doubt,
      alpha: 0.86,
      y: doubt.y - 4,
      duration: 280,
      ease: "Sine.easeOut",
      onComplete: () => {
        this.tweens.add({
          targets: doubt,
          alpha: 0,
          y: doubt.y - 9,
          duration: 1050,
          delay: 1250,
          ease: "Sine.easeIn",
          onComplete: () => doubt.destroy()
        });
      }
    });
  }

  private failBalance() {
    if (!this.player || this.phase !== "balance") {
      return;
    }
    this.phase = "balance-fall";
    this.balanceCueActive = false;
    this.balanceResolving = true;
    gameState.balanceFalls += 1;
    const checkpointSteps =
      Math.floor(this.balanceSteps / BALANCE_CONSTANTS.stepsPerStage) *
      BALANCE_CONSTANTS.stepsPerStage;
    this.balanceSteps = checkpointSteps;
    this.balanceStumbles = 0;
    this.balanceWind?.clear();
    this.balanceAsh?.clear();
    this.cameras.main.shake(180, 0.007);
    this.tweens.add({
      targets: this.player,
      y: 164,
      alpha: 0,
      rotation: this.balanceGustDirection > 0 ? 0.9 : -0.9,
      duration: 360,
      ease: "Quad.easeIn",
      onComplete: () => {
        if (!this.player) {
          return;
        }
        const x = this.getBalanceX();
        this.player.setPosition(x, 148).setRotation(0).setAlpha(1);
        this.cameras.main.setRotation(0).setScroll(0, 0);
        this.balanceStance = 0;
        this.balanceCommittedStance = 0;
        this.balanceStepCommitted = false;
        this.balanceResolving = false;
        this.phase = "balance-fall-choice";
        this.choice = "left";
        this.touch?.setActionLabel("CHOOSE");
        gameHud.setObjective("");
        this.renderLeaveChoice();
      }
    });
  }

  private renderLeaveChoice() {
    if (this.phase === "after-swing-choice") {
      gameHud.showChoice(
        "Your feet touch the ground",
        "The beam waits ahead. The park gate is open behind you.",
        "Walk to the beam",
        "Leave the park",
        this.choice
      );
      return;
    }
    gameHud.showChoice(
      "Your footing gives way",
      "The last support is close. So is the ground, and the way out.",
      "Climb back up",
      "Leave the park",
      this.choice
    );
  }

  private updateLeaveChoice(left: boolean, right: boolean, action: boolean) {
    const previous = this.choice;
    if (left !== right) {
      this.choice = left ? "left" : "right";
    }
    if (previous !== this.choice) {
      this.renderLeaveChoice();
      this.showToast(this.choice === "left" ? "Keep going" : "Leave", "#f1c7d7", 320);
    }
    if (!action || this.isTransitioning) {
      return;
    }
    if (this.choice === "right") {
      this.beginLeaveAnxiety();
      return;
    }
    this.continueFromLeaveChoice();
  }

  private beginLeaveAnxiety() {
    const afterSwing = this.phase === "after-swing-choice";
    this.leaveAnxiety = new LeaveAnxiety(
      afterSwing ? "after-swing" : "lost-balance",
      afterSwing ? "Walk to the beam" : "Climb back up"
    );
    this.leaveAnxiety.begin();
  }

  private updateLeaveAnxiety(left: boolean, right: boolean, action: boolean) {
    const result = this.leaveAnxiety?.update(left, right, action);
    if (!result) {
      return;
    }
    this.leaveAnxiety = undefined;
    if (result === "return") {
      this.continueFromLeaveChoice();
      return;
    }
    this.isTransitioning = true;
    gameHud.hideCinematic();
    const moment = this.phase === "after-swing-choice" ? "after-swing" : "lost-balance";
    fadeToScene(this, "LeaveParkScene", 520, { moment });
  }

  private continueFromLeaveChoice() {
    gameHud.hideCinematic();
    if (this.phase === "after-swing-choice") {
      this.enterBalance();
      return;
    }
    this.resumeAfterBalanceFall();
  }

  private resumeAfterBalanceFall() {
    if (!this.player || this.phase !== "balance-fall-choice") {
      return;
    }
    const x = this.getBalanceX();
    this.player.setPosition(x, BALANCE_CONSTANTS.beamY - 10).setRotation(0).setAlpha(1);
    this.balanceFooting?.setPosition(x, BALANCE_CONSTANTS.beamY - 1);
    this.phase = "balance";
    this.touch?.setActionLabel("STEP");
    this.updateBalanceSupports();
    this.showToast("Back to the last support · the song kept moving", "#f1c7d7", 780);
    this.time.delayedCall(680, () => this.beginBalanceCue());
  }

  private updateBalanceSupports() {
    this.balanceSupports.forEach((support, index) => {
      const checkpointSteps = index * BALANCE_CONSTANTS.stepsPerStage;
      const reached = this.balanceSteps >= checkpointSteps;
      const unlocked = checkpointSteps <= this.getUnlockedBalanceSteps();
      support
        .setFillStyle(reached ? 0xc78ba4 : unlocked ? 0x6e4354 : 0x382633, reached ? 0.7 : 0.72)
        .setStrokeStyle(1, reached ? 0xf0b0c1 : 0xc08099, reached ? 0.76 : unlocked ? 0.52 : 0.22)
        .setScale(reached ? 1.1 : 1);
    });
  }

  private completeBalance() {
    if (!this.player || this.phase !== "balance") {
      return;
    }
    this.phase = "balance-complete";
    this.balanceCueActive = false;
    this.balanceResolving = false;
    this.player.setPosition(BALANCE_CONSTANTS.endX, BALANCE_CONSTANTS.beamY - 10).setRotation(0);
    this.balanceFooting?.setPosition(BALANCE_CONSTANTS.endX, BALANCE_CONSTANTS.beamY - 1);
    this.balanceWind?.clear();
    this.balanceAsh?.clear();
    this.cameras.main.setRotation(0).setScroll(0, 0);
    gameHud.setProgress(1, "The song is quiet");
    gameHud.setObjective("Space · step through the open gate");
    gameHud.showCinematic(
      "The gate is open",
      gameState.balanceFalls === 0
        ? "You read the night without falling. Heat breathes on the other side."
        : `${gameState.balanceFalls} recoveries. The song moved on, but the beam did not cross itself.`,
      "Space to step through",
      true
    );
  }

  private transitionToCoals() {
    if (this.isTransitioning) {
      return;
    }
    this.isTransitioning = true;
    gameHud.hideCinematic();
    fadeToScene(this, "CoalsScene", 480);
  }

  private consumeAction() {
    const queued = this.actionQueued;
    this.actionQueued = false;
    return queued || Boolean(this.touch?.consumeAction());
  }

  private playFirstAvailable(animationKeys: string[]) {
    if (!this.player) {
      return;
    }
    for (const key of animationKeys) {
      if (this.anims.exists(key)) {
        if (this.player.anims.currentAnim?.key !== key) {
          this.player.anims.play(key, true);
        }
        return;
      }
    }
  }
}
