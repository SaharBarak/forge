# Phase 2 — PLAN

Status: **code shipped across turns this session, docs catching up**. This file records what landed, what's green, what's still owed. Task tracking mirrors this in the TaskList tool.

## Landed

### T1 — Provider abstraction ✅
- `src/lib/providers/IProvider.ts` — interface + `AgentRuntimeConfig` + `AgentRuntimeConfigResolver` types
- `src/lib/providers/AnthropicProvider.ts` — wraps injected `IAgentRunner`, exposes Sonnet 4 / Opus 4.7 / Opus 4.6 / Haiku 4.5
- `src/lib/providers/GeminiProvider.ts` — `@google/genai` chat adapter, exposes 2.5-flash / 2.5-pro / 2.0-flash, activates on `GEMINI_API_KEY` / `GOOGLE_API_KEY`
- `src/lib/providers/registry.ts` — `ProviderRegistry` with default fallback
- `src/lib/providers/index.ts` — barrel
- `@google/genai` dependency added

### T2 — Per-agent runtime config ✅
- `EDAOrchestrator.agentConfigs: Map<id, AgentRuntimeConfig>`
- Public API: `getAgentConfig`, `getAllAgentConfigs`, `updateAgentConfig`, `forceSpeak`, `injectSystemSuffix`, `getProviders`
- New EDA event: `agent_config_change`
- `ClaudeCodeAgent` routes queries through provider selected by live config
- `AgentListener.evaluateAndReact` respects `config.paused`

### T3 — Agent Control panel (OpenTUI) ✅
- `cli/otui/AgentControlPanel.tsx` (~230 lines)
- Keybind `a` from main view. Keys: `↑↓ ←→ p space s k esc`
- Agent rows: name, role, state, provider, model, paused badge, optional directive preview

### T4 — New modes ✅
`vc-pitch`, `tech-review`, `red-team` in `src/lib/modes/index.ts`. Each with phases, success criteria, goal reminder, loop intervention, and agent instructions tuned to the domain.

### T5 — Specialist personas ✅
`src/agents/personas-specialist.ts` — 11 entries split into VC (4), tech review (4), red team (3). Color map extended in `cli/otui/App.tsx`.

### T6 — Skills system ✅
- `src/lib/skills/SkillsLoader.ts` — `loadSkills()` resolves per-agent bundles; `discoverSkills()` walks project + user + plugin dirs + `skills.sh list` JSON
- `src/lib/eda/WorkdirManager.ts` — session dir layout (`agents/<id>/`, `consensus/`, `skills/`), consensus capture, per-agent message log
- Orchestrator hooks: workdir init, skills persist, consensus capture on tagged messages

### T7 — Live skill picker ✅
- `cli/otui/SkillPicker.tsx` (~150 lines)
- Keybind `k` from Agent Control. Keys: `↑↓ space/enter esc/k`
- `ClaudeCodeAgent` system prompt split into static base + dynamic skills/directive
- `setAgentSkillIds` / `toggleAgentSkill` / `resolveAgentSkills` / `getSkillCatalog` in orchestrator
- New EDA event: `agent_skills_change`

### T8 — CLI wiring ✅
`cli/index.ts` builds `ProviderRegistry`, runs `loadSkills`, runs `discoverSkills`, hands all three to the orchestrator. Persists agent-configs.json on every change.

### T9 — Quality gates ✅
- `tsc --noEmit` clean
- `npm test -- --run` → 898/898 pass
- Boot smoke for `tech-review` mode and skills discovery verified end-to-end

## Owed (not yet landed — tracked in TaskList)

See the task list in the `TaskList` tool. Scope:

1. **Specs** — write `specs/features/AGENT_CONTROL.md`, `specs/features/SKILLS_SYSTEM.md`, `specs/architecture/PROVIDERS.md`. Update `specs/README.md` index and `.planning/ROADMAP.md`.
2. **README** — bump "eight modes" → 11, add sections for Agent Control, Skills, new modes. Add `-a` cheatsheet per mode.
3. **Landing** — update `docs/index.html` (real site): mode grid 8 → 11, "For Whom" expanded (VC/security/founder/architect), install CTA fixed, new FAQ entries for model swap + skills, new "Agent Control" feature section.
4. **Clean-up Svelte scaffold** — delete `landing/` directory (stale, not the real site).
5. **Demo videos** — record new `.tape` scripts for the 3 new modes, the Agent Control panel (`a` keybind flow), and the Skill Picker (`k` flow). Publish into `docs/demo/modes/`.
6. **OpenAI provider** — stub → real implementation via `openai` SDK (tier-3, deferred).
7. **Unit tests** — add test files for `SkillsLoader` (resolution order + hook JSON parse), `WorkdirManager` (dir layout + consensus capture), provider routing in `EDAOrchestrator`.
8. **`forge skills` subcommand** — `list` prints the catalog, `apply <agent> <skill>` sets an override from the CLI (useful for headless sessions).
9. **Commit Phase 2** — split into semantic commits per wave, push after landing + README are updated (per memory: never commit unless platform works).

## Verification (how we'll know this phase is done)

- `V1 — Model swap live`: `forge start …`, press `a`, hit `p` on an agent, watch next response come from a different model.
- `V2 — Skill picker live`: `forge start …`, press `a` → `k`, toggle a skill, watch the next response incorporate the skill content.
- `V3 — New modes usable`: `forge start -m vc-pitch -a vc-partner,vc-associate,lp-skeptic,founder-voice …` runs phases to verdict + investment memo artifact.
- `V4 — Workdir contract`: after session, `output/sessions/*/` contains `agents/<id>/messages.jsonl`, `consensus/*.md`, `skills/<id>.md`.
- `V5 — Skills hook`: executable `skills.sh` runs with session env and its output appears in resolved bundles; `skills.sh list` JSON merges into the catalog.
- `V6 — Regressions`: `npm test -- --run` → 898/898 green; `npx tsc --noEmit` → 0 errors.
- `V7 — Docs match reality`: README, specs, ROADMAP and landing all reflect 11 modes, Agent Control panel, Skills system.

Current status: V1–V6 green. V7 is the outstanding work this phase owes.
