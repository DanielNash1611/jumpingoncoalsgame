import { createAnimations } from "../game/assets/animations";
import {
  environmentImages,
  spriteSheets,
  trackKeys,
  trackFiles,
} from "../game/assets/assetConfig";
import { gameState } from "../game/state/gameState";
import { gameHud } from "../game/ui/GameHud";
import { BaseScene } from "./BaseScene";

type AssetReport = {
  loadedImages: string[];
  missingImages: string[];
  loadedMeta: string[];
  missingMeta: string[];
  loadedAudio: string[];
  missingAudio: string[];
};

export class PreloadScene extends BaseScene {
  constructor() {
    super("PreloadScene");
  }

  preload() {
    console.log("[JOC] scene:preload");
    this.add.image(160, 90, "playground_sunset").setDisplaySize(320, 180);
    this.add.rectangle(160, 90, 320, 180, 0x100a10, 0.72);
    gameHud.showLoading(0, "Gathering the evening");

    this.load.on("progress", (value: number) => {
      gameHud.updateLoading(value);
    });
    this.load.on("complete", () => {
      gameHud.updateLoading(1, "Ready");
    });

    for (const sheet of spriteSheets) {
      this.load.image(`${sheet.key}__img`, sheet.imgPath);
      this.load.json(`${sheet.key}__meta`, sheet.metaPath);
    }

    for (const [key, path] of Object.entries(environmentImages)) {
      if (!this.textures.exists(key)) {
        this.load.image(key, path);
      }
    }

    for (const trackKey of trackKeys) {
      const filename = trackFiles[trackKey];
      if (filename) {
        this.load.audio(trackKey, `assets/audio-web/${filename}`);
      }
    }
  }

  create() {
    console.log("[JOC] preload complete");
    super.create();
    const report = this.buildSpriteSheets();
    this.ensurePlaceholders();
    createAnimations(this);
    this.reportAssets(report);
    this.cameras.main.fadeOut(260, 12, 7, 10);
    this.time.delayedCall(284, () => this.scene.start("SwingScene"));
  }

  private ensurePlaceholders() {
    this.createPlaceholderIfMissing("player", 32, 32, 0x89d2ff);
    this.createPlaceholderIfMissing("coals", 16, 16, 0x5e211d);
    this.createPlaceholderIfMissing("rope", 8, 16, 0xc6b48a);
    this.createPlaceholderIfMissing("particles", 8, 8, 0xa0a0a0);
  }

  private createPlaceholderIfMissing(key: string, width: number, height: number, color: number) {
    if (this.textures.exists(key)) {
      return;
    }
    const gfx = this.add.graphics();
    gfx.fillStyle(color, 1).fillRect(0, 0, width, height);
    gfx.generateTexture(key, width, height);
    gfx.destroy();
  }

  private buildSpriteSheets(): AssetReport {
    const report: AssetReport = {
      loadedImages: [],
      missingImages: [],
      loadedMeta: [],
      missingMeta: [],
      loadedAudio: [],
      missingAudio: []
    };

    for (const sheet of spriteSheets) {
      const imgKey = `${sheet.key}__img`;
      const metaKey = `${sheet.key}__meta`;
      const hasImage = this.textures.exists(imgKey);
      const meta = this.cache.json.get(metaKey) as { tileSize?: number } | null;
      (hasImage ? report.loadedImages : report.missingImages).push(sheet.key);
      (meta ? report.loadedMeta : report.missingMeta).push(sheet.key);

      if (hasImage && !this.textures.exists(sheet.key)) {
        const source = this.textures.get(imgKey).getSourceImage() as HTMLImageElement | undefined;
        if (source) {
          this.textures.addSpriteSheet(sheet.key, source, {
            frameWidth: typeof meta?.tileSize === "number" ? meta.tileSize : 16,
            frameHeight: typeof meta?.tileSize === "number" ? meta.tileSize : 16
          });
        }
      }
    }

    for (const trackKey of trackKeys) {
      (this.cache.audio.exists(trackKey) ? report.loadedAudio : report.missingAudio).push(trackKey);
    }
    return report;
  }

  private reportAssets(report: AssetReport) {
    gameState.assetsMissing =
      report.missingImages.length > 0 ||
      report.missingMeta.length > 0 ||
      report.missingAudio.length > 0;
    console.log("Asset Report", report);
  }
}
