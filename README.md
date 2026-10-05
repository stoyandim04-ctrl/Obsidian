# OBSIDIAN No. 01 — fragrance website concept by 13:33

> **Concept disclosure.** OBSIDIAN is a fictional brand and product, created by the digital studio 13:33
> as an original portfolio concept. It is not an established perfume company or a commissioned client
> project. There are no orders, payments, reviews, awards or proven fragrance claims. The scent notes are
> creative fiction, not an ingredient list. Prices are illustrative.

A cinematic single-page product site: black glass, volcanic stone, amber light, precise typography,
controlled motion — and a working product interface (size selection, demo bag, interactive 3D object).

## Commands

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # typecheck + production build → dist/
npm run preview      # serve dist/ on http://localhost:4173
npm run typecheck
npm run lint
npm test             # unit tests (bag arithmetic, storage validation)
npm run media        # rebuild public/media from render masters (needs source/renders)
node scripts/qa.mjs http://127.0.0.1:4173/        # behavioural browser QA (Playwright)
node scripts/shots.mjs http://127.0.0.1:4173/ qa-artifacts/shots   # responsive screenshots
```

The site is static (`dist/`) — no backend, no database, no API keys. `vite.config.ts` uses `base: "./"`
so the build works from any sub-path.

## Architecture

```
src/
  App.tsx                     page composition, bag drawer state, live announcements
  data/product.ts             product, variants (integer cents), scent chapter copy
  data/media.json             generated: intrinsic sizes + widths of every web image
  state/bag.ts                pure bag functions + localStorage store (validated, prices never persisted)
  media/motion.tsx            motion preference (OS reduced-motion + on-page pause control)
  media/hooks.ts              useInView, useMediaQuery, useScrollProgress (rAF-throttled, passive)
  viewer/BottleViewer.ts      three.js viewer (render-on-demand, context-loss handling, disposal)
  components/                 SiteHeader, HeroScene, ObjectStudy, ScentChapters, ProductSelection,
                              ProductViewer (code-split), DemoBagDrawer, ClosingScene, SiteFooter,
                              MotionPreferenceControls, Picture, Reveal
  styles/base.css             tokens, grid, type scale, buttons
public/
  media/                      AVIF/WebP/JPEG derivatives + hero loops (generated)
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
always HTML; the first screen is text + controls + a responsive poster, heavy media is deferred;
`prefers-reduced-motion` and the on-page "Pause motion" control disable every decorative motion.

## Creative pipeline

1. `source/scripts/make_label.py` — deterministic print texture (50 mL / 100 mL).
2. `source/scripts/render_stills.sh`, `render_motion.sh` — Blender 4.2 Cycles renders from the one
   canonical model (see `docs/TOOL_SETUP.md` for the `bpy` venv).
3. `npm run media` — lifts render blacks to the page colour `#0B0C0E` and writes responsive derivatives.
4. `source/scripts/compose.py` — reference sheet and OG image.

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
