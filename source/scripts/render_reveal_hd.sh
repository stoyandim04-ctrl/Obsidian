#!/usr/bin/env bash
# Reveal film at 1.5× resolution: 1920×1080 desktop, 864×1536 mobile, 32 samples + OIDN.
# Same 240-frame path, every 2nd frame (120 per aspect). Existing frames are skipped, so it can resume.
set -u
cd "$(dirname "$0")/../.."
PY=/opt/bpyenv/bin/python
# wait for a running reveal render to finish first (they would compete for the same 4 cores)
while pgrep -f "obsidian_scene.py --shot reveal" > /dev/null; do sleep 20; done
echo "reveal hd desktop $(date +%T)"
$PY source/blender/obsidian_scene.py --shot reveal --frames 0:240 --nframes 240 --step 2 --scale 1.5 --samples 32 --out source/frames/reveal_desktop_hd > source/renders/reveal_desktop_hd.log 2>&1 || echo "FAIL reveal hd desktop"
echo "reveal hd mobile $(date +%T)"
$PY source/blender/obsidian_scene.py --shot reveal_mobile --frames 0:240 --nframes 240 --step 2 --scale 1.5 --samples 32 --out source/frames/reveal_mobile_hd > source/renders/reveal_mobile_hd.log 2>&1 || echo "FAIL reveal hd mobile"
echo "reveal hd done $(date +%T)"
