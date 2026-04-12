# Forge — CLI Architecture (Primary Interface)

The CLI is the **primary user interface**. Electron is secondary.

## Three-Layer CLI Stack

```
┌───────────────────────────────────────────────────────────┐
│  Commander.js entry (cli/index.ts)                        │
│  - Banner + quick prompt on bare `forge`                  │
│  - Subcommands: start, login, community, personas, etc.   │
└────────────────────────┬──────────────────────────────────┘
                         │
           ┌─────────────┴──────────────┐
           │                            │
           ▼                            ▼
┌──────────────────────┐    ┌─────────────────────────────┐
│  Ink TUI             │    │  Dashboard TUI (blessed)    │
│  (cli/app/)          │    │  (cli/dashboard/)           │
│                      │    │                             │
│  HomeScreen          │    │  DashboardController        │
│  App (during session)│    │  11 widgets                 │
│  ChatPane            │    │  Layout engine              │
│  AgentList           │    │  Theme system               │
│  StatusBar           │    │  MarkdownRenderer           │
│  InputPane           │    │  MessageFormatter           │
│  CanvasPane          │    │                             │
└──────────────────────┘    └─────────────────────────────┘
```

The Ink app wraps the Dashboard for most session UI. The Ink app is the entry point, but the dashboard widget system does the heavy lifting once a session starts.

## cli/app/ — Ink React TUI

| File | Purpose |
|------|---------|
| `App.tsx` | Main session layout. Wires orchestrator events → state → widgets. Handles `/command` routing (pause, resume, synthesize, export, login, community, connections, quit). |
| `HomeScreen.tsx` | Landing screen on bare `forge`. Shows Last Supper banner + identity + quick menu + TextInput. |
| `ChatPane.tsx` | Scrollable message list. Uses `renderMarkdown()` from `src/lib/render/markdown.ts` to format agent output. |
| `AgentList.tsx` | Sidebar with agent name, color, state (listening/thinking/speaking), contribution count, stance badge. |
| `StatusBar.tsx` | Phase indicator with progress bar, floor status, consensus points, DID, peer count, quote. |
| `InputPane.tsx` | TextInput with `/command` parsing + CommandHelp overlay. |
| `CanvasPane.tsx` | Visual consensus canvas (JSONL-based). |

## cli/dashboard/ — blessed Widget System

| File | Purpose |
|------|---------|
| `DashboardController.ts` | Central orchestrator. Subscribes to EDA events, routes to widgets. Also parses `[TOOL:]` blocks and dispatches to ToolRunner. |
| `screen.ts` | blessed Screen wrapper with scheduleRender debounce. |
| `layout.ts` | Grid layout: header + chat + sidebar + input + status. |
| `theme.ts` | blessed color/style tokens. Message type → badge mapping (`[ARG]`, `[PROP]`, `[SYN]`, `[TOOL]`, `[RES]`). |
| `types.ts` | Widget interface types. |
| `index.ts` | `startDashboard(options)` entry point. |

### Widgets (cli/dashboard/widgets/)

| Widget | Shows |
|--------|-------|
| `HeaderWidget` | Project name, goal, current phase, breadcrumbs |
| `BreadcrumbWidget` | Menu navigation trail |
| `ChatLogWidget` | Message list with type badges, typing indicator |
| `InputWidget` | Command/message input |
| `AgentPanelWidget` | Agent avatars, states, contribution counts |
| `ConsensusChartWidget` | Live agreement/disagreement chart |
| `PhaseTimelineWidget` | Gauge showing phase progression |
| `CanvasWidget` | Visual consensus canvas (JSONL rendering) |
| `QuickRepliesWidget` | Suggested responses based on context |
| `SuggestionWidget` | Agent-suggested next actions |
| `StatusBarWidget` | Status message + shortcut help |

### Formatters

- `formatters/markdownRenderer.ts` — Markdown → blessed-tagged text
- `formatters/messageFormatter.ts` — Message → formatted line with color/badge

## cli/prompts/ — Banners + Wizards

| File | Purpose |
|------|---------|
| `banner.ts` | **The real banner**. Last Supper half-block terminal art (full color ANSI RGB) + ASCII "FORGE" wordmark in gold gradient. Generated via chafa from Leonardo's painting. `showBanner(savedCount?)` exported. |
| `idle.ts` | Idle mode loop. 937 lines. Handles the full between-session state: config wizard, persona selection, session list, API key setup. |
| `wizards.ts` | Configuration wizards for session setup. |

## cli/adapters/

Translations between domain-level services and the CLI environment:

| File | Purpose |
|------|---------|
| `CLIAgentRunner.ts` | Implements `IAgentRunner`. Uses `@anthropic-ai/sdk` directly (not via Electron IPC). |
| `FileSystemAdapter.ts` | Implements `IFileSystem`. Uses Node fs/promises. |
| `SessionPersistence.ts` | Auto-save sessions to JSONL. |
| `CrossSessionMemory.ts` | Memory preserved across sessions for a user. |
| `MemoryIndex.ts` | Index for cross-session memory search. |
| `auth-bridge.ts` | File-based DID auth storage (~/.forge/auth.json). |
| `p2p-direct.ts` | In-process P2P wrapper (avoids Electron IPC). |
| `connections-direct.ts` | In-process semantic connections wrapper. |
| `services.ts` | Lazy bootstrap for P2P + connections services. |

## cli/commands/

Each command is a Commander.js subcommand factory:

| File | Commands |
|------|----------|
| `personas.ts` | `forge personas list/generate/load/save` |
| `export.ts` | `forge export <session> --format <md|json|pdf|docx>` |
| `batch.ts` | `forge batch <pattern>` — run multiple sessions |
| `sessions.ts` | `forge sessions list/load/delete` |
| `watch.ts` | `forge watch` — watch files, trigger sessions on change |
| `config.ts` | `forge config get/set` |
| `completions.ts` | `forge completions <shell>` — shell completions |
| `login.ts` | `forge login [status|logout]` |
| `community.ts` | `forge community list/publish/vote` |

## cli/lib/

Utilities used across the CLI:

| File | Purpose |
|------|---------|
| `multilineText.ts` | Multi-line input handling |
| `suggestions.ts` | Context-aware reply suggestions |
| `menuBreadcrumbs.ts` | Navigation breadcrumb state |
| `wireframe.ts` | Parses wireframe proposals from agent messages |
| `wireframe-store.ts` | Stores + versions wireframe proposals |

## cli/tools/

Tool registry (restored from git history):

| File | Purpose |
|------|---------|
| `ToolRunner.ts` | Tool dispatch. `runTool(name, args, outputDir)`. Currently supports `image-generation` and `graph-generation` (both via GeminiTool). |
| `GeminiTool.ts` | Gemini API wrapper for image generation. |

## Bootstrap Flow on `forge` with no args

1. `program.action(async () => { ... })` fires in `cli/index.ts`
2. `showBanner(sessionCount)` prints Last Supper + FORGE wordmark
3. Check identity via `authRepo.restoreSession()`
4. Create DID if missing
5. Print quick-start hints
6. `readline` REPL loop handles commands: `new`, `start`, `sessions`, `login`, `community`, `exit`, etc.
7. On `new` → runs config wizard → instantiates `EDAOrchestrator` → renders dashboard via `startDashboard(options)` → Ink `App` mounts → `DashboardController` takes over

## Lazy Service Bootstrap

`cli/adapters/services.ts` exports `ensureServices()` — only starts P2P + connections when actually needed. Simple commands (`login status`, `help`, `agents`) run instantly. Community/start commands await services first.

```typescript
let started = false;

export async function ensureServices(): Promise<void> {
  if (started) return;
  started = true;
  await startP2P(p2pDataDir);
  await startConnections(forgeDataDir);
}
```

## Graceful Shutdown

```typescript
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('beforeExit', () => { shutdownServices(); });
```

Ensures P2P node and connections service persist their state on exit.
