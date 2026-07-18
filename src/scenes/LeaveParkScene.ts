import Phaser from "phaser";
import { audioManager } from "../game/audio/AudioManager";
import { StoryControls } from "../game/input/StoryControls";
import type { LeaveMoment } from "../game/narrative/LeaveAnxiety";
import { gameState } from "../game/state/gameState";
import { gameHud, type HudTone } from "../game/ui/GameHud";
import { playFirstAvailable } from "../game/visuals/StoryVisuals";
import { BaseScene } from "./BaseScene";

type LeavePresentation = {
  background: string;
  tone: HudTone;
  title: string;
  body: string;
};

const LEAVE_PRESENTATIONS: Record<LeaveMoment, LeavePresentation> = {
  "after-swing": {
    background: "playground_twilight",
    tone: "twilight",
    title: "Your feet stay on the ground",
    body: "The swing slows behind you. The gate was always another direction."
  },
  "lost-balance": {
    background: "playground_twilight",
    tone: "twilight",
    title: "You do not climb back up",
    body: "The beam keeps trembling after you turn toward the gate."
  },
  burned: {
    background: "playground_coals",
    tone: "coals",
    title: "The last cool place is enough",
    body: "The coals keep breathing. You choose not to cross them again."
  },
  "at-hole": {
    background: "playground_coals",
    tone: "earth",
    title: "You leave the shovel where it is",
    body: "The opening remains shallow. It does not become the bottom."
  },
  "return-swing": {
    background: "playground_morning",
    tone: "dawn",
    title: "This time, you stay off",
    body: "The empty swing keeps moving as you walk toward the gate."
  },
  "by-shovel": {
    background: "by_the_shovel_sunrise",
    tone: "dawn",
    title: "You leave the playground",
    body: "Nothing says whether it was escape, surrender, or simply enough."
  }
};

export class LeaveParkScene extends BaseScene {
  private controls?: StoryControls;
  private player?: Phaser.GameObjects.Sprite;
  private moment: LeaveMoment = "after-swing";
  private complete = false;
  private returningToTitle = false;

  constructor() {
    super("LeaveParkScene");
  }

  init(data?: { moment?: LeaveMoment }) {
    this.moment = data?.moment ?? "after-swing";
  }

  create() {
    console.log(`[JOC] scene:leave-park · ${this.moment}`);
    super.create();
    audioManager.stop();
    gameState.endingChoice = "leave";
    this.complete = false;
    this.returningToTitle = false;

    const presentation = LEAVE_PRESENTATIONS[this.moment];
    this.cameras.main.setBackgroundColor("#0c0910");
    this.cameras.main.fadeIn(620, 8, 7, 10);
    this.add.image(160, 90, presentation.background).setDisplaySize(320, 180).setDepth(0);
    this.add.rectangle(160, 90, 320, 180, 0x0b0810, 0.22).setDepth(1);

    this.player = this.add.sprite(92, 143, "player").setDepth(10).setFlipX(false);
    playFirstAvailable(this, this.player, ["player:walk", "player:swing", "player:idle"]);
    this.controls = new StoryControls(this, "END");

    gameHud.showHud({
      chapter: "Leaving the Park",
      objective: "The gate is open",
      trackLabel: "Silence",
      tone: presentation.tone,
      status: "Another direction"
    });
    gameHud.showCinematic(presentation.title, presentation.body, "", true);

    this.tweens.add({
      targets: this.player,
      x: 342,
      duration: 2100,
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.complete = true;
        gameHud.showCinematic(
          presentation.title,
          presentation.body,
          "Space · let the evening end",
          true
        );
      }
    });
  }

  update() {
    if (!this.controls || !this.complete || this.returningToTitle) {
      return;
    }
    if (!this.controls.read().action) {
      return;
    }
    this.returningToTitle = true;
    this.cameras.main.fadeOut(620, 9, 8, 11);
    this.time.delayedCall(650, () => {
      gameHud.hideCinematic();
      this.scene.start("BootScene");
    });
  }
}
