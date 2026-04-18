# Forge — vc-pitch mode
# Real session: simulate a Series-A partner meeting → investment memo
Output docs/demo/modes/vc-pitch-raw.gif

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

# Type the command under Hide so the recording doesn't open with the
# command being typed out. Show flips on only after the TUI has booted.
Type "forge start -m vc-pitch -p ChequeFlow -g "
Type@25ms `"Series-A: AI-native AP automation for SMBs. $800k ARR, 120% NRR, $2M raise at $15M post."`
Type " -a vc-partner,vc-associate,lp-skeptic,founder-voice --no-human -l english"
Sleep 400ms
Enter

# Give the session 6s to render the deliberation UI, then start capturing.
Sleep 6s
Show
Sleep 204s
