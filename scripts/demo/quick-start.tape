# Forge — quick-start demo
# Records the FORGE banner + HomeScreen, then exits cleanly.
# No deliberation triggered → zero token cost.
#
# Run from repo root:
#   vhs scripts/demo/quick-start.tape
# Output: docs/demo/quick-start.gif

Output docs/demo/quick-start.gif

Set Theme "Catppuccin Mocha"
Set FontSize 14
Set Width 1200
Set Height 720
Set Padding 28
Set FontFamily "JetBrainsMono Nerd Font Mono"
Set TypingSpeed 40ms
Set PlaybackSpeed 1.0
Set LoopOffset 0%

Hide
Type "cd /Users/saharbarak/workspace/forge"
Enter
Type "clear"
Enter
Sleep 200ms
Show

Type "npm run cli"
Sleep 400ms
Enter

# Wait for banner + HomeScreen to fully render
Sleep 6s

# Move selection through the menu options to show interactivity
Down
Sleep 800ms
Down
Sleep 800ms
Down
Sleep 800ms
Up
Sleep 600ms
Up
Sleep 600ms
Up
Sleep 1s

# Exit cleanly without triggering a deliberation
Ctrl+C
Sleep 1s
