#!/usr/bin/env bash
# Renders every still master from the canonical Blender scene.
set -u
cd "$(dirname "$0")/../.."
OUT=source/renders
PY=/opt/bpyenv/bin/python
mkdir -p "$OUT"
r() { # shot outname [extra args]
  local shot=$1 name=$2; shift 2
  [ -f "$OUT/$name.png" ] && { echo "skip $name"; return; }
  echo "render $name $(date +%T)"
  $PY source/blender/obsidian_scene.py --shot "$shot" --out "$OUT/$name.png" "$@" > "$OUT/$name.log" 2>&1 || echo "FAIL $name"
}
r hero_desktop hero_desktop
r hero_mobile hero_mobile
r object_o0 object_o0
r object_o1 object_o1
r object_o2 object_o2
r object_o3 object_o3
r product product_50 --size 50
r product product_100 --size 100
r closing_desktop closing_desktop
r closing_mobile closing_mobile
r ref_front ref_front
r ref_three_quarter ref_three_quarter
r ref_side ref_side
r ref_cap ref_cap
r ref_base ref_base
echo "all stills done $(date +%T)"
