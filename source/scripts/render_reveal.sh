#!/usr/bin/env bash
# Scroll-scrubbed hero/object sequence: 160 frames desktop (16:9) + 160 frames mobile (9:16).
set -u
cd "$(dirname "$0")/../.."
PY=/opt/bpyenv/bin/python
echo "reveal desktop $(date +%T)"
$PY source/blender/obsidian_scene.py --shot reveal --frames 0:240 --nframes 240 --step 2 --samples 24 --out source/frames/reveal_desktop > source/renders/reveal_desktop.log 2>&1 || echo "FAIL reveal desktop"
echo "reveal mobile $(date +%T)"
$PY source/blender/obsidian_scene.py --shot reveal_mobile --frames 0:240 --nframes 240 --step 2 --samples 24 --out source/frames/reveal_mobile > source/renders/reveal_mobile.log 2>&1 || echo "FAIL reveal mobile"
echo "reveal done $(date +%T)"
