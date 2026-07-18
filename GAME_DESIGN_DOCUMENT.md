# Jumping on Coals — Game Design Document

## Product promise

`Jumping on Coals` is a short, tactile pixel-art game about the moment a familiar childhood place stops feeling safe. The player begins by pumping a playground swing, loses balance as dusk deepens, and finally crosses a bed of living coals by turning panic into forward motion.

The target is a memorable 37–42 minute web experience: one complete, evolving chapter for each of the eight full-length tracks, plus short player-controlled transitions. It is not a score-chasing arcade game and not a rhythm game. The complete cycle is an interactive burnout metaphor: work becomes compulsion, collapse becomes stillness, recovery becomes escape, and the ending asks whether returning is resilience or repetition.

## Rebuild decision

Keep the existing Phaser 3 + TypeScript + Vite foundation, internal 320×180 resolution, audio manager, sprite metadata, and placeholder fallbacks. Rebuild the scene presentation, objectives, progression, loading strategy, feedback, and most of the moment-to-moment gameplay.

The old prototype proves the technology works, but it does not yet have a game loop worth polishing: the swing has no goal, the coal field is flat, heat has little consequence, debug text dominates the frame, and all eight large WAV files block the first playable moment.

## Experience pillars

1. **Momentum is felt.** Input creates visible acceleration, weight, camera response, and a readable payoff.
2. **Danger rewards composure.** The player succeeds by noticing safe timing and space, not by mashing.
3. **Music shapes the chapter.** Each track is non-looping and begins with its chapter. Gameplay is not mapped to beats.
4. **The world tells the story.** Light, color, particles, and the changing playground carry more narrative weight than text.
5. **One complete cycle with real off-ramps.** The first release includes all eight tracks and lets the player leave at meaningful moments of relief, failure, or commitment. Each attempt to leave surfaces the achievement, reputation, sunk-cost, comparison, and identity fears of an anxious high performer. The player must keep choosing to leave through those doubts, but the game never reverses the decision automatically.

## Visual direction

- Painterly pixel art with the emotional clarity of a half-remembered childhood evening.
- A wide cinematic composition at 320×180, crisp nearest-neighbor scaling, and no smoothing.
- Chapter palette: honey and dusty blue → bruised violet and ember orange → charcoal, copper, and pale ash.
- Layered depth: painted background, silhouetted midground, interactive foreground, then sparse atmospheric particles.
- UI is diegetic-feeling and restrained: one objective line, one meter when it matters, no permanent debug overlay.
- Player-facing text is rendered as a high-resolution HTML layer above the 320×180 canvas. It should be clean, anti-aliased, and immediately readable; only the world remains deliberately pixelated.
- The child remains small in frame so the environment feels emotionally large.

## Full-track pacing contract

Every playable chapter lasts until its non-looping track ends naturally. Completing an early mechanic earns new activity or changes the chapter; it never skips the remaining music.

Each track is divided into five broad dramatic beats using playback progress rather than beat matching:

1. **Learn (0–20%)** — establish the core verb in a safe, beautiful space.
2. **Reach (20–40%)** — add a spatial target or secondary action.
3. **Resist (40–60%)** — introduce a force that complicates the core verb.
4. **Transform (60–80%)** — visibly change the place and combine the mechanics.
5. **Commit (80–100%)** — build toward a cinematic, player-controlled transition.

Natural silence normally unlocks the chapter exit without forcing it. The one exception is the physical collapse at the end of `Digging In`: exhaustion is the consequence of the completed track, but the player still confirms the transition into the next chapter.

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move / pump / balance | Arrow keys or A/D | Left and right buttons |
| Jump / release / confirm | Space, W, or Up | Right-side action button |
| Pause | Escape | — |

Input buffering and coyote time are allowed wherever they improve feel. Touch controls appear on touch-capable or coarse-pointer devices.

## Chapter 1 — Back in the Swing

**Fantasy:** relearn a familiar motion until it becomes exhilarating.

- Left/right pumps the swing when pressed with the current travel direction.
- Good pumps add momentum; fighting the swing gently bleeds it.
- **Learn:** build three high arcs and feel the pump timing.
- **Reach:** fireflies appear at alternating apexes; Space reaches for them without releasing the swing.
- **Resist:** gusts and drifting leaves push against the pendulum, rewarding adaptation rather than rote alternation.
- **Transform:** the long sunset deepens and the playground begins to feel too large; collected fireflies orbit the child.
- **Commit:** the final minute strips the UI back and frames the next apex. When the track enters silence, Space releases the child. Apex timing improves the landing, but an early release remains recoverable.
- The player, never the track-completion callback, triggers the launch.
- After the child lands, they explicitly choose whether to walk toward the beam or leave the playground.

## Chapter 2 — Losing Balance

**Fantasy:** the safe playground stretches into something unsteady.

- The child lands on a narrow beam while the background slips from sunset into violet night.
- Leaves near the beam, the gate lamp, and later layers of drifting ash show which way the next gust will travel. These cues follow their own generous cadence rather than the music's beat.
- Left/right chooses a committed counter-lean. Space sets the stance and commits the next step; when the gust arrives, a correct read earns physical progress across the beam.
- Ignoring the mechanic never advances the crossing. An unset or incorrect stance causes a stumble, and three stumbles drop the child back to the most recent illuminated support.
- **Learn:** obvious low leaves and explicit direction copy teach `read, set, step`.
- **Reach:** the gate lamp reinforces the same directional information as the leaves.
- **Resist:** high ash drifts unreliably while the leaves closest to the beam remain trustworthy.
- **Transform:** cue windows tighten and committed stances must be held through stronger gusts.
- **Commit:** the leaves disappear. The quieter final minute is crossed by reading the gate lamp alone.
- Each fifth of the track unlocks the next beam section and cue language. Fast players rest at a support until the scene changes. After a full fall, the player chooses whether to climb back to the last support or leave the playground; returning does not rewind playback. The gate opens only when both the full crossing and natural silence are complete.

## Chapter 3 — Jumping on Coals

**Fantasy:** keep moving because stopping hurts.

- The player runs and jumps across a long, deterministic side-scrolling journey of coals, stones, broken playground pieces, and brief safe islands. Its distance is tuned around the full five-minute track, not a short demo sprint.
- Heat rises quickly while grounded on coals, more slowly while moving, and cools in the air or on safe ground.
- Full heat returns the player to the most recent safe island, where they choose whether to try again or leave the playground. It is a quick reset, not a death screen.
- Consecutive clean landings build `Flow`. Flow adds a small speed and jump-height reward and intensifies embers.
- Memory sparks mark readable routes and teach riskier jumps. Enough are placed across all five track beats that collection remains a continuing choice rather than a one-minute checklist.
- **Learn:** close safe islands teach heat and airtime.
- **Reach:** vertical platform chains reward Flow and optional sparks.
- **Resist:** ember wind changes air control and makes stopping more dangerous.
- **Transform:** the old playground disappears into smoke, safe ground becomes rare, and the earth begins to crack.
- **Commit:** the route converges on a breathing black opening. The hole does not open until the track reaches silence; entering remains the player's choice.
- At the opening, the player explicitly chooses whether to climb in and dig or leave the shovel untouched and exit the park.

## Chapter 4 — Digging In

**Fantasy:** keep digging because stopping feels impossible, even as the body gives out.

- The coal route ends at the lip of a shallow opening. It is not yet the deep hole; the player chooses to climb in with the shovel.
- Left/right aims at the weaker side of packed earth. Space swings the shovel. Correctly reading cracks makes useful progress; frantic misses cost more energy.
- Every strike deepens the shaft and spends stamina. Rest restores less and less as the track advances, turning an initially satisfying work loop into visible overextension.
- **Learn:** broad cracks, strong swings, and fast recovery make digging feel productive.
- **Reach:** alternating weak points and buried memory glints reward attention.
- **Resist:** the shaft narrows, dirt falls back in, and recovery slows.
- **Transform:** exhausted swings lag behind input, the camera looks farther upward, and the shovel begins to pull the child down with it.
- **Commit:** useful progress becomes almost indistinguishable from compulsion. At natural silence, the child attempts one final strike, drops the shovel, and collapses at the bottom.

## Chapter 5 — At the Bottom

**Fantasy:** inhabit exhaustion before movement slowly becomes possible again.

- The child begins completely prone. Directional input can only turn their gaze between the shovel, the shaft above, and dim memory fragments.
- Space is a breath, not an action button. Early breaths barely move the body; repeated, unhurried breaths gradually restore a small amount of energy.
- **Learn:** stillness. The player discovers that ordinary movement no longer works.
- **Reach:** looking toward memory fragments reveals short, non-judgmental recollections of the swing, beam, coals, and digging.
- **Resist:** the shaft is recognized as a trap. Attempts to stand fail without erasing accumulated recovery.
- **Transform:** breathing lifts the head, then shoulders, then brings the child to their knees.
- **Commit:** the child crawls to the same shovel that helped create the hole. In silence, Space picks it up and begins `Digging Out`.

## Chapter 6 — Digging Out

**Fantasy:** turn almost no remaining energy into a short burst of desperate escape.

- This track is much shorter and faster. The mechanic is readable urgency rather than a rhythm chart.
- Left/right selects the side whose support is about to fail; Space drives the shovel into that side and creates the next foothold.
- Correct alternating strikes build `Drive`, briefly carrying the child upward despite near-empty stamina. Misses cause a short slide, never a full restart.
- Falling dirt and pale wind intensify toward the surface. The camera begins claustrophobic and opens as sky becomes visible.
- Natural silence exposes the last ledge. Space performs the final pull out of the hole.

## Chapter 7 — By the Shovel

**Fantasy:** lie beside the tool that both caused the crisis and made escape possible.

- The child begins motionless at the top of the hole, the shovel beside them, looking into the sky.
- Left/right changes the focus between the shovel, hole, swing, exit, and sky. Space takes a slow breath and reveals a brief thought tied to the current focus.
- The thoughts remain questions, not a verdict: Was it chosen? Did it happen to them? Was it both? Did the work save them, or only make more work necessary?
- The body recovers gradually across the full track: breathing, sitting, kneeling, standing.
- The coal-lit night cools gradually into sunrise across the track. At natural silence, first light is fully visible and the player receives the final major branch in the game: return to the swing or leave the playground.
- Leaving ends without triumph or punishment. Returning begins the final track.

## Chapter 8 — Back in the Swing (Again)

**Fantasy:** feel both comfort and dread in a motion that is now deeply familiar.

- The original swing verb returns with less tutorial UI and the accumulated visual memory of the completed cycle.
- Ghost arcs, ash, and gathered lights briefly recall earlier chapters without literal flashbacks.
- The playground advances from morning to midday to sunset across the track, returning to full night while the familiar motion continues.
- Pumping is still satisfying. The game does not make returning feel obviously wrong.
- Space jumps off the swing at any time, including before the track is quiet. Once on the ground, the player chooses whether to leave the playground or get back on.
- Getting back on resumes the existing motion and track position. After natural silence, the swing remains playable and the same dismount choice remains available; the music does not loop and silence does not force an ending.
- If the player starts to leave but gives in to the performance-anxiety voice, they can return to any of the eight areas rather than only climbing back onto the final swing.
- The loop counter is never scored or celebrated. Repetition is the ending's meaning, not a completion reward.

## Music rules

- Tracks never loop.
- A chapter starts its track once the player explicitly enters that chapter.
- A chapter cannot expose its final continuation until its track ends naturally.
- Natural silence reveals a player-controlled continuation: release, step through, or approach the hole. The final swing's dismount is deliberately available before silence as well.
- If a track ends naturally, the scene remains playable in silence. Natural completion never advances a scene.
- All eight deployable tracks use compressed web audio. The archive-quality WAV masters remain outside the public bundle.
- Deployment audio uses compressed web formats; archival WAV masters stay outside the shipped public bundle.

## Feedback and feel

- Landing squash, brief camera impulse, and one burst of particles on meaningful contact.
- Strong pump: rope glint and warm firefly trail.
- Dangerous heat: player tint, vignette pulse, and denser embers before movement is slowed.
- Flow milestone: short label and color lift, not a modal.
- Failure recovery completes in under one second.
- Tutorial text appears contextually and fades after the action is demonstrated.
- Major track beats use restrained letterboxing, slow camera reframing, palette shifts, and environmental particles. Cinematic motion must never take control away during a demanding input moment.

## Accessibility and quality bar

- Keyboard and touch are first-class; no mouse precision is required.
- High-contrast objective text and meters remain readable over every background. Player-facing text is anti-aliased HTML, not canvas-scaled pixel text.
- Avoid rapid full-screen flashing; reduce camera shake when `prefers-reduced-motion` is enabled.
- Audio can be muted from the title and paused with the game.
- Missing optional art or audio must fall back cleanly enough to keep the game playable.
- Desktop and phone layouts must show the full playfield without page scrolling.

## Complete-game acceptance criteria

- A new player can understand each mechanic without reading this document.
- The first input-to-playable time on a normal connection is a few seconds, not the time needed to download the WAV archive.
- Each of the eight chapters has a distinct playable verb and continues to introduce play or presentation changes through the complete duration of its track.
- Swinging has evolving objectives, spatial reaches, resistance, and a satisfying silence-gated launch payoff.
- Losing Balance requires environmental cue reading and committed steps, escalates across the full track, returns falls to real support posts without rewinding music, and cannot be completed through inactivity.
- The coal journey lasts approximately the full track at ordinary play speed, with spatial decisions, checkpoints, clear heat consequences, changing environmental pressure, and a hole ending.
- The player can choose to leave after the first swing landing, after a full balance fall, after burning on the coals, and before digging at the hole.
- Choosing leave presents a contextual high-performer anxiety sequence with repeated return-or-leave agency; reaching the exit requires choosing leave through every follow-up.
- The game remains in silence if any track naturally ends.
- Natural track completion unlocks an exit but never triggers it.
- `Digging In` becomes progressively less efficient until the child collapses from exhaustion at track end.
- `At the Bottom` begins with genuine immobility and earns standing and shovel pickup through stillness, memory, and breathing.
- `Digging Out` is a shorter, faster desperation sequence that preserves low-energy vulnerability while reaching the surface.
- `By the Shovel` holds the full contemplative track before presenting a clear return-or-leave choice.
- Leaving from any offered off-ramp produces a complete ambiguous ending. Returning plays track 8, where every dismount asks whether to leave or get back on, and backing away from leaving can route to any chapter.
- All non-debug text is crisp and readable on desktop and phone-sized viewports.
- The production build succeeds and every leave choice plus the final get-back-on loop is playable on desktop and mobile-sized viewports.
