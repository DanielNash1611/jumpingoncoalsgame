export const SWING_CONSTANTS = {
  anchorX: 160,
  anchorY: 45,
  ropeLength: 62,
  maxAngle: 1.08,
  gravity: 2.45,
  pumpTorque: 2.15,
  counterTorque: 0.72,
  dampingPerFrame: 0.996,
  maxAngularVelocity: 2.45,
  apexSoftAngle: 0.76,
  apexSpring: 1.5,
  apexDamping: 5,
  strongArcAngle: 0.62,
  arcsToRelease: 3
};

export function getSwingApexAcceleration(angle: number, angularVelocity: number) {
  const distanceIntoApex = Math.abs(angle) - SWING_CONSTANTS.apexSoftAngle;
  if (distanceIntoApex <= 0) {
    return 0;
  }

  const apexRange = SWING_CONSTANTS.maxAngle - SWING_CONSTANTS.apexSoftAngle;
  const progress = distanceIntoApex / apexRange;
  const restoringForce = -Math.sign(angle) * SWING_CONSTANTS.apexSpring * progress * progress;
  const movingOutward = Math.sign(angularVelocity) === Math.sign(angle);
  const dampingForce = movingOutward
    ? -angularVelocity * SWING_CONSTANTS.apexDamping * Math.min(progress, 1) ** 2
    : 0;

  return restoringForce + dampingForce;
}

export const BALANCE_CONSTANTS = {
  startX: 32,
  endX: 286,
  beamY: 126,
  stages: 5,
  stepsPerStage: 14,
  stumblesToFall: 3,
  cueLeadMs: [3100, 2850, 2550, 2250, 3000],
  cueReadableMs: [480, 520, 560, 620, 760]
};

export const PLAYER_CONSTANTS = {
  moveSpeed: 92,
  groundAcceleration: 720,
  airAcceleration: 430,
  jumpVelocity: -232,
  coyoteMs: 105,
  jumpBufferMs: 125
};

export const COALS_CONSTANTS = {
  worldWidth: 26400,
  floorY: 164,
  heatRiseIdle: 0.46,
  heatRiseMoving: 0.3,
  heatCoolAir: 0.16,
  heatCoolSafe: 0.54,
  slowStart: 0.68,
  maxSlow: 0.24,
  flowSpeedBonus: 0.02,
  totalSparks: 15,
  holeX: 26270
};
