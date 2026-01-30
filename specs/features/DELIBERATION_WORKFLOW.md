# Deliberation Workflow

> Structured phases for reaching consensus

**Status**: Complete
**Files**: `src/lib/eda/EDAOrchestrator.ts`, `src/methodologies/`

---

## Overview

Forge guides agents through structured deliberation phases, from initial brainstorming to final drafting. Each phase has specific objectives, constraints, and exit criteria.

---

## Phases

```
┌─────────────────────────────────────────────────────────────┐
│  INITIALIZATION  →  BRAINSTORMING  →  ARGUMENTATION        │
│         ↓                                    ↓              │
│                    SYNTHESIS  ←──────────────┘              │
│                        ↓                                    │
│                    DRAFTING  →  FINALIZATION               │
└─────────────────────────────────────────────────────────────┘
```

### 1. Initialization
**Purpose**: Set context and introduce goal
**Duration**: 1-3 messages
**Activities**:
- System announces project and goal
- Agents acknowledge and orient

```typescript
// System message example
"Welcome to the deliberation for [Project Name].
Our goal: [Goal]
Participants: Ronit, Yossi, Noa, Avi, Michal

Let's begin with initial thoughts."
```

### 2. Brainstorming
**Purpose**: Generate diverse ideas without judgment
**Duration**: 10-20 messages
**Activities**:
- Agents propose initial angles
- Build on each other's ideas
- No criticism yet

**Methodology**: Collaborative ("Yes, and...")

```typescript
// Agent behavior
- Share first impressions
- Ask clarifying questions
- Propose angles to explore
- Avoid: criticism, deep analysis
```

### 3. Argumentation
**Purpose**: Debate merits of proposals
**Duration**: 15-30 messages
**Activities**:
- Support or challenge ideas
- Provide evidence and reasoning
- Surface trade-offs

**Methodology**: Dialectic (thesis → antithesis → synthesis)

```typescript
// Agent behavior
- Stake positions
- Challenge weak arguments
- Provide counter-examples
- Build coalitions
```

### 4. Synthesis
**Purpose**: Combine best elements
**Duration**: 10-15 messages
**Activities**:
- Identify consensus points
- Resolve remaining conflicts
- Formulate unified direction

**Trigger**: Manual, or auto when consensus detected

```typescript
// System injection
"Moving to synthesis phase.
Please identify areas of agreement and propose unified approaches."
```

### 5. Drafting
**Purpose**: Create actual content
**Duration**: 20-40 messages
**Activities**:
- Assign sections to agents
- Draft copy collaboratively
- Provide feedback on drafts

```typescript
// Draft structure
{
  section: 'hero',
  content: '...',
  author: 'noa',
  feedback: [
    { from: 'ronit', comment: 'Too vague' },
    { from: 'yossi', comment: 'Add credibility element' },
  ],
  version: 2,
}
```

### 6. Finalization
**Purpose**: Polish and approve
**Duration**: 5-10 messages
**Activities**:
- Final review
- Minor edits
- Formal approval

---

## Phase Transitions

### Automatic Transition
Triggered when:
1. Exit criteria met (consensus, deliverables)
2. Max messages reached
3. ModeController forces transition

### Manual Transition
User commands:
- `synthesize` - Move to synthesis
- `synthesize force` - Force even without consensus
- `draft` - Move to drafting

### Transition Flow
```typescript
async transitionToSynthesis(force: boolean): Promise<Result> {
  // Check readiness
  const status = this.getConsensusStatus();

  if (!force && !status.ready) {
    return {
      success: false,
      message: `Not ready: ${status.recommendation}`,
    };
  }

  // Update phase
  this.session.currentPhase = 'synthesis';

  // Inject transition message
  await this.injectSystemMessage(
    "📝 Moving to SYNTHESIS phase.\n" +
    "Let's consolidate our insights into unified messaging."
  );

  // Force first agent to speak in new context
  await this.forceNextAgent();

  return { success: true, message: 'Transitioned to synthesis' };
}
```

---

## Consensus Tracking

### Metrics
```typescript
interface ConsensusStatus {
  ready: boolean;           // Can transition?
  allAgentsSpoke: boolean;  // Everyone participated?
  agentParticipation: Map<string, number>;  // Message counts
  consensusPoints: number;  // Agreements found
  conflictPoints: number;   // Disagreements found
  recommendation: string;   // Human-readable status
}
```

### Detection
Agreement detected by message type tags:
```
[AGREEMENT] I support Noa's suggestion...
[CONSENSUS] We've agreed that...
[PROPOSAL] What if we combine...
[SYNTHESIS] Building on everyone's input...
```

Disagreement detected by:
```
[DISAGREEMENT] I can't support that...
However, I think...
The problem with that approach...
```

### Ready Criteria
```typescript
function isConsensusReady(): boolean {
  return (
    this.allAgentsSpoke &&
    this.consensusPoints >= 3 &&
    this.conflictPoints < this.consensusPoints
  );
}
```

---

## Methodology Integration

### Argumentation Styles

**Dialectic** (default for argumentation):
```typescript
{
  name: 'Dialectic',
  description: 'Thesis → Antithesis → Synthesis',
  promptAddition: `
    Present clear positions.
    Challenge opposing views constructively.
    Work toward synthesis that incorporates valid points from all sides.
  `,
}
```

**Socratic** (good for discovery):
```typescript
{
  name: 'Socratic',
  description: 'Question-driven exploration',
  promptAddition: `
    Ask probing questions.
    Help others examine their assumptions.
    Guide toward insights through inquiry.
  `,
}
```

**Collaborative** (good for brainstorming):
```typescript
{
  name: 'Collaborative',
  description: '"Yes, and..." building',
  promptAddition: `
    Build on others' ideas.
    Add to proposals rather than criticizing.
    Look for what works, not what's wrong.
  `,
}
```

### Consensus Methods

| Method | Threshold | Use When |
|--------|-----------|----------|
| Unanimous | 100% | Critical decisions |
| Supermajority | 67% | Important decisions |
| Majority | 50%+ | Normal decisions |
| Consent-based | No strong objections | Experimental |
| Synthesis | Combine elements | Creative work |

---

## Human Participation

Humans can participate at any phase:

```typescript
// Add human message
async addHumanMessage(content: string): Promise<void> {
  const message: Message = {
    id: generateId(),
    timestamp: new Date(),
    agentId: 'human',
    type: 'human_input',
    content,
  };

  this.bus.addMessage(message);

  // Agents will react naturally via event-driven flow
}
```

Human input is:
- Displayed prominently in chat
- Weighted in consensus (counts as agreement/disagreement)
- Can steer discussion direction
- Can request phase transitions

---

## Research Integration

During brainstorming/argumentation, agents can request research:

```typescript
// Pattern in message
"@stats-finder: What are the latest statistics on civic tech adoption?"

// Detected by orchestrator
if (RESEARCH_PATTERN.test(message.content)) {
  await this.handleResearchRequest(message);
}

// Flow
1. Pause discussion
2. Execute research query
3. Post results
4. Resume discussion
```

---

## Best Practices

### For Productive Deliberation
1. **Let agents disagree** - Tension produces better outcomes
2. **Don't rush synthesis** - Premature consensus is shallow
3. **Use research sparingly** - Analysis paralysis is real
4. **Trust the phases** - They guide natural progression

### For Intervention
1. **Goal reminders** - Keep agents focused
2. **Loop detection** - Break circular arguments
3. **Phase forcing** - Move forward when stuck
4. **Human steering** - Redirect when off-track
