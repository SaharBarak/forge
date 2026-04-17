# Forge — demo recording master plan

Execution plan for producing every GIF/MP4 referenced by the landing page
(`docs/index.html`) and README.md. Powered by VHS
(https://github.com/charmbracelet/vhs) + the `cli-demo-generator` skill
(~/.claude/skills/cli-demo-generator/).

## Why a plan

VHS binds to port 1976 (ttyd) when recording. Two VHS processes on the
same host collide, so recording is **strictly sequential**. Post-
processing (ffmpeg timelapse, file moves) is safe to run in parallel
while VHS is recording, because it touches different tools.

Recording order matters too: the cheapest-and-fastest demos ship first so
failures surface before the expensive mode tapes run.

## Surface inventory (16 deliverables)

### Already recorded (10 — do not re-record unless content changed)

| # | Surface | Tape | Raw output | Status |
|---|---|---|---|---|
| 1 | Mode: copywrite | `modes/copywrite.tape` | `docs/demo/modes/copywrite-raw.gif` | ✅ |
| 2 | Mode: idea-validation | `modes/idea-validation.tape` | `…/idea-validation-raw.gif` | ✅ |
| 3 | Mode: ideation | `modes/ideation.tape` | `…/ideation-raw.gif` | ✅ |
| 4 | Mode: will-it-work | `modes/will-it-work.tape` | `…/will-it-work-raw.gif` | ✅ |
| 5 | Mode: site-survey | `modes/site-survey.tape` | `…/site-survey-raw.gif` | ✅ |
| 6 | Mode: business-plan | `modes/business-plan.tape` | `…/business-plan-raw.gif` | ✅ |
| 7 | Mode: gtm-strategy | `modes/gtm-strategy.tape` | `…/gtm-strategy-raw.gif` | ✅ |
| 8 | Mode: custom | `modes/custom.tape` | `…/custom-raw.gif` | ✅ |
| 9 | Agent Control panel | `agent-control.tape` | `docs/demo/agent-control-raw.gif` | ✅ this session |
| 10 | Skill Picker | `skill-picker.tape` | `docs/demo/skill-picker-raw.gif` | ✅ this session |

### Recording owed — Phase 2 modes (3)

| # | Surface | Tape | Raw output | Est. cost |
|---|---|---|---|---|
| 11 | Mode: vc-pitch | `modes/vc-pitch.tape` | `docs/demo/modes/vc-pitch-raw.gif` | ~$1.50 |
| 12 | Mode: tech-review | `modes/tech-review.tape` | `docs/demo/modes/tech-review-raw.gif` | ~$1.50 |
| 13 | Mode: red-team | `modes/red-team.tape` | `docs/demo/modes/red-team-raw.gif` | ~$1.50 |

### Recording owed — CLI batch demos (3–4 short demos)

Driven by `cli-demos.yaml` through the cli-demo-generator skill. No LLM
calls, each demo is 5–15s, negligible cost.

| # | Demo | Output |
|---|---|---|
| 14 | `forge --help` | `docs/demo/forge-help.gif` |
| 15 | `forge agents` | `docs/demo/forge-agents.gif` |
| 16a | `forge skills list/show` | `docs/demo/forge-skills-list.gif` |
| 16b | `forge skills apply` | `docs/demo/forge-skills-apply.gif` |

## Execution steps (sequential — one VHS at a time)

```bash
# 0. Preconditions
which vhs ffmpeg                                    # ← required
ls /tmp/forge-bin/google-chrome                     # ← Chrome symlink
export PATH="/tmp/forge-bin:$PATH"
which forge                                         # ← `bun link` done

# 1. Phase 2 mode tapes — one at a time
vhs scripts/demo/modes/vc-pitch.tape
vhs scripts/demo/modes/tech-review.tape
vhs scripts/demo/modes/red-team.tape

# 2. CLI batch demos — runs VHS internally but sequentially
python3 ~/.claude/skills/cli-demo-generator/scripts/batch_generate.py \
  scripts/demo/cli-demos.yaml \
  --output-dir docs/demo

# 3. Post-processing — timelapse raw gifs into watchable sizes
SPEED=6 FPS=18 bash scripts/demo/modes/timelapse-all.sh
SPEED=3 FPS=20 bash scripts/demo/timelapse-overlays.sh   # see step 4

# 4. Extend timelapse-all.sh to cover the 3 new modes (vc-pitch,
#    tech-review, red-team) — already in the MODES array after this plan.
#    Add scripts/demo/timelapse-overlays.sh for agent-control + skill-picker.
```

## Per-surface verification

After every recording, confirm:

1. **Output file exists** and is > 10 KB (anything smaller means the
   tape aborted before VHS started capturing).
2. **Output file < 5 MB**. If bigger, re-record with `--speed 2` in the
   auto_generate_demo.py form or add `Set PlaybackSpeed 2.0` to the
   tape header.
3. **No stderr anomalies** from the last 10 lines of VHS stdout.
4. **TUI rendered correctly** — open the GIF, confirm no torn frames,
   no half-rendered panels, deliberation reached a meaningful state
   (at least phase 2 for mode tapes).

## Budget

Phase 2 mode tapes: ~$4.50 in LLM inference (3 × ~$1.50 on Claude Sonnet).
Use `ANTHROPIC_API_KEY` if your Claude Code auth isn't available, or
rely on the `claude` CLI path which routes through your subscription.

CLI batch demos: $0 — no LLM calls.

## Landing page wiring

Once all outputs exist, update `docs/index.html` to reference them:

- §02 Demos: `docs/demo/quick-start.gif`, `docs/demo/wizard.gif`,
  `docs/demo/deliberation.gif` (existing; no change).
- §05 Mode cards: each `mode` card gets a `<video>` / `<img>` pointing
  at `docs/demo/modes/<id>.gif` (the timelapsed form, under 2 MB).
- New section: add an "Agent Control" feature block with
  `docs/demo/agent-control.gif` + a "Skill Picker" follow-up GIF.

Tracked separately in task #9 of the Phase 2 plan.
