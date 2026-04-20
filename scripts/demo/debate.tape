# Forge · signature demo · `forge debate`
# Cross-provider agents named by their provider. Roles rotate between
# agents across phases. The recording opens on a live deliberation, not
# on typed commands, so the viewer sees the feature do its thing.
#
# Requires at minimum: Anthropic (always) + one other provider with a
# key in ~/.config/forge/config.json or env (GEMINI_API_KEY /
# OPENAI_API_KEY / OPENROUTER_API_KEY / PERPLEXITY_API_KEY).

Output docs/demo/debate-raw.gif

Set Theme "Catppuccin Mocha"
Set FontSize 13
Set Width 1280
Set Height 820
Set Padding 24
Set FontFamily "JetBrainsMono Nerd Font Mono"
Set TypingSpeed 22ms

Hide
Type "cd /Users/saharbarak/workspace/forge"
Enter
Type "clear"
Enter
Sleep 200ms

Type "forge debate "
Type@22ms `"Should a local municipality run its budget vote on-chain or on paper ballots?"`
Sleep 400ms
Enter

# clack multiselect: provider picker · first few options pre-selected.
# Accept whatever is configured (the user ran forge init beforehand).
Sleep 2s
Enter

# Model picker per provider: take the default (first option) for each.
# Up to 4 providers means up to 4 Enters. Safe to spam-enter — clack
# stays on the same prompt when there's nothing left to pick.
Sleep 1400ms
Enter
Sleep 900ms
Enter
Sleep 900ms
Enter
Sleep 900ms
Enter

# Human participation? default no · accept
Sleep 1200ms
Enter

# Confirm start
Sleep 1500ms
Enter

# Session boots · the role rotator seats each provider with a starting
# role and announces it on the bus. Wait for that first rotation + a
# couple of agent turns before revealing.
Sleep 16s
Show

# Capture 3+ phase transitions so the viewer sees the role rotate
# ("Claude is now the Skeptic. (was Pragmatist)") and the cross-
# provider back-and-forth.
Sleep 210s
