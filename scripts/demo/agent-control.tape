# Forge · Agent Control panel walkthrough
# Boots a session through the interactive menu (wizard), then demos
# the `a` panel: open · select agent · cycle model (←→) · pause (space)
# · force-speak (s) · open Skill Picker (k) · close (esc).
#
# Pre-seeds ~/.config/forge/config.json with default mode = will-it-work
# so the wizard's mode-select lands on that option and Enter is enough.
# The will-it-work deliberation is the cheapest to run to reach the
# TUI's "council rendered" state.

Output docs/demo/agent-control-raw.gif

Set Theme "Catppuccin Mocha"
Set FontSize 13
Set Width 1280
Set Height 820
Set Padding 24
Set FontFamily "JetBrainsMono Nerd Font Mono"
Set TypingSpeed 25ms

Hide
Type "cd /Users/saharbarak/workspace/forge"
Enter
# Redirect XDG_CONFIG_HOME to a scratch dir so the wizard lands on
# clean defaults (will-it-work) regardless of the user's real config.
Type "export XDG_CONFIG_HOME=/tmp/forge-demo-xdg"
Enter
Type "rm -rf /tmp/forge-demo-xdg"
Enter
Type "clear"
Enter

Type "forge"
Enter
# Banner + menu render
Sleep 3500ms

# Main menu — default = "New deliberation"
Enter
Sleep 1400ms

# Mode select — default will-it-work per config
Enter
Sleep 1100ms

# Project name
Type "DarkModeQ2"
Sleep 400ms
Enter
Sleep 900ms

# Goal
Type "Will dark mode ship this quarter or slip?"
Sleep 400ms
Enter
Sleep 900ms

# Agents (pre-selected default council) — accept
Enter
Sleep 900ms

# Language english — accept
Enter
Sleep 900ms

# Human participation — default no, accept
Enter
Sleep 1200ms

# Summary + confirm
Enter

# Let the deliberation reach Discovery (council panel visible with agents)
Sleep 22s
Show

# ─── Agent Control walkthrough ───────────────────────────────────────
Type "a"
Sleep 2s

# Cycle model forward twice on the first agent
Right
Sleep 1200ms
Right
Sleep 1200ms

# Switch provider (if Gemini/OpenAI/Ollama configured, loops through)
Type "p"
Sleep 1500ms

# Move to next agent, pause them
Down
Sleep 900ms
Space
Sleep 1500ms

# Move to the next agent, force-speak
Down
Sleep 900ms
Type "s"
Sleep 3s

# Close the panel, return to the deliberation
Escape
Sleep 25s
