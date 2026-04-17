# Skills System

**Status**: Complete (catalog + loader + picker live)
**Owner**: `src/lib/skills/SkillsLoader.ts`, `src/lib/eda/WorkdirManager.ts`, `cli/otui/SkillPicker.tsx`
**Since**: Phase 2

## Purpose
Per-agent domain knowledge delivered from multiple sources — the repo, the user's home config, Claude Code plugins, or a project-local shell hook. Replaces the Phase-1 "single shared `domainSkills` string" with a resolution pipeline + live TUI picker.

## Resolution pipeline (init-time, per agent)

At `EDAOrchestrator.start()`:

1. **Hook** — If `<cwd>/skills.sh` exists and is executable, run it with no args. Env: `FORGE_MODE`, `FORGE_AGENTS`, `FORGE_GOAL`, `FORGE_WORKDIR`. 15s timeout, non-fatal on failure. The hook is expected to populate `<cwd>/skills/` with fresh content (e.g. pulling from a private wiki).
2. **Per-agent file** — `<cwd>/skills/<agentId>.md`. If absent, fall back to `~/.claude/skills/forge/<agentId>.md`.
3. **Mode layer** — `<cwd>/skills/<modeId>.md` (e.g. `tech-review.md`). Always concatenated when present.
4. **Shared layer** — `<cwd>/skills/shared.md`. Always concatenated when present.

Final per-agent bundle = shared + mode + agent-layer, joined by `\n\n---\n\n`. Returned to the orchestrator as a `Map<agentId, string>` plus a `sources` map for UI transparency.

### Persisted artifact
The resolved bundles are written to `<session>/skills/<agentId>.md` at session start so every session is self-describing — future diffs can show what knowledge each agent had access to.

## Catalog discovery (for the picker)

At CLI startup, `discoverSkills({ cwd })` walks:

1. `<cwd>/skills/*.md` → `source: 'project'`
2. `~/.claude/skills/forge/*.md` → `source: 'user'`, id prefixed `user:`
3. `~/.claude/plugins/*/skills/*.md` → `source: 'plugin'`, id prefixed `plugin:<plugin-name>/`
4. Stdout of `<cwd>/skills.sh list` → `source: 'hook'`, id prefixed `hook:`
   Expected JSON: `[{ id, label?, summary?, path, tags? }, ...]`

Entries dedupe by id (first wins — project beats user beats plugin beats hook). Content is eagerly read so the picker can show previews without round-trips. Returned as an immutable `SkillCatalog`.

## `skills.sh` protocol

Two invocation modes:

### `skills.sh` (no args)
Session-init hook. Populate `<cwd>/skills/` with generated/fetched content. Non-zero exit is logged and ignored. Env vars above are set.

Example:
```sh
#!/usr/bin/env bash
# Pull the latest architecture guidance from our internal wiki
curl -fsSL https://internal.example.com/skills/architect.md > skills/architect.md
```

### `skills.sh list`
Catalog emitter. Must print a JSON array on stdout. Used by `discoverSkills`.

Example:
```sh
#!/usr/bin/env bash
case "$1" in
  list)
    printf '[{"id":"payment-flows","label":"Payment Flow Patterns","path":"%s/hook-skills/payment-flows.md","tags":["domain:fintech"]}]\n' "$PWD"
    ;;
  *)
    exit 0
    ;;
esac
```

## Live mutation (Skill Picker)

`ClaudeCodeAgent.basePrompt` is built once without skills. On every `routedQuery` / `routedEvaluate` it composes:

```
<basePrompt>

## Available Skills
<resolveSkills(agentId) ?? initialSkills>

## Operator Directive
<config.systemSuffix>    // if set
```

`resolveAgentSkills(agentId)` logic in the orchestrator:
1. If an operator override exists in `agentSkillOverrides`, rebuild the bundle from `skillCatalog.get(id).content` for each id in the override — joined by `\n\n---\n\n`.
2. Otherwise return the init-time `perAgentSkills.get(agentId)`.

`getAgentSkillIds(agentId)` returns the override list if set, otherwise a best-effort substring match between catalog content and init bundle (so the picker shows the right ✓ marks even for agents that haven't been touched).

## Data types

```ts
interface SkillCatalogEntry {
  id: string;
  label: string;
  summary: string;
  path: string;
  source: 'project' | 'user' | 'plugin' | 'hook';
  content: string;
  tags?: string[];
}

interface ResolvedSkills {
  shared: string;
  perAgent: Map<string, string>;
  sources: Map<string, string[]>;
}
```

## Non-goals this phase
- Persistence of picker choices across sessions.
- Agent-initiated writes back into `skills/` (the agent does NOT have a tool to produce skill files).
- Full Claude Code `SKILL.md` (with YAML frontmatter) parsing — we currently treat plugin files as flat markdown.
- Remote skill registries.

## Acceptance
- `S1` File precedence: `skills/architect.md` wins over `~/.claude/skills/forge/architect.md` for agent `architect`.
- `S2` Mode + shared layers concatenate for all agents.
- `S3` `skills.sh` (exec bit set) runs at init; JSON from `skills.sh list` merges into the catalog.
- `S4` Resolved bundles appear in `<session>/skills/<agentId>.md` after `forge start`.
- `S5` Toggling a skill in the picker applies to the next response without restart.

All five green on current smoke (manual for S5, direct test for S1–S4 via `discoverSkills()` smoke).
