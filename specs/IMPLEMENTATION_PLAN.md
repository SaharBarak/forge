# Implementation Plan

> Current tasks, priorities, and status for Forge development

**Last Updated**: 2026-01-30
**Current Phase**: Phase 4 - Polish & Scale

---

## Completed Tasks

### Phase 1: Core Engine
- [x] Event-driven architecture (MessageBus, subscriptions)
- [x] Agent personas (5 default Israeli personas)
- [x] AgentListener with reactivity thresholds
- [x] FloorManager with queue and cooldowns
- [x] EDAOrchestrator for coordination
- [x] Basic deliberation workflow
- [x] Electron app with React UI
- [x] xterm.js terminal shells

### Phase 2: Memory & Modes
- [x] ConversationMemory for context persistence
- [x] Summarization every ~12 messages
- [x] Decision and proposal tracking
- [x] ModeController for goal anchoring
- [x] Loop detection algorithm
- [x] 8 session modes defined
- [x] Phase transition logic
- [x] Research limit enforcement

### Phase 3: Unified Architecture
- [x] SessionKernel as unified core
- [x] Kernel command/response types
- [x] Kernel event system
- [x] IAgentRunner interface
- [x] IFileSystem interface (with listDir)
- [x] CLI feature parity
- [x] kernel-cli.ts demonstration
- [x] Configuration wizard

---

## Current Sprint

### Priority: High

| Task | Status | Notes |
|------|--------|-------|
| Integrate SessionKernel into MainShell.ts | TODO | Replace duplicated logic with kernel.execute() |
| Integrate SessionKernel into cli/index.ts | TODO | Migrate from direct orchestrator calls |
| Add session templates | TODO | Pre-configured sessions for common use cases |
| Improve export formats | TODO | Better Markdown structure, HTML templates |

### Priority: Medium

| Task | Status | Notes |
|------|--------|-------|
| Add streaming responses to kernel CLI | TODO | Show agent typing in real-time |
| Implement session search | TODO | Find sessions by content/date |
| Add keyboard shortcuts | TODO | Ctrl+S synthesize, Ctrl+E export |
| Improve agent colors in terminal | TODO | Better contrast, themes |

### Priority: Low

| Task | Status | Notes |
|------|--------|-------|
| Add session diff view | TODO | Compare session versions |
| Implement undo/redo | TODO | Revert session changes |
| Add analytics dashboard | TODO | Session stats, agent participation |

---

## Known Issues

| Issue | Severity | Description |
|-------|----------|-------------|
| Large chunks warning | Low | Vite build warns about >500KB chunks |
| Punycode deprecation | Low | Node.js deprecation warning |
| Memory not restored on Electron | Medium | Need to call restoreMemory on load |

---

## Technical Debt

| Item | Priority | Description |
|------|----------|-------------|
| Duplicate logic in CLI and MainShell | High | Should use SessionKernel exclusively |
| Hardcoded paths | Medium | Should use config/environment |
| Missing error boundaries | Medium | React components need error handling |
| No unit tests | High | Core logic untested |
| No integration tests | Medium | End-to-end flows untested |

---

## Architecture Improvements

### Proposed: Plugin System
Allow third-party extensions for:
- Custom personas
- Custom modes
- Custom export formats
- Custom research sources

### Proposed: Session Branching
Fork a session at any point to explore alternative directions.

### Proposed: Agent Profiles
Save/load agent configurations separately from personas.

---

## Dependencies to Watch

| Package | Current | Latest | Notes |
|---------|---------|--------|-------|
| @anthropic-ai/sdk | 0.30.0 | Check | Core AI functionality |
| electron | 28.2.0 | Check | Security updates |
| react | 18.2.0 | Check | Stable |
| xterm | 6.0.0 | Check | Terminal updates |

---

## Next Steps for Ralph

1. **Gap Analysis**: Compare specs against implementation
2. **Test Coverage**: Add tests for SessionKernel commands
3. **UI Integration**: Wire MainShell and CLI to use kernel
4. **Documentation**: Update README with new architecture
5. **Performance**: Profile and optimize long sessions

---

## Notes for Planning Mode

When analyzing this codebase:

1. **Start with specs/**: Read OVERVIEW.md and architecture specs first
2. **Check kernel types**: src/lib/kernel/types.ts defines the command interface
3. **Understand EDA flow**: MessageBus → AgentListener → FloorManager
4. **Mode system**: src/lib/modes/ controls deliberation focus
5. **Memory**: src/lib/eda/ConversationMemory.ts manages context

Key files to review:
- `src/lib/kernel/SessionKernel.ts` - Unified core (1168 lines)
- `src/lib/eda/EDAOrchestrator.ts` - Agent coordination
- `src/lib/eda/MessageBus.ts` - Event hub
- `src/lib/modes/ModeController.ts` - Goal anchoring
- `cli/kernel-cli.ts` - Reference kernel integration
