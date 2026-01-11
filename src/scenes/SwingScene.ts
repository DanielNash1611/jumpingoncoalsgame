import Phaser from "phaser";
import { audioManager } from "../game/audio/AudioManager";
import { fadeToScene } from "../game/fx/fade";
import { gameState } from "../game/state/gameState";
import { BaseScene } from "./BaseScene";
import { PLAYER_CONSTANTS, SWING_CONSTANTS } from "./constants";

export class SwingScene extends BaseScene {
  private player?: Phaser.Physics.Arcade.Sprite;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys?: { left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key };
  private onSwing = true;
  private swingAngle = 0;
  private swingAngularVelocity = 0;
  swingIntensity = 0;
  private rope?: Phaser.GameObjects.Graphics;
  private swingSeat?: Phaser.GameObjects.Image;
  private isTransitioning = false;

  constructor() {
    super("SwingScene");
  }

  create() {
    super.create();
    this.cameras.main.setBackgroundColor("#141419");
    this.cameras.main.fadeIn(200, 0, 0, 0);

    const floor = this.physics.add.staticImage(160, 168, "coals");
    floor.setScale(6, 1).refreshBody();

    this.player = this.physics.add.sprite(160, 40, "player");
    this.player.setCollideWorldBounds(true);
    this.player.setBounce(0.2);
    this.player.body.setAllowGravity(false);

    this.physics.add.collider(this.player, floor);

    const anchor = this.add.circle(
      SWING_CONSTANTS.anchorX,
      SWING_CONSTANTS.anchorY,
      3,
      0xffffff
    );
    anchor.setDepth(5);

    this.rope = this.add.graphics().setDepth(4);
    this.swingSeat = this.add
      .image(SWING_CONSTANTS.anchorX, SWING_CONSTANTS.anchorY, "rope")
      .setDepth(4)
      .setVisible(this.textures.exists("rope"));

    this.cursors = this.input.keyboard?.createCursorKeys();
    this.keys = this.input.keyboard
      ? {
          left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
          right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
        }
      : undefined;

    this.add
      .text(10, 30, "Swing: hold left/right", {
        fontFamily: "Courier New, monospace",
        fontSize: "10px",
        color: "#d9d9d9"
      })
      .setScrollFactor(0);

    this.input.keyboard?.on("keydown-SPACE", () => {
      if (this.shouldAdvanceToCoals()) {
        this.transitionToCoals();
        return;
      }
      this.toggleSwing();
    });

    if (!audioManager.isPlaying()) {
      audioManager.play("01_back_in_the_swing");
    }

    this.updateSwingPosition();
  }

  update() {
    if (!this.player || !this.cursors) {
      return;
    }

    this.updateBalanceLoss();
    this.applyBalanceEffects();

    if (this.onSwing) {
      this.updateSwingPhysics();
    } else {
      this.updateOffSwingMovement();
    }

    this.updatePlayerAnimation();
  }

  private updateSwingPhysics() {
    if (!this.player) {
      return;
    }

    const leftPressed = this.cursors?.left?.isDown || this.keys?.left?.isDown;
    const rightPressed = this.cursors?.right?.isDown || this.keys?.right?.isDown;

    const torqueScale = 1 - gameState.balanceLoss * 0.25;
    const effectiveTorque = SWING_CONSTANTS.torque * torqueScale;

    if (leftPressed) {
      this.swingAngularVelocity -= effectiveTorque;
    } else if (rightPressed) {
      this.swingAngularVelocity += effectiveTorque;
    }

    this.swingAngularVelocity *= SWING_CONSTANTS.damping;
    const drift =
      (Math.sin(this.time.now * 0.004) * 0.0006 +
        Math.sin(this.time.now * 0.0025 + 2) * 0.0004) *
      gameState.balanceLoss;
    this.swingAngularVelocity += drift;
    this.swingAngularVelocity = Phaser.Math.Clamp(
      this.swingAngularVelocity,
      -SWING_CONSTANTS.maxAngularVelocity,
      SWING_CONSTANTS.maxAngularVelocity
    );

    this.swingAngle += this.swingAngularVelocity;
    this.swingAngle = Phaser.Math.Clamp(
      this.swingAngle,
      -SWING_CONSTANTS.maxAngle,
      SWING_CONSTANTS.maxAngle
    );

    this.swingIntensity = Phaser.Math.Clamp(
      Math.abs(this.swingAngularVelocity) / SWING_CONSTANTS.maxAngularVelocity,
      0,
      1
    );

    this.updateSwingPosition();
  }

  private updateOffSwingMovement() {
    if (!this.player) {
      return;
    }

    if (this.cursors?.left?.isDown || this.keys?.left?.isDown) {
      this.player.setVelocityX(-PLAYER_CONSTANTS.moveSpeed);
    } else if (this.cursors?.right?.isDown || this.keys?.right?.isDown) {
      this.player.setVelocityX(PLAYER_CONSTANTS.moveSpeed);
    } else {
      this.player.setVelocityX(0);
    }

    if (Phaser.Input.Keyboard.JustDown(this.cursors.space)) {
      if (this.shouldAdvanceToCoals()) {
        this.transitionToCoals();
        return;
      }
      if (this.player.body.blocked.down) {
        this.player.setVelocityY(PLAYER_CONSTANTS.jumpVelocity);
      }
    }
  }

  private updateSwingPosition() {
    if (!this.player) {
      return;
    }

    const swingX =
      SWING_CONSTANTS.anchorX +
      Math.sin(this.swingAngle) * SWING_CONSTANTS.ropeLength;
    const swingY =
      SWING_CONSTANTS.anchorY +
      Math.cos(this.swingAngle) * SWING_CONSTANTS.ropeLength;

    this.player.setPosition(swingX, swingY);
    this.player.body.setVelocity(0);

    this.rope?.clear();
    this.rope?.lineStyle(1, 0x555a66, 1);
    this.rope?.lineBetween(
      SWING_CONSTANTS.anchorX,
      SWING_CONSTANTS.anchorY,
      swingX,
      swingY
    );

    if (this.swingSeat) {
      this.swingSeat.setPosition(swingX, swingY);
      this.swingSeat.setVisible(this.textures.exists("rope"));
    }
  }

  private toggleSwing() {
    if (!this.player) {
      return;
    }

    if (this.onSwing) {
      this.onSwing = false;
      this.player.body.setAllowGravity(true);
      this.player.setVelocity(
        Math.sin(this.swingAngle) * 120,
        Math.cos(this.swingAngle) * 80
      );
    }
  }

  private shouldAdvanceToCoals() {
    return (
      audioManager.getInSilence() &&
      audioManager.getTrackKey() === "02_losing_balance"
    );
  }

  private transitionToCoals() {
    if (this.isTransitioning) {
      return;
    }
    this.isTransitioning = true;
    fadeToScene(this, "CoalsScene", 250);
  }

  private updateBalanceLoss() {
    if (
      audioManager.getTrackKey() === "02_losing_balance" &&
      audioManager.isPlaying()
    ) {
      const progress = audioManager.getPlaybackProgress();
      if (progress > gameState.balanceLoss) {
        gameState.balanceLoss = progress;
      }
    }
  }

  private applyBalanceEffects() {
    const balanceLoss = gameState.balanceLoss;
    const camera = this.cameras.main;

    if (balanceLoss <= 0) {
      camera.setScroll(0, 0);
      camera.setRotation(0);
      return;
    }

    const t = this.time.now;
    const swayX = Math.sin(t * 0.002) * 2 * balanceLoss;
    const swayY = Math.sin(t * 0.0013 + 1.2) * 1.2 * balanceLoss;
    const rotation = Math.sin(t * 0.0017) * 0.01 * balanceLoss;

    camera.setScroll(-swayX, -swayY);
    camera.setRotation(rotation);
  }

  private updatePlayerAnimation() {
    if (!this.player) {
      return;
    }

    if (this.onSwing) {
      this.playFirstAvailable(["player:swing", "player:idle"]);
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
