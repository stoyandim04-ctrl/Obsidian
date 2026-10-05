#!/usr/bin/env bash
# Hero loop frames only (0..72; the loop is symmetric). See render_motion.sh for the full second pass.
set -u
cd "$(dirname "$0")/../.."
PY=/opt/bpyenv/bin/python
echo "loop desktop $(date +%T)"
$PY source/blender/obsidian_scene.py --shot hero_loop --frames 0:73 --nframes 144 --samples 28 --out source/frames/hero_desktop > source/renders/loop_desktop.log 2>&1 || echo "FAIL loop desktop"
echo "loop mobile $(date +%T)"
$PY source/blender/obsidian_scene.py --shot hero_mobile_loop --frames 0:73 --nframes 144 --samples 28 --out source/frames/hero_mobile > source/renders/loop_mobile.log 2>&1 || echo "FAIL loop mobile"
echo "loops done $(date +%T)"
