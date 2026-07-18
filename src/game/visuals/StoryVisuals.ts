import Phaser from "phaser";

const SWING_KICK_FIRST_FRAME = 12;
const SWING_KICK_LAST_FRAME = 15;

export function updateSwingKickPose(
  player: Phaser.GameObjects.Sprite,
  currentBlend: number,
  kickingRight: boolean,
  deltaSeconds: number
) {
  const target = kickingRight ? 1 : 0;
  const response = kickingRight ? 13 : 9;
  const amount = 1 - Math.exp(-response * deltaSeconds);
  const nextBlend = Math.abs(currentBlend - target) < 0.002
    ? target
    : Phaser.Math.Linear(currentBlend, target, amount);
  const frame = SWING_KICK_FIRST_FRAME + Math.round(
    nextBlend * (SWING_KICK_LAST_FRAME - SWING_KICK_FIRST_FRAME)
  );

  player.anims.stop();
  if (player.frame.name !== String(frame)) {
    player.setFrame(frame);
  }
  return nextBlend;
}

export function createUndergroundBackdrop(scene: Phaser.Scene, darkness = 0.08) {
  const image = scene.add
    .image(160, 90, "underground_cycle")
    .setDisplaySize(320, 180)
    .setDepth(0);
  const veil = scene.add
    .rectangle(160, 90, 320, 180, 0x100b10, darkness)
    .setScrollFactor(0)
    .setDepth(1);
  return { image, veil };
}

export function ensureStoryTextures(scene: Phaser.Scene) {
  if (!scene.textures.exists("story_shovel")) {
    const gfx = scene.add.graphics();
    gfx.fillStyle(0x9a6d45, 1).fillRect(3, 2, 2, 18);
    gfx.fillStyle(0xd2a06c, 1).fillRect(4, 2, 1, 14);
    gfx.fillStyle(0x5d6268, 1).fillTriangle(0, 18, 8, 18, 4, 25);
    gfx.fillStyle(0x9ba0a4, 1).fillTriangle(2, 18, 6, 18, 4, 22);
    gfx.fillStyle(0x6f432b, 1).fillRect(1, 0, 6, 2);
    gfx.generateTexture("story_shovel", 8, 26);
    gfx.destroy();
  }
  if (!scene.textures.exists("story_crack")) {
    const gfx = scene.add.graphics();
    gfx.lineStyle(1, 0xe2a16b, 1);
    gfx.lineBetween(1, 0, 5, 4);
    gfx.lineBetween(5, 4, 2, 8);
    gfx.lineBetween(5, 4, 9, 7);
    gfx.generateTexture("story_crack", 10, 9);
    gfx.destroy();
  }
}

export function createShovel(scene: Phaser.Scene, x: number, y: number, rotation = 0) {
  ensureStoryTextures(scene);
  return scene.add.image(x, y, "story_shovel").setRotation(rotation).setDepth(14);
}

export function createDustField(
  scene: Phaser.Scene,
  color = 0xc38a5f,
  count = 18,
  depth = 5
) {
  const dust: Phaser.GameObjects.Rectangle[] = [];
  for (let index = 0; index < count; index += 1) {
    const mote = scene.add
      .rectangle(
        Phaser.Math.Between(12, 308),
        Phaser.Math.Between(24, 174),
        1,
        1,
        color,
        Phaser.Math.FloatBetween(0.12, 0.42)
      )
      .setDepth(depth);
    scene.tweens.add({
      targets: mote,
      x: mote.x + Phaser.Math.Between(-12, 13),
      y: mote.y + Phaser.Math.Between(8, 24),
      alpha: 0,
      duration: Phaser.Math.Between(1800, 3600),
      repeat: -1,
      delay: Phaser.Math.Between(0, 1800),
      onRepeat: () => {
        mote.setPosition(Phaser.Math.Between(12, 308), Phaser.Math.Between(20, 150));
        mote.setAlpha(Phaser.Math.FloatBetween(0.12, 0.42));
      }
    });
    dust.push(mote);
  }
  return dust;
}

export function playFirstAvailable(
  scene: Phaser.Scene,
  player: Phaser.GameObjects.Sprite,
  animationKeys: string[]
) {
  for (const key of animationKeys) {
    if (!scene.anims.exists(key)) {
      continue;
    }
    if (player.anims.currentAnim?.key !== key) {
      player.anims.play(key, true);
    }
    return;
  }
}
