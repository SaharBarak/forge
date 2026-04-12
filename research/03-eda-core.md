# Forge — Event-Driven Architecture Core

The heart of Forge. Agents are fully decoupled and coordinate asynchronously via a central pub/sub bus.

## Components (src/lib/eda/)

| File | Role |
|------|------|
| `MessageBus.ts` | Central event emitter. 500-message history (pruned at 90%). Subscriptions map. Injectable ConversationMemory. |
| `AgentListener.ts` | One per agent. Subscribes to `message:new`, `floor:*`, `session:*` events. Reacts → decides → speaks. |
| `FloorManager.ts` | Turn-taking. Priority queue by urgency. 2s cooldown per agent. 30s floor timeout. |
| `EDAOrchestrator.ts` | Top-level coordinator. Wires agents to bus, tracks phases, consensus, contributions. |
| `ConversationMemory.ts` | Summaries every 12 messages. Tracks decisions, proposals, reactions via regex pattern matching. |

## The Agent Reaction Loop

```
1. Message arrives → MessageBus.addMessage(message, fromAgent)
   ↓
2. MessageBus.emit('message:new', { message, fromAgent })
   ↓
3. For each listening agent: AgentListener.onMessage()
   - Increment messagesSinceSpoke
   - Set state = 'thinking'
   - Debounce 500ms → evaluateAndReact()
   ↓
4. evaluateAndReact()
   - Fetch recent messages (8 max)
   - Call ClaudeCodeAgent.evaluateReaction(context, silenceCount)
   - Haiku model: "Should I speak?" → { urgency, reason, responseType }
   ↓
5. If urgency ≠ 'pass' AND Math.random() > reactivityThreshold:
   - Create FloorRequest { agentId, urgency, reason, timestamp }
   - state = 'waiting'
   - emit 'floor:request'
   ↓
6. FloorManager.handleFloorRequest()
   - Check cooldown (2000ms since last spoke)
   - Insert into priority queue (high > medium > low)
   - If no current speaker: processQueue() → grant next
   ↓
7. emit 'floor:granted' → AgentListener.onFloorGranted()
   - state = 'speaking'
   - Fetch recent messages (15 max)
   - Call ClaudeCodeAgent.generateResponse(context, triggerReason)
   - Sonnet model: full response → { content, type }
   ↓
8. Create Message → addMessage → bus emits → cycle repeats
   - Reset messagesSinceSpoke = 0
   - emit 'floor:released'
   - state = 'listening'
```

## Key Algorithmic Details

### Probabilistic Reactivity

Even when evaluation says "speak", agents only actually speak **50% of the time** by default:

```typescript
if (decision.urgency !== 'pass' && Math.random() > this.reactivityThreshold) {
  this.requestFloor(decision);
}
```

This prevents over-chatty behavior and creates natural conversation flow. Configurable via `reactivityThreshold` (0.0-1.0).

### Debounced Evaluation

Agents wait 500ms after a new message before evaluating. If another message arrives in that window, the timer resets. This prevents agents from evaluating every rapid-fire message — they react to conversation flow, not individual words.

### Two-Model Strategy

- **Haiku (claude-3-5-haiku-20241022)** for evaluation — 200 tokens max, ~2s latency, ~10x cheaper
- **Sonnet (claude-sonnet-4-20250514)** for response generation — 1024 tokens max, ~5s latency

Cost savings via Haiku: an agent evaluates every incoming message but only generates a Sonnet response when it wins the floor.

### Floor Queue Dedup

If agent A is already in the queue and requests the floor again with higher urgency, the old request is replaced. Same agent can't hold multiple slots.

### Cooldown Protection

After speaking, an agent is locked out of the queue for 2000ms. Prevents monopolization — even an "urgent" request is ignored during cooldown.

## Message Types

From `src/types/index.ts`:

| Type | Purpose |
|------|---------|
| `argument` | Standard debate contribution |
| `question` | Clarification request |
| `proposal` | Concrete suggestion (tracked for consensus) |
| `agreement` | Support for existing proposal |
| `disagreement` | Objection to proposal |
| `synthesis` | Combining multiple ideas |
| `research_request` | Halt → ask researcher agent |
| `research_result` | Returned data from researcher |
| `human_input` | Direct human injection |
| `system` | Meta-messages (phase changes, warnings) |
| `consensus` | Meta: consensus declared |
| `vote` | Explicit vote |
| `methodology` | Methodology-specific prompt |
| `tool_result` | Output from ToolRunner ([TOOL:] protocol) |

## ConversationMemory Pattern Detection

Regex patterns in `src/lib/eda/ConversationMemory.ts`:

```typescript
const DECISION_PATTERNS = [
  /we('ve)?\s+(agreed|decided|concluded)/i,
  /consensus\s+(is|reached)/i,
  /let's\s+go\s+with/i,
  /final\s+(decision|answer)/i,
  /\[CONSENSUS\]/i,
  /\[DECISION\]/i,
];

const PROPOSAL_PATTERNS = [
  /I\s+propose/i,
  /what\s+if\s+we/i,
  /let's\s+consider/i,
  /my\s+suggestion/i,
  /\[PROPOSAL\]/i,
];

const REACTION_PATTERNS = {
  support: [/I\s+agree/i, /great\s+idea/i, /מסכים/i, /רעיון מצוין/i],
  oppose: [/I\s+disagree/i, /won't\s+work/i, /לא מסכים/i, /בעיה עם/i],
  neutral: [/not\s+sure/i, /need\s+more\s+info/i, /לא בטוח/i],
};
```

Hebrew patterns coexist with English (primary user audience is Israeli).

## Summary Generation

Every 12 messages, ConversationMemory triggers `summarizeRecent()` which calls Claude Haiku to compress the last window. Summaries are stored in a rolling array capped at 20. When exceeded, oldest is pruned.

This summary is injected into agent prompts as `memoryContext`, preventing long-context drift.

## Virtual Scroll Offset

MessageBus tracks `prunedMessageCount` so the dashboard widget can display correct line numbers even after older messages are pruned from memory. This lets the CLI show "Message 347 of 412" correctly when only 50 messages are in RAM.
