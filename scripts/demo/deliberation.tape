# Forge — real deliberation demo
# Runs `forge start ...` directly (the real binary, not a script).
# Three archetypes debate Forge's UX risk in english, no human turns.
# Bounded by the script's internal phase machine — exits when consensus reached.
#
# Re-record:
#   PATH=/tmp/forge-bin:$PATH vhs scripts/demo/deliberation.tape
# Output: docs/demo/deliberation.gif

Output docs/demo/deliberation.gif

Set Theme "Catppuccin Mocha"
Set FontSize 13
Set Width 1280
Set Height 820
Set Padding 24
Set FontFamily "JetBrainsMono Nerd Font Mono"
Set TypingSpeed 30ms
Set PlaybackSpeed 1.4

Hide
Type "cd /Users/saharbarak/workspace/forge"
Enter
Type "clear"
Enter
Sleep 200ms
Show

Type "forge start -p Forge -g "
Type@30ms `"What is Forge's biggest UX risk?"`
Type " -a skeptic,pragmatist,analyst --no-human -l english"
Sleep 500ms
Enter

# Wait for the persona-set prompt, then pick default
Sleep 3s
Type "0"
Enter

# Capture the live deliberation
Sleep 120s
