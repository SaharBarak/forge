# Mode System

> Goal anchoring and deliberation focus through session modes

**Status**: Complete
**Files**: `src/lib/modes/`

---

## Overview

The Mode System ensures agents stay focused on session objectives. Each mode defines goals, phases, research limits, and success criteria. The ModeController monitors progress and injects interventions when needed.

---

## Available Modes

| Mode | Icon | Purpose |
|------|------|---------|
| Copywriting | ✍️ | Create compelling website copy |
| Site Survey | 🔍 | Analyze existing site, recommend improvements |
| Idea Validation | ✓ | Validate ideas against market/audience |
| Ideation | 💡 | Generate creative approaches |
| Will-It-Work | ⚖️ | Stress-test ideas for feasibility |
| Business Plan | 📊 | Create business plan elements |
| GTM Strategy | 🚀 | Develop go-to-market strategy |
| Custom | ⚙️ | User-defined mode |

---

## Mode Definition

```typescript
interface SessionMode {
  id: string;
  name: string;
  icon: string;
  description: string;

  // Goal anchoring
  goalReminder: string;           // Injected periodically
  goalReminderFrequency: number;  // Every N messages

  // Phases
  phases: PhaseDefinition[];

  // Research limits
  maxResearchRequests: number;
  maxResearchPerTopic: number;

  // Loop detection
  loopDetection: {
    enabled: boolean;
    similarityThreshold: number;  // 0-1
    windowSize: number;           // Messages to check
    maxSimilarMessages: number;   // Before intervention
  };

  // Success criteria
  successCriteria: SuccessCriterion[];

  // Agent instructions
  agentInstructions: string;
}
```

---

## Copywriting Mode (Default)

```typescript
const COPYWRITE_MODE: SessionMode = {
  id: 'copywrite',
  name: 'Copywriting',
  icon: '✍️',
  description: 'Create compelling website copy through structured debate',

  goalReminder: `
    REMEMBER: Our goal is to create website copy that:
    - Resonates with the target audience
    - Differentiates from competitors
    - Drives action (signups, purchases, inquiries)

    Focus on WRITING, not endless research.
  `,
  goalReminderFrequency: 8,

  phases: [
    {
      id: 'discovery',
      name: 'Discovery',
      maxMessages: 15,
      focus: 'Understand audience, pain points, value proposition',
      exitCriteria: ['audience_defined', 'pain_points_identified'],
    },
    {
      id: 'research',
      name: 'Research',
      maxMessages: 20,
      focus: 'Gather competitive intelligence, market data',
      exitCriteria: ['competitor_analysis', 'market_context'],
    },
    {
      id: 'ideation',
      name: 'Ideation',
      maxMessages: 25,
      focus: 'Generate messaging angles, hooks, value props',
      exitCriteria: ['multiple_angles', 'consensus_direction'],
    },
    {
      id: 'synthesis',
      name: 'Synthesis',
      maxMessages: 15,
      focus: 'Combine best elements, resolve conflicts',
      exitCriteria: ['unified_direction', 'key_messages'],
    },
    {
      id: 'drafting',
      name: 'Drafting',
      maxMessages: 30,
      focus: 'Write actual copy sections',
      exitCriteria: ['hero_copy', 'value_props', 'cta'],
    },
  ],

  maxResearchRequests: 5,
  maxResearchPerTopic: 2,

  loopDetection: {
    enabled: true,
    similarityThreshold: 0.7,
    windowSize: 10,
    maxSimilarMessages: 3,
  },

  successCriteria: [
    { id: 'hero_copy', description: 'Hero section copy drafted' },
    { id: 'value_props', description: 'Value propositions defined' },
    { id: 'cta', description: 'Call-to-action crafted' },
    { id: 'consensus', description: 'Team consensus on messaging' },
  ],

  agentInstructions: `
    You are creating website copywriting. Focus on:
    - Clear, scannable headlines
    - Benefit-driven messaging
    - Emotional resonance with audience
    - Strong calls to action

    Avoid: jargon, generic claims, AI-sounding text
  `,
};
```

---

## ModeController

The controller monitors deliberation and injects interventions.

```typescript
class ModeController {
  constructor(mode: SessionMode);

  // Process each message
  processMessage(message: Message, allMessages: Message[]): Intervention[];

  // Check if mode objectives achieved
  checkSuccessCriteria(): { met: boolean; criteria: SuccessCriterion[] };

  // Get current phase info
  getCurrentPhase(): PhaseDefinition;

  // Check if should transition phase
  shouldTransitionPhase(): boolean;

  // Get mode-specific prompt additions
  getAgentInstructions(): string;

  // Get progress summary
  getProgress(): ModeProgress;
}
```

---

## Interventions

When the controller detects issues, it returns interventions:

```typescript
type InterventionType =
  | 'goal_reminder'      // Remind agents of objective
  | 'loop_detected'      // Agents repeating themselves
  | 'phase_transition'   // Time to move to next phase
  | 'research_limit'     // Too many research requests
  | 'force_synthesis'    // Force move to synthesis
  | 'success_check';     // Check if done

interface Intervention {
  type: InterventionType;
  priority: 'low' | 'medium' | 'high';
  message: string;
  action?: 'inject_message' | 'transition_phase' | 'pause';
}
```

**Example Interventions**:

```typescript
// Goal reminder (every 8 messages)
{
  type: 'goal_reminder',
  priority: 'medium',
  message: '🎯 REMINDER: Our goal is to create compelling copy...',
  action: 'inject_message'
}

// Loop detected
{
  type: 'loop_detected',
  priority: 'high',
  message: '🔄 We seem to be covering the same ground. Let\'s synthesize what we have and move forward.',
  action: 'inject_message'
}

// Research limit
{
  type: 'research_limit',
  priority: 'medium',
  message: '📚 Research limit reached for this topic. Let\'s work with what we have.',
  action: 'inject_message'
}

// Force synthesis
{
  type: 'force_synthesis',
  priority: 'high',
  message: '⏱️ We\'ve discussed enough. Moving to synthesis phase.',
  action: 'transition_phase'
}
```

---

## Loop Detection Algorithm

```typescript
function detectLoop(messages: Message[], config: LoopConfig): boolean {
  const window = messages.slice(-config.windowSize);

  // Hash message content for comparison
  const hashes = window.map(m => hashContent(m.content));

  // Count similar messages
  let similarCount = 0;
  for (let i = 0; i < hashes.length; i++) {
    for (let j = i + 1; j < hashes.length; j++) {
      const similarity = compareSimilarity(hashes[i], hashes[j]);
      if (similarity > config.similarityThreshold) {
        similarCount++;
      }
    }
  }

  return similarCount >= config.maxSimilarMessages;
}

function hashContent(content: string): string {
  // Normalize: lowercase, remove punctuation, extract key phrases
  const normalized = content
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3)
    .slice(0, 20)
    .join(' ');

  return normalized;
}
```

---

## Phase Transitions

Phases transition when:
1. **Exit criteria met**: Key deliverables produced
2. **Max messages reached**: Automatic progression
3. **Manual trigger**: User requests transition
4. **Forced by controller**: Loop detected, stuck

```typescript
function shouldTransition(phase: PhaseDefinition, messages: Message[]): boolean {
  // Check message count
  const phaseMessages = messages.filter(m => m.phase === phase.id);
  if (phaseMessages.length >= phase.maxMessages) {
    return true;
  }

  // Check exit criteria
  const criteriamet = phase.exitCriteria.every(c =>
    checkCriterion(c, messages)
  );
  if (criteriaMet) {
    return true;
  }

  return false;
}
```

---

## Usage with EDAOrchestrator

```typescript
// In EDAOrchestrator
private modeController: ModeController;

constructor(session: Session) {
  const mode = getModeById(session.config.mode) || getDefaultMode();
  this.modeController = new ModeController(mode);
}

private async handleMessage(message: Message) {
  // Process through mode controller
  const interventions = this.modeController.processMessage(
    message,
    this.session.messages
  );

  // Apply interventions
  for (const intervention of interventions) {
    await this.applyIntervention(intervention);
  }
}

private async applyIntervention(intervention: Intervention) {
  switch (intervention.action) {
    case 'inject_message':
      await this.injectSystemMessage(intervention.message);
      break;
    case 'transition_phase':
      await this.transitionToNextPhase();
      break;
    case 'pause':
      messageBus.pause(intervention.message);
      break;
  }
}
```

---

## Custom Modes

Users can define custom modes:

```typescript
const customMode: SessionMode = {
  id: 'my-custom-mode',
  name: 'Product Naming',
  icon: '🏷️',
  description: 'Brainstorm and validate product names',

  goalReminder: 'We are naming a product. Focus on memorability and meaning.',
  goalReminderFrequency: 6,

  phases: [
    { id: 'brainstorm', name: 'Brainstorm', maxMessages: 20 },
    { id: 'filter', name: 'Filter', maxMessages: 15 },
    { id: 'validate', name: 'Validate', maxMessages: 10 },
    { id: 'decide', name: 'Decide', maxMessages: 5 },
  ],

  maxResearchRequests: 3,
  maxResearchPerTopic: 1,

  loopDetection: { enabled: true, ... },

  successCriteria: [
    { id: 'candidates', description: '5+ name candidates' },
    { id: 'winner', description: 'Winning name selected' },
  ],

  agentInstructions: 'Focus on short, memorable names...',
};
```

---

## Best Practices

### For Mode Design
1. **Specific goals**: Vague goals lead to unfocused deliberation
2. **Reasonable limits**: Too restrictive kills creativity, too loose wastes time
3. **Clear phases**: Each phase should have distinct purpose
4. **Measurable criteria**: Success should be checkable

### For Intervention Tuning
1. **Start lenient**: Add restrictions based on observed behavior
2. **Log interventions**: Track what triggers them
3. **Test with real sessions**: Theory differs from practice
