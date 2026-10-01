# Local maintenance verification — 2026-09-30

Deployment base: `7f944992137bcb8f8aa528d8db615f8f3c92c75b` on `master`. Isolated clone and branch `maintenance/secure-ci`; no original working-tree changes, pushes or deployments.

## Changes

Retained Phaser and Vite 8.1.5. Updated lockfile Nano ID 3.3.16 → 3.3.19 and PostCSS 8.5.19 → 8.5.28. Added pinned Vitest 4.1.11 and Playwright 1.63.0, typecheck/check scripts, ten behavioral regressions and a built-page smoke script. Added Node 22/24 engine range and CI.

## Verification

Clean npm ci --ignore-scripts, npm run check: typecheck, ten behavioral tests and Vite build pass. Tests cover non-looping natural audio completion, missing-audio pause/resume, all six leave contexts, run reset and breath pace. Browser verifies title mute, first chapter, keyboard pumping, pause/resume and 390×844 canvas fit.

Final official npm audit: zero vulnerabilities (all dependency scopes). Local Node 22.22.1; npm 10.9.4 for clean installs, locally installed npm 11.13.0 used for dependency resolution after npm 10's peer resolver crashed. No global installs. Chrome 154.0.8037.59, headless; final screenshots inspected in `test-results/browser-smoke.png` (ignored). Every browser run reported zero page errors, external HTTP requests and media requests. Browser network interception blocks external requests and media APIs reject if accidentally invoked.

CI prepares Node 24, runs npm ci and npm run check, installs pinned Playwright Chromium, then runs npm run test:browser. Workflow is prepared locally and has not run remotely. Unit tests use synthetic inputs/mocks. No semantic AI evaluations changed.

To repeat locally: `npm ci`, `npm run check`, `npx --no-install playwright install chromium`, `npm run test:browser`. For an installed local Chrome use `QA_CHROME=/path/to/chrome`; optional `QA_PORT` avoids port collisions.

## Limits

Browser smoke covers first chapter and mobile fit; unit tests cover every leave prompt. Full 37–42 minute arc and every chapter were not replayed. Existing bundle-size warning remains.

All remote services, production state and deployment settings remain untouched. npm audit is advisory evidence, not proof of absence of all vulnerabilities.

## Official dependency evidence

Registry metadata and npm audit queried 2026-09-30: [Vite registry](https://registry.npmjs.org/vite), [Vitest registry](https://registry.npmjs.org/vitest), [Next.js registry](https://registry.npmjs.org/next), [Geist registry](https://registry.npmjs.org/geist). Relevant advisories: [Vitest mocker](https://github.com/advisories/GHSA-82fw-gwwq-j7x9), [Nano ID](https://github.com/advisories/GHSA-2v37-7h3g-55p8), [PostCSS](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp), [Next.js](https://github.com/advisories/GHSA-6gpp-xcg3-4w24), [brace expansion](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr), [JS-YAML](https://github.com/advisories/GHSA-2883-xcg3-v3hh), [Browserslist](https://github.com/advisories/GHSA-c83g-rgw3-j3cx), [baseline mapping](https://github.com/advisories/GHSA-w5vr-8v7q-w6rv).
