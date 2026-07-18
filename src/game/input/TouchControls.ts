import type Phaser from "phaser";

export class TouchControls {
  left = false;
  right = false;
  private actionQueued = false;
  private readonly root?: HTMLDivElement;
  private actionButton?: HTMLButtonElement;

  constructor(_scene: Phaser.Scene, actionLabel = "JUMP") {
    if (!this.shouldShow()) {
      return;
    }

    const frame = document.getElementById("ui-frame");
    if (!frame) {
      return;
    }

    this.root = document.createElement("div");
    this.root.className = "ui-touch-controls";
    frame.appendChild(this.root);
    this.addHoldButton("left", "←", "Move left", (value) => {
      this.left = value;
    });
    this.addHoldButton("right", "→", "Move right", (value) => {
      this.right = value;
    });
    this.addActionButton(actionLabel);
  }

  consumeAction(): boolean {
    const queued = this.actionQueued;
    this.actionQueued = false;
    return queued;
  }

  setActionLabel(label: string) {
    if (!this.actionButton) {
      return;
    }
    this.actionButton.textContent = label;
    this.actionButton.setAttribute("aria-label", label);
  }

  destroy() {
    this.left = false;
    this.right = false;
    this.root?.remove();
  }

  private shouldShow() {
    return navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches;
  }

  private addHoldButton(
    side: "left" | "right",
    label: string,
    ariaLabel: string,
    setValue: (value: boolean) => void
  ) {
    if (!this.root) {
      return;
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = `ui-touch-button ui-touch-button--${side}`;
    button.textContent = label;
    button.setAttribute("aria-label", ariaLabel);
    const release = () => {
      setValue(false);
      button.classList.remove("is-pressed");
    };
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      setValue(true);
      button.classList.add("is-pressed");
    });
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
    this.root.appendChild(button);
  }

  private addActionButton(label: string) {
    if (!this.root) {
      return;
    }
    const button = document.createElement("button");
    this.actionButton = button;
    button.type = "button";
    button.className = "ui-touch-button ui-touch-button--action";
    button.textContent = label;
    button.setAttribute("aria-label", label);
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      this.actionQueued = true;
      button.classList.add("is-pressed");
    });
    const release = () => button.classList.remove("is-pressed");
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("pointerout", release);
    this.root.appendChild(button);
  }
}
