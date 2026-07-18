import Phaser from "phaser";

export function fadeToScene(
  scene: Phaser.Scene,
  targetScene: string,
  duration = 250,
  data?: object
) {
  const camera = scene.cameras.main;
  if (camera.fadeEffect.isRunning) {
    return;
  }
  camera.fadeOut(duration, 0, 0, 0);
  scene.time.delayedCall(duration + 24, () => {
    scene.scene.start(targetScene, data);
  });
}
