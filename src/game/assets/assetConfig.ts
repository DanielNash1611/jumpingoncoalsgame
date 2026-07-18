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
  "01_back_in_the_swing": "01-back-in-the-swing.mp3",
  "02_losing_balance": "02-losing-balance.mp3",
  "03_jumping_on_coals": "03-jumping-on-coals.mp3",
  "04_digging_in": "04-digging-in.mp3",
  "05_at_the_bottom": "05-at-the-bottom.mp3",
  "06_digging_out": "06-digging-out.mp3",
  "07_by_the_shovel": "07-by-the-shovel.mp3",
  "08_back_in_the_swing_again": "08-back-in-the-swing-again.mp3"
};

export const environmentImages = {
  playground_sunset: "assets/backgrounds/playground-sunset.png",
  playground_twilight: "assets/backgrounds/playground-twilight.png",
  playground_morning: "assets/backgrounds/playground-morning.png",
  playground_midday: "assets/backgrounds/playground-midday.png",
  playground_night: "assets/backgrounds/playground-night.png",
  playground_coals: "assets/backgrounds/playground-coals.png",
  by_the_shovel: "assets/backgrounds/by-the-shovel.png",
  by_the_shovel_sunrise: "assets/backgrounds/by-the-shovel-sunrise.png",
  underground_cycle: "assets/backgrounds/underground-cycle.png"
} as const;

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
