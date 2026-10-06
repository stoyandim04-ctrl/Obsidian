#!/usr/bin/env bash
# End of the notes film: the closing plinth, 16:9 and 9:16, empty (Kling T3 end frame) and with the bottle.
set -u
cd "$(dirname "$0")/../.."
PY=/opt/bpyenv/bin/python
mkdir -p source/renders/plinth
for shot in plinth_film plinth_film_mobile; do
  $PY source/blender/obsidian_scene.py --shot $shot --no-bottle --out source/renders/plinth/${shot}_empty.png > source/renders/plinth/${shot}_empty.log 2>&1 || echo "FAIL $shot empty"
  $PY source/blender/obsidian_scene.py --shot $shot --out source/renders/plinth/${shot}_bottle.png > source/renders/plinth/${shot}_bottle.log 2>&1 || echo "FAIL $shot bottle"
done
