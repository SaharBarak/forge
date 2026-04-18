# Forge · Skill Picker walkthrough
# Boots a tech-review session through the menu wizard, then demos
# the `a` → `k` flow: Agent Control panel → Skill Picker overlay →
# navigate skills (↑↓) → toggle (space) → close (esc).
#
# Pre-seeds a tmp workdir with skills/ so the picker has something
# to browse. Default mode in config = tech-review so the wizard
# mode-select lands on that option.

Output docs/demo/skill-picker-raw.gif

Set Theme "Catppuccin Mocha"
Set FontSize 13
Set Width 1280
Set Height 820
Set Padding 24
Set FontFamily "JetBrainsMono Nerd Font Mono"
Set TypingSpeed 25ms

Hide
# Scratch tmp cwd with skills so the picker has rows to render
Type "mkdir -p /tmp/forge-skill-demo/skills && cd /tmp/forge-skill-demo"
Enter
Type "printf '# Architecture Patterns\n\nModule boundaries and seams.\n' > skills/architecture.md"
Enter
Type "printf '# OWASP Top 10\n\nInjection, auth, crypto, access control.\n' > skills/owasp.md"
Enter
Type "printf '# Performance Tuning\n\nN+1, caching, async.\n' > skills/performance.md"
Enter

# Clean XDG dir so wizard lands on default mode (will-it-work) and we
# can reach tech-review with a known number of Down presses.
Type "export XDG_CONFIG_HOME=/tmp/forge-demo-xdg"
Enter
Type "rm -rf /tmp/forge-demo-xdg"
Enter
Type "clear"
Enter

Type "forge"
Enter
Sleep 3500ms

# Main menu — default "New deliberation"
Enter
Sleep 1400ms

# Mode select — cursor lands on will-it-work (default fallback). The
# mode order is copywrite, idea-validation, ideation, will-it-work,
# site-survey, business-plan, gtm-strategy, vc-pitch, tech-review, …
# so Down × 5 from will-it-work reaches tech-review.
Down
Sleep 300ms
Down
Sleep 300ms
Down
Sleep 300ms
Down
Sleep 300ms
Down
Sleep 500ms
Enter
Sleep 1100ms

# Project
Type "CheckoutAudit"
Sleep 400ms
Enter
Sleep 900ms

# Goal
Type "Audit the checkout service."
Sleep 400ms
Enter
Sleep 900ms

# Agents — pre-checked tech-review set (architect, perf, security, test)
Enter
Sleep 900ms

# Language — english default
Enter
Sleep 900ms

# Human participation — default no
Enter
Sleep 1200ms

# Summary + confirm
Enter

# Wait for deliberation to render
Sleep 22s
Show

# Agent Control → Skill Picker
Type "a"
Sleep 1500ms
Type "k"
Sleep 2s

# Browse + toggle two skills, watch preview update
Down
Sleep 1200ms
Down
Sleep 1200ms
Space
Sleep 1600ms
Up
Sleep 1000ms
Space
Sleep 1600ms

# Close picker → back to Agent Control
Escape
Sleep 1500ms

# Close panel → back to deliberation
Escape
Sleep 18s

# Cleanup hidden
Hide
Type "rm -rf /tmp/forge-skill-demo"
Enter
