import { createGame } from "./game";

declare global {
  interface Window {
    __JUMPING_ON_COALS_GAME__?: ReturnType<typeof createGame>;
  }
}

const game = createGame();

if (import.meta.env.DEV) {
  window.__JUMPING_ON_COALS_GAME__ = game;
}
