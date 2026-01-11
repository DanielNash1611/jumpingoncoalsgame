export const SWING_CONSTANTS = {
  anchorX: 160,
  anchorY: 20,
  ropeLength: 60,
  maxAngle: Math.PI / 3,
  torque: 0.06,
  damping: 0.98,
  maxAngularVelocity: 0.12
};

export const PLAYER_CONSTANTS = {
  moveSpeed: 110,
  jumpVelocity: -260
};

export const COALS_CONSTANTS = {
  tileSize: 16,
  gridWidth: 60,
  gridHeight: 12,
  moveSpeed: 120,
  jumpVelocity: -270,
  heatRiseIdle: 0.22,
  heatRiseMoving: 0.08,
  heatCool: 0.18,
  heatSlowStart: 0.6,
  heatSlowMax: 0.35,
  heatShakeStart: 0.7,
  heatShakeMax: 1.5,
  staminaRegen: 0.22,
  staminaJumpDrain: 0.18,
  staminaJumpDrainStep: 0.06,
  staminaJumpMinScale: 0.55
};
