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
- Width: 1100–1200px, height 680–760px
- Typing speed: 30–35ms (feels human, not jittery)
- End every recording with a clean prompt (no half-typed commands)
