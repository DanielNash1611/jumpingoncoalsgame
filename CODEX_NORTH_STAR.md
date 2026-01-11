# Codex North Star — Jumping on Coals (Web Game)

## Goal
Build a small artistic indie game using Phaser 3 + TypeScript + Vite, deployed as a static site on Vercel.
Prioritize simplicity and finishability over perfect architecture.

## Non-Negotiables (must not break)
- Pixel art: internal resolution 320x180, crisp scaling, no smoothing.
- Phaser 3 + Arcade Physics is OK.
- Music tracks are non-looping and drive the experience.
- When a track ends, the game enters silence; it MUST NOT auto-advance scenes.
- The game must run even if assets are missing (use placeholder graphics).
- No shaders / no heavy post-processing.

## Preferred Style
- Keep the code easy to read.
- Prefer simple scene-specific code over big frameworks.
- Avoid complex abstractions unless they remove real duplication.
- Keep files small and focused.

## What to build first (vertical slice)
Tracks 1–3 only:
1) Swing (habitual, not rhythm game)
2) Losing Balance (subtle destabilization)
3) Coals (heat + stamina loop)
Include dev hotkeys and a debug overlay.

## Don’ts
- Don’t turn this into a rhythm game.
- Don’t introduce ECS, dependency injection, or big state libraries.
- Don’t refactor just because.
- Don’t add multiplayer, save systems, or complex UI.

## If something is unclear
Choose the simplest approach that:
- keeps performance light,
- preserves the non-negotiables,
- and moves the vertical slice forward.
