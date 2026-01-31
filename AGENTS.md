## Build & Run

```bash
npm install          # Install dependencies
npm run build        # Build web app (tsc + vite)
npm run cli:build    # Build CLI binary (esbuild)
npm run electron:build  # Build Electron desktop app
```

## Validation

Run these after implementing to get immediate feedback:

- Typecheck: `npm run typecheck`
- Build: `npm run build`
- Tests: `npm run test` (270 tests: SessionKernel, MessageBus, AgentListener, ConversationMemory, ModeController, FloorManager)
- Lint: `npm run lint` (requires eslint setup - not configured)

## Operational Notes

- TypeScript strict mode enabled in `tsconfig.json` (not in `tsconfig.cli.json`)
- CLI uses separate tsconfig (`tsconfig.cli.json`) with relaxed checking
- Path alias `@/*` maps to `./src/*`

### Build Commands - Important Notes

When making changes to core library files under `src/lib/`:

1. **Always run typecheck first**: `npm run typecheck` - catches type errors before build
2. **For CLI changes**: Run `npm run cli:build` to rebuild the CLI binary
3. **For web app changes**: Run `npm run build` to rebuild with Vite
4. **For Electron changes**: Run `npm run electron:build` after web build

**Build Order for Full Rebuild**:
```bash
npm run typecheck && npm run build && npm run cli:build && npm run electron:build
```

**Quick Validation** (recommended before committing):
```bash
npm run typecheck && npm run build
```

### Codebase Patterns

- SessionPhase type has 10 phases - always import from `src/types/index.ts`, not local definitions
- Model selection: Use `claude-3-5-haiku-20241022` for evaluations/tests, `claude-sonnet-4-20250514` for generation
- EDAOrchestrator has local 5-phase type at line 29 - known tech debt, use global type when possible
- CLI files at `cli/app/App.tsx` and `cli/app/StatusBar.tsx` import from EDA's limited type - known gap

### Recent Fixes (2026-01-31)

- **EDAOrchestrator**: Added `transitionToArgumentation()` method (~lines 836-890) with `getNextSpeakerForArgumentation()` helper
- **ModeController**: Added `checkRequiredResearch()` (~lines 355-380) and `isSynthesisPhase()` helpers for enforcing research requirements
- See `/home/ralph/project/IMPLEMENTATION_PLAN.md` for full gap analysis and fix status
