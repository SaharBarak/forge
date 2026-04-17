# Phase 2 — CONTEXT

## Goal
Give operators live control over a deliberation: swap each agent's model, toggle their skills, pause/force-speak — without restarting the session. Expand the deliberation catalog beyond "copywriting + generic debate" to include role-specific panels (VC partner meeting, technical review, red team). Give every session a self-describing on-disk footprint so reruns, audits, and downstream tooling have a stable contract.

## Root cause addressed (why this phase existed)
Phase 1 produced a deterministic engine, but:
1. **Single-runner dead-end.** All agents shared one `IAgentRunner` baked against Anthropic, with model hardcoded in `ClaudeCodeAgent.query()`. No path to mid-session model swap, no Gemini, no per-agent differentiation.
2. **Thin catalog of roles.** Five generic archetypes + seven modes covered "copywriting and debate". VC pitch, code review, and red-teaming needed different role vocabularies and phase flows — users were shoe-horning them into `will-it-work` + `custom`.
3. **Skills were all-or-nothing.** A single `domainSkills` string was injected into every agent. There was no convention for "give the architect the architecture skill, give the security reviewer OWASP", no discovery, no user hook.
4. **Session state was ephemeral.** Messages and transcripts persisted, but there was no per-agent scratch dir, no distinct "consensus material" surface, no place for `skills.sh` to write generated content that the session could then pick up.

## Decisions

### D1 — Provider abstraction (additive)
New `src/lib/providers/` layer with `IProvider` interface. `AnthropicProvider` wraps the existing `IAgentRunner` (no changes to Claude path). `GeminiProvider` is a real chat backend via `@google/genai`. `ProviderRegistry` constructs once in `cli/index.ts`, injected into the orchestrator.

**Why:** Keeps the IAgentRunner contract (Electron uses it) while giving the CLI path per-agent model routing without a rewrite.
**How to apply:** Providers own their own auth + model catalog. `ClaudeCodeAgent.routedQuery()` picks a provider based on the agent's live runtime config; falls back to the injected runner when no providers registered (Electron / legacy).

### D2 — Per-agent runtime config with event-driven mutation
`EDAOrchestrator` holds `Map<agentId, AgentRuntimeConfig>` where config = `{ providerId, modelId, paused?, systemSuffix? }`. `updateAgentConfig()` mutates and emits `agent_config_change`. Listeners resolve config on every call — **no restart required** for model changes to apply.

**Why:** Mid-session swap is the primary UX. If changes required agent reinstantiation, operators would lose context and the feature would be theoretical only.
**How to apply:** Pass `(id) => getAgentConfig(id)` as a resolver into `AgentListener` → `ClaudeCodeAgent`. The agent evaluates it on every `routedQuery`.

### D3 — OpenTUI Agent Control panel (keybind `a`)
Full-screen overlay reached by pressing `a` from the main deliberation view. Keys: `↑↓` select agent, `←→` cycle model, `p` cycle provider, `space` pause/resume, `s` force-speak, `k` open skills picker, `esc`/`a` close.

**Why:** The deliberation view is the primary UX; model control must be one keystroke away, not hidden in a subcommand.
**How to apply:** `cli/otui/AgentControlPanel.tsx`. Reads orchestrator state, calls `updateAgentConfig` / `forceSpeak`. Uses OpenTUI `useKeyboard`.

### D4 — Three new deliberation modes: `vc-pitch`, `tech-review`, `red-team`
Each ships a role-specific phase flow, goal-reminder template, loop-detection intervention, and required-outputs contract. Register in `SESSION_MODES` so CLI `-m` flag picks them up without engine changes.

**Why:** Catalog was biased toward copy + generic debate. The three new domains have enough shared shape (phased → artifact) to reuse the mode contract, but distinct enough vocabularies to warrant their own entries.
**How to apply:** `src/lib/modes/index.ts`. Three entries: `VC_PITCH_MODE`, `TECH_REVIEW_MODE`, `RED_TEAM_MODE`. Each defines phases + success criteria + agent instructions.

### D5 — 11 specialist personas split into a dedicated file
Add VC (partner/associate/LP/founder), tech review (architect/perf/security/test), red team (attack-planner/social-engineer/blue-team-lead). Split into `src/agents/personas-specialist.ts` to keep `personas.ts` under the 500-line soft cap.

**Why:** Personas are data, not logic. Splitting avoids bloating the main manifest and keeps the diff reviewable. Exported as `SPECIALIST_PERSONAS`, spread into `AGENT_PERSONAS`.
**How to apply:** New file. Main `personas.ts` imports and concatenates.

### D6 — Skills system with hook protocol
New `src/lib/skills/SkillsLoader.ts`. Resolution order: optional `<cwd>/skills.sh` hook (runs with `FORGE_MODE`/`FORGE_AGENTS`/`FORGE_GOAL`/`FORGE_WORKDIR` env), then `skills/<agentId>.md`, `skills/<mode>.md`, `skills/shared.md`, `~/.claude/skills/forge/<agentId>.md`. Per-agent bundles already include shared + mode layers. Also `discoverSkills()` for the catalog (picker).

**Why:** Agents need distinct knowledge — generic "copywriting" skills were being applied to security reviewers. Hook protocol lets users pipe in company-specific skills without PRs.
**How to apply:** `loadSkills()` resolves per-agent strings used at init. `discoverSkills()` walks project + user + plugin dirs plus `skills.sh list` JSON output to build a browseable catalog.

### D7 — Live skill picker (keybind `k` from Agent Control)
Overlay browses the catalog, shows applied ✓, toggles on `space`. Orchestrator stores overrides in a map; `resolveAgentSkills()` composes the bundle. `ClaudeCodeAgent`'s system prompt is no longer baked once — skills resolve on every query.

**Why:** Same principle as D2 — if skill changes required restart, nobody would use it.
**How to apply:** `cli/otui/SkillPicker.tsx`. Split `ClaudeCodeAgent` into a static `basePrompt` + dynamic `effectiveSkills()`.

### D8 — Session workdir contract
Every session gets a workdir at `output/sessions/<project>-<ts>/` with:
- `agents/<agentId>/messages.jsonl` + `agents/<agentId>/notes/`
- `consensus/<phase>-<ts>-<agent>.md` — one file per `[CONSENSUS]`/`[SYNTHESIS]`-tagged message
- `skills/<agentId>.md` — the resolved bundle at session start (self-describing)
- `agent-configs.json` — live-persisted runtime config snapshot

**Why:** Sessions have always been transient. A structured workdir makes sessions reproducible, auditable, and lets downstream tools consume results without parsing transcripts.
**How to apply:** `WorkdirManager` owns the layout. Orchestrator wires it on `start()`, captures consensus messages on `message:new`, appends per-agent logs automatically.

### D9 — Additive defaults; no regressions
Every new code path gates on presence of the new dependency (providers, catalog, workdir). Absent → fall back to Phase-1 behavior. Electron path untouched.

**Why:** Keep Phase 1's 898 tests green, keep the Electron build working, let each new capability land incrementally.
**How to apply:** Constructor defaults + null guards at each integration point.

## Non-goals (deliberate deferrals)
- OpenAI provider (scaffold only; real impl deferred to Phase 3).
- Persisting skill-override choices across sessions (overrides currently live in memory).
- A web dashboard for agent control (CLI-first).
- Programmatic skill generation from the agent side (write-back to `skills/` from a running agent).
- Claude Code `SKILL.md` / plugin-skill deep integration beyond filesystem discovery.

## Constraints honored
- All files under 500 lines (personas split when it would breach).
- Existing 898 unit tests stay green across the phase.
- No new commits unless the platform runs end-to-end (per project memory).
- No duplicate patterns — reuse `Result`-style returns, existing `IAgentRunner`, existing `IFileSystem`.
- No hardcoded credentials; providers read from env only.
