import { createAnimations } from "../game/assets/animations";
import { spriteSheets, trackFiles, trackKeys } from "../game/assets/assetConfig";
import { gameState } from "../game/state/gameState";
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
    for (const sheet of spriteSheets) {
      this.load.image(`${sheet.key}__img`, sheet.imgPath);
      this.load.json(`${sheet.key}__meta`, sheet.metaPath);
    }

    for (const trackKey of trackKeys) {
      const filename = trackFiles[trackKey];
      this.load.audio(trackKey, `assets/audio/${filename}`);
    }

    const loadingText = this.add
      .text(10, 10, "Loading...", {
        fontFamily: "Courier New, monospace",
        fontSize: "12px",
        color: "#f5f5f5"
      })
      .setScrollFactor(0);

    this.load.on("complete", () => {
      loadingText.destroy();
    });
  }

  create() {
    super.create();
    const report = this.buildSpriteSheets();
    this.ensurePlaceholders();
    createAnimations(this);
    this.reportAssets(report);
    this.scene.start("SwingScene");
  }

  private ensurePlaceholders() {
    this.createPlaceholderIfMissing("player", 16, 16, 0x89d2ff);
    this.createPlaceholderIfMissing("coals", 16, 16, 0x5e211d);
    this.createPlaceholderIfMissing("rope", 8, 16, 0xc6b48a);
    this.createPlaceholderIfMissing("particles", 8, 8, 0xa0a0a0);
  }

  private createPlaceholderIfMissing(
    key: string,
    width: number,
    height: number,
    color: number
  ) {
    if (this.textures.exists(key)) {
      return;
    }

    const gfx = this.add.graphics();
    gfx.fillStyle(color, 1);
    gfx.fillRect(0, 0, width, height);
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

      if (hasImage) {
        report.loadedImages.push(sheet.key);
      } else {
        report.missingImages.push(sheet.key);
      }

      if (meta) {
        report.loadedMeta.push(sheet.key);
      } else {
        report.missingMeta.push(sheet.key);
      }

      if (hasImage && !this.textures.exists(sheet.key)) {
        const texture = this.textures.get(imgKey);
        const source = texture.getSourceImage() as HTMLImageElement | undefined;
        if (source) {
          const tileSize = typeof meta?.tileSize === "number" ? meta.tileSize : 16;
          this.textures.addSpriteSheet(sheet.key, source, {
            frameWidth: tileSize,
            frameHeight: tileSize
          });
        }
      }
    }

    const audioCache = this.cache.audio;
    for (const trackKey of trackKeys) {
      if (audioCache.exists(trackKey)) {
        report.loadedAudio.push(trackKey);
      } else {
        report.missingAudio.push(trackKey);
      }
    }

    return report;
  }

  private reportAssets(report: AssetReport) {
    const hasMissing =
      report.missingImages.length > 0 ||
      report.missingMeta.length > 0 ||
      report.missingAudio.length > 0;
    gameState.assetsMissing = hasMissing;

    console.log("Asset Report", {
      images: {
        loaded: report.loadedImages,
        missing: report.missingImages
      },
      meta: {
        loaded: report.loadedMeta,
        missing: report.missingMeta
      },
      audio: {
        loaded: report.loadedAudio,
        missing: report.missingAudio
      }
    });
  }
}
