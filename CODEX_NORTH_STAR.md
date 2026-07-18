# Codex North Star — Jumping on Coals (Web Game)

The authoritative design and acceptance criteria now live in
[`GAME_DESIGN_DOCUMENT.md`](./GAME_DESIGN_DOCUMENT.md). This file remains the
compact engineering guardrail.

## Goal
Build a complete eight-song artistic indie game using Phaser 3 + TypeScript + Vite, deployed as a static site on Vercel.
Prioritize simplicity and finishability over perfect architecture.

## Non-Negotiables (must not break)
- Pixel art: internal resolution 320x180, crisp scaling, no smoothing.
- Phaser 3 + Arcade Physics is OK.
- Music tracks are non-looping and drive the experience.
- When a track ends, the game enters silence; it MUST NOT auto-advance scenes. An automatic dramatic beat may occur within the current scene, but the next scene still requires player confirmation.
- The game must run even if assets are missing (use placeholder graphics).
- No shaders / no heavy post-processing.

## Preferred Style
- Keep the code easy to read.
- Prefer simple scene-specific code over big frameworks.
- Avoid complex abstractions unless they remove real duplication.
- Keep files small and focused.

## Complete Arc
1) Swing (habitual, not a rhythm game)
2) Losing Balance (subtle destabilization)
3) Coals (heat + stamina loop)
4) Digging In (fatigue and collapse)
5) At the Bottom (stillness, memory, breath, standing)
6) Digging Out (short, desperate ascent)
7) By the Shovel (contemplation and a real binary choice)
8) Back in the Swing (Again) (comfort, warning, and a repeatable choice to get off or get back on)

The leave ending remains deliberately ambiguous. Leaving is available at meaningful moments of relief, failure, or commitment rather than only at the final branch. Every leave attempt passes through the achievement-focused second thoughts of an anxious high performer, but the player can keep choosing to leave. In the final swing chapter, turning back can lead to any prior area. Include dev hotkeys and an opt-in debug overlay without changing production balance.

## Don’ts
- Don’t turn this into a rhythm game.
- Don’t introduce ECS, dependency injection, or big state libraries.
- Don’t refactor just because.
- Don’t add multiplayer, save systems, or complex UI.

## If something is unclear
Choose the simplest approach that:
- keeps performance light,
- preserves the non-negotiables,
- and strengthens the complete burnout cycle.
