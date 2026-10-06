# Tool setup and connection status

Verified in the Claude Code cloud session on 2026-10-05 (Linux container, Node 22, Python 3.11, 4 CPU cores, no GPU).
No secrets are stored in this repository. All account connections below use OAuth through the Claude
connector system; nothing in the site bundle talks to a generation service.

## Summary

| Capability | Tool | Status | Verified how |
| --- | --- | --- | --- |
| Canonical 3D bottle, product renders, hero motion frames | **Blender 4.2 (`bpy` wheel) + Cycles CPU** | ✅ Installed in `/opt/bpyenv` | Rendered every product image in `source/renders/` |
| Deterministic bottle typography | **Pillow + OFL fonts** (`source/scripts/make_label.py`) | ✅ | Label textures in `source/textures/` |
| Image generation (first scent drafts) | **Figma MCP → `generate_image` (gemini-3.1-flash-image)** | ✅ Connected (team plan "Stoyan Dimitrov's team", Starter) | 3 drafts in `source/generated/`; base draft reused as Higgsfield reference |
| Image / video generation | **Higgsfield MCP** (`https://mcp.higgsfield.ai/mcp`) | ✅ Connected (Lite plan, private workspace) | 11 image + 9 video generations; **144 of the approved 150 credits** spent (see below) |
| Web derivatives (AVIF/WebP/JPEG) | **sharp 0.35** (`scripts/build-media.mjs`) | ✅ | `public/media/*` |
| Video encode / reel edit | **ffmpeg** (system) | ✅ | `public/media/hero-loop-*.mp4`, `portfolio/reel/*` |
| Browser QA and screenshots | **Playwright 1.56.1 + bundled Chromium 1194** | ✅ | `scripts/qa.mjs`, `scripts/shots.mjs` |
| Interactive 3D on the site | **three.js r186** (GLB exported from the same Blender build) | ✅ | `public/models/obsidian-no01.glb` |
| Canva generator | Canva MCP | Available, **not used** (Figma covered the need) | — |

## Higgsfield

**What it would create:** higher-resolution scent still lifes (2K/4K) and an optional atmospheric
image-to-video shot (for example the amber resin scene) — never the bottle itself, which stays
deterministic in Blender so the product never morphs.

**Connection:** the Higgsfield MCP connector is already attached to this Claude account and answers
read-only calls (`balance`, `models_explore`, `get_cost`). Per the official help centre
(<https://higgsfield.ai/creator-hub/help-center/integrations/what-is-higgsfield-mcp>):

> "MCP connects to your existing account and uses your existing plan credits, with no API key required."
> "Everything generated through MCP deducts credits, regardless of your plan."
> "Unlimited access and free generations apply only on higgsfield.ai."

So a web subscription with "unlimited" generations does **not** make MCP generations free.

**History:** at the start of the session the connector reported `{"credits":0,"subscription_plan_type":"free"}`,
so nothing was generated. After the owner's account showed 250 credits (Lite plan), `list_workspaces` and
`balance` returned 250 credits in the private workspace and generation went ahead within the owner's
**150-credit ceiling**.

**Spend (from `transactions`, re-read 2026-10-06 08:20 UTC; balance now 106):**

| Time (UTC) | Item | Credits |
| --- | --- | --- |
| 23:13:44 | Nano Banana Pro 2K — Opening still | −2 |
| 23:13:44 | Nano Banana Pro 2K — Heart still | −2 |
| 23:13:44 | Nano Banana Pro 2K — Base still (rejected: composition) | −2 |
| 23:15:26 | Nano Banana Pro 2K — Base still from the Figma draft as reference (accepted) | −2 |
| 23:16:27 | Seedance 2.0, 6 s, 1080p, no audio — Base light-movement loop | −54 |
| | *Subtotal, editorial version* | *−62* |
| 2026-10-06 00:18:19 | Nano Banana Pro 2K ×6 — 16:9 and 9:16 reframes of the three keyframes | −12 |
| 00:26:21 | Refund — one 16:9 reframe failed on the provider side | +2 |
| 00:28:27 | Nano Banana Pro 2K — opening 16:9 reframe, retry | −2 |
| 00:30:04–00:30:15 | Kling 3.0 pro 5 s ×6 — transitions T0–T2, 16:9 and 9:16 | −52.5 |
| 08:07:04 | Kling 3.0 pro 5 s ×2 — transition T3 (base → plinth), 16:9 and 9:16 | −17.5 |
| | **Total this project** | **−144** of the 150 approved (balance 250 → 106) |

Model choice for the transitions: costs were pre-flighted with `get_cost: true` for Kling 3.0 std, Kling
3.0 pro and Seedance 2.0 fast before anything was submitted; Kling 3.0 pro (8.75 credits per 5 s) was
chosen for its start/end-frame adherence. Two submissions were blocked by a preset recommendation before
charging and resubmitted with `declined_preset_id`. The remaining 6 approved credits were not used.

Every request was cost-preflighted with `get_cost: true` and sent with `use_unlim: false`. Media upload for
the reference image used the presigned PUT returned by `media_upload` (requires the `If-None-Match: *`
header listed in its signed headers) followed by `media_confirm`.

The REST API (<https://docs.higgsfield.ai/>) uses a separate server-side key pair
(`Authorization: Key ${HF_API_KEY_ID}:${HF_API_KEY_SECRET}`, created at <https://console.higgsfield.ai>).
It is **not needed** because the OAuth MCP connector covers the same generation; if ever used, keep the
key in a local secret store / environment variable, never in this repo or the frontend.

## Figma image generation

Used `mcp__Figma__generate_image` with `planKey team::1637246835953568716` and model
`gemini-3.1-flash-image`. Each call consumes Figma AI credits on that plan; outputs were 1200×896 PNG,
downloaded immediately (Figma URLs expire after 7 days). Prompts are recorded in
`docs/ASSET_MANIFEST.md`.

## Blender (`bpy`) — reproduce locally

```bash
python3.11 -m venv /opt/bpyenv
/opt/bpyenv/bin/pip install bpy==4.2.0 pillow numpy
/opt/bpyenv/bin/python source/scripts/make_label.py            # label textures
source/scripts/render_stills.sh                                   # all still masters
source/scripts/render_motion.sh                                   # closing light pass
source/scripts/render_reveal.sh                                   # reveal film frames (≈40 min per aspect on 4 cores)
source/scripts/render_plinth.sh                                   # plinth frames that close the notes film
/opt/bpyenv/bin/python source/blender/export_glb.py public/models/obsidian-no01.glb
```

`bpy==4.2.0` requires Python 3.11 exactly. Rendering is CPU-only here; a 2560×1440 still at 160 samples
took ≈3.5 min on 4 cores.

## Not connected / not needed

- **Scrollytelling libraries / code snippets** offered by the owner (e.g. from "scrollide"-type tools):
  not required — both films run on a ~280-line component (`ScrollFilm.tsx`) with native scroll, canvas
  and `img.decode()`; no GSAP / Lenis / ScrollTrigger dependency.
- **Vercel deployment**: the Vercel connector is connected, but `create_project` returned **403** for this
  account, so no project exists and nothing was deployed. The owner creates the project once (steps in
  `docs/STATUS.md`); after that, deploys need no secrets in this repo.
