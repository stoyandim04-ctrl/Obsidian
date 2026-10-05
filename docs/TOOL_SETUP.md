# Tool setup and connection status

Verified in the Claude Code cloud session on 2026-10-05 (Linux container, Node 22, Python 3.11, 4 CPU cores, no GPU).
No secrets are stored in this repository. All account connections below use OAuth through the Claude
connector system; nothing in the site bundle talks to a generation service.

## Summary

| Capability | Tool | Status | Verified how |
| --- | --- | --- | --- |
| Canonical 3D bottle, product renders, hero motion frames | **Blender 4.2 (`bpy` wheel) + Cycles CPU** | ✅ Installed in `/opt/bpyenv` | Rendered every product image in `source/renders/` |
| Deterministic bottle typography | **Pillow + OFL fonts** (`source/scripts/make_label.py`) | ✅ | Label textures in `source/textures/` |
| Image generation (scent still lifes) | **Figma MCP → `generate_image` (gemini-3.1-flash-image)** | ✅ Connected (team plan "Stoyan Dimitrov's team", Starter) | 3 generations downloaded to `source/generated/` |
| Image / video generation | **Higgsfield MCP** (`https://mcp.higgsfield.ai/mcp`) | ⚠️ Connected, **0 credits** | `balance` → `{"credits":0,"subscription_plan_type":"free"}`; cost pre-flight only |
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

**Blocker:** the account is on the free plan with 0 credits, so no Higgsfield generation was run.
Pre-flight costs (no charge, `get_cost: true`):

| Request | Credits |
| --- | --- |
| `nano_banana_pro`, 16:9, 2K image | 2 |
| `seedance_2_0`, 6 s, 1080p, no audio | 54 |

**Owner action (only if you want Higgsfield output):**
1. Sign in at <https://higgsfield.ai> with the same account the connector uses.
2. Add credits yourself (Claude cannot purchase). The agreed ceiling for this project is **150 credits**.
3. Tell the session "готово"; it will re-check `balance` before any paid request and stop at three attempts per shot.

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
source/scripts/render_motion.sh                                   # mobile hero, closing light pass, loop frames
/opt/bpyenv/bin/python source/blender/export_glb.py public/models/obsidian-no01.glb
```

`bpy==4.2.0` requires Python 3.11 exactly. Rendering is CPU-only here; a 2560×1440 still at 160 samples
took ≈3.5 min on 4 cores.

## Not connected / not needed

- **Scrollytelling libraries / code snippets** offered by the owner (e.g. from "scrollide"-type tools):
  not required — the one scroll-linked sequence uses a 40-line native hook (`useScrollProgress`).
- **Vercel deployment**: the Vercel connector exists in this account, but no project was created or
  deployed without explicit approval. See `docs/STATUS.md` for the deploy step.
