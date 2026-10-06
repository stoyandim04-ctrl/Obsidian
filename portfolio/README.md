# OBSIDIAN No. 01 — portfolio package for 13:33

Everything needed to present OBSIDIAN on the 13:33 website **without embedding the application in an
iframe**. OBSIDIAN stays a separate, independently deployable project; the 13:33 site links to it.

## Short description (EN, ready to paste)

> **OBSIDIAN No. 01** — an original fragrance website concept. Black glass, volcanic stone and amber
> light, told as two full-screen films the visitor scrubs with the scroll: the bottle is revealed, opened
> and sprayed; the droplets become bergamot, iris and amber, and the stone turns into the plinth the
> bottle returns to. A working product page follows — size selection, an interactive 3D view of the same
> canonical bottle and an accessible demo bag. Fictional brand — concept project by 13:33.

One-line version: *A cinematic fragrance website concept in dark glass and amber light — concept by 13:33.*

## Role (accurate)

Concept, art direction, product design of the bottle, 3D modelling and look development, lighting and
rendering, motion design, frontend engineering, accessibility and performance QA — 13:33.

Production tools: Blender 4.2 (Cycles) for every product image and the reveal film; Higgsfield
(Nano Banana Pro still lifes, Kling 3.0 start/end-frame transitions) for the ingredient film, with Figma's
AI image generation for first drafts; three.js for the interactive viewer; React + TypeScript + Vite for
the site; AI-assisted development with Claude Code.

## What works (verifiable in the build)

- Two full-screen scroll-scrubbed films on a sticky canvas, driven by ordinary page scrolling:
  - **Reveal** (Blender, 120 frames): hero → the object → cap and brass ring lift away → atomizer →
    900-droplet amber spray.
  - **Notes** (Kling 3.0 + Blender, 264 frames): the droplets fall and become bergamot and pepper →
    daylight turns the slate to travertine, iris and cedar → amber resin and vetiver on volcanic stone →
    the stone becomes a plinth and the bottle appears on it.
- Copy in a different colour for each scene, measured for contrast over the actual frames.
- Separate 16:9 and 9:16 frame sets (composed for each, not cropped); frames stream coarse-to-fine.
- 50 mL / 100 mL selection with matching bottle print and illustrative prices.
- Genuine interactive 3D view (drag, keyboard, reset) of the same canonical bottle; omitted without WebGL.
- Demo bag drawer: modal, keyboard and screen-reader friendly, quantity 1–9, integer-cent subtotal,
  validated local storage. No checkout, no payments, no data collection.
- Reduced motion / "Pause motion": both films become still frames with the same copy.

## Concept disclosure (must accompany the project)

> OBSIDIAN is a fictional brand and product created by 13:33 as a portfolio concept. It is not a client
> commission. No product exists for sale; prices are illustrative; scent notes are creative fiction.

## Files

| File | Use |
| --- | --- |
| `hero/obsidian-hero-2560.jpg`, `hero/obsidian-hero-1600.webp` | Project hero still |
| `thumbnail/obsidian-thumb-1600x1000.jpg`, `…-800x500.webp` | Project card / grid thumbnail |
| `screenshots/desktop-*.png` | Real 1440×900 captures: every film chapter, product, bag, closing, footer |
| `screenshots/mobile-*.png` | Real 390×844 (@2x) captures of the same |
| `reel/obsidian-reel-16x9.mp4` | 18 s website walkthrough, 1920×1080 |
| `reel/obsidian-reel-9x16.mp4` | 18 s vertical edit from the phone layout, 1080×1920 |
| `reel/poster-16x9.jpg`, `reel/poster-9x16.jpg` | Posters for the reel `<video>` |
| `reference/obsidian-no01-reference-sheet.jpg` | Canonical product sheet (front, ¾, side, cap, base) |

Hero and thumbnail are the 2560×1440 Blender master of the canonical bottle (the same model as every
film frame).

### Reel timeline (both edits, one continuous take of the live site)

| Time | Content |
| --- | --- |
| 0–6.5 s | Reveal film scrolled from the hero through the cap lift and the atomizer to the spray |
| 6.5–12.5 s | Notes film: droplets → bergamot → iris → amber → plinth with the bottle |
| 12.5–15 s | Selecting 100 mL (print and price change), adding to the demo bag |
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
