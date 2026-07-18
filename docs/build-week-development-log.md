# Jumping on Coals — Build Week development log

This log summarizes repository evidence and user-supplied session context. It records decisions, actions, and outcomes without reproducing private model reasoning.

## Evidence window

- Build Week work represented here: July 16–17, 2026
- Preexisting Git baseline: `619a147` from January 10, 2026
- Model/workflow reported by Daniel: Codex with GPT-5.6, Goal Mode, and Sol
- Primary Codex feedback session: `PRIMARY_CODEX_FEEDBACK_SESSION_ID: [ADD BEFORE SUBMISSION]`

## Starting state

The repository had one baseline commit containing a Phaser 3 + TypeScript + Vite vertical slice, the original eight WAV tracks, sprites and metadata, placeholder fallbacks, a basic audio manager, and two main gameplay classes: `SwingScene` and `CoalsScene`.

The baseline README framed the game as three short experiences. Swing accepted directional input and dismounting, Losing Balance was represented within the swing scene largely through track-progress camera disturbance, and Coals used a short 60×12 grid with heat/stamina variables before returning to Swing. Tracks four through eight had audio but no dedicated gameplay scenes.

The project concept, album, earlier gameplay ideas, and prototype predated this evidence window. The session goal was not to invent the project, but to make the unresolved album-wide arc substantially playable and submission-ready.

## Intended goal

Turn the existing vertical slice into a coherent eight-song web game while preserving these constraints:

- Music is non-looping and shapes each chapter without becoming a rhythm chart.
- Natural silence unlocks continuation but does not automatically advance the player.
- The internal world remains crisp 320×180 pixel art.
- Missing optional sprites still receive lightweight fallbacks.
- The complete cycle includes meaningful opportunities to leave and an ambiguous final return.
- The long album experience remains inspectable with deterministic developer shortcuts.

The session formalized those constraints in `GAME_DESIGN_DOCUMENT.md` and updated `CODEX_NORTH_STAR.md` from a three-track vertical-slice goal to the complete arc.

## Major implementation steps

### July 16 — presentation and browser delivery foundation

1. Added optimized sunset, twilight, and coals environment art plus the first three browser MP3s.
2. Expanded the title/boot/loading flow so a deliberate user gesture unlocks audio, displays loading progress, and enters the opening chapter cleanly.
3. Reworked application sizing and the HTML overlay foundation for readable responsive HUD text above the pixel canvas.
4. Started replacing the tracked runtime WAV path with `public/assets/audio-web/` and richer audio state management.

### July 16–17 — complete album assets and shared systems

1. Added browser MP3s for tracks four through eight and environment art for underground, dawn, morning, midday, sunset, and night states.
2. Extended the player sprite sheet and animation metadata.
3. Added shared `StoryControls`, `TouchControls`, `BreathPacer`, `GameHud`, `StoryVisuals`, and `LeaveAnxiety` systems.
4. Expanded `BaseScene` with pause/mute behavior, opt-in debug overlays, scene shortcuts, audio seeking, and scene-aware outro preparation.
5. Extended run state to track gathered lights/memories, route and ending state, while keeping the architecture scene-local and small.

### July 17 — opening and central mechanic rebuilds

1. Rebuilt Swing around pendulum-like pumping, strong arcs, collectible lights, gust response, silence, and an apex release performed by the player.
2. Replaced passive Losing Balance presentation with a five-stage beam-crossing mechanic. Directional cues, committed counter-lean, stumbles, supports, and player-confirmed steps make progress legible.
3. Replaced the short flat coal test with a 26,400-pixel deterministic route using safe surfaces, checkpoints, Heat, Flow, memory sparks, buffered jumping/coyote time, a music-progress fire front, and a final opening.
4. Added recoverable burn/fall choices so failure does not create a long death-screen reset.

### July 17 — second-half chapters and endings

1. Implemented Digging In: weak-side aiming, useful/missed strikes, accelerating fatigue, deepening visuals, collapse, and a player-confirmed continuation.
2. Implemented At the Bottom: focus selection, paced breaths, memory fragments, energy/posture recovery, and shovel pickup.
3. Implemented Digging Out: alternating support targets, Drive, short slides instead of full resets, opening camera/air, and a final pull.
4. Implemented By the Shovel: changing focus, steady breathing, recovery under a sunrise, reflective prompts, and the leave/return branch.
5. Implemented Back in the Swing (Again): the familiar swing verb, accumulated visual echoes, time-of-day progression, dismount at any time, get-back-on behavior, and selection of an earlier area after second thoughts.
6. Implemented Leave Park presentations for several exit moments and a reusable four-step achievement-anxiety sequence that never removes the leave option.

## Problems discovered and decisions made

### The old first load was too heavy

Eight tracked WAV files totaled about 397 MB. The runtime now loads eight MP3s totaling about 36 MB, a reduction of roughly 91%. Archival WAV masters remain local under `source_assets/audio-masters/` and are gitignored; they are not required to build or play.

The baseline blobs still exist in Git history, so deleting them from the current tree does not make a fresh clone small. History rewriting or an LFS migration is deliberately left as a separate, potentially disruptive follow-up.

### Music pacing could remove agency

The implementation uses full-track progress to change chapter state, but natural silence normally only opens the final action. The player releases, steps through, picks up the shovel, or chooses a branch. Digging In may collapse automatically as its internal dramatic consequence, but continuing to At the Bottom still requires input.

### Slow chapters still needed meaningful interaction

Recovery was implemented through focus, breath pacing, posture, and restrained feedback rather than a conventional score. Digging/escape mechanics use readable side selection and consequences rather than beat matching.

### Leaving could become a simplistic “good ending”

Leave choices surface momentum, reputation, sunk effort, comparison, and identity fears in four explicit prompts. The player must continue choosing leave, but the code never changes that choice on their behalf. Returning also remains mechanically satisfying and unscored.

### A full album is difficult to judge quickly

Chapter hotkeys, audio seeking, immediate silence, and `Shift+F9` scene-aware outro preparation were added in development mode. The coal route also has an `E` shortcut to its final hole decision. These controls expose real scene state rather than substituting a prerecorded mock.

### Visual readability needed a separate scale from the game world

The Phaser canvas remains crisp at 320×180. Objectives, track state, choices, cinematic text, pause, and loading presentation use responsive HTML/CSS above it, so text is not forced through pixel scaling.

## Submission-preparation validation

On July 17, Codex inspected the entire staged/unstaged/untracked diff, the January commit, file timestamps, asset sizes, executable scripts, secret-like filenames/content, and source-versus-runtime media.

Commands and results:

```text
npm ci            -> passed
npx tsc --noEmit  -> passed, no diagnostics
npm run build     -> passed with Vite 8.1.5, 30 modules transformed
npm audit         -> passed, zero known vulnerabilities
git diff --check  -> passed
```

The initial clean install reported four development-tool advisories (two moderate and two high) through the Vite 5 dependency tree. Vite was upgraded to 8.1.5, the Node requirement was made explicit, and the build/typecheck were rerun successfully. The final audit reports zero known vulnerabilities.

The Vite 8 build produced a 1.33 MB minified JavaScript chunk (356 KB gzip) and emitted its standard warning for chunks larger than 500 KB. This is non-fatal but remains a performance optimization opportunity.

Manual local-browser checks at `http://127.0.0.1:5173/`:

1. Title screen rendered with background art, project description, start prompt, and mute state.
2. Starting entered `I · Back in the Swing` with its HUD and swing presentation.
3. Hotkeys `4`–`8` loaded Digging In, At the Bottom, Digging Out, By the Shovel, and Back in the Swing (Again), each with the expected chapter/track/objective state.
4. Hotkey `2` loaded Jumping on Coals.
5. Hotkey `E` opened the shallow-hole choice.
6. Selecting Leave and confirming produced `Second thoughts · 1/4` with the expected achievement-anxiety copy.
7. No browser warnings or errors appeared during this inspected path.

## Final state

The repository now contains an eight-track implementation whose later chapters are registered, render, accept their intended inputs, and connect through explicit transitions and choices. The opening and coal systems are materially more complete than the baseline, and the browser delivery/presentation path is substantially lighter and clearer. A judge can start the intended experience or use deterministic shortcuts to inspect the arc.

This is stronger than the January vertical slice, but the current evidence should not be described as exhaustive final-game certification. The submission-preparation pass did not play every track for its natural full duration or test every failure/leave/return permutation.

## Remaining work

Priority order:

1. Add the primary Codex `/feedback` session ID to both Build Week documents.
2. Record one uninterrupted natural playthrough, note any pacing/transition defects, and fix only reproducible blockers.
3. Capture `docs/media/gameplay-overview.png` and `docs/media/build-week-before-after.png` from the validated build.
4. Produce a public gameplay video under three minutes showing the baseline distinction, the coal transformation, the recovery arc, and the final choice.
5. Test keyboard and touch flows on at least one physical mobile device and one additional desktop browser.
6. Deploy the exact commit intended for judging and verify the public URL, audio unlock, asset loading, and deep-link/reload behavior.
7. Add an asset provenance/license document covering the original album, earlier assets, Build Week visual assets, fonts, and redistribution permissions.
8. Decide whether to split the Phaser bundle to remove the Vite chunk-size warning.
9. Add a small automated smoke test for boot, scene registration, and developer chapter navigation.
