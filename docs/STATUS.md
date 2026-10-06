# Status — OBSIDIAN No. 01 (concept by 13:33)

Updated 2026-10-06.

## Where it is

| What | Where |
| --- | --- |
| Source | GitHub `stoyandim04-ctrl/Obsidian`, branch `main` |
| Private preview | claude.ai artifact <https://claude.ai/artifact/DesJCgAAZ7FzP2MccC7XfJ> (owner-only until shared) |
| Production URL | **none** — no hosting was created or bought (see "Deploy" below) |
| Portfolio package | `portfolio/` (screenshots, reels, reference sheet, README) |

## Stages

| Stage | State |
| --- | --- |
| A — audit, tool setup | done (`docs/TOOL_SETUP.md`) |
| B — canonical bottle, reference sheet, product renders | done (Blender, deterministic) |
| C — site build | done: two scroll films, product selector, demo bag, 3D viewer, closing, footer |
| Rework after owner feedback — full-screen scroll films | done: reveal film (Blender) + notes film (Kling 3.0 + Blender) |
| D — QA | done for what can be automated here, see `docs/QA.md`; real-device checks not done |
| E — portfolio package | screenshots + 16:9 / 9:16 reels from the real site |

## Deploy (owner action, ~3 minutes)

The Vercel connector in this session can read the account but `create_project` returned **403**, and
deploying into one of the existing, unrelated projects would overwrite someone's site, so nothing was
deployed. To publish:

1. <https://vercel.com/new> → **Import Git Repository** → `stoyandim04-ctrl/Obsidian`
   (grant the Vercel GitHub app access to that repository if asked).
2. Framework preset **Vite**. Build command `npm run build`, output directory `dist`, install `npm install`.
   No environment variables — the site has no keys or backend.
3. Deploy. Each push to `main` then redeploys automatically.

Optional: add a custom domain in the project settings (not bought here).

## Known limitations / next steps

- **Reveal film** is the HD pass on both form factors (1920×1080 desktop, 864×1536 mobile, 32 samples).
  The notes film stays at the generated footage's native ~1080p (1600×900 / 720×1280 frames).
- **Generated transitions are interpretive** (morphs between still lifes), checked frame by frame but not
  physically accurate.
- **Rights** for Higgsfield / Figma outputs are not independently verified for commercial use
  (`docs/ASSET_MANIFEST.md`).
- **Real devices** (iOS Safari, Android Chrome, low-memory phones) were not tested; only emulated
  viewports in Chromium.
- No payments, accounts, orders, analytics or cookies by design.
