# Forge

> **Multi-agent deliberation engine.** Stop debating in Slack. Start deciding with structure.

Forge runs structured deliberation workflows that turn endless discussions into concrete decisions. Eight battle-tested modes for copywriting, idea validation, feasibility analysis, ideation, business planning, go-to-market strategy, site surveys, and custom workflows. CLI-first, open source, no API key lock-in.

**[→ Landing page](https://saharbarak.github.io/forge/)** · **[Source](https://github.com/SaharBarak/forge)**

---

## What it does

You pick a **mode** and give Forge a goal. It runs a deterministic phase state machine — Discovery → Research → Synthesis → Drafting → Finalization — with five reasoning archetypes debating, researching, and producing a structured deliverable. Phase transitions are automatic, loop detection is built in, and sessions always terminate cleanly with the artifact you asked for.

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
🎉 DRAFTING COMPLETE — 3/3 sections
  ✓ VERDICT, ✓ CONFIDENCE LEVEL, ✓ KEY FACTORS
```

## The eight modes

Each mode ships with its own phase sequence, per-phase focus, message limits, success criteria, and loop detection — all defined in [`src/lib/modes/index.ts`](src/lib/modes/index.ts).

| Mode | ID | Phases | Use when |
|---|---|---|---|
| **Copywriting** | `copywrite` | discovery → research → ideation → synthesis → drafting | Writing web copy that converts |
| **Idea Validation** | `idea-validation` | understand → research → stress-test → verdict | Deciding GO/NO-GO/PIVOT on an idea |
| **Ideation** | `ideation` | scout → pattern → ideate → rank | Finding opportunities in a domain |
| **Will It Work?** | `will-it-work` | define → evidence → debate → verdict | Forcing a YES/NO/MAYBE-IF answer |
| **Site Survey & Rewrite** | `site-survey` | analyze → diagnose → research → rewrite | Auditing an existing site |
| **Business Plan** | `business-plan` | problem → market → model → gtm → synthesis | Building a fundable plan |
| **Go-to-Market Strategy** | `gtm-strategy` | audience → positioning → channels → tactics | Planning a launch |
| **Custom** | `custom` | your phases → your outputs | Anything the above doesn't fit |

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
- [`src/lib/eda/EDAOrchestrator.ts`](src/lib/eda/EDAOrchestrator.ts) — phase state machine, agent coordination, session lifecycle
- [`src/lib/eda/AgentListener.ts`](src/lib/eda/AgentListener.ts) — per-agent message handling, `speakNow()` for turn-taking
- [`src/lib/eda/MessageBus.ts`](src/lib/eda/MessageBus.ts) — typed pub/sub (`message:new`, `phase:change`, `session:end`, …)
- [`src/lib/eda/GoalParser.ts`](src/lib/eda/GoalParser.ts) — extracts required sections from the goal string
- [`src/lib/eda/FloorManager.ts`](src/lib/eda/FloorManager.ts) — floor-request serialization with cooldown
- [`src/lib/eda/ConversationMemory.ts`](src/lib/eda/ConversationMemory.ts) — bounded summaries + per-agent state
- [`src/lib/modes/ModeController.ts`](src/lib/modes/ModeController.ts) — mode progression, loop detection, output validation
- [`src/lib/research/ProjectIntrospector.ts`](src/lib/research/ProjectIntrospector.ts) — walks a project dir and answers questions grounded in real source code
- [`cli/adapters/ClaudeCodeCLIRunner.ts`](cli/adapters/ClaudeCodeCLIRunner.ts) — shells out to `claude` via `@anthropic-ai/claude-agent-sdk`

## Agent archetypes

Five **generic, culture-neutral** reasoning archetypes ship in the default registry. No names, no personalities — just stances:

| ID | Role | What they bring |
|---|---|---|
| `skeptic` | Evidence-demanding critic | Catches weak claims, demands sources, asks "what would falsify this?" |
| `pragmatist` | Outcome-focused builder | Favors proven over novel, cuts through paralysis, forces closure |
| `analyst` | Systems thinker | Reasons from first principles, identifies leverage points, traces implications |
| `advocate` | Mission-driven voice | Centers stakeholders, surfaces ethical concerns, holds the group accountable |
| `contrarian` | Devil's advocate | Challenges emerging consensus, inverts assumptions, prevents groupthink |

Define your own at runtime via `registerCustomPersonas()`, or generate domain-specific ones via `generatePersonas()`.

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

# Authenticate Claude Code (one-time — Forge uses your existing claude CLI auth)
claude login

# Run the interactive CLI
npm run cli
```

No `ANTHROPIC_API_KEY` needed — Forge shells out to the authenticated `claude` binary via `@anthropic-ai/claude-agent-sdk`.

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

The file you're reading was **generated by Forge running against itself**. The test script at [`scripts/forge-landing-copy.ts`](scripts/forge-landing-copy.ts) spins up a three-agent deliberation with `contextDir` pointed at this repo. During the Research phase, the `context-finder` reads `src/lib/modes/` and `cli/commands/`; during Drafting, agents cite the eight real modes by ID and the real phase structures.

Run it yourself:

```bash
npx tsx scripts/forge-landing-copy.ts
```

Output lands in `output/forge-landing-copy/runs/<timestamp>/`:
- `landing-copy.md` — the consolidated draft
- `transcript.md` — the full deliberation transcript including context-finder citations

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
- Mode-driven workflows for common decision types
- Local project introspection via `context-finder`
- CLI-first UX with an Ink TUI and Electron fallback

**Not in scope:**
- Hosted SaaS (Forge runs locally, period)
- Hard-coded personas or locale-specific defaults
- Dependency on `ANTHROPIC_API_KEY` — always goes through the `claude` CLI

## License

MIT © [SaharBarak](https://github.com/SaharBarak)

---

Built with forge itself.
