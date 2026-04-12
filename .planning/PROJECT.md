# Forge — Project Charter

## Vision
Multi-agent deliberation engine: AI agents with distinct reasoning archetypes (skeptic, pragmatist, analyst, advocate, contrarian) debate, research, and synthesize to reach consensus on complex decisions. Produces **complete deliverables**, not debate fragments.

## Interface
CLI-first (Ink TUI + dashboard widgets). Electron is secondary. All features wire into CLI first.

## Core Constraints
- **Zero API-key lock-in** — shells out to authenticated `claude` CLI via `@anthropic-ai/claude-agent-sdk` (ClaudeCodeCLIRunner).
- **Functional TS** — `Result<T,E>` via neverthrow, tagged unions, minimal mutation, composable.
- **Clean code** — DDD bounded contexts, files < 500 lines, typed interfaces for all public APIs, no `any` in new code.
- **No commits without working platform** — live e2e must pass before any commit.
- **882 existing unit tests must stay green** across any refactor.
- **No hardcoded personas or locale-specific defaults** — agents are generic archetypes.

## Guardrails
- Memory-stable long sessions (no MessageBus verbose logging, bounded ConversationMemory, bounded per-turn context).
- Orchestrator drives turn-taking (round-robin + phase state machine) — does not rely on autonomous per-message evaluator calls.
- Sessions must terminate cleanly on completion, not on timeout.
