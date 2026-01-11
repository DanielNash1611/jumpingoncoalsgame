import Phaser from "phaser";

export function fadeToScene(
  scene: Phaser.Scene,
  targetScene: string,
  duration = 250
) {
  const camera = scene.cameras.main;
  if (camera.fadeEffect.isRunning) {
    return;
  }

  camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
    scene.scene.start(targetScene);
  });
  camera.fadeOut(duration, 0, 0, 0);
}
