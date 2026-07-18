import { gameHud, type ChoiceSide } from "../ui/GameHud";

export type LeaveMoment =
  | "after-swing"
  | "lost-balance"
  | "burned"
  | "at-hole"
  | "return-swing"
  | "by-shovel";

export type LeaveAnxietyResult = "return" | "leave";

type AnxietyPrompt = {
  title: string;
  body: string;
};

const FIRST_DOUBT: Record<LeaveMoment, AnxietyPrompt> = {
  "after-swing": {
    title: "Waste all that momentum?",
    body: "You finally found the rhythm. A high performer would use it, not walk away before the difficult part."
  },
  "lost-balance": {
    title: "Let one fall decide for you?",
    body: "Capable people recover quickly. Leaving now might make the fall look like your limit."
  },
  burned: {
    title: "Stop because it hurt?",
    body: "Everyone gets burned. The people who get ahead are supposed to be the ones who keep moving anyway."
  },
  "at-hole": {
    title: "Leave before the real work?",
    body: "You crossed everything to reach this point. Walking away now could make all that effort look unfinished."
  },
  "return-swing": {
    title: "After working this hard to return?",
    body: "You made it all the way back. Leaving now might mean the recovery never became anything useful."
  },
  "by-shovel": {
    title: "Leave without turning it into a win?",
    body: "After everything it took to get out, shouldn't you make the experience count for something?"
  }
};

const SHARED_DOUBTS: readonly AnxietyPrompt[] = [
  {
    title: "What will you say when they ask?",
    body: "People know you as reliable—the one who finishes, handles more, and does not need an easier way out."
  },
  {
    title: "What if everyone else keeps going?",
    body: "They could move ahead while you stand still. You might never know whether one more push would have been enough."
  },
  {
    title: "Who are you if you stop?",
    body: "If you are not the person who can carry more than everyone expects, what is left to prove your worth?"
  }
];

export class LeaveAnxiety {
  private readonly prompts: readonly AnxietyPrompt[];
  private index = 0;
  private choice: ChoiceSide = "left";

  constructor(
    moment: LeaveMoment,
    private readonly returnLabel: string
  ) {
    this.prompts = [FIRST_DOUBT[moment], ...SHARED_DOUBTS];
  }

  begin() {
    this.index = 0;
    this.choice = "left";
    this.render();
  }

  update(left: boolean, right: boolean, action: boolean): LeaveAnxietyResult | null {
    const previous = this.choice;
    if (left !== right) {
      this.choice = left ? "left" : "right";
    }
    if (previous !== this.choice) {
      this.render();
    }
    if (!action) {
      return null;
    }
    if (this.choice === "left") {
      return "return";
    }
    if (this.index < this.prompts.length - 1) {
      this.index += 1;
      this.choice = "left";
      this.render();
      return null;
    }
    return "leave";
  }

  private render() {
    const prompt = this.prompts[this.index];
    gameHud.setStatus(`Second thoughts · ${this.index + 1}/${this.prompts.length}`);
    gameHud.showChoice(
      prompt.title,
      prompt.body,
      this.returnLabel,
      this.index === this.prompts.length - 1 ? "Leave the park" : "Leave anyway",
      this.choice
    );
  }
}
