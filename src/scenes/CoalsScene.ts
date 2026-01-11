import Phaser from "phaser";
import { getFrameIndex } from "../game/assets/animations";
import { audioManager } from "../game/audio/AudioManager";
import { fadeToScene } from "../game/fx/fade";
import { BaseScene } from "./BaseScene";
import { COALS_CONSTANTS } from "./constants";

type TileType = "coal" | "dirt";
type FrameCoord = [number, number];
type MetaFrames = Record<string, FrameCoord | FrameCoord[]>;
type SpriteSheetMeta = { tileSize?: number; frames?: MetaFrames };

export class CoalsScene extends BaseScene {
  private player?: Phaser.Physics.Arcade.Sprite;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys?: {
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    jump: Phaser.Input.Keyboard.Key;
  };
  private tileGrid: TileType[][] = [];
  private coalTiles: Phaser.GameObjects.Image[] = [];
  private coalFlicker = false;
  private useSpriteSheet = false;
  private coalFrameA?: number;
  private coalFrameB?: number;
  private dirtFrame?: number;
  private heat = 0;
  private stamina = 1;
  private jumpChain = 0;
  private lastJumpAt = 0;
  private debugText?: Phaser.GameObjects.Text;
  private debugVisible = false;
  private downHold = 0;
  private isTransitioning = false;

  constructor() {
    super("CoalsScene");
  }

  create() {
    super.create();
    this.cameras.main.setBackgroundColor("#140c0a");
    this.cameras.main.fadeIn(200, 0, 0, 0);

    this.resolveCoalFrames();
    if (!this.useSpriteSheet) {
      this.ensureTileTextures();
    }
    this.buildTileGrid();
    this.renderTiles();

    this.player = this.physics.add.sprite(
      COALS_CONSTANTS.tileSize * 6,
      COALS_CONSTANTS.tileSize * 6,
      "player"
    );
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(5);

    this.createGround();

    this.cursors = this.input.keyboard?.createCursorKeys();
    this.keys = this.input.keyboard
      ? {
          left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
          right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
          jump: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
        }
      : undefined;

    this.physics.world.setBounds(
      0,
      0,
      COALS_CONSTANTS.gridWidth * COALS_CONSTANTS.tileSize,
      COALS_CONSTANTS.gridHeight * COALS_CONSTANTS.tileSize
    );
    this.cameras.main.setBounds(
      0,
      0,
      COALS_CONSTANTS.gridWidth * COALS_CONSTANTS.tileSize,
      COALS_CONSTANTS.gridHeight * COALS_CONSTANTS.tileSize
    );
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);

    this.time.addEvent({
      delay: 260,
      loop: true,
      callback: () => {
        this.coalFlicker = !this.coalFlicker;
        const key = this.coalFlicker ? "coal_b" : "coal_a";
        const frame = this.coalFlicker ? this.coalFrameB : this.coalFrameA;
        for (const tile of this.coalTiles) {
          if (this.useSpriteSheet && frame !== undefined) {
            tile.setFrame(frame);
          } else {
            tile.setTexture(key);
          }
        }
      }
    });

    this.input.keyboard?.on("keydown-D", () => {
      this.debugVisible = !this.debugVisible;
      if (this.debugText) {
        this.debugText.setVisible(this.debugVisible);
      }
    });

    this.debugText = this.add
      .text(6, 60, "", {
        fontFamily: "Courier New, monospace",
        fontSize: "10px",
        color: "#f5f5f5",
        backgroundColor: "rgba(0,0,0,0.4)",
        padding: { left: 4, right: 4, top: 2, bottom: 2 }
      })
      .setScrollFactor(0)
      .setDepth(1000)
      .setVisible(this.debugVisible);

    if (!audioManager.isPlaying() || audioManager.getTrackKey() !== "03_jumping_on_coals") {
      audioManager.play("03_jumping_on_coals");
    }
  }

  update(_time: number, delta: number) {
    if (!this.player || !this.cursors) {
      return;
    }

    const dt = delta / 1000;
    const isGrounded = this.player.body.blocked.down;
    const moving = Math.abs(this.player.body.velocity.x) > 6;
    const onCoal = this.isOnCoal();

    this.updateHeat(dt, isGrounded, onCoal, moving);
    this.updateStamina(dt, isGrounded);
    this.applyHeatEffects();
    this.handleMovement(isGrounded);
    this.updatePlayerAnimation();
    this.updateReturnToSwing(dt);

    if (this.debugVisible && this.debugText) {
      this.debugText.setText([
        `Heat ${this.heat.toFixed(2)}`,
        `Stamina ${this.stamina.toFixed(2)}`
      ]);
    }
  }

  private ensureTileTextures() {
    if (!this.textures.exists("coal_a")) {
      const gfx = this.add.graphics();
      gfx.fillStyle(0x6b2a24, 1);
      gfx.fillRect(0, 0, 16, 16);
      gfx.fillStyle(0x842c20, 1);
      gfx.fillRect(3, 3, 5, 5);
      gfx.fillRect(9, 7, 4, 3);
      gfx.generateTexture("coal_a", 16, 16);
      gfx.destroy();
    }

    if (!this.textures.exists("coal_b")) {
      const gfx = this.add.graphics();
      gfx.fillStyle(0x5e211d, 1);
      gfx.fillRect(0, 0, 16, 16);
      gfx.fillStyle(0x7a2a1d, 1);
      gfx.fillRect(2, 8, 5, 4);
      gfx.fillRect(9, 4, 4, 5);
      gfx.generateTexture("coal_b", 16, 16);
      gfx.destroy();
    }

    if (!this.textures.exists("dirt")) {
      const gfx = this.add.graphics();
      gfx.fillStyle(0x3a2a1e, 1);
      gfx.fillRect(0, 0, 16, 16);
      gfx.fillStyle(0x4a3324, 1);
      gfx.fillRect(1, 1, 3, 3);
      gfx.fillRect(10, 6, 4, 4);
      gfx.generateTexture("dirt", 16, 16);
      gfx.destroy();
    }
  }

  private resolveCoalFrames() {
    if (!this.textures.exists("coals")) {
      return;
    }

    const meta = this.cache.json.get("coals__meta") as SpriteSheetMeta | null;
    if (!meta?.frames) {
      return;
    }

    const texture = this.textures.get("coals");
    const source = texture.getSourceImage() as HTMLImageElement | undefined;
    const tileSize = typeof meta.tileSize === "number" ? meta.tileSize : 16;
    const columns = source ? Math.floor(source.width / tileSize) : 0;
    if (!columns) {
      return;
    }

    const coalA = this.getFrameIndexFromMeta(meta.frames, "coal_a", columns);
    const coalB = this.getFrameIndexFromMeta(meta.frames, "coal_b", columns);
    const dirt = this.getFrameIndexFromMeta(meta.frames, "dirt", columns);

    if (coalA === undefined || coalB === undefined || dirt === undefined) {
      return;
    }

    this.coalFrameA = coalA;
    this.coalFrameB = coalB;
    this.dirtFrame = dirt;
    this.useSpriteSheet = true;
  }

  private buildTileGrid() {
    this.tileGrid = [];
    for (let y = 0; y < COALS_CONSTANTS.gridHeight; y += 1) {
      const row: TileType[] = [];
      for (let x = 0; x < COALS_CONSTANTS.gridWidth; x += 1) {
        if (y === COALS_CONSTANTS.gridHeight - 1) {
          row.push("coal");
        } else {
          row.push("dirt");
        }
      }
      this.tileGrid.push(row);
    }
  }

  private renderTiles() {
    this.coalTiles = [];
    for (let y = 0; y < COALS_CONSTANTS.gridHeight; y += 1) {
      for (let x = 0; x < COALS_CONSTANTS.gridWidth; x += 1) {
        const type = this.tileGrid[y][x];
        const posX = x * COALS_CONSTANTS.tileSize + COALS_CONSTANTS.tileSize / 2;
        const posY = y * COALS_CONSTANTS.tileSize + COALS_CONSTANTS.tileSize / 2;
        const tile = this.useSpriteSheet
          ? this.add
              .image(
                posX,
                posY,
                "coals",
                type === "coal" ? this.coalFrameA : this.dirtFrame
              )
              .setOrigin(0.5)
              .setDepth(1)
          : this.add
              .image(posX, posY, type === "coal" ? "coal_a" : "dirt")
              .setOrigin(0.5)
              .setDepth(1);
        if (type === "coal") {
          this.coalTiles.push(tile);
        }
      }
    }
  }

  private createGround() {
    const ground = this.physics.add.staticImage(
      (COALS_CONSTANTS.gridWidth * COALS_CONSTANTS.tileSize) / 2,
      COALS_CONSTANTS.gridHeight * COALS_CONSTANTS.tileSize -
        COALS_CONSTANTS.tileSize / 2,
      this.useSpriteSheet ? "coals" : "dirt",
      this.useSpriteSheet ? this.dirtFrame : undefined
    );
    ground.setDisplaySize(
      COALS_CONSTANTS.gridWidth * COALS_CONSTANTS.tileSize,
      COALS_CONSTANTS.tileSize
    );
    ground.refreshBody();
    ground.setVisible(false);

    if (this.player) {
      this.physics.add.collider(this.player, ground);
    }
  }

  private handleMovement(isGrounded: boolean) {
    if (!this.player) {
      return;
    }

    const left = this.cursors?.left?.isDown || this.keys?.left?.isDown;
    const right = this.cursors?.right?.isDown || this.keys?.right?.isDown;
    const speed = this.getHeatAdjustedSpeed();

    if (left) {
      this.player.setVelocityX(-speed);
    } else if (right) {
      this.player.setVelocityX(speed);
    } else {
      this.player.setVelocityX(0);
    }

    const jumpPressed =
      (this.cursors?.space && Phaser.Input.Keyboard.JustDown(this.cursors.space)) ||
      (this.cursors?.up && Phaser.Input.Keyboard.JustDown(this.cursors.up)) ||
      (this.keys?.jump && Phaser.Input.Keyboard.JustDown(this.keys.jump));

    if (jumpPressed && isGrounded) {
      const jumpScale = Phaser.Math.Clamp(
        COALS_CONSTANTS.staminaJumpMinScale +
          (1 - COALS_CONSTANTS.staminaJumpMinScale) * this.stamina,
        COALS_CONSTANTS.staminaJumpMinScale,
        1
      );
      this.player.setVelocityY(COALS_CONSTANTS.jumpVelocity * jumpScale);
      this.consumeStamina();
    }
  }

  private updateReturnToSwing(dt: number) {
    if (
      !audioManager.getInSilence() ||
      audioManager.getTrackKey() !== "03_jumping_on_coals"
    ) {
      this.downHold = 0;
      return;
    }

    const downHeld = this.cursors?.down?.isDown || false;
    if (downHeld) {
      this.downHold += dt;
    } else {
      this.downHold = 0;
    }

    if (this.downHold >= 0.6) {
      this.transitionToSwing();
    }
  }

  private transitionToSwing() {
    if (this.isTransitioning) {
      return;
    }
    this.isTransitioning = true;
    fadeToScene(this, "SwingScene", 300);
  }

  private updateHeat(
    dt: number,
    isGrounded: boolean,
    onCoal: boolean,
    moving: boolean
  ) {
    if (isGrounded && onCoal) {
      const rate = moving
        ? COALS_CONSTANTS.heatRiseMoving
        : COALS_CONSTANTS.heatRiseIdle;
      this.heat += rate * dt;
    } else {
      this.heat -= COALS_CONSTANTS.heatCool * dt;
    }

    this.heat = Phaser.Math.Clamp(this.heat, 0, 1);
  }

  private updateStamina(dt: number, isGrounded: boolean) {
    if (isGrounded) {
      this.stamina += COALS_CONSTANTS.staminaRegen * dt;
    }
    this.stamina = Phaser.Math.Clamp(this.stamina, 0, 1);
  }

  private consumeStamina() {
    const now = this.time.now;
    if (now - this.lastJumpAt < 600) {
      this.jumpChain += 1;
    } else {
      this.jumpChain = 0;
    }
    this.lastJumpAt = now;
    const drain =
      COALS_CONSTANTS.staminaJumpDrain +
      COALS_CONSTANTS.staminaJumpDrainStep * this.jumpChain;
    this.stamina = Phaser.Math.Clamp(this.stamina - drain, 0, 1);
  }

  private getHeatAdjustedSpeed() {
    if (this.heat <= COALS_CONSTANTS.heatSlowStart) {
      return COALS_CONSTANTS.moveSpeed;
    }
    const t =
      (this.heat - COALS_CONSTANTS.heatSlowStart) /
      (1 - COALS_CONSTANTS.heatSlowStart);
    const slow = Phaser.Math.Clamp(t, 0, 1) * COALS_CONSTANTS.heatSlowMax;
    return COALS_CONSTANTS.moveSpeed * (1 - slow);
  }

  private applyHeatEffects() {
    const camera = this.cameras.main;
    if (this.heat <= COALS_CONSTANTS.heatShakeStart) {
      camera.setFollowOffset(0, 0);
      return;
    }

    const t =
      (this.heat - COALS_CONSTANTS.heatShakeStart) /
      (1 - COALS_CONSTANTS.heatShakeStart);
    const intensity =
      Phaser.Math.Clamp(t, 0, 1) * COALS_CONSTANTS.heatShakeMax;
    const time = this.time.now;
    const shakeX = Math.sin(time * 0.012) * intensity;
    const shakeY = Math.sin(time * 0.02 + 2) * intensity * 0.6;
    camera.setFollowOffset(shakeX, shakeY);
  }

  private isOnCoal() {
    if (!this.player) {
      return false;
    }

    const tileX = Math.floor(
      this.player.x / COALS_CONSTANTS.tileSize
    );
    const tileY = Math.floor(
      (this.player.body.bottom - 1) / COALS_CONSTANTS.tileSize
    );

    if (
      tileX < 0 ||
      tileX >= COALS_CONSTANTS.gridWidth ||
      tileY < 0 ||
      tileY >= COALS_CONSTANTS.gridHeight
    ) {
      return false;
    }

    return this.tileGrid[tileY][tileX] === "coal";
  }

  private getFrameIndexFromMeta(
    frames: MetaFrames,
    name: string,
    columns: number
  ) {
    const entry = frames[name];
    if (!entry) {
      return undefined;
    }
    const coords = Array.isArray(entry[0])
      ? (entry as FrameCoord[])[0]
      : (entry as FrameCoord);
    const [x, y] = coords;
    return getFrameIndex(x, y, columns);
  }

  private updatePlayerAnimation() {
    if (!this.player) {
      return;
    }

    const onGround = this.player.body.blocked.down;
    const moving = Math.abs(this.player.body.velocity.x) > 4;

    if (!onGround) {
      if (this.player.body.velocity.y < 0) {
        this.playFirstAvailable(["player:jump", "player:fall", "player:idle"]);
      } else {
        this.playFirstAvailable(["player:fall", "player:jump", "player:idle"]);
      }
      return;
    }

    if (moving) {
      this.playFirstAvailable(["player:swing", "player:walk", "player:idle"]);
    } else {
      this.playFirstAvailable(["player:idle"]);
    }
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
