# QA — OBSIDIAN No. 01

Run 2026-10-06 against the production build (`npm run build && npx vite preview --port 4173`) in
Playwright 1.56 / Chromium 141 (headless, Linux). Emulated viewports only — **no real devices**.

## Static checks

| Check | Result |
| --- | --- |
| `npx tsc -b` (strict) | pass |
| `npx eslint .` | pass, 0 warnings |
| `npm test` (Vitest) | 14/14 — bag arithmetic, quantity limits, storage validation, stored prices ignored; film load order covers every frame once, scroll→frame remap holds and is monotonic, chapter fades, atlas mapping unique |

## Behavioural QA — `node scripts/qa.mjs` → 55/55 pass

Navigation and anchors · size selection (price, print on the bottle, arrow keys) · demo bag (modal +
inert background, focus in/out, live-region announcement, concept disclosure, no checkout, quantity
1–9, integer-cent subtotals, persistence, malformed storage, stored prices ignored) · 3D viewer
(offered only with WebGL, labelled, keyboard rotation changes pixels, canvas removed on close, focus
return) · reduced motion (films become stills, no canvas, content visible) · mobile menu and drawer at
390 px, touch targets ≥ 44 px · no-WebGL fallback · films paint frames · **every film frame present as
WebP** (768 files; needed because the preview server answers missing files with `index.html`) ·
**copy contrast over the real frames** (below) · no console errors or failed requests in any flow.

### Copy contrast over the films

For each of the 10 chapters the copy is hidden, the film behind every text line box is screenshotted,
and the scene's text colour is compared with the worst-case background (95th luminance percentile for
light text, 5th for dark text). Thresholds: 4.5:1 for body/labels, 3:1 for large headings.

| Viewport | Lowest measured | Where |
| --- | --- | --- |
| Desktop 1440×900 | **4.90:1** | Heart label "02 · Heart" (violet on travertine) |
| Mobile 390×844 @2x | **5.50:1** | Notes intro disclaimer over the amber droplets |

The first run of this check failed in three places; fixes: darker iris accent (`#6F5C8E` → `#55466F`)
and a stronger top shade on portrait screens.

## Lab performance — `node scripts/perf.mjs` (median of 3, cache disabled)

Lighthouse-like profiles: mobile 390×844 @2x, 150 ms RTT, 1.6 Mbps down, 4× CPU slowdown; desktop
1440×900, 40 ms RTT, 10 Mbps. **Lab data, not field data.** A Blender render was running on the same
4-core machine during the measurement, so CPU-bound numbers are, if anything, pessimistic.

| Metric | Mobile | Desktop |
| --- | --- | --- |
| LCP | 1.47 s (`h1`) | 0.74 s (`h1`) |
| CLS | 0 | 0 |
| Transferred until `load` | 160 KB | 161 KB |
| All 120 reveal frames arrived | 9.9 s (1.7 MB transferred by then) | 2.8 s (2.1 MB) |
| JS (gzip) | 77 KB initial; three.js viewer chunk only on "Rotate object" | same |

Film weight (WebP): reveal 1.5 MB (mobile) / 1.9 MB (desktop); notes 7.1 MB / 8.7 MB, loaded only when
the visitor is within two screens of it. On the throttled mobile profile the full notes film needs
≈ 36 s; frames load coarse-to-fine (every 32nd first), so fast scrolling shows the nearest loaded frame
rather than a blank, but early in the visit it can look stepped. This is the main performance cost of
the cinematic approach.

## Visual review

Contact sheets of every film were checked frame by frame: the reveal (seam between two render runs at
frame 42/43 invisible), the four Kling transitions (no warped geometry, text, hands or bottle), and the
generated→rendered blend at the end of the notes film (no black-level step after mixing in output
colour space). An upscaling bug (1280 px masters written at 1920 px produced posterised frames) was
caught here and fixed by never upscaling.

## Not verified

- Real iOS Safari / Android Chrome, low-memory phones (≈ 1 GB of decoded frames if a visitor scrubs
  through everything; browsers may evict and re-decode, which can stutter).
- Screen readers by ear (VoiceOver/NVDA); semantics and live-region text are verified in the DOM only.
- Field Core Web Vitals (no deployment yet).
- Firefox and WebKit engines.
