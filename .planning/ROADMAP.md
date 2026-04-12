# Forge — Roadmap

## Phase 1: Fix Deliberation Engine (CURRENT)
**Goal:** Sessions produce complete N-section deliverables. No phase stalls, no premature success, no OOM, clean termination.

**Acceptance:** R1 – R7 in REQUIREMENTS.md all pass. Live `forge-landing-copy.ts` produces 10 full landing page sections.

**Scope (locked):**
- `src/lib/eda/EDAOrchestrator.ts`
- `src/lib/eda/AgentListener.ts`
- `src/lib/modes/ModeController.ts`
- New: `src/lib/eda/GoalParser.ts`
- Test updates only where required by API changes.

**Out of scope (future phases):**
- New modes beyond copywrite
- Research pipeline hardening
- Dashboard widget updates
- P2P community integration
