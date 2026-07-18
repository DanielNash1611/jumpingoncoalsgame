import Phaser from "phaser";
import { audioManager } from "../game/audio/AudioManager";
import { fadeToScene } from "../game/fx/fade";
import { TouchControls } from "../game/input/TouchControls";
import { LeaveAnxiety } from "../game/narrative/LeaveAnxiety";
import { gameState } from "../game/state/gameState";
import { gameHud, type ChoiceSide } from "../game/ui/GameHud";
import { createShovel } from "../game/visuals/StoryVisuals";
import { BaseScene } from "./BaseScene";
import { COALS_CONSTANTS, PLAYER_CONSTANTS } from "./constants";

type SurfaceKind = "coal" | "safe";
type Surface = {
  object: Phaser.GameObjects.TileSprite;
  kind: SurfaceKind;
  checkpoint?: boolean;
};

type Spark = { object: Phaser.GameObjects.Image; collected: boolean };
type RunState = "running" | "burn-choice" | "at-hole" | "leaving";

const COAL_BEATS = [
  { status: "Learn · heat", objective: "Move  ← →   ·   jump  Space", title: "The first hot step", story: "The ground punishes stillness. Forward becomes the only cool direction." },
  { status: "Reach · cool stone", objective: "Chain cool landings to build Flow", title: "A path appears", story: "Relief appears in fragments, never where you want it." },
  { status: "Resist · ember rain", objective: "Air cools you. Keep moving.", title: "The coals remember fire", story: "The fire behind you has learned the pace of the song." },
  { status: "Transform · hollow earth", objective: "Rest briefly. The ground is changing.", title: "Something opens below", story: "You can feel the ground becoming the next thing you will have to survive." },
  { status: "Commit · the hollow", objective: "Follow the sound beneath the heat", title: "The playground runs out", story: "The path ends where the deeper work begins." }
] as const;

const COAL_END_SAFE_START = COALS_CONSTANTS.holeX - 238;

const CHASE_FIREFLY_AFFIRMATIONS = [
  "Good catch.",
  "You stayed with it.",
  "That was sharp.",
  "You can handle this.",
  "Nice work.",
  "You found the opening."
] as const;

export class CoalsScene extends BaseScene {
  private player?: Phaser.Physics.Arcade.Sprite;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys?: { left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key };
  private touch?: TouchControls;
  private surfaces: Surface[] = [];
  private sparks: Spark[] = [];
  private gate?: Phaser.GameObjects.Rectangle;
  private gateLight?: Phaser.GameObjects.Rectangle;
  private heatFill?: Phaser.GameObjects.Rectangle;
  private heatGlow?: Phaser.GameObjects.Rectangle;
  private stageVeil?: Phaser.GameObjects.Rectangle;
  private pursuitFire?: Phaser.GameObjects.Graphics;
  private pursuitGlow?: Phaser.GameObjects.Rectangle;
  private pursuitScreenGlow?: Phaser.GameObjects.Rectangle;
  private chaseFirefly?: Phaser.GameObjects.Container;
  private ashParticles: Phaser.GameObjects.Rectangle[] = [];
  private heat = 0;
  private flow = 0;
  private checkpointX = 48;
  private checkpointY = 136;
  private lastGroundedAt = 0;
  private jumpQueuedAt = -1000;
  private wasGrounded = false;
  private lastLandingSurface?: Phaser.GameObjects.TileSprite;
  private respawning = false;
  private gateOpened = false;
  private runState: RunState = "running";
  private coalStage = -1;
  private actionQueued = false;
  private tapDirection = 0;
  private tapUntil = 0;
  private choice: ChoiceSide = "left";
  private leaveAnxiety?: LeaveAnxiety;
  private fireFrontX = -420;
  private fireSetback = 0;
  private fireWarningShown = false;
  private chaseFireflySerial = 0;
  private chaseFirefliesCaught = 0;

  constructor() {
    super("CoalsScene");
  }

  create() {
    console.log("[JOC] scene:coals");
    super.create();
    this.surfaces = [];
    this.sparks = [];
    this.ashParticles = [];
    this.heat = 0;
    this.flow = 0;
    this.checkpointX = 48;
    this.checkpointY = 136;
    this.respawning = false;
    this.gateOpened = false;
    this.runState = "running";
    this.coalStage = -1;
    this.leaveAnxiety = undefined;
    this.fireFrontX = -420;
    this.fireSetback = 0;
    this.fireWarningShown = false;
    this.chaseFirefly = undefined;
    this.chaseFireflySerial = 0;
    this.chaseFirefliesCaught = 0;
    this.cameras.main.setBackgroundColor("#130a10");
    this.cameras.main.fadeIn(460, 12, 6, 9);
    this.physics.world.setBounds(0, 0, COALS_CONSTANTS.worldWidth, 380);
    this.cameras.main.setBounds(0, 0, COALS_CONSTANTS.worldWidth, 380);

    this.add
      .image(160, 90, "playground_coals")
      .setDisplaySize(320, 180)
      .setScrollFactor(0)
      .setDepth(0);
    this.add.rectangle(160, 90, 320, 180, 0x15080d, 0.14).setScrollFactor(0).setDepth(1);
    this.stageVeil = this.add
      .rectangle(160, 90, 320, 180, 0x160f1d, 0)
      .setScrollFactor(0)
      .setDepth(2);

    this.ensureTextures();
    this.createRoute();
    this.createHole();
    this.createSparks();
    this.createPlayer();
    this.createAtmosphere();
    this.createPursuingFire();
    this.spawnChaseFirefly(false);
    this.createHud();
    this.createInput();

    this.input.keyboard?.on("keydown-G", () => this.collectAllMemories());
    this.input.keyboard?.on("keydown-E", () => {
      if (!import.meta.env.DEV || !this.player) {
        return;
      }
      audioManager.debugCompleteTrack();
      this.openGate();
      this.arriveAtHole();
    });
    audioManager.play("03_jumping_on_coals");
    this.time.delayedCall(650, () => this.showToast("Air cools you"));
  }

  update(_time: number, delta: number) {
    if (this.gameplayPaused || !this.player || !this.cursors || this.respawning) {
      return;
    }

    const action = this.consumeAction();
    const tappedDirection = this.time.now <= this.tapUntil ? this.tapDirection : 0;
    const left = Boolean(
      this.cursors.left.isDown || this.keys?.left.isDown || this.touch?.left || tappedDirection < 0
    );
    const right = Boolean(
      this.cursors.right.isDown || this.keys?.right.isDown || this.touch?.right || tappedDirection > 0
    );
    if (this.runState === "burn-choice" || this.runState === "at-hole") {
      if (this.leaveAnxiety) {
        this.updateLeaveAnxiety(left, right, action);
      } else {
        this.updateLeaveChoice(left, right, action);
      }
      return;
    }
    if (this.runState === "leaving") {
      return;
    }

    this.syncToTrack();
    const dt = Math.min(delta / 1000, 0.034);
    this.updatePursuingFire(dt);
    this.updateChaseFirefly(dt);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const grounded = body.blocked.down || body.touching.down;
    const surface = this.getCurrentSurface(grounded);

    if (grounded) {
      this.lastGroundedAt = this.time.now;
    }
    if (action) {
      this.jumpQueuedAt = this.time.now;
    }

    this.handleMovement(left, right, grounded);
    this.handleBufferedJump();
    this.updateHeat(dt, grounded, surface, left || right);
    this.updateLanding(grounded, surface);
    this.updateCheckpoints(surface);
    this.collectNearbySparks();
    this.updatePresentation(surface);

    if (this.player.x > COALS_CONSTANTS.holeX - 70 && this.gateOpened) {
      this.arriveAtHole();
      return;
    }
    if (this.player.y > 214 || this.heat >= 1) {
      this.burnOut();
      return;
    }
    this.wasGrounded = grounded;
  }

  protected prepareOutroForDebug() {
    if (!this.player || this.runState !== "running") {
      return;
    }
    this.heat = 0.18;
    this.flow = 3;
    this.openGate();
    this.arriveAtHole();
  }

  protected onStoryBreakComplete() {
    this.actionQueued = false;
    this.tapDirection = 0;
    this.tapUntil = 0;
    this.touch?.consumeAction();
  }

  private ensureTextures() {
    if (!this.textures.exists("coal_floor")) {
      const gfx = this.add.graphics();
      gfx.fillStyle(0x241417, 1).fillRect(0, 0, 32, 16);
      gfx.fillStyle(0x4b1d18, 1).fillRect(0, 0, 32, 3);
      gfx.fillStyle(0xe05a28, 0.95).fillRect(3, 2, 7, 1).fillRect(19, 1, 9, 1);
      gfx.fillStyle(0x84311f, 1).fillRect(10, 5, 8, 2).fillRect(24, 8, 6, 2);
      gfx.fillStyle(0x130d12, 1).fillRect(4, 10, 10, 4).fillRect(18, 12, 11, 3);
      gfx.generateTexture("coal_floor", 32, 16);
      gfx.destroy();
    }
    if (!this.textures.exists("safe_platform")) {
      const gfx = this.add.graphics();
      gfx.fillStyle(0x40332f, 1).fillRect(0, 0, 16, 8);
      gfx.fillStyle(0xa18062, 1).fillRect(0, 0, 16, 2);
      gfx.fillStyle(0x6b5547, 1).fillRect(3, 3, 7, 1).fillRect(11, 5, 4, 1);
      gfx.fillStyle(0x241d20, 1).fillRect(1, 6, 15, 2);
      gfx.generateTexture("safe_platform", 16, 8);
      gfx.destroy();
    }
    if (!this.textures.exists("memory_spark")) {
      const gfx = this.add.graphics();
      gfx.fillStyle(0xfff0b0, 1).fillRect(3, 0, 2, 8).fillRect(0, 3, 8, 2);
      gfx.fillStyle(0xff9d3f, 1).fillRect(2, 2, 4, 4);
      gfx.fillStyle(0xffffff, 1).fillRect(3, 3, 2, 2);
      gfx.generateTexture("memory_spark", 8, 8);
      gfx.destroy();
    }
  }

  private createRoute() {
    const coalWidth = COALS_CONSTANTS.holeX - 82;
    const coal = this.add
      .tileSprite(coalWidth / 2, COALS_CONSTANTS.floorY + 8, coalWidth, 16, "coal_floor")
      .setDepth(12);
    this.addSurface(coal, "coal");

    const clusterSpacing = 248;
    const routeCount = Math.floor((COALS_CONSTANTS.holeX - 250) / clusterSpacing);
    const clusterHeights = [
      [147, 128, 111],
      [138, 116, 134],
      [146, 123, 101],
      [132, 108, 126]
    ];

    for (let cluster = 0; cluster <= routeCount; cluster += 1) {
      const checkpoint = cluster % 8 === 0;
      const baseX = 56 + cluster * clusterSpacing;
      const heights = clusterHeights[cluster % clusterHeights.length];
      const offsets = checkpoint ? [0, 76, 139] : [0, 62, 126];
      const widths = checkpoint ? [126, 46, 48] : [52, 42, 48];

      for (let step = 0; step < offsets.length; step += 1) {
        const x = baseX + offsets[step];
        const top = checkpoint && step === 0 ? 150 : heights[step];
        const width = widths[step];
        const platform = this.add
          .tileSprite(x, top + 4, width, 8, "safe_platform")
          .setDepth(14);
        this.addSurface(platform, "safe", checkpoint && step === 0);
        this.add
          .rectangle(x, top + 10, Math.max(8, width - 5), 4, 0x140f13, 0.55)
          .setDepth(13);
      }

      if (checkpoint) {
        const glow = this.add
          .circle(baseX, 148, 9, 0xffb15c, 0.08)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(13);
        this.tweens.add({
          targets: glow,
          alpha: { from: 0.035, to: 0.14 },
          scale: { from: 0.85, to: 1.2 },
          duration: 1600 + (cluster % 4) * 180,
          yoyo: true,
          repeat: -1
        });
      }
    }

    const endSafeWidth = 144;
    const endSafe = this.add
      .tileSprite(COALS_CONSTANTS.holeX - 166, 154, endSafeWidth, 8, "safe_platform")
      .setDepth(15);
    this.addSurface(endSafe, "safe", true);
    this.add
      .rectangle(COALS_CONSTANTS.holeX - 166, 161, endSafeWidth - 8, 5, 0x160f13, 0.72)
      .setDepth(13);
    const endSafeGlow = this.add
      .rectangle(COALS_CONSTANTS.holeX - 166, 148, endSafeWidth - 14, 9, 0xffca74, 0.06)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(14);
    this.tweens.add({
      targets: endSafeGlow,
      alpha: { from: 0.035, to: 0.16 },
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });

    const gateX = COALS_CONSTANTS.holeX - 118;
    this.gateLight = this.add
      .rectangle(gateX, 112, 5, 76, 0xff9b43, 0.38)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(18);
    this.gate = this.add
      .rectangle(gateX, 112, 7, 94, 0x21131a, 0.94)
      .setStrokeStyle(1, 0xd76832, 0.9)
      .setDepth(19);
    this.physics.add.existing(this.gate, true);
  }

  private addSurface(object: Phaser.GameObjects.TileSprite, kind: SurfaceKind, checkpoint = false) {
    this.physics.add.existing(object, true);
    this.surfaces.push({ object, kind, checkpoint });
  }

  private createHole() {
    const x = COALS_CONSTANTS.holeX;
    const pit = this.add.graphics().setDepth(10);
    pit.fillStyle(0x08070a, 1);
    pit.fillEllipse(x, 170, 128, 34);
    pit.fillStyle(0x2a191b, 1);
    pit.fillTriangle(x - 66, 165, x - 30, 165, x - 51, 188);
    pit.fillTriangle(x + 66, 165, x + 30, 165, x + 51, 188);
    pit.lineStyle(2, 0x6e3027, 0.65);
    pit.lineBetween(x - 60, 164, x - 31, 151);
    pit.lineBetween(x + 60, 164, x + 32, 151);
    this.add
      .ellipse(x, 165, 108, 21, 0x020204, 0.98)
      .setStrokeStyle(1, 0x7a382a, 0.75)
      .setDepth(15);
    createShovel(this, x + 61, 143, 0.58).setDepth(18);
  }

  private createSparks() {
    const usableWidth = COALS_CONSTANTS.holeX - 900;
    for (let index = 0; index < COALS_CONSTANTS.totalSparks; index += 1) {
      const x = 720 + (index / (COALS_CONSTANTS.totalSparks - 1)) * usableWidth;
      const pattern = index % 4;
      const y = [112, 88, 126, 101][pattern];
      const spark = this.add.image(x, y, "memory_spark").setDepth(20);
      this.tweens.add({
        targets: spark,
        y: y - 4,
        scale: { from: 0.85, to: 1.12 },
        alpha: { from: 0.72, to: 1 },
        duration: 720 + (index % 6) * 70,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });
      this.sparks.push({ object: spark, collected: false });
    }
  }

  private createPlayer() {
    this.player = this.physics.add.sprite(48, 136, "player").setDepth(24);
    (this.player.body as Phaser.Physics.Arcade.Body).setSize(12, 22).setOffset(10, 2);
    this.player.setCollideWorldBounds(true, 0, 0, false);
    this.player.setMaxVelocity(190, 420).setDragX(760);
    for (const surface of this.surfaces) {
      this.physics.add.collider(this.player, surface.object);
    }
    if (this.gate) {
      this.physics.add.collider(this.player, this.gate);
    }
    this.cameras.main.startFollow(this.player, true, 0.09, 0.12, -56, 0);
    this.cameras.main.setDeadzone(82, 46);
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
      this.tapUntil = this.time.now + 180;
    };
    this.input.keyboard?.on("keydown-LEFT", () => queueDirection(-1));
    this.input.keyboard?.on("keydown-A", () => queueDirection(-1));
    this.input.keyboard?.on("keydown-RIGHT", () => queueDirection(1));
    this.input.keyboard?.on("keydown-D", () => queueDirection(1));
    this.touch = new TouchControls(this, "JUMP");
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.touch?.destroy());
  }

  private createAtmosphere() {
    for (let index = 0; index < 30; index += 1) {
      const ember = this.add
        .rectangle(
          Phaser.Math.Between(0, 320),
          Phaser.Math.Between(65, 175),
          Phaser.Math.RND.pick([1, 1, 2]),
          Phaser.Math.RND.pick([1, 2]),
          Phaser.Math.RND.pick([0xff7b2e, 0xffb34c, 0xd94a25]),
          Phaser.Math.FloatBetween(0.2, 0.68)
        )
        .setScrollFactor(0)
        .setDepth(6);
      this.tweens.add({
        targets: ember,
        x: ember.x + Phaser.Math.Between(-22, 18),
        y: Phaser.Math.Between(26, 72),
        alpha: 0,
        duration: Phaser.Math.Between(1800, 3600),
        repeat: -1,
        delay: Phaser.Math.Between(0, 2400),
        onRepeat: () => {
          ember.setPosition(Phaser.Math.Between(0, 320), Phaser.Math.Between(145, 178));
          ember.setAlpha(Phaser.Math.FloatBetween(0.25, 0.7));
        }
      });
    }
    for (let index = 0; index < 18; index += 1) {
      const ash = this.add
        .rectangle(Phaser.Math.Between(0, 320), Phaser.Math.Between(-20, 190), 1, 1, 0xd9d7d1, 0)
        .setScrollFactor(0)
        .setDepth(7);
      this.ashParticles.push(ash);
    }
  }

  private createPursuingFire() {
    this.pursuitGlow = this.add
      .rectangle(this.fireFrontX - 42, 104, 112, 152, 0xff5429, 0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(16);
    this.pursuitScreenGlow = this.add
      .rectangle(24, 90, 92, 180, 0xff3d20, 0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScrollFactor(0)
      .setDepth(17);
    this.pursuitFire = this.add
      .graphics()
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(21);
  }

  private getMusicFireFront() {
    return Phaser.Math.Linear(
      -420,
      COALS_CONSTANTS.holeX - 260,
      audioManager.getPlaybackProgress()
    );
  }

  private updatePursuingFire(dt: number) {
    if (!this.player || !this.pursuitFire) {
      return;
    }
    const progress = audioManager.getPlaybackProgress();
    const musicFront = this.getMusicFireFront();
    const targetFront = Math.min(COALS_CONSTANTS.holeX - 260, musicFront - this.fireSetback);
    const pursuitSpeed = PLAYER_CONSTANTS.moveSpeed * (0.68 + progress * 0.26);
    this.fireFrontX = targetFront < this.fireFrontX
      ? targetFront
      : Math.min(targetFront, this.fireFrontX + pursuitSpeed * dt);
    const gap = this.player.x - this.fireFrontX;
    const inEndSafeZone = this.player.x >= COAL_END_SAFE_START;
    const pressure = Phaser.Math.Clamp((340 - gap) / 300, 0, 1);
    const time = this.time.now;

    this.pursuitGlow
      ?.setPosition(this.fireFrontX - 42, 104)
      .setAlpha(0.08 + pressure * 0.18);
    this.pursuitScreenGlow?.setAlpha(pressure * 0.13);

    this.pursuitFire.clear();
    this.pursuitFire.fillStyle(0x9f231c, 0.5 + pressure * 0.18);
    this.pursuitFire.fillRect(this.fireFrontX - 72, 130, 78, 50);
    this.pursuitFire.fillStyle(0xff6c31, 0.28 + pressure * 0.26);
    this.pursuitFire.fillRect(this.fireFrontX - 10, 128, 14, 52);
    for (let index = 0; index < 12; index += 1) {
      const x = this.fireFrontX - 70 + index * 6;
      const wave = Math.sin(time * 0.009 + index * 1.7);
      const height = 17 + (index % 4) * 6 + wave * 5;
      this.pursuitFire.fillStyle(index % 3 === 0 ? 0xffb34e : 0xff5c2d, 0.64 + pressure * 0.2);
      this.pursuitFire.fillTriangle(x, 166, x + 8, 166, x + 4, 166 - height);
      this.pursuitFire.fillStyle(0xffdf79, 0.48);
      this.pursuitFire.fillTriangle(x + 2, 166, x + 6, 166, x + 4, 158 - height * 0.35);
    }
    for (let index = 0; index < 14; index += 1) {
      const cycle = ((time * (0.016 + (index % 4) * 0.003) + index * 31) % 110);
      const x = this.fireFrontX - 82 + ((index * 17) % 96) + Math.sin(time * 0.003 + index) * 8;
      const y = 164 - cycle;
      this.pursuitFire.fillStyle(index % 3 === 0 ? 0xffe09a : 0xff7137, 0.28 + pressure * 0.42);
      this.pursuitFire.fillCircle(x, y, index % 5 === 0 ? 1.4 : 0.8);
    }

    if (!inEndSafeZone && gap < 14) {
      const body = this.player.body as Phaser.Physics.Arcade.Body;
      this.player.setX(this.fireFrontX + 14);
      this.player.setVelocityX(Math.max(body.velocity.x, PLAYER_CONSTANTS.moveSpeed * 0.72));
      this.heat = 1;
    }
    if (!inEndSafeZone && !this.fireWarningShown && gap < 270) {
      this.fireWarningShown = true;
      this.showToast("The fire is gaining", "#ff9a5d", 1050);
    }
    if (!inEndSafeZone && gap < 125) {
      const danger = Phaser.Math.Clamp((125 - gap) / 125, 0, 1);
      this.heat = Phaser.Math.Clamp(this.heat + danger * 0.78 * dt, 0, 1);
    }
  }

  private givePursuitGrace() {
    const requiredSetback = this.getMusicFireFront() - (this.checkpointX - 360);
    this.fireSetback = Math.max(this.fireSetback, requiredSetback);
    this.fireWarningShown = false;
  }

  private spawnChaseFirefly(afterCatch: boolean) {
    if (!this.player || this.runState !== "running") {
      return;
    }
    this.chaseFirefly?.destroy(true);
    const requestedLead = afterCatch ? 520 : 390;
    const x = Math.min(
      COALS_CONSTANTS.holeX - 300,
      Math.max(this.player.x + requestedLead, this.fireFrontX + 620)
    );
    if (x <= this.player.x + 60) {
      this.chaseFirefly = undefined;
      return;
    }

    const halo = this.add
      .circle(0, 0, 5.4, 0xffc83d, 0.16)
      .setBlendMode(Phaser.BlendModes.ADD);
    const wingLeft = this.add
      .ellipse(-3.2, 0, 5, 2, 0xfff0b1, 0.62)
      .setRotation(-0.35)
      .setBlendMode(Phaser.BlendModes.ADD);
    const wingRight = this.add
      .ellipse(3.2, 0, 5, 2, 0xfff0b1, 0.62)
      .setRotation(0.35)
      .setBlendMode(Phaser.BlendModes.ADD);
    const core = this.add
      .circle(0, 0, 1.65, 0xffffd8, 1)
      .setStrokeStyle(1, 0xffb72e, 0.92)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.chaseFirefly = this.add
      .container(x, Phaser.Math.Between(82, 122), [halo, wingLeft, wingRight, core])
      .setDepth(23);
    this.chaseFireflySerial += 1;
    this.tweens.add({
      targets: [wingLeft, wingRight],
      scaleX: { from: 0.45, to: 1.18 },
      alpha: { from: 0.32, to: 0.82 },
      duration: 90,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
    this.tweens.add({
      targets: [halo, core],
      scale: { from: 0.78, to: 1.34 },
      alpha: { from: 0.5, to: 1 },
      duration: 420,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
  }

  private updateChaseFirefly(dt: number) {
    if (!this.player || !this.chaseFirefly || this.runState !== "running") {
      return;
    }
    const firefly = this.chaseFirefly;
    const cycle = (this.time.now / 1000 + this.chaseFireflySerial * 0.73) % 4.8;
    const darting = cycle < 1.25;
    const speed = PLAYER_CONSTANTS.moveSpeed * (darting ? 1.34 : 0.3);
    const minFireLead = this.fireFrontX + 440;
    firefly.x = Math.min(
      COALS_CONSTANTS.holeX - 300,
      Math.max(minFireLead, firefly.x + speed * dt)
    );
    firefly.y = 104
      + Math.sin(this.time.now * 0.0062 + this.chaseFireflySerial) * 22
      + Math.sin(this.time.now * 0.017) * 5;
    firefly.rotation = Math.sin(this.time.now * 0.013) * 0.16;

    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, firefly.x, firefly.y) <= 15) {
      this.catchChaseFirefly(firefly);
      return;
    }
    if (firefly.x < this.player.x - 28) {
      this.spawnChaseFirefly(true);
    }
  }

  private catchChaseFirefly(firefly: Phaser.GameObjects.Container) {
    if (this.chaseFirefly !== firefly) {
      return;
    }
    this.chaseFirefly = undefined;
    this.chaseFirefliesCaught += 1;
    this.spawnBurst(firefly.x, firefly.y, 0xffef96, 14);
    gameHud.showWhisper(
      CHASE_FIREFLY_AFFIRMATIONS[
        (this.chaseFirefliesCaught - 1) % CHASE_FIREFLY_AFFIRMATIONS.length
      ],
      2600
    );
    this.showToast("Firefly caught · another flashes ahead", "#ffe8a0", 720);
    this.tweens.add({
      targets: firefly,
      scale: 2.2,
      alpha: 0,
      duration: 220,
      ease: "Quad.easeOut",
      onComplete: () => firefly.destroy(true)
    });
    this.time.delayedCall(720, () => this.spawnChaseFirefly(true));
  }

  private createHud() {
    this.add
      .rectangle(160, 18, 82, 4, 0x1b0d12, 0.88)
      .setStrokeStyle(1, 0x9d4a31, 0.72)
      .setScrollFactor(0)
      .setDepth(1798);
    this.heatFill = this.add
      .rectangle(119, 18, 0, 2, 0xff7a35, 1)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(1800);
    this.heatGlow = this.add
      .rectangle(160, 90, 320, 180, 0x8d1f13, 0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScrollFactor(0)
      .setDepth(1700);
    gameHud.showHud({
      chapter: "III · Jumping on Coals",
      objective: COAL_BEATS[0].objective,
      trackLabel: "Jumping on Coals",
      tone: "coals",
      status: COAL_BEATS[0].status
    });
  }

  private syncToTrack() {
    const progress = audioManager.getPlaybackProgress();
    gameHud.setProgress(progress, audioManager.getInSilence() ? "The song is quiet" : "Jumping on Coals");
    const stage = audioManager.getInSilence() ? 4 : Math.min(4, Math.floor(progress * 5));
    if (stage !== this.coalStage) {
      this.coalStage = stage;
      const beat = COAL_BEATS[stage];
      gameHud.setStatus(beat.status);
      gameHud.setObjective(beat.objective);
      this.presentBeat(beat.title, beat.story, stage);
      this.tweens.add({
        targets: this.stageVeil,
        alpha: stage * 0.04,
        duration: 1800,
        ease: "Sine.easeInOut"
      });
    }
    this.updateAsh(progress, stage);
    if (audioManager.getInSilence()) {
      this.openGate();
    }
  }

  private presentBeat(title: string, body: string, stage: number) {
    if (stage === 0) {
      return;
    }
    this.showStoryBeat(title, body, {
      duration: stage >= 3 ? 4100 : 3000,
      letterbox: stage >= 3
    });
  }

  private updateAsh(progress: number, stage: number) {
    const visible = stage < 3 ? 0 : (stage - 2) * 0.14 + progress * 0.08;
    this.ashParticles.forEach((ash, index) => {
      ash.setAlpha(visible * (0.5 + (index % 4) * 0.16));
      ash.x = ((index * 29 - this.time.now * (0.018 + stage * 0.006)) % 360 + 360) % 360 - 20;
      ash.y = ((index * 41 + this.time.now * 0.009) % 220) - 20;
    });
  }

  private handleMovement(left: boolean, right: boolean, grounded: boolean) {
    if (!this.player) {
      return;
    }
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const direction = left === right ? 0 : left ? -1 : 1;
    const flowBonus = 1 + this.flow * COALS_CONSTANTS.flowSpeedBonus;
    const memorySpeed = 1 + this.getMemoryCount() * 0.012;
    const heatSlow = this.heat <= COALS_CONSTANTS.slowStart
      ? 0
      : Phaser.Math.Clamp(
          (this.heat - COALS_CONSTANTS.slowStart) / (1 - COALS_CONSTANTS.slowStart),
          0,
          1
        ) * COALS_CONSTANTS.maxSlow;
    const maxSpeed = PLAYER_CONSTANTS.moveSpeed * flowBonus * memorySpeed * (1 - heatSlow);

    if (direction !== 0) {
      this.player.setAccelerationX(
        direction * (grounded ? PLAYER_CONSTANTS.groundAcceleration : PLAYER_CONSTANTS.airAcceleration)
      );
      this.player.setDragX(grounded ? 650 : 90);
      this.player.setMaxVelocity(maxSpeed, 420);
      this.player.setFlipX(direction < 0);
    } else {
      this.player.setAccelerationX(0);
      this.player.setDragX(grounded ? 820 : 80);
    }

    if (!grounded) {
      this.playFirstAvailable([body.velocity.y < 0 ? "player:jump" : "player:fall", "player:idle"]);
    } else if (Math.abs(body.velocity.x) > 8) {
      this.playFirstAvailable(["player:walk", "player:swing", "player:idle"]);
    } else {
      this.playFirstAvailable(["player:idle"]);
    }
  }

  private handleBufferedJump() {
    if (!this.player) {
      return;
    }
    const canCoyote = this.time.now - this.lastGroundedAt <= PLAYER_CONSTANTS.coyoteMs;
    const hasBufferedJump = this.time.now - this.jumpQueuedAt <= PLAYER_CONSTANTS.jumpBufferMs;
    if (!canCoyote || !hasBufferedJump) {
      return;
    }
    const flowLift = 1 + this.flow * 0.035;
    this.player.setVelocityY(PLAYER_CONSTANTS.jumpVelocity * flowLift);
    this.lastGroundedAt = -1000;
    this.jumpQueuedAt = -1000;
    this.wasGrounded = false;
    this.spawnBurst(this.player.x, this.player.y + 8, 0xff913f, 4);
  }

  private updateHeat(dt: number, grounded: boolean, surface: Surface | undefined, moving: boolean) {
    const stageMultiplier = 1 + Math.max(0, this.coalStage) * 0.055;
    const memoryVulnerability = 1 + this.getMemoryCount() * 0.05;
    if (!grounded) {
      this.heat -= COALS_CONSTANTS.heatCoolAir * dt;
    } else if (surface?.kind === "safe") {
      this.heat -= COALS_CONSTANTS.heatCoolSafe * dt;
    } else {
      this.heat +=
        (moving ? COALS_CONSTANTS.heatRiseMoving : COALS_CONSTANTS.heatRiseIdle)
        * dt
        * stageMultiplier
        * memoryVulnerability;
    }
    this.heat = Phaser.Math.Clamp(this.heat, 0, 1);
  }

  private updateLanding(grounded: boolean, surface: Surface | undefined) {
    if (!grounded || this.wasGrounded || !surface || !this.player) {
      return;
    }
    if (surface.object === this.lastLandingSurface) {
      return;
    }
    this.lastLandingSurface = surface.object;

    if (surface.kind === "safe") {
      this.flow = Math.min(5, this.flow + 1);
      gameState.bestFlow = Math.max(gameState.bestFlow, this.flow);
      this.spawnBurst(this.player.x, (this.player.body as Phaser.Physics.Arcade.Body).bottom, 0xffd174, 7);
      this.cameras.main.shake(75, 0.0022);
      if (this.flow >= 3) {
        this.showToast(this.flow === 5 ? "Flow · unbroken" : `Flow · ×${this.flow}`, "#ffd273", 460);
      }
    } else {
      this.flow = 0;
      this.cameras.main.shake(80, 0.0032);
    }
  }

  private updateCheckpoints(surface: Surface | undefined) {
    if (!surface?.checkpoint || !this.player || this.player.x <= this.checkpointX + 80) {
      return;
    }
    this.checkpointX = this.player.x;
    this.checkpointY = surface.object.getBounds().top - 12;
    this.showToast("Safe ground remembers you", "#ffd6a1", 650);
  }

  private collectNearbySparks() {
    if (!this.player) {
      return;
    }
    for (const spark of this.sparks) {
      if (spark.collected) {
        continue;
      }
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, spark.object.x, spark.object.y) > 17) {
        continue;
      }
      spark.collected = true;
      gameState.sparksCollected += 1;
      const memoryCount = this.getMemoryCount();
      this.spawnBurst(spark.object.x, spark.object.y, 0xffe49a, 10);
      this.tweens.killTweensOf(spark.object);
      this.tweens.add({
        targets: spark.object,
        scale: 2.2,
        alpha: 0,
        duration: 180,
        onComplete: () => spark.object.destroy()
      });
      this.showToast(
        `Memory ${memoryCount} / ${COALS_CONSTANTS.totalSparks} · quicker, more exposed`,
        "#ffe18f",
        820
      );
    }
  }

  private collectAllMemories() {
    if (!import.meta.env.DEV) {
      return;
    }
    for (const spark of this.sparks) {
      if (spark.collected) {
        continue;
      }
      spark.collected = true;
      spark.object.setVisible(false);
      this.tweens.killTweensOf(spark.object);
      gameState.sparksCollected += 1;
    }
  }

  private getMemoryCount() {
    return this.sparks.reduce((count, spark) => count + Number(spark.collected), 0);
  }

  private openGate() {
    if (this.gateOpened) {
      return;
    }
    this.gateOpened = true;
    gameHud.setStatus("Silence · the hollow is open");
    gameHud.setObjective("The ground ahead is hollow · take the last step");
    this.showToast("The earth opens");
    if (this.gate?.body) {
      (this.gate.body as Phaser.Physics.Arcade.StaticBody).enable = false;
    }
    this.tweens.add({
      targets: [this.gate, this.gateLight],
      y: 50,
      alpha: 0,
      duration: 920,
      ease: "Sine.easeIn",
      onComplete: () => {
        this.gate?.destroy();
        this.gateLight?.destroy();
      }
    });
  }

  private updatePresentation(surface: Surface | undefined) {
    if (!this.player) {
      return;
    }
    this.heatFill?.setDisplaySize(80 * this.heat, 2);
    this.heatFill?.setFillStyle(
      this.heat > 0.72 ? 0xff4e2c : this.heat > 0.4 ? 0xff853a : 0xd86d35,
      1
    );
    this.heatGlow?.setAlpha(Math.max(0, this.heat - 0.56) * 0.23);
    this.player.setTint(this.heat > 0.78 ? 0xff8054 : 0xffffff);

    const heatLabel = this.heat > 0.78 ? "Burning" : this.heat > 0.48 ? "Hot" : "Cool";
    const fireGap = this.player.x - this.fireFrontX;
    gameHud.setStatus(
      `${COAL_BEATS[Math.max(0, this.coalStage)].status} · ${heatLabel}${fireGap < 235 ? " · Fire close" : ""}${this.flow ? ` · Flow ×${this.flow}` : ""}`
    );
    if (this.heat > 0.78) {
      gameHud.setObjective("Keep moving — you are burning");
    } else if (fireGap < 210) {
      gameHud.setObjective("The fire is gaining — keep moving");
    } else if (this.gateOpened && this.player.x > COALS_CONSTANTS.holeX - 500) {
      gameHud.setObjective("The ground ahead is hollow · take the last step");
    } else if (!this.gateOpened && this.player.x > COALS_CONSTANTS.holeX - 520) {
      gameHud.setObjective("Stay in motion until the song goes quiet");
    } else if (surface?.kind === "safe") {
      gameHud.setObjective("Breathe — then move");
    } else {
      gameHud.setObjective(COAL_BEATS[Math.max(0, this.coalStage)].objective);
    }

    const shake = Math.max(0, this.heat - 0.7) * 1.8;
    this.cameras.main.setFollowOffset(
      Math.sin(this.time.now * 0.024) * shake,
      Math.sin(this.time.now * 0.031 + 1.7) * shake * 0.45
    );
  }

  private getCurrentSurface(grounded: boolean): Surface | undefined {
    if (!grounded || !this.player) {
      return undefined;
    }
    const x = this.player.x;
    const bottom = (this.player.body as Phaser.Physics.Arcade.Body).bottom;
    return this.surfaces.find(({ object }) => {
      const bounds = object.getBounds();
      return x >= bounds.left - 2 && x <= bounds.right + 2 && Math.abs(bottom - bounds.top) <= 5;
    });
  }

  private burnOut() {
    if (!this.player || this.respawning) {
      return;
    }
    this.respawning = true;
    this.flow = 0;
    this.cameras.main.shake(240, 0.009);
    this.cameras.main.flash(160, 115, 30, 15, false);
    this.playFirstAvailable(["player:burn", "player:fall", "player:idle"]);
    this.player.setAcceleration(0, 0).setVelocity(0, -45);
    this.tweens.add({
      targets: this.player,
      alpha: 0,
      duration: 310,
      onComplete: () => {
        if (!this.player) {
          return;
        }
        this.givePursuitGrace();
        this.player
          .setPosition(this.checkpointX, this.checkpointY)
          .setVelocity(0, 0)
          .setAlpha(1)
          .clearTint();
        this.heat = 0.18;
        this.lastGroundedAt = this.time.now;
        this.lastLandingSurface = undefined;
        this.respawning = false;
        this.runState = "burn-choice";
        this.choice = "left";
        this.touch?.setActionLabel("CHOOSE");
        gameHud.setObjective("");
        this.renderLeaveChoice();
      }
    });
  }

  private arriveAtHole() {
    if (!this.player || this.runState !== "running") {
      return;
    }
    this.runState = "at-hole";
    this.player.setAcceleration(0, 0).setVelocity(0, 0).clearTint();
    (this.player.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.cameras.main.stopFollow();
    this.cameras.main.setFollowOffset(0, 0);
    gameHud.setTone("earth");
    gameHud.setObjective("");
    this.choice = "left";
    this.touch?.setActionLabel("CHOOSE");
    this.renderLeaveChoice();
    this.tweens.add({ targets: this.cameras.main, zoom: 1.11, duration: 900, ease: "Sine.easeInOut" });
    this.cameras.main.pan(COALS_CONSTANTS.holeX, 142, 900, "Sine.easeInOut");
  }

  private renderLeaveChoice() {
    if (this.runState === "at-hole") {
      gameHud.showChoice(
        "A shallow opening",
        "Loose earth. A shovel waits at the edge. You can decide not to make it deeper.",
        "Climb in and dig",
        "Leave the park",
        this.choice
      );
      return;
    }
    gameHud.showChoice(
      "Back at the last cool place",
      "The heat drove you back. The way behind you is still open.",
      "Try again",
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
      this.showToast(this.choice === "left" ? "Keep going" : "Leave", "#ffd0a0", 320);
    }
    if (!action || this.runState === "leaving") {
      return;
    }
    if (this.choice === "right") {
      this.beginLeaveAnxiety();
      return;
    }
    this.continueFromLeaveChoice();
  }

  private beginLeaveAnxiety() {
    const atHole = this.runState === "at-hole";
    this.leaveAnxiety = new LeaveAnxiety(
      atHole ? "at-hole" : "burned",
      atHole ? "Climb in and dig" : "Try again"
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
    const moment = this.runState === "at-hole" ? "at-hole" : "burned";
    this.runState = "leaving";
    gameHud.hideCinematic();
    fadeToScene(this, "LeaveParkScene", 520, { moment });
  }

  private continueFromLeaveChoice() {
    if (this.runState === "at-hole") {
      this.enterDiggingIn();
      return;
    }
    this.resumeFromBurn();
  }

  private resumeFromBurn() {
    if (this.runState !== "burn-choice") {
      return;
    }
    this.runState = "running";
    this.touch?.setActionLabel("JUMP");
    gameHud.hideCinematic();
    this.showToast("Back to the last cool place", "#ffd0a0", 620);
  }

  private enterDiggingIn() {
    if (this.runState !== "at-hole") {
      return;
    }
    this.runState = "leaving";
    gameHud.hideCinematic();
    fadeToScene(this, "DiggingInScene", 700);
  }

  private spawnBurst(x: number, y: number, color: number, count: number) {
    for (let index = 0; index < count; index += 1) {
      const particle = this.add
        .rectangle(x, y, Phaser.Math.Between(1, 2), Phaser.Math.Between(1, 2), color, 0.9)
        .setDepth(30);
      this.tweens.add({
        targets: particle,
        x: x + Phaser.Math.Between(-12, 12),
        y: y - Phaser.Math.Between(6, 18),
        alpha: 0,
        duration: Phaser.Math.Between(260, 520),
        onComplete: () => particle.destroy()
      });
    }
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
