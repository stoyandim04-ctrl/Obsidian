#!/usr/bin/env bash
# Second pass: mobile hero still, closing light pass, and hero loop frames.
# The loop is symmetric (frame f == frame N-f), so only frames 0..N/2 are rendered.
set -u
cd "$(dirname "$0")/../.."
OUT=source/renders
PY=/opt/bpyenv/bin/python
r() { local shot=$1 name=$2; shift 2
  [ -f "$OUT/$name.png" ] && { echo "skip $name"; return; }
  echo "render $name $(date +%T)"
  $PY source/blender/obsidian_scene.py --shot "$shot" --out "$OUT/$name.png" "$@" > "$OUT/$name.log" 2>&1 || echo "FAIL $name"; }
r hero_mobile hero_mobile
r object_o1 object_o1
r object_o2 object_o2
r object_o3 object_o3
r ref_base ref_base
r closing_desktop_b closing_desktop_b
r closing_mobile_b closing_mobile_b
echo "loop desktop $(date +%T)"
$PY source/blender/obsidian_scene.py --shot hero_loop --frames 0:73 --nframes 144 --samples 40 --out source/frames/hero_desktop > "$OUT/loop_desktop.log" 2>&1 || echo "FAIL loop desktop"
echo "loop mobile $(date +%T)"
$PY source/blender/obsidian_scene.py --shot hero_mobile_loop --frames 0:73 --nframes 144 --samples 40 --out source/frames/hero_mobile > "$OUT/loop_mobile.log" 2>&1 || echo "FAIL loop mobile"
echo "motion done $(date +%T)"
