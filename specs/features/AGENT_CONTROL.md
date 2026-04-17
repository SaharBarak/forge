# Agent Control

**Status**: Complete
**Owner**: `cli/otui/AgentControlPanel.tsx`, `cli/otui/SkillPicker.tsx`, `EDAOrchestrator`
**Since**: Phase 2
**Depends on**: [PROVIDERS](../architecture/PROVIDERS.md), [SKILLS_SYSTEM](./SKILLS_SYSTEM.md)

## Purpose
Give the operator a live control surface over the deliberation — switch each agent's model, toggle skills, pause a noisy voice, force a specific agent to speak next — without restarting the session.

## UX

### Reaching the panel
From the main OpenTUI deliberation view, press **`a`**. A footer hint on the main view tells the operator this.

### Main panel (agent list)
Per agent row: name · role · state · provider · model · applied-skills preview · directive preview.

Keys while main panel is focused:
| Key | Effect |
|---|---|
| `↑` / `↓` / `j` / `k` | Select agent |
| `←` / `→` / `h` / `l` | Cycle model within current provider |
| `p` | Cycle provider (skips providers without credentials) |
| `space` | Pause/resume selected agent |
| `s` | Force-speak — agent takes the floor next |
| `k` | Open Skill Picker for selected agent |
| `esc` / `a` | Close panel, return to deliberation view |

### Skill Picker sub-overlay
Opened by `k`. Shows the whole skill catalog with ✓/○ checkboxes for the selected agent.

| Key | Effect |
|---|---|
| `↑` / `↓` / `j` / `k` | Select skill |
| `space` / `enter` | Toggle applied for this agent |
| `esc` / `k` | Return to main Agent Control panel |

The right column shows the chosen skill's label, source, summary, and content preview (first ~18 lines, 60 chars per line).

## Behavior contract

### Mutations
All mutations go through the orchestrator. The panel only renders state:
- `orchestrator.updateAgentConfig(agentId, patch)` — model/provider/paused/directive
- `orchestrator.forceSpeak(agentId, reason)` — bypass floor manager, agent speaks next
- `orchestrator.toggleAgentSkill(agentId, skillId)` — picker only
- `orchestrator.setAgentSkillIds(agentId, ids[])` — bulk replace

### Events emitted
| Event | Payload | Emitted when |
|---|---|---|
| `agent_config_change` | `{ agentId, config }` | `updateAgentConfig` fires |
| `agent_skills_change` | `{ agentId, skillIds }` | `setAgentSkillIds` fires |

UI subscribes to these to re-render. No polling.

### Live propagation
The next query (response or evaluation) picks up the new config and skills. No restart. This depends on two resolvers:
- `(id) => getAgentConfig(id)` — wired through `AgentListener` → `ClaudeCodeAgent.effectiveConfig()`
- `(id) => resolveAgentSkills(id)` — wired through `AgentListener` → `ClaudeCodeAgent.effectiveSkills()`

`ClaudeCodeAgent.basePrompt` is built once (persona + project + context); skills and the optional operator directive are composed on every `routedQuery`.

### Pause semantics
A paused agent:
- Still receives bus messages.
- **Does not** trigger autonomous evaluations (`evaluateAndReact` early-returns when `cfg.paused === true`).
- Can still be forced to speak via `forceSpeak` (operator-initiated overrides the pause).

## Persistence
`output/sessions/<name>/agent-configs.json` — written on every `agent_config_change` via a microtask-debounced write in `cli/index.ts`. This is a best-effort snapshot; it's not replayed automatically on subsequent runs (see Non-goals).

## Non-goals for this phase
- Persisting skill overrides across sessions.
- Keyboard-driven edit of the `systemSuffix` directive from the panel (set via MCP/API only for now).
- A web/dashboard version of the panel.

## Acceptance
- `V1` Start a session → `a` → `p` on an agent → next turn routes through the new provider (verifiable via provider logs or Gemini's response style).
- `V2` `a` → `k` → toggle a skill → the next response incorporates the skill's content (observable as changed vocabulary / topics).
- `V3` `a` → `space` → selected agent stops auto-speaking. `s` still forces them.
- `V4` `esc` returns to the deliberation view with no flicker (OpenTUI renderer contract).

All four currently green on manual smoke.
