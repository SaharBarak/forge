<div align="center">

```
    ███████╗ ██████╗ ██████╗  ██████╗ ███████╗
    ██╔════╝██╔═══██╗██╔══██╗██╔════╝ ██╔════╝
    █████╗  ██║   ██║██████╔╝██║  ███╗█████╗
    ██╔══╝  ██║   ██║██╔══██╗██║   ██║██╔══╝
    ██║     ╚██████╔╝██║  ██║╚██████╔╝███████╗
    ╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝
```

### *The Digital Renaissance of Ideas*

**You don't need a smarter AI. You need five that disagree.**

Three hours re-prompting one model gets you a longer draft, not a decision. Forge runs five reasoning archetypes through a deterministic phase machine · `discovery → research → synthesis → drafting → verdict` · until they actually converge on something you can ship.

[![License: MIT](https://img.shields.io/badge/license-MIT-a78bfa.svg?style=flat-square)](#license)
[![TypeScript](https://img.shields.io/badge/typescript-5.x-3178c6.svg?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-898%20passing-4ade80.svg?style=flat-square)](#build--test)
[![CLI](https://img.shields.io/badge/CLI-first-fbbf24.svg?style=flat-square&logo=gnubash&logoColor=white)](#install)
[![Powered by Claude](https://img.shields.io/badge/powered%20by-Claude%20Code-d97757.svg?style=flat-square)](https://github.com/anthropics/claude-code)

[**Landing page**](https://saharbarak.github.io/forge/) ·
[**Modes**](#the-eleven-modes) ·
[**Agent Control**](#agent-control) ·
[**Skills**](#skills-system) ·
[**Install**](#install) ·
[**Architecture**](#architecture) ·
[**FAQ**](#scope--non-goals)

<br>

![Forge CLI](docs/demo/quick-start.gif)

</div>

---

Forge ships eleven deliberation modes · copywriting, idea validation, feasibility, ideation, business planning, go-to-market, site surveys, VC pitch meetings, technical repo review, red-team adversarial review, plus fully custom. Every agent can run on a different model · **Claude, Gemini, and OpenAI** are all live · and you can swap models or load project-specific skills live from the TUI without restarting the session. CLI-first, open source, no API key lock-in.

---

## What it does

You pick a **mode** and give Forge a goal. It runs a deterministic phase state machine · Discovery → Research → Synthesis → Drafting → Finalization · with five reasoning archetypes debating, researching, and producing a structured deliverable. Phase transitions are automatic, loop detection is built in, and sessions always terminate cleanly with the artifact you asked for.

```bash
$ forge start --mode will-it-work \
    --goal "Migrate 10M-user system from Postgres to Cockroach?"

🔎 PHASE 1/4: DISCOVERY
  skeptic     ▸ What's the actual failure mode we're solving for?
  pragmatist  ▸ Wins: horizontal scaling, zero-downtime. Cost: ops complexity.
  analyst     ▸ Three constraints matter: write latency, backfill window, tooling.

🔍 PHASE 2/4: RESEARCH
  [RESEARCH: stats-finder] Postgres vs Cockroach latency at 10M users
  [RESEARCH: context-finder] What does src/lib/db/ look like today?

🧭 PHASE 3/4: SYNTHESIS → ✍️ PHASE 4/4: DRAFTING
🎉 DRAFTING COMPLETE · 3/3 sections
  ✓ VERDICT, ✓ CONFIDENCE LEVEL, ✓ KEY FACTORS
```

## The eleven modes

Each mode ships with its own phase sequence, per-phase focus, message limits, success criteria, and loop detection · all defined in [`src/lib/modes/index.ts`](src/lib/modes/index.ts).

| Mode | ID | Phases | Use when |
|---|---|---|---|
| **Copywriting** | `copywrite` | discovery → research → ideation → synthesis → drafting | Writing web copy that converts |
| **Idea Validation** | `idea-validation` | understand → research → stress-test → verdict | Deciding GO/NO-GO/PIVOT on an idea |
| **Ideation** | `ideation` | scout → pattern → ideate → rank | Finding opportunities in a domain |
| **Will It Work?** | `will-it-work` | define → evidence → debate → verdict | Forcing a YES/NO/MAYBE-IF answer |
| **Site Survey & Rewrite** | `site-survey` | analyze → diagnose → research → rewrite | Auditing an existing site |
| **Business Plan** | `business-plan` | problem → market → model → gtm → synthesis | Building a fundable plan |
| **Go-to-Market Strategy** | `gtm-strategy` | audience → positioning → channels → tactics | Planning a launch |
| **VC Pitch Meeting** | `vc-pitch` | pitch-digest → market-probe → unit-economics → partner-debate → investment-memo | Running a startup pitch through a simulated partner meeting |
| **Technical Review** | `tech-review` | recon → architecture-read → hotspot-dive → report | Specialist panel audits a GitHub repo for architecture / perf / security / tests |
| **Red Team** | `red-team` | recon → threat-model → attack-chains → mitigations | Adversarial review of a system, plan, or launch with ranked mitigations |
| **Custom** | `custom` | your phases → your outputs | Anything the above doesn't fit |

**Which mode do I pick?** Series-A pitch → `vc-pitch`. Migration anxiety → `will-it-work`. Code audit → `tech-review`. Launch risk review → `red-team`. New landing page → `copywrite`. Unknown idea → `idea-validation`.

### Specialist personas
Modes ship paired with role-specific personas so you don't hand an architecture review to a copywriter:

| Mode | Suggested agents |
|---|---|
| `vc-pitch` | `vc-partner,vc-associate,lp-skeptic,founder-voice` |
| `tech-review` | `architect,perf-engineer,security-reviewer,test-engineer` |
| `red-team` | `attack-planner,social-engineer,blue-team-lead` |
| anything else | `skeptic,pragmatist,analyst,advocate,contrarian` (the generic council) |

Pass them to `forge start` with `-a <id1>,<id2>,...`. All personas live in [`src/agents/personas.ts`](src/agents/personas.ts) + [`src/agents/personas-specialist.ts`](src/agents/personas-specialist.ts).

## Architecture

Forge is a CLI-first Ink TUI with a deterministic phase executor at its core.

```
┌────────────────────────────────────────────────────────────┐
│                    EDAOrchestrator                         │
│  runPhaseMachine() drives the deliberation state machine   │
└──┬─────────────────────────────────────────────────────────┘
   │
   │  Discovery → Research → Synthesis → Drafting → Final
   │
   ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│ AgentListener│────▶│  MessageBus  │◀────│ ModeController  │
│  speakNow()  │     │  pub/sub     │     │ success checks  │
└──────┬───────┘     └──────┬───────┘     └─────────────────┘
       │                    │
       ▼                    ▼
┌──────────────┐     ┌────────────────────┐
│ ClaudeCode   │     │ ProjectIntrospector│
│ CLIRunner    │     │ (context-finder)   │
└──────────────┘     └────────────────────┘
```

**Key modules:**
- [`src/lib/eda/EDAOrchestrator.ts`](src/lib/eda/EDAOrchestrator.ts) · phase state machine, agent coordination, session lifecycle
- [`src/lib/eda/AgentListener.ts`](src/lib/eda/AgentListener.ts) · per-agent message handling, `speakNow()` for turn-taking
- [`src/lib/eda/MessageBus.ts`](src/lib/eda/MessageBus.ts) · typed pub/sub (`message:new`, `phase:change`, `session:end`, …)
- [`src/lib/eda/GoalParser.ts`](src/lib/eda/GoalParser.ts) · extracts required sections from the goal string
- [`src/lib/eda/FloorManager.ts`](src/lib/eda/FloorManager.ts) · floor-request serialization with cooldown
- [`src/lib/eda/ConversationMemory.ts`](src/lib/eda/ConversationMemory.ts) · bounded summaries + per-agent state
- [`src/lib/modes/ModeController.ts`](src/lib/modes/ModeController.ts) · mode progression, loop detection, output validation
- [`src/lib/research/ProjectIntrospector.ts`](src/lib/research/ProjectIntrospector.ts) · walks a project dir and answers questions grounded in real source code
- [`cli/adapters/ClaudeCodeCLIRunner.ts`](cli/adapters/ClaudeCodeCLIRunner.ts) · shells out to `claude` via `@anthropic-ai/claude-agent-sdk`
- [`src/lib/providers/`](src/lib/providers/) · `IProvider` registry with Anthropic + Gemini (see [PROVIDERS](specs/architecture/PROVIDERS.md))
- [`src/lib/skills/SkillsLoader.ts`](src/lib/skills/SkillsLoader.ts) · per-agent skill resolution + catalog discovery
- [`src/lib/eda/WorkdirManager.ts`](src/lib/eda/WorkdirManager.ts) · per-session disk layout + consensus capture
- [`cli/otui/AgentControlPanel.tsx`](cli/otui/AgentControlPanel.tsx) · live agent control TUI overlay
- [`cli/otui/SkillPicker.tsx`](cli/otui/SkillPicker.tsx) · live skill toggle overlay

## Agent archetypes

Five **generic, culture-neutral** reasoning archetypes ship in the default registry. No names, no personalities · just stances:

| ID | Role | What they bring |
|---|---|---|
| `skeptic` | Evidence-demanding critic | Catches weak claims, demands sources, asks "what would falsify this?" |
| `pragmatist` | Outcome-focused builder | Favors proven over novel, cuts through paralysis, forces closure |
| `analyst` | Systems thinker | Reasons from first principles, identifies leverage points, traces implications |
| `advocate` | Mission-driven voice | Centers stakeholders, surfaces ethical concerns, holds the group accountable |
| `contrarian` | Devil's advocate | Challenges emerging consensus, inverts assumptions, prevents groupthink |

Eleven additional specialist personas ship alongside (see [the table above](#specialist-personas)). Define your own at runtime via `registerCustomPersonas()`, or generate domain-specific ones via `generatePersonas()`.

## Agent Control

Live operator surface over the deliberation. Press **`a`** in the running TUI to open the Agent Control panel. From there every alive agent is controllable without restarting the session:

| Key | Effect |
|---|---|
| `↑↓ / jk` | Select agent |
| `←→ / hl` | Cycle model within current provider |
| `p` | Cycle provider (Anthropic ↔ Gemini · providers without credentials are skipped) |
| `space` | Pause/resume this agent |
| `s` | Force-speak · this agent takes the floor next |
| `k` | Open the Skill Picker (see [Skills System](#skills-system)) |
| `esc / a` | Close back to the deliberation view |

Provider support today:
- **Anthropic** · Sonnet 4 / Opus 4.7 / Opus 4.6 / Haiku 4.5. Always available (routes through the existing Claude Code auth).
- **Gemini** · 2.5 Flash / 2.5 Pro / 2.0 Flash. Activates when `GEMINI_API_KEY` (or `GOOGLE_API_KEY`) is set.
- **OpenAI** · GPT-4o / GPT-4o mini / o1 mini / GPT-4 Turbo. Activates when `OPENAI_API_KEY` is set.

Config mutations emit `agent_config_change`; listeners resolve the agent's live config on every query, so changes apply to the very next response. Full contract in [`specs/features/AGENT_CONTROL.md`](specs/features/AGENT_CONTROL.md) and [`specs/architecture/PROVIDERS.md`](specs/architecture/PROVIDERS.md).

## Skills System

Per-agent skill bundles resolved from multiple sources, with a shell hook for project-specific generation.

### Resolution order
At session init, for each enabled agent:

1. Optional **`<cwd>/skills.sh`** · if executable, runs first with `FORGE_MODE` / `FORGE_AGENTS` / `FORGE_GOAL` / `FORGE_WORKDIR` env vars. The hook may populate `skills/` with fresh content (e.g. `curl` from a private wiki).
2. **`<cwd>/skills/<agentId>.md`** · per-agent skills.
3. **`<cwd>/skills/<modeId>.md`** · mode-level shared skills.
4. **`<cwd>/skills/shared.md`** · project-wide shared skills.
5. **`~/.claude/skills/forge/<agentId>.md`** · user-level fallback.

The resolved bundle for each agent is persisted to `<session>/skills/<agentId>.md` so the session is self-describing.

### Live skill picker
From the Agent Control panel, press **`k`** on a selected agent. Shows the discovered catalog with ✓/○ checkboxes. Sources scanned:

- `<cwd>/skills/*.md` → `source: project`
- `~/.claude/skills/forge/*.md` → `source: user`
- `~/.claude/plugins/*/skills/*.md` → `source: plugin`
- stdout of `skills.sh list` → `source: hook` (JSON array)

`space` toggles a skill; the change takes effect on the agent's next response. No restart.

### `skills.sh list` protocol
For the hook to contribute to the catalog, support a `list` subcommand that prints JSON on stdout:

```json
[{"id":"payment-flows","label":"Payment Flow Patterns","path":"/abs/path/skill.md","tags":["domain:fintech"]}]
```

Full contract in [`specs/features/SKILLS_SYSTEM.md`](specs/features/SKILLS_SYSTEM.md).

### `forge skills` CLI
The same catalog is available headless for CI and scripted flows:

```bash
forge skills list                          # print the full discovered catalog
forge skills list --json                   # machine-readable form
forge skills list --source project         # filter by source
forge skills show <id>                     # dump one skill's content
forge skills apply <agent> <skill>         # write override to the latest session's
                                           #   agent-configs.json
forge skills apply <agent> <skill> \
  --session MySession-2026-04-17T12-00-00  # target a specific session
forge skills apply <agent> <skill> --replace
                                           # replace instead of append
```

## Session workdir

Every session materializes an on-disk contract at `output/sessions/<project>-<timestamp>/`:

```
output/sessions/MySession-2026-04-17T12-34-56/
  session.json              session metadata
  messages.jsonl            full bus log (all agents, system, human)
  transcript.md             human-readable markdown transcript
  agent-configs.json        live runtime config snapshot (provider, model, paused, skills)
  agents/
    <agentId>/
      messages.jsonl        only this agent's messages
      notes/                agent scratch dir (for future tool-enabled write-back)
  consensus/
    <phase>-<ts>-<agent>.md one file per [CONSENSUS] or [SYNTHESIS] tagged message
  skills/
    <agentId>.md            resolved skill bundle applied at session start
```

Agents tag synthesized or agreed-on content with `[CONSENSUS]` or `[SYNTHESIS]`; the orchestrator auto-captures each one to `consensus/` · that directory ends up containing just the agreed-upon material, separate from the full debate transcript.

## Project introspection

Forge's `context-finder` researcher reads your local codebase to answer grounded questions during Research phases. Agents invoke it with an explicit block:

```
[RESEARCH: context-finder]
What deliberation modes are defined in src/lib/modes/? List each mode's
id, name, and phase structure.
[/RESEARCH]
```

The [`ProjectIntrospector`](src/lib/research/ProjectIntrospector.ts) walks the configured `contextDir` (symlink-safe, hard file cap, excludes dev-internal paths like `.planning/`), scores files by keyword match, reads the top 15 candidates, and asks the runner to answer strictly from the source. Every answer comes back with **file citations** so drafting agents can cite real paths instead of hallucinating feature names.

## Install

```bash
# Clone and set up
git clone https://github.com/SaharBarak/forge.git
cd forge
npm install

# Authenticate Claude Code (one-time · Forge uses your existing claude CLI auth)
claude login

# Run the interactive CLI
npm run cli
```

No `ANTHROPIC_API_KEY` needed · Forge shells out to the authenticated `claude` binary via `@anthropic-ai/claude-agent-sdk`.

## Build & test

```bash
# TypeScript typecheck
npx tsc --noEmit -p tsconfig.json

# Full test suite (898 tests)
npm test

# Live end-to-end: generate a landing page for Forge itself
#   writes to output/forge-landing-copy/runs/<timestamp>/
npx tsx scripts/forge-landing-copy.ts
```

## Live example: Forge writes its own landing page

The file you're reading was **generated by Forge running against itself**. The test script at [`scripts/forge-landing-copy.ts`](scripts/forge-landing-copy.ts) spins up a three-agent deliberation with `contextDir` pointed at this repo. During the Research phase, the `context-finder` reads `src/lib/modes/` and `cli/commands/`; during Drafting, agents cite the eleven real modes by ID and the real phase structures.

Run it yourself:

```bash
npx tsx scripts/forge-landing-copy.ts
```

Output lands in `output/forge-landing-copy/runs/<timestamp>/`:
- `landing-copy.md` · the consolidated draft
- `transcript.md` · the full deliberation transcript including context-finder citations

## Development

```bash
# Run tests in watch mode
npx vitest

# Lint
npm run lint

# Build production bundle
npm run build
```

## Project architecture

- **Domain-Driven Design** with bounded contexts under `src/lib/`
- **Functional TypeScript** with `Result<T, E>` via `neverthrow` for error handling
- **Event Sourcing** for state changes via `MessageBus`
- **TDD-first** new code with mock runners for the agent SDK
- **Clean code**: files under 500 lines where possible, typed interfaces for all public APIs

## Scope & non-goals

**In scope:**
- Structured multi-agent deliberation with deterministic phases
- Mode-driven workflows for common decision types (copywriting → VC pitch → red team)
- Per-agent model routing (Claude + Gemini + OpenAI) with live swap
- Pluggable skills: `skills.sh` hook, project/user/plugin discovery, per-agent bundles
- Session workdir contract (per-agent logs, consensus artifacts, resolved skills on disk)
- Local project introspection via `context-finder`
- CLI-first UX with an OpenTUI Ink-style renderer and Electron fallback

**Not in scope:**
- Hosted SaaS (Forge runs locally, period)
- Hard-coded personas or locale-specific defaults
- Forcing `ANTHROPIC_API_KEY` · Anthropic provider shells through the `claude` CLI, other providers read their own env vars
- Persisting skill-picker overrides across sessions (overrides live in-memory + the session's `agent-configs.json`)

### FAQ

**Can I run different models for different agents?** Yes · Agent Control (`a`) lets you assign any combination, e.g. Skeptic on Claude Opus, Pragmatist on Gemini 2.5 Flash, all live.

**Can I bring my own skills?** Yes · drop markdown files in `skills/`, or ship a `skills.sh` that populates them at session start, or put user-level skills in `~/.claude/skills/forge/`. The picker (`k`) browses all sources.

**What does this cost to run?** Inference cost is whatever your model provider charges. Forge adds no fee. Anthropic goes through your existing `claude` auth (included with Claude Pro / Max if you have it). Gemini needs `GEMINI_API_KEY`; pricing lives in the TUI cost meter at order-of-magnitude accuracy.

**Does it work offline?** The deliberation engine is local but the models are remote. A self-hosted Ollama provider would plug in as another `IProvider` · scoped for later phases.

## License

MIT © [SaharBarak](https://github.com/SaharBarak)

---

Built with forge itself.
