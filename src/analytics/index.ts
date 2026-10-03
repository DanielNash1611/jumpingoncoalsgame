import { createAnalytics } from "./browser.js";
export const analytics = createAnalytics({
  "app": "jumpingoncoalsgame",
  "origins": [
    "https://jumpingoncoals.danielnash.co",
    "https://jumpingoncoalsgame.vercel.app",
    "https://jumpingoncoalsgame-danash1611-3756s-projects.vercel.app",
    "https://jumpingoncoalsgame-git-master-danash1611-3756s-projects.vercel.app"
  ],
  "previewPrefix": "jumpingoncoalsgame",
  "pages": [
    "/",
    "/other"
  ],
  "events": [
    "game_started",
    "game_completed",
    "chapter_reached"
  ]
});
