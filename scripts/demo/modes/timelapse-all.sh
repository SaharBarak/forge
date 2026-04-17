#!/bin/bash
# Timelapse all 11 mode recordings into watchable gifs.
# Input:  docs/demo/modes/<mode>-raw.gif  (raw 60-180s recordings)
# Output: docs/demo/modes/<mode>.gif       (6x speedup, ~10-30s, smaller)
#
# Uses ffmpeg with palettegen+paletteuse for a clean gif encode.
# Phase 2 adds vc-pitch, tech-review, red-team to the set.

set -e
cd "$(dirname "$0")/../../.."

MODES=(copywrite will-it-work idea-validation ideation business-plan gtm-strategy site-survey custom vc-pitch tech-review red-team)
SPEED="${SPEED:-6}"     # 6x speedup by default
FPS="${FPS:-18}"        # output fps

for m in "${MODES[@]}"; do
  in="docs/demo/modes/${m}-raw.gif"
  out="docs/demo/modes/${m}.gif"
  if [ ! -f "$in" ]; then
    echo "SKIP ${m} (no raw gif at ${in})"
    continue
  fi
  echo "=== timelapse: ${m} ==="
  ffmpeg -y -i "$in" \
    -filter_complex "[0:v]setpts=PTS/${SPEED},fps=${FPS},split[a][b];[a]palettegen[p];[b][p]paletteuse" \
    "$out" 2>&1 | tail -2
  in_size=$(stat -f%z "$in" 2>/dev/null || stat -c%s "$in")
  out_size=$(stat -f%z "$out" 2>/dev/null || stat -c%s "$out")
  printf "  %-18s %8d → %8d bytes\n" "$m" "$in_size" "$out_size"
done

echo "=== all done ==="
