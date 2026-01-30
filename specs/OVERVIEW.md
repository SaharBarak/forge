# Forge: Project Overview

> Multi-Agent Deliberation Engine for Consensus-Driven Content Creation

**Status**: Active Development
**Created**: 2026-01-30

---

## Vision

Forge simulates a "think tank" where AI agents with distinct personas debate, research, and synthesize to produce high-quality content. By embodying different audience perspectives and expertise areas, agents create more nuanced, compelling output than a single AI could achieve alone.

---

## Problem Statement

### Current Pain Points

1. **Single-perspective AI output**: One AI produces content reflecting one viewpoint, missing audience diversity
2. **Lack of debate**: Ideas aren't stress-tested against different perspectives before publication
3. **Context amnesia**: Long sessions lose earlier insights as context windows overflow
4. **Unfocused deliberation**: AI discussions can spiral into endless research or circular debates
5. **No structured workflow**: Ad-hoc prompting lacks the rigor of professional content creation

### Target Users

- **Content teams** creating website copy, marketing materials, strategic documents
- **Solo founders** who need multiple perspectives but lack a team
- **Agencies** looking to augment creative process with AI deliberation
- **Product teams** validating ideas and messaging before development

---

## Solution

### Core Concept

Multiple AI agents, each with a defined persona (background, biases, communication style), engage in structured deliberation:

```
Human provides goal + context
         ↓
Agents debate (brainstorm → argue → synthesize)
         ↓
Consensus emerges through structured phases
         ↓
Agents draft content collaboratively
         ↓
Human reviews and iterates
```

### Key Differentiators

1. **Persona-driven diversity**: Each agent represents a distinct audience segment or expertise
2. **Event-driven flow**: Natural conversation rather than rigid turn-taking
3. **Mode-based focus**: Different modes for different objectives (copywriting, validation, ideation)
4. **Memory persistence**: Summaries and decisions survive long sessions
5. **Goal anchoring**: Automatic interventions keep deliberation on track

---

## Scope

### In Scope (MVP)

- [x] 5 default personas (Israeli tech/business audience)
- [x] Copywriting mode with 5 phases
- [x] Event-driven architecture with MessageBus
- [x] Floor management (queue, cooldowns, timeouts)
- [x] Conversation memory (summaries, decisions, proposals)
- [x] Mode system with 8 modes
- [x] ModeController (goal reminders, loop detection, interventions)
- [x] Session persistence (save/load/export)
- [x] Electron desktop app with terminal UI
- [x] CLI with full feature parity
- [x] SessionKernel for unified logic
- [x] Research agents with web search
- [x] Consensus tracking
- [x] Human participation

### Out of Scope (Future)

- [ ] Real-time collaboration (multiple humans)
- [ ] Voice input/output
- [ ] Image generation integration
- [ ] Custom training on user's past content
- [ ] Team/workspace management
- [ ] API for external integrations
- [ ] Mobile apps
- [ ] Billing/subscription system

---

## Success Metrics

### Qualitative

- Content feels like it came from a diverse team, not a single AI
- Users report the deliberation surfaced insights they wouldn't have considered
- Output requires minimal editing before use

### Quantitative

- Session completion rate > 80%
- Average session produces 3+ distinct content sections
- User intervention rate < 20% (agents stay on track)
- Memory recall accuracy > 90% (agents reference earlier decisions correctly)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     SessionKernel                           │
│  - Session lifecycle     - Command processing               │
│  - Configuration wizard  - Event emission                   │
└─────────────────────────────────────────────────────────────┘
                              ↑
                              │ execute(command) → responses[]
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     EDAOrchestrator                         │
│  - Agent coordination    - Phase transitions                │
│  - Research handling     - Consensus tracking               │
│  - Mode interventions    - Synthesis scheduling             │
└─────────────────────────────────────────────────────────────┘
                              ↑
                              │ events
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                       MessageBus                            │
│  - Event pub/sub         - Message history                  │
│  - Memory integration    - Session state                    │
└─────────────────────────────────────────────────────────────┘
        ↑               ↑               ↑               ↑
        │               │               │               │
   AgentListener   AgentListener   FloorManager   ConversationMemory
   (Ronit)         (Yossi)         (queue mgmt)   (summaries)
```

---

## Key Decisions

### Locked Decisions

| Decision | Rationale |
|----------|-----------|
| TypeScript | Type safety for complex event system |
| Electron for desktop | Cross-platform, web tech reuse |
| Anthropic Claude | Best reasoning, tool use, long context |
| Event-driven architecture | Natural conversation flow, decoupled components |
| Zustand for UI state | Lightweight, works well with React |
| xterm.js for terminals | Rich terminal emulation in browser |

### Open Decisions

| Decision | Options | Consideration |
|----------|---------|---------------|
| Database for sessions | SQLite vs JSON files | Currently JSON; SQLite if scaling |
| Multi-user collaboration | WebSocket vs polling | Not yet implemented |
| Persona marketplace | Built-in vs community | Future feature |

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Claude API costs | High | Efficient context windows, caching |
| Agents go off-topic | Medium | ModeController interventions |
| Long sessions lose context | Medium | ConversationMemory summarization |
| UI complexity | Medium | Unified SessionKernel |
| Rate limiting | Low | Queue management, delays |

---

## Roadmap

### Phase 1: Core Engine (Complete)
- Event-driven architecture
- Basic personas and deliberation
- Electron app with terminals

### Phase 2: Memory & Modes (Complete)
- ConversationMemory for context persistence
- ModeController for goal anchoring
- 8 session modes

### Phase 3: Unified Architecture (Complete)
- SessionKernel as single source of truth
- CLI feature parity
- Adapter interfaces

### Phase 4: Polish & Scale (Next)
- Performance optimization
- Better export formats
- Session templates
- Persona marketplace

### Phase 5: Collaboration (Future)
- Multi-user sessions
- Team workspaces
- API access
