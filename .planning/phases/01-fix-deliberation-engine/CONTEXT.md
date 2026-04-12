# Phase 1 — CONTEXT

## Root cause (single architectural defect)
Forge has **two disconnected phase systems**:
1. `ModeController` tracks phases `discovery → research → ideation → synthesis → drafting` and emits `phase_transition` *interventions*.
2. `EDAOrchestrator` tracks an independent `currentPhase: SessionPhase` field and has manual `transitionToSynthesis()` / `transitionToDrafting()` methods that nothing auto-calls.

The mode controller's intervention messages are logged into the bus as system messages, but **no code reads them to actually advance orchestrator phase or change agent behavior**. The rolling round-robin (added as a hack to keep agents talking) fires every 45s in the initial phase forever, so agents debate framing indefinitely while `ModeController.detectOutputs()` matches substrings and prematurely marks `hero` as produced.

## Decisions

### D1 — Collapse to one phase authority: EDAOrchestrator
The orchestrator owns phase progression. ModeController becomes a pure observer for loop detection + goal reminders. Phase transitions are driven by a deterministic state machine in the orchestrator, not by consensus heuristics.

**Why:** Two systems competing = nothing drives progress. Consensus detection (Opus evaluator) was returning `pass` after round 1, so phase-advance-on-consensus never fires.
**How to apply:** Remove rolling round-robin. Add `runPhaseMachine()` in orchestrator with explicit phase steps.

### D2 — Goal-driven section parsing
Required deliverable sections are parsed from the session goal string (regex on numbered list `1. **HERO**` and headers `## HERO`). No hardcoded COPY_SECTIONS array. Section IDs, names, and the full required list come from the goal itself.

**Why:** Current hardcode is 5 sections; landing page test asks for 10. Any mode-agnostic refactor must derive the deliverable shape from the goal.
**How to apply:** New file `src/lib/eda/GoalParser.ts`. EDAOrchestrator calls `parseGoalSections(goal)` during start; if ≥3 sections detected, use them; otherwise fall back to generic `['overview','body','conclusion']`.

### D3 — Discovery + Synthesis = 1 round each; Drafting = 1 agent per section
Discovery: each enabled agent speaks once about initial perspective. Synthesis: each agent speaks once proposing structure. Drafting: round-robin through sections, force-speak one assigned agent per section with injected instruction "WRITE ONLY: [section]".

**Why:** Fixed-cost phases give predictable session length. Drafting-per-section with targeted prompts is the only way to guarantee 10 sections get drafted.
**How to apply:** Sequential loop with `await forceAgentToSpeakAndWait(agentId, reason)` — a new helper that resolves when the agent's message:new event fires.

### D4 — Markdown-header section extraction
In drafting phase, agent responses are parsed for `## SECTION_NAME` followed by content. The matching section is stored in `copySections[i].content`. No more string-contains detection.

**Why:** Prevents false-positive "hero mentioned" from counting as "hero drafted". Forces agents to produce structured output.
**How to apply:** Regex `/^##\s+(.+?)\s*\n([\s\S]*?)(?=\n##\s|\n\n\*\*\d+\.|$)/gm`. Normalize section name (uppercase, strip punctuation) and fuzzy-match to requested section IDs.

### D5 — Bounded per-turn context
In drafting phase, agents receive: (a) the session goal, (b) a 1-paragraph synthesis summary, (c) ONLY their assigned section's instructions, (d) already-completed sections as reference. No full message history.

**Why:** Full-history context grows O(N²) over a session and drives the OOM. 12 recent messages × 10 drafting turns × 3 agents × growing summary = blow-up.
**How to apply:** Drop `maxResponseMessages` 12 → 6. Override in drafting phase to pass `draftingContext` string instead of bus history (via new method on AgentListener).

### D6 — Success criteria requires actual content
`ModeController.detectOutputs()` now requires a markdown header `## NAME` followed by ≥80 chars within the same message. Substring match is removed.

**Why:** Prevents premature `success_check` intervention that confuses downstream logic.
**How to apply:** Regex-based detection in `detectOutputs()`. Applied the same way to any mode's `requiredOutputs`.

### D7 — Session emits `session:end` when finalized
After finalizeDrafting() assembles the consolidated draft, orchestrator emits `bus.emit('session:end', { reason: 'completed' })` so the test script's `sessionEnded` flag flips and the loop exits cleanly.

**Why:** Currently the test script runs to its 20-min timeout even when drafting completes, which silently hides completion vs. timeout cases.
**How to apply:** Add one `this.bus.emit('session:end', {...})` at the end of finalizeDrafting().

## What we are NOT changing
- MessageBus, FloorManager, ConversationMemory internals (already memory-bounded).
- ClaudeCodeCLIRunner (works).
- Personas, modes catalog, methodologies.
- Dashboard widgets, CLI screens.
- Phase names in `SessionPhase` type (kept for backward compat — we just drive them correctly).

## Code scope
| File | Change |
|---|---|
| `src/lib/eda/GoalParser.ts` | **NEW** — goal → required sections |
| `src/lib/eda/EDAOrchestrator.ts` | Replace kickoff + rolling round-robin with `runPhaseMachine()`. Add `forceAgentToSpeakAndWait`. Wire section parser. Emit session:end. Wire bounded drafting context. |
| `src/lib/modes/ModeController.ts` | Harden `detectOutputs()` with header-based detection. |
| `src/lib/eda/AgentListener.ts` | Default `maxResponseMessages: 6`. Accept an optional `contextOverride` in `onFloorGranted` path (new method `speakWithContext`). |
| `tests/*` | Update only if API signatures break (keep the ModeController.test.ts contract). |
| `scripts/forge-landing-copy.ts` | Optional: shorter timeout (12 min), transcript trim (system messages truncated). |
