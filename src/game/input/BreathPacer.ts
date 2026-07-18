export type BreathPace = {
  healthy: boolean;
  streak: number;
};

const HEALTHY_BREATH_MIN_MS = 2400;
const HEALTHY_BREATH_MAX_MS = 5200;

export class BreathPacer {
  private lastBreathAt?: number;
  private streak = 0;

  reset() {
    this.lastBreathAt = undefined;
    this.streak = 0;
  }

  register(now: number): BreathPace {
    const interval = this.lastBreathAt === undefined ? undefined : now - this.lastBreathAt;
    this.lastBreathAt = now;
    const healthy = interval !== undefined
      && interval >= HEALTHY_BREATH_MIN_MS
      && interval <= HEALTHY_BREATH_MAX_MS;
    this.streak = healthy ? this.streak + 1 : 0;
    return { healthy, streak: this.streak };
  }
}
