# Forge — Roadmap

## Phase 1: Fix Deliberation Engine ✅
**Goal:** Sessions produce complete N-section deliverables. No phase stalls, no premature success, no OOM, clean termination.

**Acceptance:** R1 – R7 in REQUIREMENTS.md all pass. Live `forge-landing-copy.ts` produces 10 full landing page sections.

**Scope (locked):**
- `src/lib/eda/EDAOrchestrator.ts`
- `src/lib/eda/AgentListener.ts`
- `src/lib/modes/ModeController.ts`
- New: `src/lib/eda/GoalParser.ts`
- Test updates only where required by API changes.

**Status:** Code shipped. 898 unit tests green.

---

## Phase 2: Agent Control + Skills (CURRENT)
**Goal:** Operator can swap models, toggle skills, pause, and force-speak any agent live — without restart. Deliberation catalog expands with three role-specific modes (vc-pitch, tech-review, red-team) and eleven specialist personas. Every session produces a self-describing workdir with per-agent logs, resolved skill bundles, and auto-captured consensus artifacts.

**Acceptance:** V1–V7 in `.planning/phases/02-agent-control-skills/PLAN.md`. `tsc --noEmit` clean, 898 tests green, landing+README+specs match shipped reality.

**Scope:**
- `src/lib/providers/` — provider abstraction + Anthropic + Gemini
- `src/lib/skills/` — SkillsLoader + discovery + `skills.sh` hook protocol
- `src/lib/eda/WorkdirManager.ts` — per-session disk layout
- `src/lib/eda/EDAOrchestrator.ts` — runtime config + skill overrides + consensus capture
- `src/agents/personas-specialist.ts` — 11 VC / tech-review / red-team personas
- `src/lib/modes/index.ts` — `vc-pitch` / `tech-review` / `red-team` modes
- `cli/otui/AgentControlPanel.tsx`, `cli/otui/SkillPicker.tsx`
- Docs: `specs/architecture/PROVIDERS.md`, `specs/features/AGENT_CONTROL.md`, `specs/features/SKILLS_SYSTEM.md`

**Status:** Code shipped across turns this session. Specs written. Docs (README, landing) and demo videos still owed — see PLAN.md.

**Out of scope (future phases):**
- OpenAI provider (scaffold only)
- Skill-override persistence across sessions
- Web/dashboard agent control
- P2P community integration
