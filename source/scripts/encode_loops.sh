#!/usr/bin/env bash
# Assemble the seamless hero loops from rendered frames 0..72 (frame f == frame 144-f by construction).
# 0..72 forward + 71..1 backward = 144 frames = 6 s at 24 fps. Blacks lifted to #0B0C0E like the stills.
set -euo pipefail
cd "$(dirname "$0")/../.."
LIFT="lutrgb=r='11+val*244/255':g='12+val*243/255':b='14+val*241/255'"
enc() { # name width height crf maxrate
  local name=$1 w=$2 h=$3 crf=$4 maxrate=$5 dir=source/frames/$1 list
  list=$(mktemp)
  for i in $(seq 0 72) $(seq 71 -1 1); do printf "file '%s/f%04d.png'\nduration 0.0416667\n" "$PWD/$dir" "$i"; done > "$list"
  ffmpeg -y -v error -f concat -safe 0 -i "$list" \
    -vf "fps=24,scale=${w}:${h}:flags=lanczos,${LIFT},format=yuv420p" \
    -c:v libx264 -profile:v high -preset veryslow -crf "$crf" -maxrate "$maxrate" -bufsize "$maxrate" \
    -g 48 -movflags +faststart -an "public/media/hero-loop-${name#hero_}.mp4"
  # VP9/WebM first in the <source> list: smaller, and playable in open-source Chromium builds
  ffmpeg -y -v error -f concat -safe 0 -i "$list" \
    -vf "fps=24,scale=${w}:${h}:flags=lanczos,${LIFT},format=yuv420p" \
    -c:v libvpx-vp9 -b:v 0 -crf "$((crf + 13))" -row-mt 1 -deadline good -cpu-used 1 -g 48 -an "public/media/hero-loop-${name#hero_}.webm"
  rm -f "$list"
  ls -la "public/media/hero-loop-${name#hero_}".*
}
enc hero_desktop 1920 1080 20 8M
enc hero_mobile 720 1280 21 4M
