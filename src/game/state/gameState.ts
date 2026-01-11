import type { TrackKey } from "../assets/assetConfig";

export const gameState = {
  hasUnlockedAudio: false,
  currentTrackKey: null as TrackKey | null,
  inSilence: false,
  balanceLoss: 0,
  assetsMissing: false
};
