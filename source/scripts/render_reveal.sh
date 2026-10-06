#!/usr/bin/env bash
# Reveal film (hero → object → cap → atomizer → spray): every 2nd frame of a 240-frame path,
# 120 frames desktop (16:9, 1920×1080) + 120 frames mobile (9:16, 1080×1920). Existing frames are skipped.
set -u
cd "$(dirname "$0")/../.."
PY=/opt/bpyenv/bin/python
echo "reveal desktop $(date +%T)"
$PY source/blender/obsidian_scene.py --shot reveal --frames 0:240 --nframes 240 --step 2 --samples 24 --out source/frames/reveal_desktop > source/renders/reveal_desktop.log 2>&1 || echo "FAIL reveal desktop"
echo "reveal mobile $(date +%T)"
$PY source/blender/obsidian_scene.py --shot reveal_mobile --frames 0:240 --nframes 240 --step 2 --samples 24 --out source/frames/reveal_mobile > source/renders/reveal_mobile.log 2>&1 || echo "FAIL reveal mobile"
echo "reveal done $(date +%T)"
