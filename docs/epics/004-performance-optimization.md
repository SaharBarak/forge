# Epic: Performance Optimization

## Overview

Reduce bundle size, improve startup time, and optimize runtime performance for smoother user experience across all platforms.

## Problem Statement

Current performance issues identified:
- **Bundle size**: Main JS bundle is 646 kB (recommended < 500 kB)
- **Startup time**: Cold start can take 3-5 seconds on older machines
- **Memory usage**: Long sessions accumulate memory
- **API efficiency**: No response caching or request deduplication

## Proposed Solution

### Bundle Size Reduction

1. **Code Splitting**
   - Lazy load heavy components (TerminalPane, ExportModal)
   - Dynamic imports for methodology guides
   - Separate chunk for xterm.js (~200 kB)

2. **Tree Shaking Improvements**
   - Audit unused exports
   - Replace large deps with lighter alternatives
   - Remove unused Tailwind classes (purge config)

3. **Dependency Optimization**
   ```
   Current heavy deps:
   - xterm.js: ~200 kB → lazy load
   - @anthropic-ai/sdk: ~100 kB → keep (core)
   - react-markdown: ~50 kB → consider lighter alt
   - marked: ~40 kB → already included in react-markdown?
   ```

### Startup Optimization

1. **Deferred Initialization**
   - Load SessionKernel lazily
   - Initialize agents on-demand
   - Defer non-critical IPC handlers

2. **Preload Script Optimization**
   - Minimize preload bundle
   - Async context bridge setup

3. **Window Loading**
   - Show splash/skeleton immediately
   - Progressive hydration

### Runtime Performance

1. **Memory Management**
   - Implement ConversationMemory pruning
   - Clear old message references
   - Periodic garbage collection hints

2. **API Optimization**
   - Response caching for repeated queries
   - Request deduplication (prevent double-sends)
   - Streaming response handling improvements

3. **UI Rendering**
   - Virtual scrolling for long message lists
   - Debounced re-renders
   - Memoization of expensive components

### Metrics & Monitoring

```typescript
interface PerformanceMetrics {
  startup: {
    coldStartMs: number;
    timeToInteractiveMs: number;
    timeToFirstPaintMs: number;
  };
  
  runtime: {
    avgRenderTimeMs: number;
    memoryUsageMb: number;
    apiLatencyMs: number;
  };
  
  bundle: {
    mainBundleKb: number;
    totalBundleKb: number;
    largestChunkKb: number;
  };
}
```

## Affected Components

| Component | Changes |
|-----------|---------|
| `vite.config.ts` | Code splitting, chunk optimization |
| `src/components/` | Lazy loading wrappers |
| `electron/main.js` | Deferred initialization |
| `electron/preload.js` | Minimal preload |
| `src/lib/eda/ConversationMemory.ts` | Memory pruning |
| `src/lib/eda/MessageBus.ts` | Message limit enforcement |
| `tailwind.config.js` | Purge unused classes |
| `package.json` | Dependency audit |

## Success Criteria

- [ ] Bundle size < 500 kB (from 646 kB) - **23% reduction**
- [ ] Cold start < 2 seconds (from 3-5s)
- [ ] Memory usage stable over 1-hour sessions
- [ ] No duplicate API requests
- [ ] Virtual scrolling for 500+ messages
- [ ] Performance metrics dashboard in dev mode

## Implementation Phases

### Phase 1: Analysis & Baseline
- Bundle analyzer report
- Startup time profiling
- Memory usage baseline
- Create metrics tracking

### Phase 2: Bundle Optimization
- Code splitting implementation
- Dependency audit and replacement
- Tailwind purge verification

### Phase 3: Startup Optimization
- Lazy loading implementation
- Preload script minimization
- Splash screen

### Phase 4: Runtime Optimization
- Memory management
- Virtual scrolling
- Component memoization

### Phase 5: API Optimization
- Response caching
- Request deduplication
- Streaming improvements

## Estimated Effort

- **Backend (BE)**: 3 days
- **Frontend (FE)**: 4 days
- **Architect**: 2 days (analysis)
- **QA**: 2 days
- **Total**: ~11 days

## Dependencies

- May require Vite config expertise
- Electron performance profiling tools

## Risks

| Risk | Mitigation |
|------|------------|
| Breaking changes from code splitting | Thorough testing, incremental rollout |
| Lazy loading UX degradation | Prefetch hints, loading states |
| Cache invalidation bugs | Clear cache strategy, versioning |

## Measurement Tools

- `vite-bundle-visualizer` for bundle analysis
- Electron DevTools Performance panel
- Custom metrics collection in dev mode
