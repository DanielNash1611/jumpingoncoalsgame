export const trackKeys = [
  "01_back_in_the_swing",
  "02_losing_balance",
  "03_jumping_on_coals",
  "04_digging_in",
  "05_at_the_bottom",
  "06_digging_out",
  "07_by_the_shovel",
  "08_back_in_the_swing_again"
] as const;

export type TrackKey = (typeof trackKeys)[number];

export const trackFiles: Record<TrackKey, string> = {
  "01_back_in_the_swing": "01 Back in the Swing.wav",
  "02_losing_balance": "02 Losing Balance.wav",
  "03_jumping_on_coals": "03 Jumping on Coals.wav",
  "04_digging_in": "04 Digging In.wav",
  "05_at_the_bottom": "05 At the Bottom.wav",
  "06_digging_out": "06 Digging Out.wav",
  "07_by_the_shovel": "07 By the Shovel.wav",
  "08_back_in_the_swing_again": "08 Back in the Swing (Again).wav"
};

export type SpriteSheetKey = "player" | "coals" | "rope" | "particles";

export const spriteSheets: Array<{
  key: SpriteSheetKey;
  imgPath: string;
  metaPath: string;
}> = [
  {
    key: "player",
    imgPath: "assets/sprites/player.png",
    metaPath: "assets/sprites/player.json"
  },
  {
    key: "coals",
    imgPath: "assets/sprites/coals.png",
    metaPath: "assets/sprites/coals.json"
  },
  {
    key: "rope",
    imgPath: "assets/sprites/rope.png",
    metaPath: "assets/sprites/rope.json"
  },
  {
    key: "particles",
    imgPath: "assets/sprites/particles.png",
    metaPath: "assets/sprites/particles.json"
  }
];
