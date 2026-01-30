# Forge Specifications

> Multi-Agent Deliberation Engine for Consensus-Driven Content Creation

**Status**: Active Development
**Last Updated**: 2026-01-30
**Version**: 1.0.0

---

## Quick Links

| Document | Purpose |
|----------|---------|
| [OVERVIEW](./OVERVIEW.md) | Project vision, goals, and scope |
| [IMPLEMENTATION_PLAN](./IMPLEMENTATION_PLAN.md) | Current tasks and priorities |

---

## Architecture

Core technical design decisions and system structure.

| Spec | Status | Description |
|------|--------|-------------|
| [EVENT_DRIVEN_ARCHITECTURE](./architecture/EVENT_DRIVEN_ARCHITECTURE.md) | Complete | MessageBus, events, subscriptions |
| [SESSION_KERNEL](./architecture/SESSION_KERNEL.md) | Complete | Unified core engine for all UIs |
| [ADAPTERS](./architecture/ADAPTERS.md) | Complete | IAgentRunner, IFileSystem interfaces |
| [PERSISTENCE](./architecture/PERSISTENCE.md) | Complete | Session save/load, memory state |
| [UI_ARCHITECTURE](./architecture/UI_ARCHITECTURE.md) | Complete | Electron, CLI, terminal shells |

---

## Features

User-facing capabilities and workflows.

| Spec | Status | Description |
|------|--------|-------------|
| [DELIBERATION_WORKFLOW](./features/DELIBERATION_WORKFLOW.md) | Complete | Phases, transitions, consensus |
| [CONVERSATION_MEMORY](./features/CONVERSATION_MEMORY.md) | Complete | Context persistence, summarization |
| [FLOOR_MANAGEMENT](./features/FLOOR_MANAGEMENT.md) | Complete | Speaking turns, queue, cooldowns |
| [RESEARCH_SYSTEM](./features/RESEARCH_SYSTEM.md) | Complete | Web search, researcher agents |
| [CONSENSUS_TRACKING](./features/CONSENSUS_TRACKING.md) | Complete | Agreement detection, synthesis |
| [HUMAN_PARTICIPATION](./features/HUMAN_PARTICIPATION.md) | Complete | User input, steering, feedback |
| [EXPORT_SYSTEM](./features/EXPORT_SYSTEM.md) | Partial | Markdown, JSON, HTML export |

---

## Modes

Session modes that define deliberation goals and constraints.

| Spec | Status | Description |
|------|--------|-------------|
| [MODE_SYSTEM](./modes/MODE_SYSTEM.md) | Complete | ModeController, interventions |
| [COPYWRITING_MODE](./modes/COPYWRITING_MODE.md) | Complete | Website copy generation |
| [IDEA_VALIDATION_MODE](./modes/IDEA_VALIDATION_MODE.md) | Complete | Market/audience validation |
| [IDEATION_MODE](./modes/IDEATION_MODE.md) | Complete | Creative brainstorming |
| [SITE_SURVEY_MODE](./modes/SITE_SURVEY_MODE.md) | Complete | Existing site analysis |
| [BUSINESS_PLAN_MODE](./modes/BUSINESS_PLAN_MODE.md) | Complete | Business planning |
| [GTM_STRATEGY_MODE](./modes/GTM_STRATEGY_MODE.md) | Complete | Go-to-market strategy |

---

## Agents

Persona system and agent behavior.

| Spec | Status | Description |
|------|--------|-------------|
| [PERSONA_SYSTEM](./agents/PERSONA_SYSTEM.md) | Complete | Agent personas, traits, expertise |
| [AGENT_BEHAVIOR](./agents/AGENT_BEHAVIOR.md) | Complete | Reactivity, evaluation, generation |
| [RESEARCHER_AGENTS](./agents/RESEARCHER_AGENTS.md) | Complete | Specialized research capabilities |
| [PERSONA_GENERATION](./agents/PERSONA_GENERATION.md) | Complete | Dynamic persona creation |

---

## Design Principles

### 1. Event-Driven, Not Turn-Based
Agents react organically to conversation flow rather than taking rigid turns. The MessageBus enables natural discussion dynamics.

### 2. Goal-Anchored Deliberation
ModeController ensures agents stay focused on session objectives. Loop detection and interventions prevent endless debates.

### 3. Unified Kernel Architecture
SessionKernel provides single source of truth. UIs are thin adapters that render kernel responses.

### 4. Memory-Enhanced Context
ConversationMemory prevents agents from forgetting earlier discussion. Summaries and decisions persist across long sessions.

### 5. Human-in-the-Loop
Users can participate, steer, or observe. Human input is weighted appropriately in consensus.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Vite |
| Desktop | Electron 28 |
| CLI | Commander.js + Ink + readline |
| Terminal | xterm.js |
| State | Zustand (UI), MessageBus (runtime) |
| AI | Anthropic Claude SDK |
| Styling | Tailwind CSS |

---

## File Structure

```
forge/
├── src/
│   ├── agents/           # Persona definitions
│   ├── components/       # React UI components
│   │   └── shell/        # Terminal shell components
│   ├── lib/
│   │   ├── eda/          # Event-driven architecture
│   │   ├── kernel/       # SessionKernel (unified core)
│   │   ├── modes/        # Mode definitions & controller
│   │   └── interfaces/   # Adapter interfaces
│   ├── methodologies/    # Deliberation frameworks
│   ├── stores/           # Zustand state
│   └── types/            # TypeScript definitions
├── cli/                  # CLI application
│   ├── adapters/         # CLI-specific adapters
│   └── commands/         # CLI commands
├── electron/             # Electron main process
├── context/              # Project context files
├── briefs/               # Project briefs
├── personas/             # Custom persona sets
├── output/               # Session output
└── specs/                # This directory
```

---

## Getting Started

```bash
# Install dependencies
npm install

# Run Electron app
npm run electron:dev

# Run CLI
npm run cli

# Run kernel-based CLI
npm run cli:kernel
```

---

## Contributing

1. Read relevant spec before implementing
2. Update spec if design changes
3. Keep specs in sync with code
4. One topic per spec file
