import Phaser from "phaser";
import { spriteSheets } from "./assetConfig";

type FrameCoord = [number, number];
type MetaFrames = Record<string, FrameCoord | FrameCoord[]>;

type SpriteSheetMeta = {
  tileSize?: number;
  frames?: MetaFrames;
  frameRates?: Record<string, number>;
};

export function getFrameIndex(x: number, y: number, columns: number) {
  return y * columns + x;
}

export function createAnimations(scene: Phaser.Scene) {
  for (const sheet of spriteSheets) {
    if (!scene.textures.exists(sheet.key) || !scene.textures.exists(`${sheet.key}__img`)) {
      continue;
    }

    const meta = scene.cache.json.get(`${sheet.key}__meta`) as SpriteSheetMeta | null;
    if (!meta?.frames) {
      continue;
    }

    const texture = scene.textures.get(sheet.key);
    const source = texture.getSourceImage() as HTMLImageElement | undefined;
    const tileSize = typeof meta.tileSize === "number" ? meta.tileSize : 16;
    const columns = source ? Math.floor(source.width / tileSize) : 0;
    if (!columns) {
      continue;
    }

    for (const [name, frames] of Object.entries(meta.frames)) {
      const animKey = `${sheet.key}:${name}`;
      if (scene.anims.exists(animKey)) {
        continue;
      }

      const frameList = normalizeFrames(frames);
      const mappedFrames = frameList.map(([x, y]) => ({
        key: sheet.key,
        frame: getFrameIndex(x, y, columns)
      }));

      if (!mappedFrames.length) {
        continue;
      }

      const loop = shouldLoop(name, frameList.length);
      const configuredFrameRate = meta.frameRates?.[name];
      const frameRate =
        typeof configuredFrameRate === "number" && configuredFrameRate > 0
          ? configuredFrameRate
          : frameList.length > 1
            ? 6
            : 1;

      scene.anims.create({
        key: animKey,
        frames: mappedFrames,
        frameRate,
        repeat: loop ? -1 : 0
      });
    }
  }
}

function normalizeFrames(frames: FrameCoord | FrameCoord[]) {
  if (!Array.isArray(frames)) {
    return [];
  }

  if (typeof frames[0] === "number") {
    return [frames as FrameCoord];
  }

  return frames as FrameCoord[];
}

function shouldLoop(name: string, frameCount: number) {
  if (frameCount <= 1) {
    return false;
  }

  const lowered = name.toLowerCase();
  if (lowered.includes("jump") || lowered.includes("fall") || lowered.includes("burn")) {
    return false;
  }
  if (lowered.includes("success") || lowered.includes("hit") || lowered.includes("land")) {
    return false;
  }

  return true;
}
