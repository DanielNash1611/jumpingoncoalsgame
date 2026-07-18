export type HudTone = "sunset" | "twilight" | "coals" | "earth" | "ash" | "dawn";

export type ChoiceSide = "left" | "right";

class GameHud {
  private readonly root = this.requireElement<HTMLDivElement>("game-ui");
  private readonly frame = this.requireElement<HTMLDivElement>("ui-frame");
  private readonly titlePanel = this.requireElement<HTMLElement>("ui-title-panel");
  private readonly titleSound = this.requireElement<HTMLDivElement>("ui-title-sound");
  private readonly loading = this.requireElement<HTMLElement>("ui-loading");
  private readonly loadingLabel = this.requireElement<HTMLDivElement>("ui-loading-label");
  private readonly loadingFill = this.requireElement<HTMLDivElement>("ui-loading-fill");
  private readonly hud = this.requireElement<HTMLDivElement>("ui-hud");
  private readonly chapter = this.requireElement<HTMLDivElement>("ui-chapter");
  private readonly trackLabel = this.requireElement<HTMLSpanElement>("ui-track-label");
  private readonly progressFill = this.requireElement<HTMLDivElement>("ui-progress-fill");
  private readonly status = this.requireElement<HTMLDivElement>("ui-status");
  private readonly objective = this.requireElement<HTMLDivElement>("ui-objective");
  private readonly toast = this.requireElement<HTMLDivElement>("ui-toast");
  private readonly whisper = this.requireElement<HTMLDivElement>("ui-whisper");
  private readonly cinematic = this.requireElement<HTMLElement>("ui-cinematic");
  private readonly cinematicTitle = this.requireElement<HTMLHeadingElement>("ui-cinematic-title");
  private readonly cinematicBody = this.requireElement<HTMLParagraphElement>("ui-cinematic-body");
  private readonly cinematicPrompt = this.requireElement<HTMLDivElement>("ui-cinematic-prompt");
  private toastTimer?: number;
  private whisperTimer?: number;
  private whisperSequence = 0;

  private readonly whisperLocations = [
    "ui-whisper--lower-left",
    "ui-whisper--upper-right",
    "ui-whisper--lower-right",
    "ui-whisper--upper-left"
  ] as const;

  reset(tone: HudTone = "sunset") {
    this.setTone(tone);
    this.setVisible(this.titlePanel, false);
    this.setVisible(this.loading, false);
    this.setVisible(this.hud, false);
    this.setVisible(this.objective, false);
    this.setVisible(this.toast, false);
    this.setVisible(this.whisper, false);
    this.whisper.classList.remove(...this.whisperLocations);
    this.setVisible(this.cinematic, false);
    this.frame.classList.remove("is-letterboxed");
    this.progressFill.style.width = "0%";
    this.status.textContent = "";
    if (this.toastTimer !== undefined) {
      window.clearTimeout(this.toastTimer);
      this.toastTimer = undefined;
    }
    if (this.whisperTimer !== undefined) {
      window.clearTimeout(this.whisperTimer);
      this.whisperTimer = undefined;
    }
  }

  setTone(tone: HudTone) {
    this.root.dataset.tone = tone;
  }

  showTitle(muted: boolean) {
    this.reset("sunset");
    this.updateTitleSound(muted);
    this.setVisible(this.titlePanel, true);
  }

  updateTitleSound(muted: boolean) {
    this.titleSound.textContent = muted ? "M · Sound off" : "M · Sound on";
  }

  showLoading(progress = 0, label = "Gathering the evening") {
    this.reset("sunset");
    this.loadingLabel.textContent = label;
    this.loadingFill.style.width = `${Math.round(progress * 100)}%`;
    this.setVisible(this.loading, true);
  }

  updateLoading(progress: number, label?: string) {
    this.loadingFill.style.width = `${Math.round(Math.max(0, Math.min(1, progress)) * 100)}%`;
    if (label) {
      this.loadingLabel.textContent = label;
    }
  }

  showHud(options: {
    chapter: string;
    objective: string;
    trackLabel: string;
    tone?: HudTone;
    status?: string;
  }) {
    this.reset(options.tone ?? "sunset");
    this.chapter.textContent = options.chapter;
    this.trackLabel.textContent = options.trackLabel;
    this.status.textContent = options.status ?? "";
    this.objective.textContent = options.objective;
    this.setVisible(this.hud, true);
    this.setVisible(this.objective, true);
  }

  setChapter(value: string) {
    this.chapter.textContent = value;
  }

  setObjective(value: string) {
    this.objective.textContent = value;
    this.setVisible(this.objective, Boolean(value));
  }

  setStatus(value: string) {
    this.status.textContent = value;
  }

  setProgress(value: number, label?: string) {
    const clamped = Math.max(0, Math.min(1, value));
    this.progressFill.style.width = `${clamped * 100}%`;
    if (label) {
      this.trackLabel.textContent = label;
    }
  }

  showToast(message: string, duration = 1150) {
    if (this.toastTimer !== undefined) {
      window.clearTimeout(this.toastTimer);
    }
    this.toast.textContent = message;
    this.setVisible(this.toast, true);
    this.toastTimer = window.setTimeout(() => {
      this.setVisible(this.toast, false);
      this.toastTimer = undefined;
    }, duration);
  }

  showWhisper(message: string, duration = 2400) {
    if (this.whisperTimer !== undefined) {
      window.clearTimeout(this.whisperTimer);
    }
    this.setVisible(this.whisper, false);
    this.whisper.classList.remove(...this.whisperLocations);
    // Restart the fade when catches arrive before the prior encouragement has cleared.
    void this.whisper.offsetWidth;
    this.whisper.textContent = message;
    this.whisper.classList.add(
      this.whisperLocations[this.whisperSequence % this.whisperLocations.length]
    );
    this.whisperSequence += 1;
    this.setVisible(this.whisper, true);
    this.whisperTimer = window.setTimeout(() => {
      this.setVisible(this.whisper, false);
      this.whisperTimer = undefined;
    }, duration);
  }

  showCinematic(title: string, body = "", prompt = "", letterbox = true) {
    this.cinematicTitle.textContent = title;
    this.cinematicBody.textContent = body;
    this.cinematicPrompt.classList.remove("is-choice", "is-selector");
    this.cinematicPrompt.textContent = prompt;
    this.cinematicBody.style.display = body ? "block" : "none";
    this.cinematicPrompt.style.display = prompt ? "block" : "none";
    this.frame.classList.toggle("is-letterboxed", letterbox);
    this.setVisible(this.cinematic, true);
  }

  showChoice(title: string, body: string, left: string, right: string, selected: ChoiceSide) {
    this.showCinematic(title, body, "", true);
    const leftOption = document.createElement("span");
    const rightOption = document.createElement("span");
    leftOption.className = `ui-choice-option${selected === "left" ? " is-selected" : ""}`;
    rightOption.className = `ui-choice-option${selected === "right" ? " is-selected" : ""}`;
    leftOption.textContent = `${selected === "left" ? "●" : "○"} ${left}`;
    rightOption.textContent = `${right} ${selected === "right" ? "●" : "○"}`;
    this.cinematicPrompt.replaceChildren(leftOption, rightOption);
    this.cinematicPrompt.classList.add("is-choice");
    this.cinematicPrompt.style.display = "block";
  }

  showSelector(title: string, body: string, options: readonly string[], selectedIndex: number) {
    this.showCinematic(title, body, "", true);
    const option = document.createElement("span");
    option.className = "ui-choice-option is-selected";
    option.textContent = `←  ${options[selectedIndex]}  →`;
    const confirm = document.createElement("span");
    confirm.className = "ui-selector-confirm";
    confirm.textContent = "Space · go there";
    this.cinematicPrompt.replaceChildren(option, confirm);
    this.cinematicPrompt.classList.add("is-selector");
    this.cinematicPrompt.style.display = "flex";
  }

  hideCinematic() {
    this.setVisible(this.cinematic, false);
    this.frame.classList.remove("is-letterboxed");
  }

  setLetterbox(visible: boolean) {
    this.frame.classList.toggle("is-letterboxed", visible);
  }

  clear() {
    this.reset((this.root.dataset.tone as HudTone | undefined) ?? "sunset");
  }

  private setVisible(element: HTMLElement, visible: boolean) {
    element.classList.toggle("is-visible", visible);
    element.setAttribute("aria-hidden", String(!visible));
  }

  private requireElement<T extends HTMLElement>(id: string): T {
    const element = document.getElementById(id);
    if (!element) {
      throw new Error(`Missing game UI element #${id}`);
    }
    return element as T;
  }
}

export const gameHud = new GameHud();
