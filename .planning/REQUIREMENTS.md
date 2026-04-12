# Forge — Requirements

## R1: Deliberation engine produces complete deliverables
Given a goal that lists N required output sections (e.g. "HERO, PROBLEM, SOLUTION, ..., FOOTER"), a single session must produce copy for **all N sections**, not just the first.

## R2: Phase progression is deterministic
Sessions advance Discovery → Synthesis → Drafting → Finalization on schedule. No reliance on stochastic consensus detection or Haiku/Opus evaluators returning `pass` for phase transitions.

## R3: Memory-stable long sessions
Sessions running 5+ minutes must not OOM. Per-call Claude context is bounded. Transcript files stay under 1 MB for a 10-section landing page.

## R4: Clean termination
When all required outputs are produced, the orchestrator emits `session:end` and test harnesses (forge-landing-copy.ts) exit without waiting for their wall-clock timeout.

## R5: Success criteria cannot pass prematurely
A requirement like `requiredOutputs: ['hero']` is only met when an actual `## HERO` section with substantive content (≥80 chars) has been written, not when any agent mentions the word "hero".

## R6: Regression safety
All 882 existing unit tests remain green. The ModeController public API stays compatible (tests use it directly).

## R7: Live e2e test is the source of truth
`npx tsx scripts/forge-landing-copy.ts` must produce `output/forge-landing-copy/landing-copy.md` with ALL 10 requested landing page sections in under 10 minutes.
