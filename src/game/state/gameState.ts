import type { TrackKey } from "../assets/assetConfig";

export const gameState = {
  hasUnlockedAudio: false,
  currentTrackKey: null as TrackKey | null,
  inSilence: false,
  assetsMissing: false,
  muted: false,
  balanceFalls: 0,
  sparksCollected: 0,
  bestFlow: 0,
  cycleCount: 0,
  endingChoice: null as "leave" | "return" | null
};

export function resetRunState() {
  gameState.balanceFalls = 0;
  gameState.sparksCollected = 0;
  gameState.bestFlow = 0;
  gameState.cycleCount = 0;
  gameState.endingChoice = null;
}
