import Phaser from "phaser";
import { audioManager } from "../game/audio/AudioManager";
import { fadeToScene } from "../game/fx/fade";
import { StoryControls } from "../game/input/StoryControls";
import { LeaveAnxiety } from "../game/narrative/LeaveAnxiety";
import { gameState } from "../game/state/gameState";
import { gameHud, type ChoiceSide } from "../game/ui/GameHud";
import { playFirstAvailable, updateSwingKickPose } from "../game/visuals/StoryVisuals";
import { BaseScene } from "./BaseScene";
import { getSwingApexAcceleration, SWING_CONSTANTS } from "./constants";

const RETURN_BEATS = [
  { status: "Return · familiar weight", objective: "Lean  ←  →   ·   jump off  Space", title: "Back in the swing", story: "The seat fits. The cycle does not need to introduce itself." },
  { status: "Memory · ghost arcs", objective: "Jump off whenever you choose  Space", title: "The body remembers", story: "Your body remembers the rhythm before your mind can question it." },
  { status: "Resist · ash in the air", objective: "You can always put your feet down  Space", title: "So does the hole", story: "The hole is out of sight, not out of the story." },
  { status: "Transform · warmth again", objective: "Stay with the motion, or step out of it", title: "It can still feel good", story: "Pleasure returns without proving that the cycle is safe." },
  { status: "Commit · your choice", objective: "Jump off whenever you are ready  Space", title: "The cycle waits for you", story: "The swing will keep moving. The next direction is yours." }
] as const;

const RETURN_FIREFLY_ANGLES = [-0.86, -0.6, -0.36, 0.36, 0.6, 0.86] as const;

const RETURN_FIREFLY_AFFIRMATIONS = [
  "I'm enough.",
  "I can rest.",
  "My pace is allowed.",
  "I don't have to earn this.",
  "I can choose again.",
  "I'm still here.",
  "I can stop.",
  "My needs matter.",
  "I can be gentle with myself.",
  "I can trust myself."
] as const;

type ReturnFirefly = {
  container: Phaser.GameObjects.Container;
  angle: number;
};

type ReturnState =
  | "swinging"
  | "jumping-off"
  | "choosing"
  | "selecting-area"
  | "getting-back-on"
  | "leaving";

type ReturnDestination = {
  label: string;
  scene?: string;
  data?: object;
};

const RETURN_DESTINATIONS: readonly ReturnDestination[] = [
  { label: "I · Back in the Swing", scene: "SwingScene" },
  { label: "II · Losing Balance", scene: "SwingScene", data: { startAtBalance: true } },
  { label: "III · Jumping on Coals", scene: "CoalsScene" },
  { label: "IV · Digging In", scene: "DiggingInScene" },
  { label: "V · At the Bottom", scene: "AtBottomScene" },
  { label: "VI · Digging Out", scene: "DiggingOutScene" },
  { label: "VII · By the Shovel", scene: "ByShovelScene" },
  { label: "VIII · Back in the Swing (Again)" }
];

export class ReturnSwingScene extends BaseScene {
  private controls?: StoryControls;
  private player?: Phaser.GameObjects.Sprite;
  private rope?: Phaser.GameObjects.Graphics;
  private seat?: Phaser.GameObjects.Rectangle;
  private releaseHalo?: Phaser.GameObjects.Arc;
  private midday?: Phaser.GameObjects.Image;
  private sunset?: Phaser.GameObjects.Image;
  private night?: Phaser.GameObjects.Image;
  private ghostArcs?: Phaser.GameObjects.Graphics;
  private angle = -0.1;
  private velocity = 0;
  private previousVelocity = 0;
  private highArcs = 0;
  private lastPeakAt = 0;
  private stage = -1;
  private state: ReturnState = "swinging";
  private debugReleaseReady = false;
  private swingKickBlend = 0;
  private choice: ChoiceSide = "left";
  private leaveAnxiety?: LeaveAnxiety;
  private areaIndex = 0;
  private lastAreaMoveAt = -1000;
  private returnFireflies: ReturnFirefly[] = [];
  private returnFirefliesCaught = 0;

  constructor() {
    super("ReturnSwingScene");
  }

  create() {
    console.log("[JOC] scene:return-swing");
    super.create();
    this.state = "swinging";
    this.angle = -0.1;
    this.velocity = 0;
    this.highArcs = 0;
    this.stage = -1;
    this.debugReleaseReady = false;
    this.swingKickBlend = 0;
    this.leaveAnxiety = undefined;
    this.areaIndex = 0;
    this.lastAreaMoveAt = -1000;
    this.returnFireflies = [];
    this.returnFirefliesCaught = 0;
    this.cameras.main.setBackgroundColor("#130e16");
    this.cameras.main.fadeIn(800, 12, 9, 13);
    this.add.image(160, 90, "playground_morning").setDisplaySize(320, 180).setDepth(0);
    this.midday = this.add
      .image(160, 90, "playground_midday")
      .setDisplaySize(320, 180)
      .setAlpha(0)
      .setDepth(1);
    this.sunset = this.add
      .image(160, 90, "playground_sunset")
      .setDisplaySize(320, 180)
      .setAlpha(0)
      .setDepth(2);
    this.night = this.add
      .image(160, 90, "playground_night")
      .setDisplaySize(320, 180)
      .setAlpha(0)
      .setDepth(3);
    this.add.rectangle(160, 90, 320, 180, 0x17131d, 0.05).setDepth(4);
    this.createGhosts();
    this.createSwing();
    this.createReturnFireflies();
    this.createAtmosphere();
    this.controls = new StoryControls(this, "JUMP OFF");

    gameHud.showHud({
      chapter: "VIII · Back in the Swing (Again)",
      objective: RETURN_BEATS[0].objective,
      trackLabel: "Back in the Swing (Again)",
      tone: "dawn",
      status: RETURN_BEATS[0].status
    });
    audioManager.play("08_back_in_the_swing_again");
    this.input.keyboard?.on("keydown-K", () => {
      if (!import.meta.env.DEV || this.state !== "swinging") {
        return;
      }
      this.highArcs = 2;
      this.angle = SWING_CONSTANTS.strongArcAngle;
      this.velocity = 0;
      this.debugReleaseReady = true;
      audioManager.debugCompleteTrack();
      this.updateSwingPosition();
      this.showToast("DEV · release gate ready", "#dec2c9", 520);
    });
    this.time.delayedCall(720, () => this.showToast("The seat fits exactly as before", "#e0c7c9", 900));
  }

  update(_time: number, delta: number) {
    if (this.gameplayPaused || !this.player || !this.controls) {
      return;
    }
    const input = this.controls.read();
    if (this.state === "choosing") {
      if (this.leaveAnxiety) {
        this.updateLeaveAnxiety(input.left, input.right, input.action);
      } else {
        this.updateChoice(input.left, input.right, input.action);
      }
      return;
    }
    if (this.state === "selecting-area") {
      this.updateAreaSelector(input.left, input.right, input.action);
      return;
    }
    if (this.state !== "swinging") {
      return;
    }
    const progress = audioManager.getPlaybackProgress();
    const nextStage = audioManager.getInSilence() ? 4 : Math.min(4, Math.floor(progress * 5));
    this.syncBeat(nextStage, progress);
    if (this.debugReleaseReady) {
      this.angle = SWING_CONSTANTS.strongArcAngle;
      this.velocity = 0;
      this.updateSwingPosition();
    } else {
      this.updateSwing(Math.min(delta / 1000, 0.034), delta, input.left, input.right);
    }
    this.collectReturnFireflies();
    this.swingKickBlend = updateSwingKickPose(
      this.player,
      this.swingKickBlend,
      input.right && !input.left,
      Math.min(delta / 1000, 0.034)
    );
    if (input.action) {
      this.jumpOffSwing();
    }
  }

  protected prepareOutroForDebug() {
    if (this.state !== "swinging") {
      return;
    }
    this.highArcs = 2;
    this.angle = SWING_CONSTANTS.strongArcAngle;
    this.velocity = 0;
    this.debugReleaseReady = true;
    this.updateSwingPosition();
  }

  private createGhosts() {
    this.ghostArcs = this.add.graphics().setDepth(4);
    this.ghostArcs.lineStyle(1, 0xd7b4bd, 0.18);
    this.ghostArcs.beginPath();
    this.ghostArcs.arc(160, 45, 63, Phaser.Math.DegToRad(45), Phaser.Math.DegToRad(135));
    this.ghostArcs.strokePath();
    this.ghostArcs.lineStyle(1, 0xd1a068, 0.11);
    this.ghostArcs.beginPath();
    this.ghostArcs.arc(160, 45, 53, Phaser.Math.DegToRad(38), Phaser.Math.DegToRad(142));
    this.ghostArcs.strokePath();
  }

  private createSwing() {
    this.rope = this.add.graphics().setDepth(8);
    this.seat = this.add
      .rectangle(SWING_CONSTANTS.anchorX, 108, 18, 3, 0x312228, 1)
      .setStrokeStyle(1, 0xb87e66, 0.75)
      .setDepth(8);
    this.releaseHalo = this.add
      .circle(160, 100, 12, 0xf0c886, 0)
      .setStrokeStyle(1, 0xf3d19b, 0.9)
      .setAlpha(0)
      .setDepth(7);
    this.player = this.add.sprite(160, 99, "player").setDepth(10);
    this.swingKickBlend = updateSwingKickPose(this.player, 0, false, 0);
    this.updateSwingPosition();
  }

  private createAtmosphere() {
    for (let index = 0; index < 28; index += 1) {
      const warm = index % 3 === 0;
      const mote = this.add
        .rectangle(
          Phaser.Math.Between(8, 312),
          Phaser.Math.Between(35, 168),
          1,
          1,
          warm ? 0xe9af6f : 0xb8b9ba,
          Phaser.Math.FloatBetween(0.12, 0.46)
        )
        .setDepth(5);
      this.tweens.add({
        targets: mote,
        x: mote.x + Phaser.Math.Between(-18, 18),
        y: mote.y - Phaser.Math.Between(8, 24),
        alpha: 0,
        duration: Phaser.Math.Between(1800, 3800),
        repeat: -1,
        delay: Phaser.Math.Between(0, 2000),
        onRepeat: () => {
          mote.setPosition(Phaser.Math.Between(8, 312), Phaser.Math.Between(80, 174));
          mote.setAlpha(Phaser.Math.FloatBetween(0.12, 0.46));
        }
      });
    }
  }

  private createReturnFireflies() {
    RETURN_FIREFLY_ANGLES.forEach((angle, index) => {
      this.spawnReturnFirefly(angle, index * 90);
    });
  }

  private spawnReturnFirefly(angle?: number, delay = 0) {
    if (this.state !== "swinging") {
      return;
    }
    const candidates = RETURN_FIREFLY_ANGLES.filter((candidate) =>
      Math.abs(candidate - this.angle) > 0.26
      && !this.returnFireflies.some((firefly) => Math.abs(firefly.angle - candidate) < 0.08)
    );
    const chosenAngle = angle ?? Phaser.Math.RND.pick(
      candidates.length ? [...candidates] : [...RETURN_FIREFLY_ANGLES]
    );
    const x = SWING_CONSTANTS.anchorX + Math.sin(chosenAngle) * SWING_CONSTANTS.ropeLength;
    const y = SWING_CONSTANTS.anchorY + Math.cos(chosenAngle) * SWING_CONSTANTS.ropeLength - 7;
    const halo = this.add
      .circle(0, 0, 4.6, 0xffd96a, 0.14)
      .setBlendMode(Phaser.BlendModes.ADD);
    const core = this.add
      .circle(0, 0, 1.15, 0xffffce, 0.94)
      .setBlendMode(Phaser.BlendModes.ADD);
    const wingLeft = this.add
      .ellipse(-2.4, 0, 3.8, 1.5, 0xffefb0, 0.48)
      .setRotation(-0.28)
      .setBlendMode(Phaser.BlendModes.ADD);
    const wingRight = this.add
      .ellipse(2.4, 0, 3.8, 1.5, 0xffefb0, 0.48)
      .setRotation(0.28)
      .setBlendMode(Phaser.BlendModes.ADD);
    const container = this.add
      .container(x, y, [halo, wingLeft, wingRight, core])
      .setAlpha(0)
      .setDepth(9);
    this.returnFireflies.push({ container, angle: chosenAngle });
    this.tweens.add({
      targets: container,
      alpha: { from: 0.35, to: 0.9 },
      y: y - 2.5,
      duration: 560,
      delay,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
    this.tweens.add({
      targets: [wingLeft, wingRight],
      scaleX: { from: 0.5, to: 1.22 },
      alpha: { from: 0.3, to: 0.78 },
      duration: 120,
      delay,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
    this.tweens.add({
      targets: core,
      scale: { from: 0.7, to: 1.35 },
      alpha: { from: 0.48, to: 1 },
      duration: 460,
      delay,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
  }

  private collectReturnFireflies() {
    if (!this.player || this.state !== "swinging") {
      return;
    }
    const caught = this.returnFireflies.find(({ container }) =>
      Phaser.Math.Distance.Between(this.player!.x, this.player!.y, container.x, container.y) <= 13
    );
    if (!caught) {
      return;
    }
    this.returnFireflies = this.returnFireflies.filter((firefly) => firefly !== caught);
    this.returnFirefliesCaught += 1;
    const { container } = caught;
    for (let index = 0; index < 9; index += 1) {
      const spark = this.add
        .circle(container.x, container.y, index % 3 === 0 ? 1.1 : 0.7, 0xffed9c, 0.88)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(11);
      this.tweens.add({
        targets: spark,
        x: spark.x + Phaser.Math.Between(-13, 13),
        y: spark.y + Phaser.Math.Between(-11, 11),
        alpha: 0,
        duration: Phaser.Math.Between(340, 620),
        onComplete: () => spark.destroy()
      });
    }
    gameHud.showWhisper(
      RETURN_FIREFLY_AFFIRMATIONS[
        (this.returnFirefliesCaught - 1) % RETURN_FIREFLY_AFFIRMATIONS.length
      ],
      3000
    );
    this.tweens.killTweensOf(container);
    this.tweens.add({
      targets: container,
      scale: 2,
      alpha: 0,
      duration: 220,
      onComplete: () => container.destroy(true)
    });
    this.time.delayedCall(1100, () => this.spawnReturnFirefly());
  }

  private syncBeat(nextStage: number, progress: number) {
    gameHud.setProgress(
      progress,
      audioManager.getInSilence() ? "The song is quiet" : "Back in the Swing (Again)"
    );
    this.midday?.setAlpha(smoothstep(progress, 0.08, 0.34));
    this.sunset?.setAlpha(smoothstep(progress, 0.34, 0.67));
    this.night?.setAlpha(smoothstep(progress, 0.67, 0.98));
    this.ghostArcs?.setAlpha(Phaser.Math.Linear(0.5, 1, progress));
    const timeOfDay = progress < 0.28 ? "morning" : progress < 0.58 ? "midday" : progress < 0.84 ? "sunset" : "night";
    gameHud.setTone(progress < 0.28 ? "dawn" : progress < 0.84 ? "sunset" : "twilight");
    gameHud.setStatus(
      audioManager.getInSilence()
        ? "Silence · the swing still moves · night"
        : `${RETURN_BEATS[nextStage].status} · ${timeOfDay}`
    );
    if (nextStage === this.stage) {
      if (audioManager.getInSilence()) {
        gameHud.setObjective("Jump off whenever you are ready  Space");
      }
      return;
    }
    this.stage = nextStage;
    const beat = RETURN_BEATS[nextStage];
    gameHud.setObjective(beat.objective);
    if (nextStage === 0) {
      return;
    }
    this.showStoryBeat(
      beat.title,
      beat.story,
      {
        duration: nextStage >= 2 ? 3600 : 2600,
        letterbox: nextStage >= 2,
        pauseGameplay: false
      }
    );
  }

  private updateSwing(dt: number, delta: number, left: boolean, right: boolean) {
    const direction = left === right ? 0 : left ? -1 : 1;
    if (direction !== 0) {
      const motion = Math.sign(this.velocity || direction);
      const torque = motion === direction ? SWING_CONSTANTS.pumpTorque : SWING_CONSTANTS.counterTorque;
      this.velocity += direction * torque * dt;
    }
    if (this.stage >= 2) {
      this.velocity += Math.sin(this.time.now * 0.0016) * (0.15 + this.stage * 0.045) * dt;
    }
    this.velocity += -Math.sin(this.angle) * SWING_CONSTANTS.gravity * dt;
    this.velocity += getSwingApexAcceleration(this.angle, this.velocity) * dt;
    this.velocity *= Math.pow(SWING_CONSTANTS.dampingPerFrame, delta / 16.667);
    this.velocity = Phaser.Math.Clamp(this.velocity, -SWING_CONSTANTS.maxAngularVelocity, SWING_CONSTANTS.maxAngularVelocity);
    this.angle += this.velocity * dt;
    if (
      Math.sign(this.previousVelocity) !== 0 &&
      Math.sign(this.previousVelocity) !== Math.sign(this.velocity) &&
      Math.abs(this.angle) >= SWING_CONSTANTS.strongArcAngle &&
      this.time.now - this.lastPeakAt > 430
    ) {
      this.lastPeakAt = this.time.now;
      this.highArcs = Math.min(2, this.highArcs + 1);
      this.showToast(`Remembered arc ${this.highArcs} / 2`, "#dec2c9", 440);
    }
    this.previousVelocity = this.velocity;
    this.updateSwingPosition();
  }

  private updateSwingPosition() {
    if (!this.player) {
      return;
    }
    const x = SWING_CONSTANTS.anchorX + Math.sin(this.angle) * SWING_CONSTANTS.ropeLength;
    const y = SWING_CONSTANTS.anchorY + Math.cos(this.angle) * SWING_CONSTANTS.ropeLength;
    this.player.setPosition(x, y - 7).setRotation(-this.angle * 0.12);
    this.rope?.clear();
    this.rope?.lineStyle(1, 0x292126, 0.96);
    this.rope?.lineBetween(SWING_CONSTANTS.anchorX - 4, SWING_CONSTANTS.anchorY, x - 7, y);
    this.rope?.lineBetween(SWING_CONSTANTS.anchorX + 4, SWING_CONSTANTS.anchorY, x + 7, y);
    this.seat?.setPosition(x, y).setRotation(-this.angle * 0.08);
    this.releaseHalo?.setPosition(x, y - 7);
    this.releaseHalo?.setAlpha(0);
  }

  private jumpOffSwing() {
    if (!this.player || this.state !== "swinging") {
      return;
    }
    this.state = "jumping-off";
    this.rope?.setAlpha(0.22);
    this.seat?.setAlpha(0.28);
    this.releaseHalo?.setAlpha(0);
    const direction = Math.sign(this.angle) || 1;
    playFirstAvailable(this, this.player, ["player:jump", "player:fall", "player:idle"]);
    this.tweens.add({
      targets: this.player,
      x: Phaser.Math.Clamp(this.player.x + direction * 34, 40, 280),
      y: 143,
      rotation: 0,
      duration: 560,
      ease: "Quad.easeIn",
      onComplete: () => this.beginChoice()
    });
    gameHud.setObjective("Your feet can find the ground");
  }

  private beginChoice() {
    if (this.state !== "jumping-off" || !this.player) {
      return;
    }
    this.state = "choosing";
    this.choice = "left";
    this.controls?.setActionLabel("CHOOSE");
    playFirstAvailable(this, this.player, ["player:idle"]);
    this.renderChoice();
  }

  private renderChoice() {
    gameHud.showChoice(
      "Both feet on the ground",
      "The swing is still moving. The gate is still open.",
      "Get back on",
      "Leave the park",
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
      this.showToast(this.choice === "left" ? "Get back on" : "Leave", "#dec2c9", 320);
    }
    if (!action) {
      return;
    }
    if (this.choice === "right") {
      this.leaveAnxiety = new LeaveAnxiety("return-swing", "Choose another area");
      this.leaveAnxiety.begin();
      return;
    }
    this.getBackOn();
  }

  private updateLeaveAnxiety(left: boolean, right: boolean, action: boolean) {
    const result = this.leaveAnxiety?.update(left, right, action);
    if (!result) {
      return;
    }
    this.leaveAnxiety = undefined;
    if (result === "return") {
      this.beginAreaSelector();
      return;
    }
    this.state = "leaving";
    gameHud.hideCinematic();
    fadeToScene(this, "LeaveParkScene", 560, { moment: "return-swing" });
  }

  private beginAreaSelector() {
    this.state = "selecting-area";
    this.areaIndex = RETURN_DESTINATIONS.length - 1;
    this.lastAreaMoveAt = this.time.now;
    this.controls?.setActionLabel("GO");
    this.renderAreaSelector();
  }

  private renderAreaSelector() {
    gameHud.setStatus("Second thoughts · choose an unfinished place");
    gameHud.showSelector(
      "Where should you go back to?",
      "If leaving feels impossible, every part of the park is waiting for more from you.",
      RETURN_DESTINATIONS.map((destination) => destination.label),
      this.areaIndex
    );
  }

  private updateAreaSelector(left: boolean, right: boolean, action: boolean) {
    if (left !== right && this.time.now - this.lastAreaMoveAt >= 260) {
      this.lastAreaMoveAt = this.time.now;
      const direction = left ? -1 : 1;
      this.areaIndex =
        (this.areaIndex + direction + RETURN_DESTINATIONS.length) % RETURN_DESTINATIONS.length;
      this.renderAreaSelector();
    }
    if (!action) {
      return;
    }
    const destination = RETURN_DESTINATIONS[this.areaIndex];
    if (!destination.scene) {
      this.state = "choosing";
      this.getBackOn();
      return;
    }
    this.state = "leaving";
    gameState.cycleCount += 1;
    gameHud.hideCinematic();
    fadeToScene(this, destination.scene, 620, destination.data);
  }

  private getBackOn() {
    if (!this.player || this.state !== "choosing") {
      return;
    }
    this.state = "getting-back-on";
    gameState.cycleCount += 1;
    gameHud.hideCinematic();
    const x = SWING_CONSTANTS.anchorX + Math.sin(this.angle) * SWING_CONSTANTS.ropeLength;
    const y = SWING_CONSTANTS.anchorY + Math.cos(this.angle) * SWING_CONSTANTS.ropeLength - 7;
    this.tweens.add({
      targets: this.player,
      x,
      y,
      rotation: -this.angle * 0.12,
      duration: 520,
      ease: "Sine.easeInOut",
      onComplete: () => {
        if (!this.player) {
          return;
        }
        this.state = "swinging";
        this.rope?.setAlpha(1);
        this.seat?.setAlpha(1);
        this.controls?.setActionLabel("JUMP OFF");
        this.swingKickBlend = updateSwingKickPose(this.player, this.swingKickBlend, false, 0);
        this.showToast("The seat takes your weight again", "#dec2c9", 620);
      }
    });
  }
}

function smoothstep(value: number, start: number, end: number) {
  const t = Phaser.Math.Clamp((value - start) / (end - start), 0, 1);
  return t * t * (3 - 2 * t);
}
