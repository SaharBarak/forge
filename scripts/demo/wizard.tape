# Forge — wizard demo
# Records the FORGE banner → HomeScreen → "Start new" wizard prompts.
# Exits before persona generation begins → zero token cost.
#
# Run:
#   PATH=/tmp/forge-bin:$PATH vhs scripts/demo/wizard.tape
# Output: docs/demo/wizard.gif

Output docs/demo/wizard.gif

Set Theme "Catppuccin Mocha"
Set FontSize 14
Set Width 1200
Set Height 720
Set Padding 28
Set FontFamily "JetBrainsMono Nerd Font Mono"
Set TypingSpeed 35ms

Hide
Type "cd /Users/saharbarak/workspace/forge"
Enter
Type "clear"
Enter
Sleep 200ms
Show

Type "npm run cli -- start --project Forge"
Sleep 400ms
Enter

# Wait for the start-flow prompts to appear
Sleep 8s

# Type a goal
Type "Decide whether to migrate from Postgres to Cockroach"
Sleep 600ms
Enter
Sleep 3s

# Quit before personas generate (Ctrl+C avoids any LLM call)
Ctrl+C
Sleep 1s
