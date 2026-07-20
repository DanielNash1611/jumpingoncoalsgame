# Asset licensing and provenance

This document defines the license boundary for *Jumping on Coals*. It is intended to let judges, contributors, and repository visitors understand what may be reused and what remains part of Daniel Nash's original creative work.

## Source code

The MIT License in [`LICENSE`](./LICENSE) applies to the software source code and technical configuration in this repository, including:

- `src/**/*.ts`
- `index.html`
- `package.json` and `package-lock.json`
- `tsconfig.json`
- `vercel.json`
- code examples in technical documentation

The MIT grant does **not** extend to the reserved creative assets described below.

## Reserved creative assets

Unless a file contains a separate license notice, the following material is **not** licensed under the MIT License and remains reserved by Daniel Nash:

- the *Jumping on Coals* musical compositions, recordings, arrangements, track titles, and album sequence;
- audio in `public/assets/audio-web/` and archival masters under `source_assets/audio-masters/`;
- backgrounds, sprites, particle art, logos, icons, and other images under `public/assets/`;
- high-resolution or intermediate art under `source_assets/`;
- the game's narrative text, story arc, characters, visual identity, and game-specific written material;
- gameplay screenshots, promotional artwork, the Build Week demo video, voice recording, captions, and other submission media, whether stored locally or published through YouTube or Devpost.

Copyright (c) Daniel Nash. All rights reserved for these creative assets.

Permission is granted to copy the reserved assets only as necessary to clone, build, run, test, and evaluate this repository for personal, noncommercial, educational, or hackathon-judging purposes. This limited permission does not allow extracting the assets for another project, redistributing them separately, selling them, relicensing them, publishing the music, or using the *Jumping on Coals* name or branding to imply endorsement.

For any broader use, obtain permission from Daniel Nash.

## Provenance

| Material | Provenance | License in this repository |
|---|---|---|
| Original eight-song album | Composed, arranged, and recorded by Daniel Nash before OpenAI Build Week | Reserved; limited evaluation permission above |
| Concept, emotional arc, game design, and narrative direction | Created by Daniel Nash before OpenAI Build Week and refined during development | Reserved; limited evaluation permission above |
| Project-specific backgrounds, character art, sprites, particles, logos, and icons | Created and directed for this project by Daniel Nash; portions were developed or iterated with AI-assisted image tools under his creative direction | Reserved; limited evaluation permission above |
| Software source code | Developed by Daniel Nash with assistance from OpenAI Codex and ChatGPT, including GPT-5.6 during Build Week | MIT |
| Gameplay screenshots and demo materials | Captured from this project and assembled under Daniel Nash's direction | Reserved; limited evaluation permission above |

The January 10, 2026 baseline commit [`619a147`](https://github.com/DanielNash1611/jumpingoncoalsgame/commit/619a147514e646b078c56c8a5cd0ee34b70db9c8) establishes that the album, project concept, initial assets, and three-part prototype existed before Build Week. [`BUILD_WEEK.md`](./BUILD_WEEK.md) documents the later implementation boundary.

## Third-party software

Third-party packages retain their own licenses. They are installed through npm and are not relicensed by this repository:

- [Phaser](https://github.com/phaserjs/phaser) — MIT License
- [Vite](https://github.com/vitejs/vite) — MIT License; its distribution includes separately licensed bundled dependencies
- [TypeScript](https://github.com/microsoft/TypeScript) — Apache License 2.0

See each installed package and its upstream repository for the complete applicable notices.

## No trademark grant

The software license does not grant trademark or branding rights in the names *Jumping on Coals* or Daniel Nash, the project logos, or related visual identity.
