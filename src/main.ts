import { createGame } from "./game";
import { analytics } from "./analytics";
analytics.page();

declare global {
  interface Window {
    __JUMPING_ON_COALS_GAME__?: ReturnType<typeof createGame>;
  }
}

const game = createGame();

if (import.meta.env.DEV) {
  window.__JUMPING_ON_COALS_GAME__ = game;
}

import { mountPrivacyControl } from "./analytics/browser.js";
mountPrivacyControl(document.querySelector("#analytics-privacy"), analytics);
