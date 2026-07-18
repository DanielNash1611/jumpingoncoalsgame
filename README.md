# Jumping on Coals

`Jumping on Coals` is a 37–42 minute pixel-art web game about ambition, burnout, recovery, and the uneasy pull of familiar cycles. The player moves through eight tactile chapters—swinging, balancing, crossing coals, digging down, recovering, climbing out, reflecting, and deciding whether to return—while an eight-song original album supplies the duration and dramatic shape of the journey.

The project began before OpenAI Build Week as an album-connected concept and a three-track Phaser prototype. During the July 16–17, 2026 Build Week session, it was substantially advanced into an eight-chapter playable implementation with reworked opening mechanics, a full coal route, recovery and ending chapters, player-controlled off-ramps, compressed browser audio, presentation art, touch input, and development shortcuts. See [the Build Week evidence](./BUILD_WEEK.md) and [chronological development log](./docs/build-week-development-log.md) for the supported before-and-after story.

Media status: final submission screenshots and a sub-three-minute gameplay video still need to be captured. Planned deliverables are listed in [docs/media/README.md](./docs/media/README.md); no broken image links are included here.

## The album is the narrative

The music is not interchangeable background audio and the game is not a rhythm game. Each non-looping song owns one chapter, sets its natural duration, and moves the environment through five broad dramatic phases. When a song reaches silence, it unlocks a final action or choice; it does not automatically skip the player into the next chapter. The resulting album sequence is the game's burnout cycle:

1. **Back in the Swing** — rebuild momentum, reach for lights, and choose when to release.
2. **Losing Balance** — read wind cues and commit each step across a beam.
3. **Jumping on Coals** — manage heat, airtime, Flow, and checkpoints across a long route.
4. **Digging In** — read weak earth while useful work becomes exhaustion.
5. **At the Bottom** — use steady breaths and memory to regain the ability to stand.
6. **Digging Out** — convert alternating strikes into a short, desperate ascent.
7. **By the Shovel** — recover under an opening sky and choose whether to leave or return.
8. **Back in the Swing (Again)** — revisit a satisfying old motion and decide when to step off.

The design contract and chapter acceptance criteria live in [GAME_DESIGN_DOCUMENT.md](./GAME_DESIGN_DOCUMENT.md).

## Run locally

Requirements:

- Node.js 20.19 or newer in the Node 20 line, or Node.js 22.12+ (validated with Node.js 22.22.1)
- A current desktop or mobile browser with Web Audio and Canvas support

```sh
npm ci
npm run dev
```

Open the URL printed by Vite (normally `http://localhost:5173/`), then press any key or tap once to unlock browser audio and begin.

Create a production build with:

```sh
npm run build
```

For Vercel, use `npm run build` and the `dist` output directory.

## Controls

- `A/D` or `←/→`: pump, balance, move, aim, or change focus
- `W`, `↑`, or `Space`: release, jump, dig, breathe, dismount, or confirm
- `Esc`: pause
- `M`: mute
- Touch: on-screen direction and action controls appear on touch-capable devices

## Developer and judge shortcuts

These shortcuts make the long, music-paced arc practical to inspect in development:

- `R`: restart the current chapter
- `1`: opening swing; `B`: enter the balance phase
- `2`: coal route; `E`: open its final choice directly
- `4`–`8`: Digging In, At the Bottom, Digging Out, By the Shovel, or Back in the Swing (Again)
- `Shift+F9`: move the current track to its last two seconds and prepare the scene's outro gate
- `K`: put the current track into silence; in chapter VIII it also prepares the dismount gate
- `[` / `]`: move the current track backward or forward by 20%
- `G`: add a gathered light in the opening swing or collect the optional coal memories
- `N`: cycle the eight album tracks
- `P`: toggle physics debug
- `` ` ``: toggle the runtime debug readout

## Asset layout

- Runtime environment art: `public/assets/backgrounds/`
- Runtime compressed album audio: `public/assets/audio-web/`
- Runtime sprites and metadata: `public/assets/sprites/`
- High-resolution visual source files: `source_assets/backgrounds/` and `source_assets/sprites/`
- Local archival WAV masters: `source_assets/audio-masters/` (gitignored and not required to build)

Missing optional sprite assets fall back to generated placeholders. Asset ownership and redistribution terms should be documented before making the repository public.
