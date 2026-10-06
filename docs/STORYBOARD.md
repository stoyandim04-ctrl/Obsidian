# Storyboard — implemented scenes, keyframes and deviations

All product frames come from one Blender scene (`source/blender/obsidian_scene.py`), so every shot shows
the same canonical bottle. Shot names below are the `--shot` arguments.

## Page order

Reveal film (hero → object → cap → atomizer → spray) → Notes film (droplets → opening → heart → base →
plinth) → Product Selection → Closing Campaign Frame → Footer.
Navigation: wordmark (→ top), The Fragrance (`#fragrance`), The Object (`#object`), Discover (`#discover`),
bag button with live count.

## How the films work (`ScrollFilm.tsx`)

Each film is a sticky full-screen `<canvas>` inside a tall section; ordinary page scrolling (no scroll
hijacking, no smooth-scroll library) maps the section's scroll progress to a frame index. Frames are
WebP stills (`public/media/film/<dir>/0000.webp …`) built by `scripts/build-film.mjs`. Separate 16:9 and
9:16 frame sets are chosen by aspect ratio (`min-aspect-ratio: 1/1`), so phones get a composition made
for portrait rather than a crop. Frames stream coarse-to-fine (first, last, every 32nd, 16th … 1st) with
6 parallel decoders, and the nearest loaded frame is always drawn, so any scroll position shows a
picture almost at once. The first frame is preloaded from `index.html` and painted as a poster `<img>`
under the canvas.

Copy is HTML layered over the canvas. Each chapter has a scroll window, a fade of 3.5 % at either end,
and its own colour tone (`--film-text / --film-accent / --film-muted`); a dark or light shade behind the
copy follows whichever chapter is most visible. With motion off (reduced motion, or "Pause motion") the
same chapters render as a normal stacked sequence of still frames with their copy — nothing scrubs.

## Film 1 — Reveal (Blender, deterministic, `#top`, 6 × viewport height)

120 frames (every 2nd of a 240-frame camera path, 24 samples + OIDN), 1280×720 and 576×1024. Every
frame is the canonical bottle from `build_bottle()`.

| Scroll | Copy (colour) | Picture |
| --- | --- | --- |
| 0–0.10 | **Leave an impression.** + CTAs, "Concept project by 13:33 · Scroll to unveil" (ivory / brass) | Bottle three-quarter in the dark studio, warm sweep light on the shoulder |
| 0.17–0.33 | **Dark glass. Quiet presence.** | Camera arcs to −22°, pushes in; label and glass edge catch the strip lights |
| 0.40–0.52 | **A fine line of brass.** | Close on the cap; the cap and brass ring lift off (0.30 → 0.60) |
| 0.56–0.70 | **Press once.** | Atomizer revealed: pump collar, brass actuator, nozzle; depth of field f/3.5 |
| 0.82–1.00 | **Every drop, a beginning.** | 900 amber droplets leave the nozzle in a 14° cone (ballistic + drag, motion-stretched), camera pushes into the mist |

Keys live in `REVEAL` in `source/blender/obsidian_scene.py` (piecewise smoothstep). The last frame of
this film was uploaded as the *start* frame of the first Kling transition, so the droplets continue
from Film 1 into Film 2.

## Film 2 — Notes (Higgsfield Kling 3.0 + Blender, `#fragrance`, 8.5 × viewport height)

264 frames: four 5 s start/end-frame transitions sampled at 12 fps (4 × 60), then 24 frames that mix
deterministic renders. 1600×900 and 720×1280. A scroll→frame remap (`NOTES_REMAP`) holds each
ingredient still while its copy is up and plays the transitions between chapters.

| Scroll | Copy (colour) | Frames | Picture |
| --- | --- | --- | --- |
| 0–0.10 | **A composition in three acts.** + fictional-notes disclaimer | 0 | Amber droplets from Film 1 |
| 0–0.15 | — | 0–59 (T0) | Droplets fall and fade onto dark slate; bergamot peel and peppercorns appear |
| 0.14–0.26 | **The first spark.** Bergamot · Black pepper (citrus ivory / pale citron) | hold 59 | Opening still life |
| 0.23–0.38 | — | 60–119 (T1) | Daylight floods in, slate → ivory travertine, peel unfurls into an iris petal, peppercorns gather into a cedar shaving |
| 0.37–0.49 | **The quiet centre.** Iris · Cedarwood (ink on light, violet accent, light shade) | hold 119 | Heart still life |
| 0.46–0.61 | — | 120–179 (T2) | Light dims to amber, travertine darkens into volcanic stone, petal and shaving fold into resin and vetiver |
| 0.60–0.72 | **What remains.** Amber accord · Vetiver (warm ivory / amber) | hold 179 | Base still life |
| 0.69–0.83 | — | 180–239 (T3) | Resin and roots sink into the stone; the stone settles into a low basalt plinth |
| 0.83–0.92 | — | 240–263 | Mixed in output colour: last generated frame → Blender empty-plinth render → canonical bottle on the plinth |
| 0.90–1.00 | **Fifty or a hundred millilitres.** + "Choose a size" → `#discover` (ivory / brass) | 263 | Bottle on the plinth |

No generated frame contains the bottle; the product only ever comes from Blender.

Deviations and known artefacts: the generated transitions are interpretive (the peel "unfurling" into a
petal is a morph, not a physical event). They were checked frame by frame for warped geometry, stray
text and objects; none found. The base and plinth transitions' darkest frames are lower in contrast
than the Blender frames; the final blend smooths the black-level difference.

## Product selection (`ProductSelection.tsx`, `ProductViewer.tsx`)

| Frame | Implementation |
| --- | --- |
| P0 | `product` shot (yaw −20°) on a controlled dark surface; no motion behind the selectors. |
| P1 | Native radio group (arrow keys work). Selecting a size crossfades between two renders whose printed label reads **50 mL** or **100 mL**, and updates the price. "Illustrative demo prices" sits directly under the options. |
| P2 | "Rotate object" mounts a genuine three.js viewer (code-split, loaded on click) using the GLB exported from the same Blender build and the same label texture for the selected size. Drag, ←/→ rotate, ↑/↓ tilt, Home reset, Escape close, Reset and Close buttons. Omitted entirely when WebGL is unavailable. |
| P3 | "Add to demo bag" updates the count, opens the drawer and announces the change in a polite live region. |

Deviation: both sizes share the canonical geometry; only the print differs (a real 100 mL would be
larger). The viewer uses an opaque glossy-glass material with an amber sheen instead of refraction so it
stays cheap on phones.

## Demo bag (`DemoBagDrawer.tsx`, `state/bag.ts`)

Native modal `<dialog>` (inert background, focus inside, Escape closes, focus returns to the trigger).
Contents: concept disclosure, product, size, unit price, quantity −/+ (1–9), remove, line total,
subtotal, "Continue exploring". No checkout, no payment, no personal data. State in `localStorage`
(`obsidian.demoBag.v1`): SKUs + quantities only; prices always re-derived from the catalogue in integer
cents; malformed data → empty bag.

## Closing (`ClosingScene.tsx`)

| Frame | Implementation |
| --- | --- |
| C0 | `closing_desktop` (2560×1280) / `closing_mobile`: the bottle on a low, broad volcanic-stone plinth, one warm lateral beam, raking light on the stone only. "Presence, distilled." + CTA. |
| C1 | `closing_*_b`: the same scene with the beam drifted forward. The page crossfades the two physically rendered passes over 8 s (alternate) while in view and motion is on. |

## Motion summary

Two scroll-scrubbed films (the page's main motion) · closing light crossfade · drawer slide · text
fades. All scrubbing is driven by native scroll position. Everything is replaced by still frames under
`prefers-reduced-motion` (unless the visitor explicitly presses "Play motion") or after "Pause motion"
in the hero and footer. Smooth anchor scrolling only when motion is on.
