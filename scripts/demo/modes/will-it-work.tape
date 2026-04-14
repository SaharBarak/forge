# Forge — will-it-work mode
# Real session: force a YES / NO / MAYBE-IF verdict on a migration
Output docs/demo/modes/will-it-work-raw.gif

Set Theme "Catppuccin Mocha"
Set FontSize 13
Set Width 1280
Set Height 820
Set Padding 24
Set FontFamily "JetBrainsMono Nerd Font Mono"
Set TypingSpeed 25ms
Set PlaybackSpeed 1.0

Hide
Type "cd /Users/saharbarak/workspace/forge"
Enter
Type "clear"
Enter
Sleep 200ms
Show

Type "forge start -m will-it-work -p PostgresToCockroach -g "
Type@25ms `"Migrate a 10M-user Postgres system to CockroachDB in 90 days?"`
Type " -a skeptic,pragmatist,analyst --no-human -l english"
Sleep 400ms
Enter
Sleep 3s
Type "0"
Enter

Sleep 180s
