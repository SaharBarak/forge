#!/bin/bash
# Timelapse the Phase 2 TUI-overlay recordings into watchable gifs.
# Overlays are shorter than mode tapes (~60s instead of ~180s), so we
# use a lighter speedup by default. Matches the ffmpeg pipeline of
# modes/timelapse-all.sh for consistency.
#
# Input:  docs/demo/<name>-raw.gif
# Output: docs/demo/<name>.gif

set -e
cd "$(dirname "$0")/../.."

OVERLAYS=(agent-control skill-picker)
SPEED="${SPEED:-3}"     # 3x speedup — overlays are already short
FPS="${FPS:-20}"

for o in "${OVERLAYS[@]}"; do
  in="docs/demo/${o}-raw.gif"
  out="docs/demo/${o}.gif"
  if [ ! -f "$in" ]; then
    echo "SKIP ${o} (no raw gif at ${in})"
    continue
  fi
  echo "=== timelapse: ${o} ==="
  ffmpeg -y -i "$in" \
    -filter_complex "[0:v]setpts=PTS/${SPEED},fps=${FPS},split[a][b];[a]palettegen[p];[b][p]paletteuse" \
    "$out" 2>&1 | tail -2
  in_size=$(stat -f%z "$in" 2>/dev/null || stat -c%s "$in")
  out_size=$(stat -f%z "$out" 2>/dev/null || stat -c%s "$out")
  printf "  %-18s %8d → %8d bytes\n" "$o" "$in_size" "$out_size"
done

echo "=== overlays done ==="
