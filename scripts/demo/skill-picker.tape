# Forge — Skill Picker walkthrough
# Demonstrates: open Agent Control ('a'), open Skill Picker ('k'),
# navigate skills (↑↓), toggle apply (space), preview pane updates,
# close (esc) back to the control panel.
#
# Requires a project-level skills/ directory with at least 2-3 .md
# files so the picker has something to browse. The bootstrap command
# plants a fresh set for the recording.
Output docs/demo/skill-picker-raw.gif

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

# Ensure we have demo skills to browse. These are temporary —
# the cleanup step at the end removes them.
Type "mkdir -p /tmp/forge-skill-demo/skills && cd /tmp/forge-skill-demo"
Enter
Type "printf '# Architecture Patterns\\n\\nGuidance on module boundaries and seams.\\n' > skills/architecture.md"
Enter
Type "printf '# OWASP Top 10\\n\\nReview checklist for injection, auth, crypto, access control.\\n' > skills/owasp.md"
Enter
Type "printf '# Performance Tuning\\n\\nN+1, caching, async, profiler-first mindset.\\n' > skills/performance.md"
Enter
Type "clear"
Enter
Sleep 200ms
Show

# Boot tech-review session from the tmp workdir (so skills/ is
# discovered relative to cwd). `forge` is on PATH via `bun link`.
Type "forge start -m tech-review -p SkillPickerDemo -g "
Type@25ms `"Audit the checkout service."`
Type " -a architect,security-reviewer --no-human -l english"
Sleep 400ms
Enter

# Wait for deliberation to begin
Sleep 20s

# Open Agent Control, then Skill Picker on the selected agent
Type "a"
Sleep 1500ms
Type "k"
Sleep 2s

# Navigate the catalog, toggle two skills, watch preview update
Down
Sleep 1200ms
Down
Sleep 1200ms
Space
Sleep 1800ms
Up
Sleep 1200ms
Space
Sleep 1800ms

# Close Skill Picker → back to Agent Control
Escape
Sleep 1500ms

# Close Agent Control → back to the deliberation
Escape
Sleep 20s

# Cleanup (hidden — runs after the renderer exits).
Hide
Type "rm -rf /tmp/forge-skill-demo"
Enter
