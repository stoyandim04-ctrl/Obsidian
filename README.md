# OBSIDIAN No. 01 — fragrance website concept by 13:33

> **Concept disclosure.** OBSIDIAN is a fictional brand and product, created by the digital studio 13:33
> as an original portfolio concept. It is not an established perfume company or a commissioned client
> project. There are no orders, payments, reviews, awards or proven fragrance claims. The scent notes are
> creative fiction, not an ingredient list. Prices are illustrative.

A cinematic single-page product site built around two full-screen, scroll-scrubbed films — the bottle
revealed, opened and sprayed (Blender), then the droplets turning into the notes and back into the bottle
(Higgsfield Kling 3.0 + Blender) — followed by a working product interface (size selection, demo bag,
interactive 3D object).

## Commands

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # typecheck + production build → dist/
npm run preview      # serve dist/ on http://localhost:4173
npm run typecheck
npm run lint
npm test             # unit tests (bag arithmetic, storage validation)
npm run media        # rebuild public/media stills from render masters (needs source/renders)
node scripts/build-film.mjs reveal|notes          # rebuild film frames (needs source/frames, source/generated)
node scripts/qa.mjs http://127.0.0.1:4173/        # behavioural browser QA (Playwright)
node scripts/shots.mjs http://127.0.0.1:4173/ qa-artifacts/shots   # responsive screenshots
node scripts/perf.mjs http://127.0.0.1:4173/      # lab performance (throttled mobile + desktop)
node scripts/portfolio-shots.mjs http://127.0.0.1:4173/ && node scripts/reel.mjs http://127.0.0.1:4173/
```

The site is static (`dist/`) — no backend, no database, no API keys. `vite.config.ts` uses `base: "./"`
so the build works from any sub-path.

## Architecture

```
src/
  App.tsx                     page composition, bag drawer state, live announcements
  data/product.ts             product, variants (integer cents)
  data/films.tsx              the two films: frame sets, chapter copy + colour tones, scroll→frame remap
  data/media.json             generated: intrinsic sizes + widths of every web image
  state/bag.ts                pure bag functions + localStorage store (validated, prices never persisted)
  media/motion.tsx            motion preference (OS reduced-motion + on-page pause control)
  media/hooks.ts              useInView, useMediaQuery, useScrollProgress (rAF-throttled, passive)
  viewer/BottleViewer.ts      three.js viewer (render-on-demand, context-loss handling, disposal)
  components/                 SiteHeader, ScrollFilm, ProductSelection,
                              ProductViewer (code-split), DemoBagDrawer, ClosingScene, SiteFooter,
                              MotionPreferenceControls, Picture, Reveal
  styles/base.css             tokens, grid, type scale, buttons
public/
  media/                      AVIF/WebP/JPEG stills (generated)
  media/film/                 film frames: reveal-d/-m (120), notes-d/-m (264), WebP (generated)
  models/                     canonical bottle GLB + label textures
  fonts/                      self-hosted Cormorant Garamond + Hanken Grotesk (OFL)
source/                       creative sources (masters are git-ignored, see below)
  blender/obsidian_scene.py   canonical bottle, studio, every shot
  blender/export_glb.py       GLB for the web viewer from the same build
  scripts/                    label texture, render batches, reference sheet / OG composition
scripts/                      build-media, QA, screenshots, reel capture
docs/                         art direction, storyboard, tools, assets, QA, status
portfolio/                    13:33 integration package
```

**Principles:** one WebGL canvas at most (only while the viewer is open); essential text and controls are
always HTML; the first screen is text + controls + the first film frame; film frames stream
coarse-to-fine and the second film only loads when it is near; scrubbing follows native scroll (no
hijacking); `prefers-reduced-motion` and the on-page "Pause motion" control turn both films into
still-frame sequences.

## Creative pipeline

1. `source/scripts/make_label.py` — deterministic print texture (50 mL / 100 mL).
2. `source/scripts/render_stills.sh`, `render_motion.sh`, `render_reveal.sh` — Blender 4.2 Cycles
   renders from the one canonical model (see `docs/TOOL_SETUP.md` for the `bpy` venv).
3. Higgsfield (OAuth MCP): ingredient keyframes (Nano Banana Pro) and start/end-frame transitions
   (Kling 3.0) — prompts and job ids in `docs/ASSET_MANIFEST.md`.
4. `npm run media` / `node scripts/build-film.mjs` — lift render blacks to the page colour `#0B0C0E`,
   grade generated frames, write responsive stills and film frames.
5. `source/scripts/compose.py` — reference sheet and OG image.

Render masters (`source/renders`, `source/frames`) and generated PNG masters are kept out of Git history;
everything needed to regenerate them is versioned.

## Documentation

- `docs/ART_DIRECTION.md` — tokens, typography, product consistency
- `docs/STORYBOARD.md` — scenes, keyframes, deviations
- `docs/TOOL_SETUP.md` — verified integrations and owner actions
- `docs/ASSET_MANIFEST.md` — provenance, prompts, rights
- `docs/QA.md` — tests, measurements, unverified checks
- `docs/STATUS.md` — stages, blockers, next steps
- `portfolio/README.md` — material for the 13:33 site

## Licences

Code: project-owned. Fonts: SIL Open Font License 1.1 (`public/fonts/OFL-*.txt`). Generated imagery: see
`docs/ASSET_MANIFEST.md` for tool and terms status.
