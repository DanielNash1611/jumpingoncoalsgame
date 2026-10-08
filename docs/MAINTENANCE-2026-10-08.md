# Local maintenance — October 8, 2026

Daniel approved the October 5 proposals on October 8. Isolated local branch: `maintenance/2026-10-08-approved`. Base: `57d7aac0bfaa2f7b4e2307eb55e6ca6844f790a6` from verified GitHub `master`; successful latest Vercel Production deployment record uses the same SHA. Original checkouts were not used as the maintenance base.

Refreshed only the transitive source-map-js lock entry 1.2.1 → 1.2.2 for [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q), within the existing compatible range. CI retains master, Node 24, npm cache, pinned browser install and every interaction assertion.

Fresh locked install on Node 24.21.0, typecheck, all ten behavioral tests, Vite build and built-page browser smoke pass. Smoke covers title mute, first chapter, keyboard pumping, pause/resume and 390×844 canvas fit. Pinned Playwright 1.63.0 Chromium revision 1243, Chrome 153.0.8010.12: zero page errors, external requests and media requests. Screenshot inspected. Final all-scope npm audit: zero vulnerabilities. Existing bundle-size warning remains. The full 37–42 minute arc and all chapters were not replayed. Original unpublished hackathon/readme and scene/assets work is preserved.

Actions use verified official releases [checkout v7.0.1](https://github.com/actions/checkout/releases/tag/v7.0.1) and [setup-node v7.1.0](https://github.com/actions/setup-node/releases/tag/v7.1.0). GitHub-hosted `ubuntu-latest` is retained; Node 24 action runtime requires runner 2.327.1 or newer. Existing triggers, permissions, npm cache inputs, LFS and browser-install behavior are preserved. Parsed workflows and `git diff --check` pass. Workflows have not run remotely for these local changes.

No push, PR, merge, deploy, hosting-setting or permission change, live database, email, AI/Ollama call or media capture. Original dirty checkouts and unpublished branches were left untouched. Test inputs and local service smokes are synthetic.
