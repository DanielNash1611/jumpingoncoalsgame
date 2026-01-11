# Jumping on Coals (Vertical Slice)

Jumping on Coals is a small, artistic web game prototype built as a vertical slice. It focuses on three short experiences: Swing, Losing Balance, and Coals.

## Run Locally
1) Install Node.js (version 20 LTS recommended)
2) Install dependencies:
```powershell
npm install
```
3) Start the dev server:
```powershell
npm run dev
```

## Add Assets
Place your files here:
- Audio: `public/assets/audio/*.mp3`
- Sprites: `public/assets/sprites/*.png`
- Tiles: `public/assets/tiles/*.png`

## Deploy to Vercel
1) Push the project to GitHub
2) In Vercel, import the GitHub repo
3) Build command: `npm run build`
4) Output directory: `dist`
5) Add a custom domain in Vercel (optional)

## Troubleshooting
- Audio won’t play until the first click or key press. This is expected browser behavior.
- If assets are missing, the game uses simple placeholder graphics. This is expected.

## Dev Hotkeys
- `R`: restart current scene
- `1`: go to SwingScene
- `2`: go to CoalsScene
- `P`: toggle physics debug
- `N`: advance track (01 ? 02 ? 03)
- `D`: toggle heat/stamina debug in Coals
