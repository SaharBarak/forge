# Forge · wizard demo (no LLM cost)
# Shows the interactive menu → New deliberation → wizard walk-through
# (mode → project → goal → agents → language → human → confirm).
# Exits with Ctrl+C before the deliberation actually starts, so cost is $0.
#
# Run: vhs scripts/demo/wizard.tape  → docs/demo/wizard.gif

Output docs/demo/wizard.gif

Set Theme "Catppuccin Mocha"
Set FontSize 14
Set Width 1200
Set Height 720
Set Padding 28
Set FontFamily "JetBrainsMono Nerd Font Mono"
Set TypingSpeed 30ms

Hide
Type "cd /Users/saharbarak/workspace/forge"
Enter
Type "clear"
Enter
Sleep 200ms
Type "forge"
Enter
Sleep 4s
Show

# ─── Main menu: default = "New deliberation" ─────────────────────────
Enter
Sleep 2s

# ─── Mode select: default is whatever config.defaults.mode is
#     (or 'will-it-work' on first run). Accept.
Enter
Sleep 1800ms

# ─── Project name ────────────────────────────────────────────────────
Type "Checkout v2 launch"
Sleep 500ms
Enter
Sleep 1500ms

# ─── Goal (mode-specific placeholder shown in the prompt) ────────────
Type "Should we switch payment vendor AND rebuild DB in the same quarter?"
Sleep 600ms
Enter
Sleep 1500ms

# ─── Agents multiselect — pre-checked with mode's recommended set.
#     Just accept.
Enter
Sleep 1500ms

# ─── Language: default = english. Accept. ────────────────────────────
Enter
Sleep 1200ms

# ─── Human participation: default = false (autonomous). Accept. ──────
Enter
Sleep 1200ms

# ─── Summary note renders, then "Start the deliberation?" confirm.
#     Hit Ctrl+C here to avoid actually running the LLM.
Sleep 2500ms
Ctrl+C
Sleep 1s
