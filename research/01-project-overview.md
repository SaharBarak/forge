# Forge — Project Overview

**Forge** is a multi-agent deliberation engine for consensus-driven content creation. 5+ AI agents with distinct personas debate, research, and synthesize to produce high-quality output through structured phases.

## Core Innovation

Event-driven architecture where agents **listen continuously, evaluate whether to speak, request the floor, and react organically** — instead of rigid round-robin turn-taking. Consensus emerges through structured debate across 10 phases, with memory-augmented prompts preventing agents from forgetting earlier insights.

## Primary Interface: CLI (Ink TUI)

- `forge` — Interactive Ink REPL with Last Supper ASCII banner (cli/prompts/banner.ts)
- `forge start` — Start a deliberation session (launches dashboard TUI)
- `forge login` — Decentralized DID identity (Phase 1)
- `forge community list/publish/vote` — P2P community contributions (Phases 2-3)
- `forge personas`, `forge sessions`, `forge export`, `forge batch`, `forge watch` — supporting commands

**Electron desktop app is secondary** — works but not the main interface.

## Architecture Layers

```
┌───────────────────────────────────────────────────────────┐
│                  SessionKernel                            │  State machine (6 states)
│     idle → configuring → running → paused → completed     │  Command executor
│                                                           │  22 commands, 7 events
└───────────────────────────┬───────────────────────────────┘
                            │
┌───────────────────────────▼───────────────────────────────┐
│                  EDAOrchestrator                          │  Phase controller
│  init → context → research → brainstorm → argue →        │  10 phases
│  synthesize → draft → review → consensus → finalize      │  Agent coordinator
└───────────────────────────┬───────────────────────────────┘
                            │
           ┌────────────────┼────────────────┐
           │                │                │
           ▼                ▼                ▼
    ┌──────────┐    ┌──────────────┐  ┌─────────────┐
    │MessageBus│    │ FloorManager │  │ModeControll │
    │  (pub/sub)│   │ (turn-taking)│  │ (goal/loop) │
    └─────┬────┘    └──────────────┘  └─────────────┘
          │
          │ for each agent:
          ▼
    ┌──────────────┐     ┌─────────────────┐
    │AgentListener │────▶│ ClaudeCodeAgent │
    │(react-decide)│     │ (Haiku+Sonnet)  │
    └──────────────┘     └─────────────────┘
```

## 10 Session Phases

1. **initialization** — session config loaded
2. **context_loading** — brand, audience, research files loaded
3. **research** — agents request data; researcher agents gather
4. **brainstorming** — agents propose ideas
5. **argumentation** — debate proposals; build consensus
6. **synthesis** — combine best elements
7. **drafting** — write actual copy
8. **review** — agents critique
9. **consensus** — final agreement check
10. **finalization** — export, save

## 8 Session Modes

| Mode | Phases | Use Case |
|------|--------|----------|
| `copywrite` | 5 (discovery→research→ideation→synthesis→drafting) | Website copy |
| `idea-validation` | 4 (understand→research→stress-test→verdict) | Idea feasibility |
| `ideation` | 4 (scout→pattern→ideate→rank) | Idea generation |
| `will-it-work` | 4 (define→evidence→debate→verdict) | Definitive yes/no |
| `site-survey` | 4 (analyze→gaps→recommendations→prioritize) | Audit existing site |
| `business-plan` | 4 (strategy→financials→risks→action-plan) | Business plan |
| `gtm-strategy` | 4 (discovery→positioning→channels→execution) | Go-to-market |
| `custom` | user-defined | Flexible |

## Default Personas (5)

Israeli tech/business audience:
- **Ronit (רונית)** — Busy parent, time-conscious, practical
- **Yossi (יוסי)** — Burned veteran, historical, skeptical
- **Noa (נועה)** — Data-driven, evidence-based, logical
- **Avi (אבי)** — Business-focused, ROI-oriented
- **Michal (מיכל)** — Empathetic activist, protective

Plus 10 industry templates (SaaS, e-commerce, healthcare, etc.) and dynamic generation via Claude Sonnet based on project goal.

## Tech Stack

- **Language**: TypeScript 5.3 (strict)
- **Runtime**: Node.js 18+
- **Desktop**: Electron 28
- **Web UI**: React 18 + Zustand + Tailwind
- **Terminal UI**: xterm.js 6 + Ink 4 + blessed (dashboard widgets)
- **CLI**: Commander.js 11
- **AI**: @anthropic-ai/sdk 0.30 + @anthropic-ai/claude-agent-sdk 0.2.20
- **Vector Search**: usearch 2.21 (HNSW)
- **Embeddings**: @huggingface/transformers 4.0 (all-MiniLM-L6-v2)
- **Crypto**: @noble/ed25519 3.0 + @noble/hashes 2.0
- **Error handling**: neverthrow 8.2 (Result<T,E> monad)
- **Export**: docx 9.5, puppeteer 24.37 (PDF), marked 12
- **Tests**: Vitest 4 (882+ tests)
