# Forge — red-team mode
# Real session: adversarial review with named adversary + kill chains + ranked mitigations
Output docs/demo/modes/red-team-raw.gif

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

Type "forge start -m red-team -p CheckoutV2Launch -g "
Type@25ms `"Red-team the Checkout v2 launch: new payment vendor, new DB, 3x traffic. Adversary set: motivated opportunist + insider risk + supply-chain."`
Type " -a attack-planner,social-engineer,blue-team-lead --no-human -l english"
Sleep 400ms
Enter
Sleep 210s
