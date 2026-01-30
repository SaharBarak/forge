# Conversation Memory

> Context persistence for long deliberation sessions

**Status**: Complete
**File**: `src/lib/eda/ConversationMemory.ts`

---

## Overview

Long deliberation sessions can exceed context windows, causing agents to "forget" earlier insights. ConversationMemory solves this by maintaining running summaries, tracking key decisions, and providing context to agents.

---

## Problem

Without memory:
- Agent A proposes idea X in message 5
- 50 messages later, Agent B proposes the same idea
- Agents can't reference earlier agreements
- Deliberation circles back instead of progressing

---

## Solution

```
┌─────────────────────────────────────────────────────────────┐
│                   ConversationMemory                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Summaries: Rolling summaries every ~12 messages       │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │ Decisions: Key agreements/conclusions                 │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │ Proposals: Active proposals under discussion          │  │
│  ├───────────────────────────────────────────────────────┤  │
│  │ AgentStates: Per-agent position tracking              │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Structures

```typescript
interface ConversationMemory {
  // Rolling summaries
  summaries: {
    timestamp: Date;
    messageRange: [number, number];  // [start, end] message indices
    content: string;                 // Summary text
  }[];

  // Key decisions
  decisions: {
    id: string;
    timestamp: Date;
    topic: string;
    outcome: string;
    supportingAgents: string[];
  }[];

  // Active proposals
  proposals: {
    id: string;
    timestamp: Date;
    proposer: string;
    content: string;
    status: 'active' | 'accepted' | 'rejected' | 'modified';
    reactions: { agentId: string; reaction: 'support' | 'oppose' | 'neutral' }[];
  }[];

  // Per-agent tracking
  agentStates: Record<string, {
    lastPosition: string;      // Their current stance
    keyContributions: string[];
    messageCount: number;
  }>;
}
```

---

## Summarization

Every ~12 messages, ConversationMemory generates a summary:

```typescript
async function summarizeChunk(
  messages: Message[],
  agentRunner: IAgentRunner
): Promise<string> {
  const prompt = `
    Summarize this discussion chunk concisely:

    ${messages.map(m => `[${m.agentId}]: ${m.content}`).join('\n\n')}

    Focus on:
    - Key points raised
    - Agreements reached
    - Disagreements noted
    - Decisions made
    - Open questions

    Keep it under 200 words.
  `;

  const result = await agentRunner.query({
    prompt,
    systemPrompt: 'You summarize discussions concisely.',
    model: 'haiku',  // Fast, cheap model
  });

  return result.response;
}
```

**Trigger**: Called when `messages.length % SUMMARY_INTERVAL === 0`

---

## Decision Extraction

Pattern matching detects decisions:

```typescript
const DECISION_PATTERNS = [
  /we('ve)?\s+(agreed|decided|concluded)/i,
  /consensus\s+(is|reached)/i,
  /let's\s+go\s+with/i,
  /final\s+(decision|answer)/i,
  /\[CONSENSUS\]/i,
  /\[DECISION\]/i,
];

function extractDecisions(message: Message): Decision | null {
  for (const pattern of DECISION_PATTERNS) {
    if (pattern.test(message.content)) {
      return {
        id: generateId(),
        timestamp: message.timestamp,
        topic: extractTopic(message.content),
        outcome: extractOutcome(message.content),
        supportingAgents: [message.agentId],
      };
    }
  }
  return null;
}
```

---

## Proposal Tracking

```typescript
const PROPOSAL_PATTERNS = [
  /I\s+propose/i,
  /what\s+if\s+we/i,
  /let's\s+consider/i,
  /my\s+suggestion/i,
  /\[PROPOSAL\]/i,
];

function extractProposal(message: Message): Proposal | null {
  for (const pattern of PROPOSAL_PATTERNS) {
    if (pattern.test(message.content)) {
      return {
        id: generateId(),
        timestamp: message.timestamp,
        proposer: message.agentId,
        content: extractProposalContent(message.content),
        status: 'active',
        reactions: [],
      };
    }
  }
  return null;
}

// Track reactions to proposals
function trackReaction(message: Message, proposals: Proposal[]): void {
  const reactionPatterns = {
    support: [/I\s+agree/i, /great\s+idea/i, /let's\s+do\s+it/i],
    oppose: [/I\s+disagree/i, /won't\s+work/i, /problem\s+with/i],
  };

  for (const proposal of proposals.filter(p => p.status === 'active')) {
    if (message.content.includes(proposal.content.slice(0, 50))) {
      const reaction = detectReaction(message.content, reactionPatterns);
      proposal.reactions.push({ agentId: message.agentId, reaction });
    }
  }
}
```

---

## Memory Context Generation

When agents need context, memory provides a summary:

```typescript
function getMemoryContext(forAgentId?: string): string {
  const sections: string[] = [];

  // Recent summaries (last 3)
  if (summaries.length > 0) {
    sections.push('## Earlier Discussion Summary');
    sections.push(summaries.slice(-3).map(s => s.content).join('\n\n'));
  }

  // Key decisions
  if (decisions.length > 0) {
    sections.push('## Key Decisions Made');
    sections.push(decisions.map(d =>
      `- **${d.topic}**: ${d.outcome}`
    ).join('\n'));
  }

  // Active proposals
  const activeProposals = proposals.filter(p => p.status === 'active');
  if (activeProposals.length > 0) {
    sections.push('## Active Proposals');
    sections.push(activeProposals.map(p =>
      `- ${p.proposer}: "${p.content}" (${p.reactions.length} reactions)`
    ).join('\n'));
  }

  // Agent-specific context
  if (forAgentId && agentStates[forAgentId]) {
    const state = agentStates[forAgentId];
    sections.push(`## Your Previous Position`);
    sections.push(state.lastPosition);
  }

  return sections.join('\n\n');
}
```

---

## Integration with MessageBus

```typescript
// In MessageBus
private memory: ConversationMemory = new ConversationMemory();

addMessage(message: Message): void {
  this.messages.push(message);

  // Update memory
  this.memory.processMessage(message);

  // Check if summary needed
  if (this.messages.length % SUMMARY_INTERVAL === 0) {
    this.triggerSummarization();
  }

  this.emit('message:new', { message, fromAgent: message.agentId });
}

getMemoryContext(agentId?: string): string {
  return this.memory.getMemoryContext(agentId);
}

// For faster evaluation (smaller context)
getEvalMemoryContext(): string {
  return this.memory.getBriefContext();  // Just decisions + current proposals
}
```

---

## Integration with AgentListener

```typescript
// When evaluating whether to speak
async evaluateReaction(message: Message): Promise<EvaluationResult> {
  const memoryContext = this.bus.getEvalMemoryContext();
  const recentMessages = this.bus.getRecentMessages(5);

  const prompt = `
    ${memoryContext}

    ---
    Recent messages:
    ${formatMessages(recentMessages)}

    ---
    Should ${this.persona.name} respond?
  `;

  return this.agentRunner.evaluate({ evalPrompt: prompt });
}

// When generating response
async generateResponse(): Promise<string> {
  const memoryContext = this.bus.getMemoryContext(this.persona.id);
  const recentMessages = this.bus.getRecentMessages(15);

  const systemPrompt = `
    ${this.persona.systemPrompt}

    ## Context from earlier discussion:
    ${memoryContext}
  `;

  return this.agentRunner.query({
    prompt: formatMessages(recentMessages),
    systemPrompt,
  });
}
```

---

## Persistence

Memory state can be saved/restored:

```typescript
// Save with session
const memoryState = messageBus.getMemoryState();
await fs.writeFile('memory.json', JSON.stringify(memoryState));

// Restore on load
const memoryState = JSON.parse(await fs.readFile('memory.json'));
messageBus.restoreMemory(memoryState);
```

---

## Statistics

```typescript
function getMemoryStats(): MemoryStats {
  return {
    summaryCount: this.summaries.length,
    decisionCount: this.decisions.length,
    proposalCount: this.proposals.filter(p => p.status === 'active').length,
    agentCount: Object.keys(this.agentStates).length,
    totalMessages: this.processedMessageCount,
  };
}
```

---

## Best Practices

### For Long Sessions
1. **Trust the summaries**: They capture key points
2. **Reference decisions**: "As we decided earlier..."
3. **Build on proposals**: Don't reinvent, iterate

### For Memory Tuning
1. **Adjust summary interval**: More frequent = more detail, higher cost
2. **Tune pattern matching**: Add domain-specific patterns
3. **Prune old summaries**: Keep last N to limit context size
