# AGENTS.md - Forge Project Agents

> Configuration file for Ralph Wiggum methodology

---

## Project Overview

**Forge** is a multi-agent deliberation engine that orchestrates AI personas to reach consensus through structured debate. Primary use case is website copywriting, but the mode system supports idea validation, business planning, and more.

---

## Specifications

All specifications are in `specs/` directory:

| Category | Files | Purpose |
|----------|-------|---------|
| **Architecture** | `specs/architecture/*.md` | Technical design |
| **Features** | `specs/features/*.md` | User-facing capabilities |
| **Modes** | `specs/modes/*.md` | Deliberation modes |
| **Agents** | `specs/agents/*.md` | Persona system |

**Start here**: `specs/README.md` → `specs/OVERVIEW.md`

---

## Implementation Plan

Current tasks and priorities: `specs/IMPLEMENTATION_PLAN.md`

---

## Key Technical Decisions

### Locked (Do Not Change)
- TypeScript for all code
- Event-driven architecture (MessageBus pattern)
- SessionKernel as unified core
- Anthropic Claude as AI provider
- Electron for desktop, CLI for terminal

### Open for Improvement
- Test coverage (currently none)
- Performance optimization for long sessions
- Export format richness
- UI integration with kernel

---

## Core Files

### Must Understand
| File | Lines | Purpose |
|------|-------|---------|
| `src/lib/kernel/SessionKernel.ts` | 1168 | Unified core engine |
| `src/lib/eda/EDAOrchestrator.ts` | ~500 | Agent coordination |
| `src/lib/eda/MessageBus.ts` | ~300 | Event hub |
| `src/lib/modes/ModeController.ts` | ~480 | Goal anchoring |
| `src/lib/eda/ConversationMemory.ts` | ~350 | Context persistence |

### Reference Implementation
| File | Purpose |
|------|---------|
| `cli/kernel-cli.ts` | How to use SessionKernel |
| `src/agents/personas.ts` | Persona definitions |
| `src/lib/modes/index.ts` | Mode definitions |

---

## Architecture Patterns

### Event-Driven Architecture
```
MessageBus (singleton)
  ↓ events
AgentListeners ←→ FloorManager
  ↓ coordination
EDAOrchestrator
  ↓ commands
SessionKernel
```

### Kernel Command Pattern
```typescript
// All operations are commands
const responses = await kernel.execute({ type: 'start' });

// Responses are typed for rendering
for (const r of responses) {
  switch (r.type) {
    case 'success': showSuccess(r.content); break;
    case 'error': showError(r.content); break;
  }
}

// Events for async updates
kernel.on((event) => {
  if (event.type === 'agent_message') {
    displayMessage(event.data);
  }
});
```

### Mode Intervention Pattern
```typescript
// ModeController monitors and intervenes
const interventions = modeController.processMessage(message, allMessages);

for (const intervention of interventions) {
  if (intervention.action === 'inject_message') {
    bus.addMessage(createSystemMessage(intervention.message));
  }
}
```

---

## Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Language | TypeScript 5.3 | Strict mode |
| Frontend | React 18 | Functional components |
| Desktop | Electron 28 | Main + Renderer processes |
| Terminal | xterm.js | In Electron |
| CLI | Commander.js + Ink | Standalone |
| State | Zustand | UI state |
| Events | Custom MessageBus | Runtime state |
| AI | @anthropic-ai/sdk | Claude Sonnet/Haiku |
| Build | Vite + esbuild | Fast builds |

---

## Scripts

```bash
npm run dev           # Vite dev server
npm run build         # Build web app
npm run electron:dev  # Run Electron app
npm run cli           # Run CLI
npm run cli:kernel    # Run kernel-based CLI
npm run typecheck     # TypeScript check
```

---

## Testing Requirements

### Unit Tests Needed
- [ ] SessionKernel command handling
- [ ] ModeController intervention logic
- [ ] ConversationMemory summarization
- [ ] FloorManager queue behavior

### Integration Tests Needed
- [ ] Full session lifecycle
- [ ] Agent interaction flow
- [ ] Session save/load
- [ ] Mode transitions

---

## Current Priorities

1. **Integrate SessionKernel** into MainShell.ts (replace duplicated logic)
2. **Integrate SessionKernel** into cli/index.ts (replace direct calls)
3. **Add tests** for core kernel commands
4. **Performance** profile long sessions

---

## Code Style

- Functional over class-based where possible
- Explicit types (no `any` without reason)
- Async/await over callbacks
- Descriptive variable names
- Comments for "why", not "what"

---

## Context for AI Assistants

When working on this codebase:

1. **Read specs first** - They document design decisions
2. **Use kernel pattern** - Don't bypass SessionKernel
3. **Maintain event flow** - Don't break MessageBus subscriptions
4. **Preserve personas** - They're carefully designed
5. **Test with real sessions** - Theory differs from practice

---

## File Locations

```
/
├── src/
│   ├── lib/
│   │   ├── kernel/         # SessionKernel (unified core)
│   │   ├── eda/            # Event-driven components
│   │   ├── modes/          # Mode system
│   │   └── interfaces/     # Adapter interfaces
│   ├── agents/             # Persona definitions
│   ├── components/         # React UI
│   │   └── shell/          # Terminal shells
│   ├── methodologies/      # Deliberation frameworks
│   └── stores/             # Zustand state
├── cli/                    # CLI application
├── electron/               # Electron main process
├── specs/                  # Specifications
│   ├── architecture/
│   ├── features/
│   ├── modes/
│   └── agents/
├── context/                # Project context files
├── briefs/                 # Project briefs
└── output/                 # Session output
```
