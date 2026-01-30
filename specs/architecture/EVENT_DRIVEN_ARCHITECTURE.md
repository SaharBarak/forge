# Event-Driven Architecture

> Core event system enabling natural agent conversation flow

**Status**: Complete
**Files**: `src/lib/eda/`

---

## Overview

Forge uses an event-driven architecture (EDA) where agents react to messages organically rather than taking rigid turns. The MessageBus acts as the central hub, enabling decoupled components to communicate through events.

---

## Components

### MessageBus (`MessageBus.ts`)

The singleton event hub for all inter-component communication.

```typescript
// Singleton access
import { messageBus } from '../lib/eda/MessageBus';

// Subscribe to events
const unsubscribe = messageBus.subscribe('message:new', (payload) => {
  console.log('New message:', payload.message);
}, 'my-subscriber-id');

// Publish events
messageBus.emit('floor:request', { agentId: 'ronit', urgency: 'high' });

// Add messages to history
messageBus.addMessage(message);
```

**Key Methods**:
| Method | Purpose |
|--------|---------|
| `subscribe(event, handler, subscriberId)` | Listen for events |
| `emit(event, payload)` | Publish events |
| `addMessage(message)` | Add to message history |
| `getAllMessages()` | Get full history |
| `getRecentMessages(count)` | Get last N messages |
| `pause(reason)` / `resume()` | Control message flow |
| `setAgentRunner(runner)` | Set AI adapter for memory |
| `getMemoryContext(agentId?)` | Get memory summary |
| `getMemoryState()` / `restoreMemory(state)` | Persist memory |

**Events**:
| Event | Payload | Description |
|-------|---------|-------------|
| `message:new` | `{ fromAgent, message }` | New message added |
| `floor:request` | `{ agentId, urgency, reason }` | Agent wants to speak |
| `floor:granted` | `{ agentId }` | Agent can speak |
| `floor:released` | `{ agentId }` | Agent finished |
| `floor:denied` | `{ agentId, reason }` | Request denied |
| `session:start` | `{ session }` | Session began |
| `session:pause` | `{ reason }` | Session paused |
| `session:resume` | `{}` | Session resumed |
| `session:end` | `{}` | Session ended |

---

### AgentListener (`AgentListener.ts`)

Individual agent instance that listens and reacts to conversation.

```typescript
const listener = new AgentListener(
  persona,           // Agent persona definition
  session,           // Current session
  agentRunner,       // IAgentRunner for AI calls
  customSkills       // Optional domain expertise
);

listener.start();    // Begin listening
listener.stop();     // Stop listening
```

**Behavior Flow**:
```
1. Receive message:new event
   ↓
2. Check reactivity threshold
   - Am I the sender? → Skip
   - Cooldown active? → Skip
   - Random threshold check → Maybe skip
   ↓
3. Evaluate whether to respond
   - Call AI to evaluate (fast, cheap)
   - Should I speak? Interest level?
   ↓
4. If yes, request floor
   - Determine urgency based on evaluation
   ↓
5. Wait for floor:granted
   ↓
6. Generate response
   - Include persona + expertise + context
   - Include memory summary
   - Include recent messages
   ↓
7. Emit message
8. Release floor
```

**Configuration**:
```typescript
const config = {
  reactivityThreshold: 0.6,      // How likely to react (0-1)
  minSilenceBeforeReact: 1000,   // ms before considering response
  maxContextMessages: 15,        // Messages to include in prompt
  evaluationModel: 'haiku',      // Fast model for evaluation
  responseModel: 'sonnet',       // Better model for response
};
```

---

### FloorManager (`FloorManager.ts`)

Controls speaking order to prevent chaos.

**Queue System**:
```
High Urgency Queue    → Processed first
Medium Urgency Queue  → Processed second
Low Urgency Queue     → Processed last
```

**Rules**:
| Rule | Value | Purpose |
|------|-------|---------|
| Cooldown | 2 seconds | Prevent agent dominance |
| Floor timeout | 30 seconds | Prevent hogging |
| Queue limit | 10 per priority | Prevent overflow |

**Flow**:
```
1. Agent requests floor (urgency: high/medium/low)
   ↓
2. FloorManager checks:
   - Is floor free?
   - Is agent on cooldown?
   - Queue position?
   ↓
3. If floor free and no cooldown:
   - Grant immediately
   ↓
4. If floor occupied:
   - Add to appropriate queue
   - Wait for release
   ↓
5. On floor release:
   - Process high queue first
   - Then medium, then low
   - Grant to next eligible
```

---

### EDAOrchestrator (`EDAOrchestrator.ts`)

Master coordinator that manages the entire deliberation.

**Responsibilities**:
- Create and manage AgentListeners
- Handle phase transitions
- Process mode interventions
- Track consensus
- Handle research requests
- Schedule periodic synthesis

**Lifecycle**:
```typescript
const orchestrator = new EDAOrchestrator(
  session,
  context,        // Optional loaded context
  domainSkills,   // Optional custom expertise
  adapters        // { agentRunner, fileSystem }
);

orchestrator.start();                    // Begin deliberation
orchestrator.addHumanMessage(content);   // Add human input
orchestrator.transitionToSynthesis();    // Force phase change
orchestrator.getConsensusStatus();       // Check consensus
orchestrator.stop();                     // End deliberation
```

**Event Handling**:
```typescript
orchestrator.on((event) => {
  switch (event.type) {
    case 'agent_message':
      // Agent spoke - update UI
      break;
    case 'agent_typing':
      // Agent is generating - show indicator
      break;
    case 'phase_change':
      // Phase transitioned - update status
      break;
    case 'floor_status':
      // Floor state changed
      break;
  }
});
```

---

## Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         MessageBus                                │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Events: message:new, floor:*, session:*                     │ │
│  │ State: messages[], isPaused, memory                         │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
         ↑               ↑               ↑               ↑
         │ subscribe     │ subscribe     │ subscribe     │ subscribe
         │ emit          │ emit          │ emit          │
         ↓               ↓               ↓               ↓
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ AgentListener│  │ AgentListener│  │ FloorManager │  │ Orchestrator │
│ (Ronit)     │  │ (Yossi)     │  │             │  │             │
│             │  │             │  │ - queue     │  │ - phases    │
│ - evaluate  │  │ - evaluate  │  │ - cooldown  │  │ - consensus │
│ - generate  │  │ - generate  │  │ - timeout   │  │ - research  │
│ - persona   │  │ - persona   │  │             │  │ - synthesis │
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
         │               │
         │ claudeAgent   │ claudeAgent
         ↓               ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Claude API                                  │
│  - Evaluation (fast, haiku)                                     │
│  - Generation (quality, sonnet)                                 │
│  - Research (with tools, web search)                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Message Types

```typescript
type MessageType =
  | 'argument'          // Position statement
  | 'question'          // Seeking clarification
  | 'proposal'          // Suggesting approach
  | 'agreement'         // Supporting another
  | 'disagreement'      // Opposing another
  | 'synthesis'         // Combining viewpoints
  | 'research_request'  // Asking for research
  | 'research_result'   // Research findings
  | 'human_input'       // User message
  | 'system'            // System notification
  | 'consensus'         // Agreement reached
  | 'vote';             // Formal vote
```

---

## Best Practices

### For New Subscribers
1. Always provide a unique subscriber ID
2. Store unsubscribe function for cleanup
3. Handle events asynchronously if heavy processing

### For Event Emission
1. Use appropriate event types
2. Include all required payload fields
3. Don't emit in tight loops

### For Agents
1. Check cooldown before requesting floor
2. Release floor promptly when done
3. Respect urgency levels appropriately
