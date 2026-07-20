# Jumping on Coals — OpenAI Build Week

## Project overview

`Jumping on Coals` is a pixel-art web game about ambition, burnout, recovery, and the uneasy pull of familiar cycles. The player begins on a childhood swing, loses balance, crosses a long bed of coals, digs until collapse, learns to move again, climbs out, and eventually decides whether returning to the swing is recovery or repetition. The current target experience lasts about 37–42 minutes; the eight included tracks total roughly 37.5 minutes, with short player-controlled transitions between them.

The game is connected to Daniel Nash's original album of the same arc. Each non-looping song owns a chapter and controls its dramatic duration: the environment and available activity change across the track, then natural silence exposes a final player action. The songs are therefore narrative structure rather than interchangeable background music. Input is tactile but not beat-mapped, and a finished track does not automatically take control away from the player.

The result is an interactive version of the album's emotional cycle. Momentum feels rewarding, overwork narrows the player's options, recovery is deliberately slow, and the ending preserves an ambiguous choice instead of assigning a score or moral.

## Project history

The Jumping on Coals concept, original album music, gameplay ideas, assets, and initial prototype all predate OpenAI Build Week. The Git baseline is commit `619a147` from January 10, 2026, titled `Initial commit with base game assets and code`; it contains the Phaser/TypeScript/Vite foundation, all eight WAV masters, sprite metadata, and a vertical slice centered on Swing, Losing Balance, and Coals.

Daniel previously worked on the project during the GPT-5.2 era, then stopped when several interconnected technical and creative systems remained unresolved. He revisited it during Build Week with Codex and GPT-5.6. This submission describes the transformation made in that session; it does not claim that the album, concept, or entire project was created during Build Week.

## Before Build Week

Confirmed by the January baseline commit:

- The original eight-track album audio was already present as large WAV files.
- The Phaser 3, TypeScript, and Vite application foundation already existed at 320×180 internal resolution.
- `SwingScene` and `CoalsScene`, asset preloading, an audio manager, basic state, sprite metadata, and placeholder fallbacks already existed.
- The README described a three-experience vertical slice: Swing, Losing Balance, and Coals.
- The swing accepted left/right input and allowed a dismount; the coal prototype had heat and stamina variables on a short, flat grid.
- Debug audio/physics controls and the compact `CODEX_NORTH_STAR.md` guardrail already existed in simpler form.

Reasonable interpretation, explicitly supported by the old code and the Build Week design document:

- The prototype established the technical direction but not a complete eight-song playable arc.
- Swing had motion but no multi-step objective, Losing Balance was mainly a progressive camera disturbance inside the swing scene, and Coals ended by returning to Swing after silence.
- Tracks four through eight had music files but no corresponding playable scene implementations.

The repository does not contain enough historical commits to assign every preexisting idea or asset to an exact earlier date. Claims beyond the January baseline rely on the project history supplied by Daniel and are labeled as such.

## Built or improved during Build Week

### 1. Expanded the three-track vertical slice into an eight-chapter implementation

- **What changed:** Added playable implementations for Digging In, At the Bottom, Digging Out, By the Shovel, Back in the Swing (Again), and the Leave Park ending, then registered the full scene sequence.
- **Why it mattered:** Album tracks four through eight now have distinct interaction, presentation, and transitions instead of existing only as audio files.
- **What was difficult or blocked:** The chapters depend on one another emotionally and mechanically: work must become exhaustion, stillness must become recovery, and the ending must make returning feel both attractive and uneasy.
- **How to see it:** Start the game and use `4`, `5`, `6`, `7`, and `8`. Each shortcut opens a distinct chapter with its own track label, objective, visual state, and mechanic. A full uninterrupted 37–42 minute playthrough remains to be recorded.
- **Relevant systems:** `src/scenes/DiggingInScene.ts`, `AtBottomScene.ts`, `DiggingOutScene.ts`, `ByShovelScene.ts`, `ReturnSwingScene.ts`, `LeaveParkScene.ts`, and `src/game.ts`.

### 2. Rebuilt the opening swing and balance chapters around readable player goals

- **What changed:** The swing now uses pendulum-like pumping, strong-arc tracking, apex release, collectible lights, gust response, and a player-confirmed transition. Losing Balance became a staged beam-crossing mechanic with leaf, lamp, wind, and ash cues; the player sets a counter-lean and commits each step.
- **Why it mattered:** The opening now teaches momentum and then destabilizes it through actions the player can read and perform, rather than relying mainly on motion and camera effects.
- **What was difficult or blocked:** The mechanic needed to follow full-length songs without becoming a rhythm game or allowing silence to auto-advance the story.
- **How to see it:** Press `1` for Swing, build arcs with left/right, and press Space at the release gate. Press `B` to inspect the balance phase. `Shift+F9` prepares the current outro for a short demo.
- **Relevant systems:** `src/scenes/SwingScene.ts`, `src/scenes/constants.ts`, `src/game/input/TouchControls.ts`, and `src/game/visuals/StoryVisuals.ts`.

### 3. Replaced the flat coal prototype with a chapter-length traversal and consequence loop

- **What changed:** Replaced the 60-tile flat grid with a deterministic 26,400-pixel route containing safe platforms, checkpoints, heat/cooling, buffered jumps and coyote time, Flow rewards, memory sparks, a pursuing fire front, respawn choices, and a final shallow opening.
- **Why it mattered:** Jumping on Coals is now a sustained traversal designed around its nearly five-minute track, with movement, risk, recovery, and a concrete destination.
- **What was difficult or blocked:** The route had to keep stopping dangerous without turning failure into a long reset, and it had to wait for natural silence while still giving active players something to pursue.
- **How to see it:** Press `2` to enter the route. Jumping and safe platforms change Heat and Flow; `E` opens the final hole choice for judging. Choosing Leave begins the second-thought sequence instead of silently ending or forcing progress.
- **Relevant systems:** `src/scenes/CoalsScene.ts`, `src/scenes/constants.ts`, `src/game/narrative/LeaveAnxiety.ts`, and `src/game/state/gameState.ts`.

### 4. Turned the album's second half into mechanics for burnout, recovery, and escape

- **What changed:** Digging In tracks useful and missed strikes as fatigue deepens; At the Bottom turns Space into paced breathing and posture recovery; Digging Out rewards correct alternating shovel strikes with Drive; By the Shovel connects focus and steady breaths to recovery under a changing sky.
- **Why it mattered:** The album's narrative now continues after the central coal image. Collapse, rest, and escape each have a different verb and pace rather than being summarized in text.
- **What was difficult or blocked:** These slower emotional states still needed meaningful input, visible progress, and player agency without making recovery feel like another score chase.
- **How to see it:** Use `4`–`7`. The HUD exposes fatigue, breath, Drive, focus, and recovery state; `Shift+F9` moves a chapter close to its natural ending so its continuation can be inspected.
- **Relevant systems:** the four chapter scene files, `src/game/input/BreathPacer.ts`, `StoryControls.ts`, and `src/game/visuals/StoryVisuals.ts`.

### 5. Added real off-ramps and a deliberately ambiguous return loop

- **What changed:** Added reusable leave choices after relief, failure, or commitment; a four-step achievement-anxiety sequence makes the player confirm leaving without removing that option. The final swing allows dismounting, leaving, getting back on, or selecting an earlier area.
- **Why it mattered:** The burnout theme now lives in player choice. The game neither celebrates repetition nor treats leaving as an automatic good ending.
- **What was difficult or blocked:** The second thoughts had to express momentum, reputation, sunk effort, comparison, and identity without covertly reversing the player's decision.
- **How to see it:** Press `2`, then `E`, choose `Leave the park`, and confirm. The first prompt becomes `Second thoughts · 1/4`. Press `8` to inspect the returning swing and its dismount flow.
- **Relevant systems:** `src/game/narrative/LeaveAnxiety.ts`, `src/scenes/LeaveParkScene.ts`, `ReturnSwingScene.ts`, `SwingScene.ts`, `CoalsScene.ts`, and `ByShovelScene.ts`.

### 6. Made the full album practical to load, present, and validate in a browser

- **What changed:** Replaced roughly 397 MB of tracked runtime WAV files with roughly 36 MB of MP3s, added scene-aware playback/silence state and debug seeking, created a responsive HTML HUD over the pixel canvas, added nine runtime backgrounds and an expanded player sheet, added pause/mute/touch/chapter shortcuts, and upgraded Vite 5 to Vite 8.1.5 after `npm audit` exposed vulnerable development dependencies.
- **Why it mattered:** The first playable moment is no longer blocked by downloading eight WAV masters, the game has readable presentation at modern display sizes, and a judge can inspect a 37-minute arc without waiting through every track.
- **What was difficult or blocked:** Audio must obey browser unlock rules, preserve non-looping silence semantics, survive missing assets, and remain synchronized with chapter state.
- **How to see it:** Run the title screen, start with a keypress, inspect the responsive HUD, and use `4`–`8`, `Shift+F9`, `K`, `[`/`]`, or `N`. The WAV masters remain local and gitignored; the production build uses `public/assets/audio-web/`.
- **Relevant systems:** `src/game/audio/AudioManager.ts`, `src/scenes/BootScene.ts`, `PreloadScene.ts`, `BaseScene.ts`, `src/game/ui/GameHud.ts`, `index.html`, `package.json`, `package-lock.json`, `public/assets/audio-web/`, `public/assets/backgrounds/`, and `public/assets/sprites/`.

## How Codex was used

Codex was used as the implementation partner for repository analysis, converting the creative objective into staged acceptance criteria, implementing and connecting features across scenes, debugging TypeScript and browser behavior, creating shared input/UI/narrative tools, and building judge-friendly developer shortcuts. The checked-in north-star and design documents keep the work tied to the album's intended emotional arc while the code shows coordinated changes across audio, state, physics, rendering, input, transitions, and narrative choice.

In the final submission-preparation pass, Codex compared the January commit with the full working-tree diff, audited untracked and large files, measured the audio reduction, ran the production build and TypeScript compiler, launched the game, manually inspected the title and playable chapters, exercised the coal ending/leave sequence, checked browser logs, and wrote this evidence-focused documentation. This reduced the gap between “feature code exists” and “a judge can verify an accurate claim.”

Codex accelerated execution by holding the complete arc and its constraints in view while working through dependent systems. It did not originate Daniel's album, game concept, or earlier prototype, and it did not autonomously create the entire project.

## How GPT-5.6 was used

According to the Build Week session history supplied by Daniel, GPT-5.6 was the model used with Codex during the July 16–17 implementation. Its role was to reason across interconnected scene state, music timing, mechanics, presentation, and narrative constraints while maintaining the longer objective of an eight-song playable cycle.

The clearest repository-supported result of that workflow is coordination: silence semantics are shared across eight tracks, every later chapter has a distinct mechanic, leave anxiety behaves consistently at several off-ramps, and developer controls prepare scene-specific outro state instead of only changing audio time. GPT-5.6 helped translate creative intentions—momentum, compulsion, recovery, ambiguity—into concrete player-facing rules and supported iteration after runtime inspection. This is a claim about the development process and its artifacts, not a claim that GPT-5.6 invented or autonomously built Jumping on Coals.

## Goal Mode and Sol

Daniel reports using Goal Mode and Sol during the session. Their observable workflow impact was maintaining focus on the end-to-end Build Week outcome across several dependent steps: establish the complete album arc, implement and connect the missing chapters, preserve the music/silence contract, validate the result, and prepare submission evidence. The repository does not contain a product-level benchmark, so no unsupported performance comparison is made.

## Technical overview

- **Stack:** Phaser 3.90 (manifest range `^3.80.1`), TypeScript 5.9 (manifest range `^5.6.3`), Vite 8.1.5, HTML/CSS overlay UI, Arcade Physics, Web Audio, and static image/audio assets.
- **Rendering:** 320×180 internal Phaser canvas with nearest-neighbor pixel scaling; responsive high-resolution HTML HUD layered above it.
- **Architecture:** a Phaser scene sequence; shared `AudioManager`, run state, `BaseScene` lifecycle/hotkeys, story/touch controls, breath pacing, reusable leave-anxiety flow, HUD, and visual helpers; scene-local mechanics remain intentionally direct.
- **Music:** eight non-looping MP3 tracks totaling about 37.5 minutes. Playback progress drives five broad dramatic phases per chapter, not beat-mapped input.
- **Install:** Node.js 20.19+ in the Node 20 line or Node.js 22.12+, then `npm ci`.
- **Run:** `npm run dev`, open the Vite URL, and press a key or tap once to unlock audio.
- **Build:** `npm run build`; Vercel output is `dist`.
- **Main experience:** begin at the title screen for the intended sequence. For judging, use chapter hotkeys documented in the README.
- **Platforms:** designed for current desktop and touch-capable mobile browsers. Keyboard was manually validated; touch controls compile but were not tested on a physical device in this pass.

Known limitations:

- No automated unit or end-to-end test suite is configured.
- This validation inspected every later chapter by shortcut but did not perform a natural, uninterrupted 37–42 minute playthrough.
- The production build emits a non-fatal warning for a 1.33 MB minified JavaScript chunk (356 KB gzip).
- A public deployment, physical mobile device, final screenshots, and final demo video were not validated in this pass.
- The software license boundary, original-asset rights, provenance summary, judging permission, and third-party dependency notices are documented in [`LICENSE`](./LICENSE) and [`ASSET_LICENSE.md`](./ASSET_LICENSE.md).
- The current checkout no longer ships the WAV masters, but the pre-Build-Week Git history still contains their roughly 397 MB of blobs. A fresh clone remains large until an intentional history/LFS migration is performed.

## Testing and validation

Commands run on July 17, 2026:

```sh
npm ci
npx tsc --noEmit
npm run build
npm audit
git diff --check
```

Results:

- Clean lockfile install: passed.
- TypeScript check: passed with no diagnostics.
- Vite production build: passed with Vite 8.1.5; 30 modules transformed. Output included `dist/index.html` and a 1.33 MB minified JavaScript chunk. Vite's chunk-size warning remains.
- Dependency audit: zero known vulnerabilities after the Vite upgrade.
- Whitespace/error-marker validation: passed.
- Runtime: Vite dev server launched at `http://127.0.0.1:5173/`.
- Manual browser inspection: title screen, chapter I, chapters IV–VIII, chapter III, its final “dig or leave” choice, and the first leave-anxiety prompt all rendered. Browser logs showed no warnings or errors during those checks.

Not tested in this pass:

- Full natural-duration playthrough and every branch permutation
- Physical touch device behavior
- Cross-browser matrix, accessibility audit, or performance budget
- Hosted Vercel deployment

Judge verification path:

1. Run `npm ci` and `npm run dev`.
2. Open the printed URL and press a key to start. Confirm the title transitions to `I · Back in the Swing` and album audio begins.
3. Use left/right to pump. Press `B` to inspect the staged Losing Balance mechanic.
4. Press `2` for Jumping on Coals. Confirm Heat/Flow state, safe platforms, movement, and the long scrolling route.
5. Press `E` to reach `A shallow opening`. Choose `Leave the park`, then confirm; verify `Second thoughts · 1/4` appears.
6. Press `4`, `5`, `6`, and `7` to inspect the digging, recovery, escape, and reflection mechanics.
7. Press `8` for Back in the Swing (Again); press Space to dismount and inspect the leave/get-back-on branch.
8. In any full-track chapter, use `Shift+F9` to move to the final two seconds and prepare its outro state.
9. Run `npx tsc --noEmit` and `npm run build`.

## Build Week evidence

- **Evidence date range:** July 16–17, 2026, based on local modification timestamps and the active Build Week/session history.
- **Pre-Build-Week baseline:** `619a147514e646b078c56c8a5cd0ee34b70db9c8` (`Initial commit with base game assets and code`, January 10, 2026).
- **Build Week milestone:** the commit containing this file. Resolve it with `git log -1 --format='%H %s' -- BUILD_WEEK.md` after checkout.
- **Primary changed systems:** scene sequence and chapter mechanics; audio loading and progress; shared input, HUD, visuals, pause/debug controls, narrative choices, run state; optimized audio, backgrounds, and player art; design and submission documentation.
- **Primary files:** `src/scenes/`, `src/game/`, `index.html`, `public/assets/audio-web/`, `public/assets/backgrounds/`, `public/assets/sprites/player.*`, `GAME_DESIGN_DOCUMENT.md`, and the submission documents.
- **Primary Codex feedback session:** `PRIMARY_CODEX_FEEDBACK_SESSION_ID: [ADD BEFORE SUBMISSION]`
- **Screenshots/demo:** manually inspected locally; final committed media is still TODO. Planned paths are recorded in `docs/media/README.md`.
- **Before:** a three-experience vertical slice with two main scene classes, basic swing/heat behavior, a flat coal grid, and roughly 397 MB of runtime WAV audio.
- **After:** an eight-track, eight-chapter implementation with full-length music pacing, distinct second-half mechanics, a long coal route, player-controlled off-ramps and return loop, responsive presentation, compressed browser audio, and judge shortcuts. The uninterrupted full arc still needs final capture and playthrough validation.

## Submission summary

Jumping on Coals turns an original eight-song album into a tactile web game about ambition, burnout, recovery, and the temptation to repeat a familiar cycle. The concept, music, and first three-track prototype existed before OpenAI Build Week. Earlier work proved the Phaser foundation, but the album's second half, central progression, and ending choices were not yet a complete playable experience.

During Build Week, Daniel Nash revisited the project with Codex and GPT-5.6 and materially transformed it. The opening swing and balance mechanics were rebuilt around readable player goals; the flat coal test became a chapter-length route with heat, Flow, checkpoints, memory sparks, and a pursuing fire; and five later album chapters gained distinct mechanics for digging, collapse, paced recovery, escape, reflection, and return. Reusable off-ramps let the player leave despite achievement-focused second thoughts, while the final swing remains satisfying enough to make repetition an ambiguous choice. Browser-ready audio, responsive presentation, touch controls, and deterministic judge shortcuts make the 37-minute arc practical to run and evaluate.

Codex helped analyze the repository, plan and implement interconnected systems, debug and validate the runtime, and prepare evidence. GPT-5.6 helped sustain reasoning across music, mechanics, state, and narrative intent. The Build Week achievement is the accelerated completion of this playable arc—not the creation of the preexisting album or original idea.
