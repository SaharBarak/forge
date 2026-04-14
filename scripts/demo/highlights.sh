#!/usr/bin/env bash
# Variable-speed MP4 highlight reels for each deliberation mode.
#
# Approach (per taste-skill synthesis):
#   - video-understand: parse transcripts to find Skeptic / Pragmatist / Analyst
#     timestamps
#   - demo-producer: one continuous narrative, no hard cuts → no "screenshot
#     collage" feel
#   - video-editing: use ffmpeg trim + setpts + concat to time-lapse boring
#     parts (6x) while keeping interesting moments at readable speed (1.5x)
#   - ffmpeg: h264 output is 10x smaller than gif + much smoother motion
#
# For each mode the pipeline:
#   1. Finds the most recent session dir for the project
#   2. Parses transcript.md → first Skeptic/Pragmatist/Analyst timestamps
#   3. Splits the raw gif into 7 segments: pre-Sk, Sk, Sk-Pr, Pr, Pr-An, An, post-An
#   4. Time-lapses boring segments 6x, interesting segments 1.5x
#   5. Concatenates via filter_complex into a single h264 MP4
#
# Requires bash 4+ OR bash 3.2 (macOS default) — uses case, not associative arrays.

set -e
cd "$(dirname "$0")/../.."

RAW_DIR=docs/demo/modes
OUT_DIR=docs/demo/modes

PRE_SESSION_PAD=15      # ~seconds from vhs start → first session message
WINDOW=10               # seconds held at near-real-time around each moment
SPEED_BORING=6          # speedup factor for boring time-lapse segments
SPEED_MOMENT=1.5        # speedup factor for interesting-moment segments
TARGET_FPS=24           # output framerate
TARGET_WIDTH=1280

# mode → project name prefix (bash 3.2 compatible)
project_for() {
  case "$1" in
    copywrite)       echo "StarshipDB" ;;
    will-it-work)    echo "PostgresToCockroach" ;;
    idea-validation) echo "SentryDeck" ;;
    ideation)        echo "DevToolsOpportunities" ;;
    business-plan)   echo "VerticalAgentOps" ;;
    gtm-strategy)    echo "AgentCI" ;;
    site-survey)     echo "LegacyDashboard" ;;
    custom)          echo "OpenQuestion" ;;
  esac
}

find_session() {
  ls -dt "output/sessions/$1"-* 2>/dev/null | head -1
}

# Parse transcript → emit `offset\tagent\ttag\tpreview` lines for first Skeptic/
# Pragmatist/Analyst messages
pick_moments() {
  local transcript="$1"
  python3 - "$transcript" <<'PY'
import re, sys
text = open(sys.argv[1]).read()

def hms(ts):
    h, m, s = map(int, ts.split(':'))
    return h * 3600 + m * 60 + s

first = re.search(r'### \*\*System\*\*\s*\n\*(\d+:\d+:\d+)\*', text)
if not first:
    sys.exit(0)
start = hms(first.group(1))

hdr = re.compile(r'### \*\*(Skeptic|Pragmatist|Analyst)\*\* \[([A-Z_]+)\]\s*\n\*(\d+:\d+:\d+)\*')
wanted = {'Skeptic': None, 'Pragmatist': None, 'Analyst': None}
for m in hdr.finditer(text):
    agent = m.group(1)
    if wanted[agent] is not None:
        continue
    off = hms(m.group(3)) - start
    if off < 0:
        off += 86400
    preview = re.sub(r'\s+', ' ', text[m.end(): m.end() + 200].strip())[:80]
    wanted[agent] = (off, agent, m.group(2), preview)
    if all(wanted.values()):
        break

for k in ('Skeptic', 'Pragmatist', 'Analyst'):
    if wanted[k]:
        off, agent, tag, preview = wanted[k]
        print(f"{off}\t{agent}\t{tag}\t{preview}")
PY
}

# Get raw gif duration in seconds (integer)
gif_duration() {
  ffprobe -v error -show_entries stream=duration -of default=nw=1:nk=1 "$1" \
    | awk '{printf "%d", $1 + 0.5}'
}

for mode in copywrite will-it-work idea-validation ideation business-plan gtm-strategy site-survey custom; do
  proj=$(project_for "$mode")
  raw="$RAW_DIR/$mode-raw.gif"
  out_mp4="$OUT_DIR/$mode.mp4"

  if [ ! -f "$raw" ]; then
    echo "SKIP $mode (no raw gif)"
    continue
  fi
  sess=$(find_session "$proj")
  if [ -z "$sess" ] || [ ! -f "$sess/transcript.md" ]; then
    echo "SKIP $mode (no transcript for $proj)"
    continue
  fi

  echo "=== $mode ($proj) ==="
  moments=$(pick_moments "$sess/transcript.md")
  if [ -z "$moments" ]; then
    echo "  no moments — skipping"
    continue
  fi

  # Extract the three offsets (add pre-session pad to map to raw-gif time)
  sk_off=0; pr_off=0; an_off=0
  while IFS=$'\t' read -r off agent tag preview; do
    gif_t=$(( off + PRE_SESSION_PAD ))
    case "$agent" in
      Skeptic)    sk_off=$gif_t; echo "  Sk@${gif_t}s: ${preview}" ;;
      Pragmatist) pr_off=$gif_t; echo "  Pr@${gif_t}s: ${preview}" ;;
      Analyst)    an_off=$gif_t; echo "  An@${gif_t}s: ${preview}" ;;
    esac
  done <<< "$moments"

  if [ "$sk_off" -eq 0 ] || [ "$pr_off" -eq 0 ] || [ "$an_off" -eq 0 ]; then
    echo "  missing one of sk/pr/an — falling back to naive 6x time-lapse"
    ffmpeg -y -v error -i "$raw" \
      -vf "setpts=PTS/${SPEED_BORING},fps=${TARGET_FPS},scale=${TARGET_WIDTH}:-2:flags=lanczos" \
      -pix_fmt yuv420p -c:v libx264 -preset medium -crf 22 \
      -movflags +faststart "$out_mp4"
    continue
  fi

  raw_dur=$(gif_duration "$raw")

  # Define 7 segments (all with PTS relative to segment start):
  #   0: [0, sk_start)                             BORING
  #   1: [sk_start, sk_start+WINDOW)               MOMENT
  #   2: [sk_end, pr_start)                        BORING
  #   3: [pr_start, pr_start+WINDOW)               MOMENT
  #   4: [pr_end, an_start)                        BORING
  #   5: [an_start, an_start+WINDOW)               MOMENT
  #   6: [an_end, raw_dur)                         BORING
  sk_end=$(( sk_off + WINDOW ))
  pr_end=$(( pr_off + WINDOW ))
  an_end=$(( an_off + WINDOW ))
  # clamp
  [ "$pr_off" -lt "$sk_end" ] && pr_off=$sk_end
  [ "$an_off" -lt "$pr_end" ] && an_off=$pr_end
  [ "$an_end" -gt "$raw_dur" ] && an_end=$raw_dur

  echo "  segments: 0-${sk_off}(bored) ${sk_off}-${sk_end}(Sk) ${sk_end}-${pr_off}(bored) ${pr_off}-${pr_end}(Pr) ${pr_end}-${an_off}(bored) ${an_off}-${an_end}(An) ${an_end}-${raw_dur}(bored)"

  fc="[0:v]trim=start=0:end=${sk_off},setpts=(PTS-STARTPTS)/${SPEED_BORING}[s0];"
  fc+="[0:v]trim=start=${sk_off}:end=${sk_end},setpts=(PTS-STARTPTS)/${SPEED_MOMENT}[s1];"
  fc+="[0:v]trim=start=${sk_end}:end=${pr_off},setpts=(PTS-STARTPTS)/${SPEED_BORING}[s2];"
  fc+="[0:v]trim=start=${pr_off}:end=${pr_end},setpts=(PTS-STARTPTS)/${SPEED_MOMENT}[s3];"
  fc+="[0:v]trim=start=${pr_end}:end=${an_off},setpts=(PTS-STARTPTS)/${SPEED_BORING}[s4];"
  fc+="[0:v]trim=start=${an_off}:end=${an_end},setpts=(PTS-STARTPTS)/${SPEED_MOMENT}[s5];"
  fc+="[0:v]trim=start=${an_end}:end=${raw_dur},setpts=(PTS-STARTPTS)/${SPEED_BORING}[s6];"
  fc+="[s0][s1][s2][s3][s4][s5][s6]concat=n=7:v=1:a=0[cat];"
  fc+="[cat]fps=${TARGET_FPS},scale=${TARGET_WIDTH}:-2:flags=lanczos[v]"

  ffmpeg -y -v error -i "$raw" \
    -filter_complex "$fc" \
    -map "[v]" \
    -pix_fmt yuv420p -c:v libx264 -preset medium -crf 22 \
    -movflags +faststart "$out_mp4"

  dur=$(ffprobe -v error -show_entries stream=duration -of default=nw=1:nk=1 "$out_mp4" | awk '{printf "%.1f", $1}')
  sz=$(stat -f%z "$out_mp4" 2>/dev/null || stat -c%s "$out_mp4")
  printf "  → %s (%.1fs, %d bytes)\n" "$out_mp4" "$dur" "$sz"
done

echo "=== highlights done ==="
