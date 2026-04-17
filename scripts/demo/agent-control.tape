# Forge — Agent Control panel walkthrough
# Demonstrates: open panel ('a'), cycle model (←→), cycle provider ('p'),
# pause/resume (space), force-speak ('s'), close (esc).
#
# Requires ANTHROPIC + (optional) GEMINI / OPENAI keys to show provider cycling.
Output docs/demo/agent-control-raw.gif

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

# Boot a short will-it-work session — enough agents in the room to
# demonstrate per-agent control.
Type "forge start -m will-it-work -p AgentControlDemo -g "
Type@25ms `"Will adding a dark-mode toggle ship in Q2?"`
Type " -a skeptic,pragmatist,analyst --no-human -l english"
Sleep 400ms
Enter

# Let the session reach Discovery so the council has rendered.
Sleep 22s

# Open Agent Control panel
Type "a"
Sleep 2s

# Cycle the selected agent's model forward twice
Right
Sleep 1200ms
Right
Sleep 1200ms

# Switch provider (Anthropic → Gemini / OpenAI if available)
Type "p"
Sleep 1500ms

# Move down to the next agent
Down
Sleep 900ms

# Pause this agent
Space
Sleep 1500ms

# Move down and force-speak
Down
Sleep 900ms
Type "s"
Sleep 3s

# Close the panel, return to the deliberation
Escape
Sleep 30s
