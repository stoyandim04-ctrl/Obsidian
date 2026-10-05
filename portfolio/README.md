# OBSIDIAN No. 01 — portfolio package for 13:33

Everything needed to present OBSIDIAN on the 13:33 website **without embedding the application in an
iframe**. OBSIDIAN stays a separate, independently deployable project; the 13:33 site links to it.

## Short description (EN, ready to paste)

> **OBSIDIAN No. 01** — an original fragrance website concept. Black glass, volcanic stone and amber
> light, staged like a photographed campaign and built as a working product page: a canonical 3D bottle
> rendered consistently across every frame, a seamless hero loop, a scroll-led study of the object,
> three scent chapters, size selection, an interactive 3D view and an accessible demo bag.
> Fictional brand — concept project by 13:33.

One-line version: *A cinematic fragrance website concept in dark glass and amber light — concept by 13:33.*

## Role (accurate)

Concept, art direction, product design of the bottle, 3D modelling and look development, lighting and
rendering, motion design, frontend engineering, accessibility and performance QA — 13:33.

Production tools: Blender 4.2 (Cycles) for every product image and the hero loop, three.js for the
interactive viewer, Figma's AI image generation (Gemini 3.1 Flash Image) for the three scent still lifes,
React + TypeScript + Vite for the site, AI-assisted development with Claude Code.

## What works (verifiable in the build)

- Hero with a seamless 6-second rendered loop, matching poster first, deferred video, pause control.
- One sticky "The Object" sequence on desktop (four authored frames, scroll-linked crossfade).
- Three editorial scent chapters with a light editorial band.
- 50 mL / 100 mL selection with matching bottle print and illustrative prices.
- Genuine interactive 3D view (drag, keyboard, reset) of the same canonical bottle; omitted without WebGL.
- Demo bag drawer: modal, keyboard and screen-reader friendly, quantity 1–9, integer-cent subtotal,
  validated local storage. No checkout, no payments, no data collection.
- Reduced-motion support and an on-page motion pause; designed mobile layouts from 320 px.

## Concept disclosure (must accompany the project)

> OBSIDIAN is a fictional brand and product created by 13:33 as a portfolio concept. It is not a client
> commission. No product exists for sale; prices are illustrative; scent notes are creative fiction.

## Files

| File | Use |
| --- | --- |
| `hero/obsidian-hero-2560.jpg`, `hero/obsidian-hero-1600.webp` | Project hero still |
| `thumbnail/obsidian-thumb-1600x1000.jpg`, `…-800x500.webp` | Project card / grid thumbnail |
| `screenshots/desktop-*.png` | Real 1440×900 captures of each section |
| `screenshots/mobile-*.png` | Real 390×844 (@2x) captures |
| `reel/obsidian-reel-16x9.mp4` | 18 s website walkthrough, 1920×1080 |
| `reel/obsidian-reel-9x16.mp4` | 18 s vertical edit from the phone layout, 1080×1920 |
| `reel/poster-16x9.jpg`, `reel/poster-9x16.jpg` | Posters for the reel `<video>` |
| `reference/obsidian-no01-reference-sheet.jpg` | Canonical product sheet (front, ¾, side, cap, base) |

### Reel timeline (both edits)

| Time | Content (all captured from the live site) |
| --- | --- |
| 0–3 s | Hero composition with the rendered loop playing |
| 3–6 s | Scrolling through "The Object" from cap to brass-ring macro (desktop) / object figures (vertical) |
| 6–9 s | Opening chapter, cut to Heart chapter |
| 9–12 s | Selecting 100 mL, the print and price change, adding to the demo bag |
| 12–15 s | Actual phone layout (16:9 edit: centred capture; vertical edit: mobile menu) |
| 15–18 s | Closing frame "Presence, distilled." + title card "OBSIDIAN — Concept by 13:33" |

The title card is the only element added in editing; nothing in the reel suggests an interaction the
site does not have.

## Integration snippet for the 13:33 site

```html
<article class="project">
  <a href="LIVE_URL" rel="noopener">
    <video muted playsinline loop preload="none" poster="obsidian/reel/poster-16x9.jpg" width="1920" height="1080">
      <source src="obsidian/reel/obsidian-reel-16x9.mp4" type="video/mp4" />
    </video>
    <h3>OBSIDIAN No. 01</h3>
    <p>A cinematic fragrance website concept in dark glass and amber light.</p>
    <p class="note">Concept project — fictional brand.</p>
  </a>
</article>
```

Replace `LIVE_URL` only once a real deployment exists (see `docs/STATUS.md`). Until then, link to the
reel or screenshots, not to a placeholder URL. Start the reel only on hover/in-view and respect
`prefers-reduced-motion` on the 13:33 site.

## Live URL

**None yet.** No deployment was made; see `docs/STATUS.md` for the one-step Vercel/static deploy.
