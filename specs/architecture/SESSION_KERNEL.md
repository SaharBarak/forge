# Session Kernel

> Unified core engine for all user interfaces

**Status**: Complete
**Files**: `src/lib/kernel/`

---

## Overview

The SessionKernel is the single source of truth for Forge. Both the Electron app and CLI delegate all operations to the kernel, ensuring consistent behavior across interfaces.

---

## Design Principle

```
┌─────────────────────────────────────────────────────────────┐
│                     SessionKernel                           │
│  - All session logic lives here                             │
│  - Stateful: tracks config, session, orchestrator           │
│  - Command → Response pattern                               │
│  - Events for async updates                                 │
└─────────────────────────────────────────────────────────────┘
                    ↑                        ↑
                    │ execute()              │ execute()
                    │ on()                   │ on()
                    ↓                        ↓
          ┌────────────────┐       ┌────────────────┐
          │  MainShell.ts  │       │  kernel-cli.ts │
          │  (Electron)    │       │  (Terminal)    │
          │                │       │                │
          │  Rendering:    │       │  Rendering:    │
          │  - xterm.js    │       │  - chalk       │
          │  - React       │       │  - readline    │
          └────────────────┘       └────────────────┘
```

**Key Insight**: UIs only handle:
1. Taking user input
2. Calling `kernel.execute(command)`
3. Rendering `KernelResponse[]`
4. Subscribing to `KernelEvent`

---

## Kernel State

```typescript
type KernelState =
  | 'idle'           // No session, waiting
  | 'configuring'    // Running config wizard
  | 'ready'          // Configured, not started
  | 'running'        // Session active
  | 'paused'         // Session paused
  | 'generating';    // Generating personas
```

**State Transitions**:
```
idle → configuring (on 'new' command)
configuring → ready (config complete)
configuring → generating (generate personas)
generating → configuring (personas generated)
ready → running (on 'start' command)
running → paused (on 'pause' command)
paused → running (on 'resume' command)
running → idle (on 'stop' command)
```

---

## Commands

All operations are expressed as commands:

```typescript
type KernelCommand =
  | { type: 'new' }                           // Start config wizard
  | { type: 'config_input'; value: string }   // Config step input
  | { type: 'start' }                         // Start session
  | { type: 'stop' }                          // Stop session
  | { type: 'pause' }                         // Pause session
  | { type: 'resume' }                        // Resume session
  | { type: 'save' }                          // Save session
  | { type: 'load'; nameOrIndex: string }     // Load session
  | { type: 'sessions' }                      // List sessions
  | { type: 'export'; format?: string }       // Export session
  | { type: 'status' }                        // Get status
  | { type: 'memory' }                        // Get memory stats
  | { type: 'recall'; agentId?: string }      // Test memory
  | { type: 'agents' }                        // List agents
  | { type: 'synthesize'; force?: boolean }   // Force synthesis
  | { type: 'consensus' }                     // Consensus status
  | { type: 'draft' }                         // Move to drafting
  | { type: 'say'; content: string }          // Send message
  | { type: 'token'; key?: string }           // Set/get API key
  | { type: 'test' }                          // Test API
  | { type: 'help' }                          // Show help
  | { type: 'mode_info' };                    // Mode details
```

---

## Responses

Commands return typed responses for UIs to render:

```typescript
type KernelResponseType =
  | 'info'          // Informational message
  | 'success'       // Success message
  | 'warning'       // Warning message
  | 'error'         // Error message
  | 'prompt'        // Waiting for input
  | 'list'          // List of items
  | 'table'         // Tabular data
  | 'message'       // Agent message
  | 'status'        // Status update
  | 'config_step'   // Configuration step
  | 'help';         // Help text

interface KernelResponse {
  type: KernelResponseType;
  content: string;           // Human-readable content
  data?: unknown;            // Structured data for rendering
}
```

**Example Response Handling**:
```typescript
const responses = await kernel.execute({ type: 'status' });

for (const response of responses) {
  switch (response.type) {
    case 'status':
      const data = response.data as StatusData;
      console.log(`State: ${data.state}`);
      console.log(`Project: ${data.project}`);
      break;
    case 'error':
      console.error(response.content);
      break;
  }
}
```

---

## Events

For async updates (agent messages, state changes):

```typescript
type KernelEventType =
  | 'state_change'      // Kernel state changed
  | 'agent_typing'      // Agent generating
  | 'agent_message'     // Agent spoke
  | 'phase_change'      // Phase transitioned
  | 'intervention'      // Mode controller intervention
  | 'session_saved'     // Session persisted
  | 'session_loaded';   // Session restored

// Subscribe to events
const unsubscribe = kernel.on((event) => {
  if (event.type === 'agent_message') {
    const { agentId, agentName, message } = event.data;
    displayMessage(agentName, message.content);
  }
});
```

---

## Configuration Wizard

The kernel manages a multi-step configuration flow:

```
Step 0: Project Name
  "Enter project name:"
  → config.projectName

Step 1: Goal
  "Enter project goal:"
  → config.goal

Step 2: Agents
  "Select agents:"
  [✓] 1. Ronit - Overwhelmed Decision-Maker
  [✓] 2. Yossi - Burned Veteran
  ...
  [g] Generate new personas
  [d] Use defaults
  → config.agents[]

Step 3: Language
  "Select language:"
  1. Hebrew (default)
  2. English
  3. Mixed
  → config.language

Step 4: Mode
  "Select session mode:"
  1. ✍️ Copywriting
  2. 🔍 Site Survey
  3. 💡 Ideation
  ...
  → config.mode
```

**Config Step Response**:
```typescript
interface ConfigStepResponse {
  type: 'config_step';
  content: string;  // Prompt text
  data: {
    id: string;
    prompt: string;
    options?: { value: string; label: string; default?: boolean }[];
    multiSelect?: boolean;
    allowGenerate?: boolean;
  };
}
```

---

## Dependency Injection

The kernel accepts adapters for environment-specific operations:

```typescript
interface KernelOptions {
  agentRunner?: IAgentRunner;   // AI calls
  fileSystem?: IFileSystem;     // File operations
  sessionsDir?: string;         // Where to save sessions
  outputDir?: string;           // Output directory
  onEvent?: KernelEventCallback;
}

// Electron usage
const kernel = new SessionKernel({
  agentRunner: new ElectronAgentRunner(),
  fileSystem: new ElectronFileSystem(),
});

// CLI usage
const kernel = new SessionKernel({
  agentRunner: new CLIAgentRunner(),
  fileSystem: new FileSystemAdapter(),
});
```

---

## Usage Example

```typescript
import { SessionKernel } from './lib/kernel';
import { CLIAgentRunner } from './adapters/CLIAgentRunner';
import { FileSystemAdapter } from './adapters/FileSystemAdapter';

// Create kernel
const kernel = new SessionKernel({
  agentRunner: new CLIAgentRunner(),
  fileSystem: new FileSystemAdapter(),
  onEvent: (event) => {
    if (event.type === 'agent_message') {
      console.log(`[${event.data.agentName}] ${event.data.message.content}`);
    }
  },
});

// Set API key
kernel.setApiKey(process.env.ANTHROPIC_API_KEY);

// Start configuration
let responses = await kernel.execute({ type: 'new' });
renderResponses(responses);

// Provide config values
responses = await kernel.execute({ type: 'config_input', value: 'My Project' });
responses = await kernel.execute({ type: 'config_input', value: 'Create compelling copy' });
responses = await kernel.execute({ type: 'config_input', value: 'done' });  // Accept default agents
responses = await kernel.execute({ type: 'config_input', value: '1' });     // Hebrew
responses = await kernel.execute({ type: 'config_input', value: '1' });     // Copywriting mode

// Start session
responses = await kernel.execute({ type: 'start' });

// Send message
responses = await kernel.execute({ type: 'say', content: 'Focus on trust-building' });

// Check status
responses = await kernel.execute({ type: 'status' });

// Stop and save
responses = await kernel.execute({ type: 'stop' });
```

---

## Best Practices

### For UI Implementers

1. **Always render all responses** - Commands may return multiple responses
2. **Subscribe to events early** - Don't miss agent messages
3. **Handle all response types** - Even unexpected ones gracefully
4. **Check state before commands** - Some commands require specific states

### For Kernel Extensions

1. **Return typed responses** - Don't just return strings
2. **Emit events for async operations** - UIs need real-time updates
3. **Validate state transitions** - Don't allow invalid commands
4. **Preserve backwards compatibility** - Don't break existing UIs
