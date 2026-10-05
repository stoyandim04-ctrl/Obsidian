# Storyboard — implemented scenes, keyframes and deviations

All product frames come from one Blender scene (`source/blender/obsidian_scene.py`), so every shot shows
the same canonical bottle. Shot names below are the `--shot` arguments.

## Page order

Hero → The Object → Scent Chapters → Product Selection → Closing Campaign Frame → Footer.
Navigation: wordmark (→ top), The Fragrance (`#fragrance`), The Object (`#object`), Discover (`#discover`),
bag button with live count.

## Hero (`HeroScene.tsx`)

| Frame | Implementation |
| --- | --- |
| H0 first paint | Poster `hero_desktop` (2560×1440) / `hero_mobile` (1080×1920) is the first image; headline and CTAs are HTML and render before any media. Bottle yaw −12°, centre at 69 % x / 53 % y, ≈67 % of hero height (measured on a 1440×900 screenshot). |
| H1 0–1.5 s | Narrow warm "sweep" strip light starts travelling across the shoulder. |
| H2 1.5–4 s | Camera pushes in 2.5 % and arcs ±2° (4° total), eased. |
| H3 4–6 s | Every channel returns to the start pose: frame 144 ≡ frame 0, so the loop has no visible seam. |

- Loop math: `s = (1 − cos 2πt)/2`; camera azimuth `−2° + 4°·s`, distance `×(1 − 0.025·s)`,
  sweep angle `−35° + 50°·s`. Because `s(t) = s(1−t)`, only frames 0–72 are rendered and mirrored.
- Video is attached only after `load` + idle, never with Save-Data, never with motion off; paused while
  off-screen; an autoplay rejection leaves the poster in place.
- Desktop pointer parallax: **not implemented** — it would conflict with the prerecorded camera move.
- Mobile: a dedicated 9:16 render (text over the quiet top, bottle ≈40 % of the frame height centred
  at 60 %, CTAs on the dark floor). Short (<740 px) and landscape phones switch to a stacked layout
  (text → 4:5 crop of the same composition → actions) so nothing overlaps the bottle.

## The Object (`ObjectStudy.tsx`) — the one sticky sequence

Desktop with motion on: 7-column sticky visual beside ~170svh of copy. Scroll progress drives
crossfades plus a slow 4 % push-in per frame. Mobile, or motion off: normal stacked figures (O0, O2, O3).

| Frame | Local scroll | Shot | Content |
| --- | --- | --- | --- |
| O0 | 0 % | `object_o0` | Three-quarter (yaw −24°) continuing the hero |
| O1 | 28 % | `object_o1` | Cap + upper shoulder, camera at 4° elevation, f/4 |
| O2 | 58 % | `object_o2` | Macro: brass ring + rounded glass shoulder, f/3.2 |
| O3 | 86 % | `object_o3` | Lower body, thick base glowing amber (hidden warm card behind the base), floor reflection |

Deviation: authored stills with crossfades instead of a scrubbed video (the brief's preferred option).

## Scent chapters (`ScentChapters.tsx`)

Three editorial rows (not a carousel), alternating image/text on desktop; image-first on mobile.
The Heart chapter sits on the light `--paper` band for breathing room. 20 px / 640 ms entrance only when
motion is on; all text is visible immediately with motion off. Disclaimer: the notes are fictional.

| Frame | Image | Source |
| --- | --- | --- |
| S1 Opening | bergamot peel curl + black peppercorns on volcanic stone, raking warm light | Figma / Gemini 3.1 Flash Image |
| S2 Heart | iris petal + cedarwood shaving on ivory travertine, soft side light (cropped) | Figma / Gemini 3.1 Flash Image |
| S3 Base | amber-coloured resin glowing beside vetiver roots on dark stone | Figma / Gemini 3.1 Flash Image |

Deviation: the generated peppercorns read dark brown rather than jet black; accepted as natural.

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

One hero loop · one scroll-linked sequence · reveal entrances · closing light crossfade · drawer slide.
All disabled by `prefers-reduced-motion` (unless the visitor explicitly presses "Play motion") and by the
"Pause motion" control in the hero and footer. Normal browser scrolling everywhere; smooth anchor
scrolling only when motion is on.
