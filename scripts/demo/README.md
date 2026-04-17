# Forge demo recordings

Real CLI session captures for the landing page (`docs/index.html`) and README.

## Why VHS

[VHS](https://github.com/charmbracelet/vhs) renders terminal sessions to GIF/MP4/WebM from a plain `.tape` script. No screen-recording, no after-effects — just keystrokes and timing. Reproducible, version-controlled, and the output looks like a clean asciinema cast.

## Install

```bash
# macOS
brew install vhs ttyd ffmpeg

# Linux
go install github.com/charmbracelet/vhs@latest
sudo apt install ttyd ffmpeg
```

## Generate

vhs uses chromedp under the hood, which looks for `google-chrome` on `PATH`. On macOS the binary lives at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` (with a space), so create a one-time symlink:

```bash
mkdir -p /tmp/forge-bin
ln -sf "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" /tmp/forge-bin/google-chrome
```

Then record:

```bash
# From the repo root
PATH="/tmp/forge-bin:$PATH" vhs scripts/demo/quick-start.tape  # → docs/demo/quick-start.gif
PATH="/tmp/forge-bin:$PATH" vhs scripts/demo/wizard.tape       # → docs/demo/wizard.gif
```

## Add a new mode demo

1. Copy `quick-start.tape` to `scripts/demo/<mode>.tape`
2. Edit the `Type "..."` lines to reflect that mode's flow
3. Set `Output docs/demo/<mode>.gif`
4. Run `vhs scripts/demo/<mode>.tape`
5. Reference the GIF from `docs/index.html` with `<img src="demo/<mode>.gif" alt="...">`

## Style guide

- Theme: **Catppuccin Mocha** (matches the landing page palette)
- Font: **JetBrains Mono** at 13–14pt
- Width: 1100–1280px, height 680–820px
- Typing speed: 25–35ms (feels human, not jittery)
- End every recording with a clean prompt (no half-typed commands)

---

## Inventory

### Mode sessions (real deliberations, long-form — 2–5 min each)

| Tape | Output | Mode |
|---|---|---|
| `modes/copywrite.tape` | `docs/demo/modes/copywrite.mp4` | `copywrite` |
| `modes/idea-validation.tape` | `docs/demo/modes/idea-validation.mp4` | `idea-validation` |
| `modes/ideation.tape` | `docs/demo/modes/ideation.mp4` | `ideation` |
| `modes/will-it-work.tape` | `docs/demo/modes/will-it-work.mp4` | `will-it-work` |
| `modes/site-survey.tape` | `docs/demo/modes/site-survey.mp4` | `site-survey` |
| `modes/business-plan.tape` | `docs/demo/modes/business-plan.mp4` | `business-plan` |
| `modes/gtm-strategy.tape` | `docs/demo/modes/gtm-strategy.mp4` | `gtm-strategy` |
| `modes/vc-pitch.tape` | `docs/demo/modes/vc-pitch-raw.gif` | `vc-pitch` ★ |
| `modes/tech-review.tape` | `docs/demo/modes/tech-review-raw.gif` | `tech-review` ★ |
| `modes/red-team.tape` | `docs/demo/modes/red-team-raw.gif` | `red-team` ★ |
| `modes/custom.tape` | `docs/demo/modes/custom.mp4` | `custom` |

★ = Phase 2 additions.

### TUI overlays (Phase 2)

| Tape | Output | What it shows |
|---|---|---|
| `agent-control.tape` | `docs/demo/agent-control-raw.gif` | `a` panel, cycle model/provider, pause, force-speak |
| `skill-picker.tape` | `docs/demo/skill-picker-raw.gif` | `a` → `k` picker, toggle skills, preview pane |

### CLI-only short demos (batch via `cli-demo-generator` skill)

`cli-demos.yaml` drives `~/.claude/skills/cli-demo-generator/scripts/batch_generate.py`:

| Demo | Output |
|---|---|
| `forge --help` | `docs/demo/forge-help.gif` |
| `forge agents` | `docs/demo/forge-agents.gif` |
| `forge skills list` / `show` | `docs/demo/forge-skills-list.gif` |
| `forge skills apply` | `docs/demo/forge-skills-apply.gif` |

## Recording workflows

### One-shot: record every Phase 2 overlay + mode

```bash
PATH="/tmp/forge-bin:$PATH" \
  vhs scripts/demo/modes/vc-pitch.tape && \
PATH="/tmp/forge-bin:$PATH" \
  vhs scripts/demo/modes/tech-review.tape && \
PATH="/tmp/forge-bin:$PATH" \
  vhs scripts/demo/modes/red-team.tape && \
PATH="/tmp/forge-bin:$PATH" \
  vhs scripts/demo/agent-control.tape && \
PATH="/tmp/forge-bin:$PATH" \
  vhs scripts/demo/skill-picker.tape
```

### Batch CLI-only demos via the `cli-demo-generator` skill

Install once (from [skills.sh](https://skills.sh/daymade/claude-code-skills/cli-demo-generator)):

```bash
# Manual clone (the interactive installer hangs in non-TTY terminals)
git clone --depth 1 https://github.com/daymade/claude-code-skills /tmp/ccs
cp -r /tmp/ccs/cli-demo-generator ~/.claude/skills/
```

Then:

```bash
python3 ~/.claude/skills/cli-demo-generator/scripts/batch_generate.py \
  scripts/demo/cli-demos.yaml \
  --output-dir docs/demo
```

### Tips

- **Real LLM calls cost real money.** The mode tapes each fire a full deliberation. Set a budget before running the full suite (estimate ~$0.50–$2 per mode tape depending on model).
- **Use `--no-execute`** (on `auto_generate_demo.py`) to emit the `.tape` file without recording, if you want to audit keystrokes first.
- **Clean prompts**: every tape ends with the session's own `onExit`, not a half-typed shell. Check before committing the GIF.
- **Encode tricky keystrokes in base64** if a command contains `$`, `"`, or backticks — the VHS parser rejects them raw. See `references/vhs_syntax.md` in the skill.
