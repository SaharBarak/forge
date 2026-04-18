# Forge · quick-start demo (no LLM cost)
# Shows bare `forge` → Last Supper banner → clack menu interactivity.
# Exits with Ctrl+C before any deliberation runs, so cost is $0.
#
# Run: vhs scripts/demo/quick-start.tape  → docs/demo/quick-start.gif

Output docs/demo/quick-start.gif

Set Theme "Catppuccin Mocha"
Set FontSize 14
Set Width 1200
Set Height 720
Set Padding 28
Set FontFamily "JetBrainsMono Nerd Font Mono"
Set TypingSpeed 40ms
Set PlaybackSpeed 1.0

Hide
Type "cd /Users/saharbarak/workspace/forge"
Enter
Type "clear"
Enter
Sleep 200ms
# Type the command while hidden so the recording opens on the rendered menu.
Type "forge"
Enter
# Banner + menu render window.
Sleep 4s
Show

# Show the menu being navigable — flip through a couple options, then
# land back on "New deliberation" (the default).
Down
Sleep 900ms
Down
Sleep 900ms
Down
Sleep 900ms
Up
Sleep 800ms
Up
Sleep 800ms
Up
Sleep 1200ms

# Exit cleanly — no session is created.
Ctrl+C
Sleep 1s
