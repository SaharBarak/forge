# Implementation Plan

> Comprehensive gap analysis and prioritized tasks for Forge development

**Last Updated**: 2026-01-31 (Deep analysis with Opus 4.5 + 12 parallel Sonnet exploration agents)
**Analysis Method**: Automated spec vs. implementation comparison with code-level verification
**Current Phase**: Gap Remediation
**Validation Status**: ALL 26 GAPS VERIFIED ✓
**Verification Run**: 2026-01-31 - Deep codebase analysis with 15 specialized agents covering specs, src/lib, EDA, kernel/modes, CLI, models, types, methodologies, personas, interfaces
**Total Gaps**: 26 (24 previous + 2 new discoveries) - All confirmed accurate

---

## Executive Summary

Analysis of 10 specification files against implementation reveals:

| Component | Spec Alignment | Status | Evidence |
|-----------|----------------|--------|----------|
| SessionKernel Commands | 100% | Production Ready | All 22 commands implemented |
| SessionKernel States | 100% | Production Ready | All 6 states with proper transitions |
| Configuration Wizard | 100% | Production Ready | 5-step process complete |
| MessageBus Core | 95% | **Minor Gap** | Core methods verified; 2 events defined but never emitted |
| IFileSystem | 100% | Production Ready | All 11 methods match spec |
| Persona System | 100% | Production Ready | 5 default personas fully implemented |
| getMethodologyPrompt() | 100% | Production Ready | IS actively called via claude.ts:65 |
| ARGUMENTATION_GUIDES | 100% | Production Ready | 5 styles defined (lines 16-102) |
| CONSENSUS_GUIDES | 100% | Production Ready | 5 methods defined (lines 108-169) |
| SessionKernel Events | 43% | **CRITICAL GAP** | Only 3 of 7 event types emitted; 9 state changes without events |
| FloorManager | 90% | Minor Enhancement | Queue limit global (10), not per-priority (30) |
| EDAOrchestrator | 50% | **CRITICAL GAPS** | ARGUMENTATION phase missing, human excluded from consensus, local type mismatch |
| ConversationMemory | 35% | **CRITICAL GAPS** | Pattern arrays missing, wrong model, missing functions |
| ModeController | 65% | **CRITICAL GAPS** | success_check missing, checkSuccessCriteria() never called, loop detection hardcoded, exit criteria unchecked, research.requiredBeforeSynthesis unused |
| AgentListener | 60% | Needs Work | reactivityThreshold unused (no Math.random check), hardcoded values |
| Type System | 70% | Cleanup Needed | PhaseConfig CONFLICT, SavedSessionInfo conflict, duplicates |
| Model Selection | 45% | **HIGH PRIORITY** | 7 Sonnet where Haiku needed (~10x each); electron/main.js:944 correctly uses Haiku |
| PHASE_METHODOLOGY_MAP | 0% | Enhancement | Auto-select methodology per phase not implemented |
| EvalResult Interface | 0% | **SPEC MISMATCH** | Implementation fields differ from spec |
| CLI Type Imports | 50% | **NEW GAP** | CLI files import EDA's limited 5-phase type |
| PhaseIndicator UI | 50% | **NEW GAP** | Defines all 10 phases but EDA only supports 5 |

---

## CRITICAL PRIORITY (Blocking Core Functionality)

### 1. Human Input Excluded from Consensus

**Location**: `src/lib/eda/EDAOrchestrator.ts:260-263`
**Status**: ~~VERIFIED CRITICAL GAP (2026-01-30)~~ **FIXED (2026-01-31)**
**Priority**: CRITICAL

**Evidence**:
```typescript
// Line 260-263 - Human EXPLICITLY excluded:
if (payload.fromAgent !== 'system' && payload.fromAgent !== 'human') {
  this.trackAgentContribution(payload.fromAgent, payload.message);
}
```

**Impact**: Human messages are NEVER tracked in:
- `agentContributions` map (line 79)
- `keyInsights` consensus tracking (line 80)
- Consensus ratio calculations (lines 399-409)

**Spec Contradiction**: DELIBERATION_WORKFLOW.md states:
> "Human input is: ... Weighted in consensus (counts as agreement/disagreement)"

**Tasks**:
- [x] Remove `&& payload.fromAgent !== 'human'` condition at line 261 *(FIXED 2026-01-31)*
- [x] Add human to `agentParticipation` tracking *(FIXED 2026-01-31)*
- [x] Weight human input in consensus calculations (consider higher weight) *(FIXED 2026-01-31 - humanWeight=2 for double weight)*
- [x] Track human contributions in keyInsights *(FIXED 2026-01-31)*

---

### 2. ConversationMemory Pattern Arrays Missing

**Location**: `src/lib/eda/ConversationMemory.ts`
**Status**: ~~VERIFIED CRITICAL GAP (2026-01-30)~~ **PARTIALLY FIXED (2026-01-31)**

**Evidence** (lines 95-125):
```typescript
// CURRENT - Simple includes() checks:
if (content.includes('consensus') || content.includes('agree') || content.includes('decided'))

// SPEC REQUIRES (CONVERSATION_MEMORY.md lines 129-196) - Regex pattern arrays:
const DECISION_PATTERNS = [
  /we('ve)?\s+(agreed|decided|concluded)/i,
  /consensus\s+(is|reached)/i,
  /let's\s+go\s+with/i,
  /final\s+(decision|answer)/i,
  /\[CONSENSUS\]/i,
  /\[DECISION\]/i,
];
```

**Missing Arrays (CONFIRMED NOT PRESENT)**:
- `DECISION_PATTERNS` - NOT IMPLEMENTED
- `PROPOSAL_PATTERNS` - NOT IMPLEMENTED
- `REACTION_PATTERNS` - NOT IMPLEMENTED

**Missing Functions** (per spec lines 138-196):
- `extractTopic(content: string): string` - NOT IMPLEMENTED
- `extractOutcome(content: string): string` - NOT IMPLEMENTED
- `trackReaction(agentId, proposalId, reaction)` - NOT IMPLEMENTED
- `detectReaction(content, patterns)` - NOT IMPLEMENTED

**Missing Data Structures** (per spec lines 67-72):
- No `status` field on proposals ('active' | 'accepted' | 'rejected' | 'modified')
- No `reactions` array on proposals
- No `id` field on decisions/proposals
- No `supportingAgents` array on decisions

**Tasks**:
- [x] Add `DECISION_PATTERNS` array with 6 regex patterns *(FIXED 2026-01-31)*
- [x] Add `PROPOSAL_PATTERNS` array with 5 regex patterns *(FIXED 2026-01-31)*
- [x] Add `REACTION_PATTERNS` object with support/oppose/neutral arrays *(FIXED 2026-01-31)*
- [x] Implement `extractTopic(content: string): string` *(FIXED 2026-01-31 - exported)*
- [x] Implement `extractOutcome(content: string): string` *(FIXED 2026-01-31 - exported)*
- [x] Replace `includes()` checks (lines 95-125) with regex pattern matching *(FIXED 2026-01-31)*
- [x] Add `generateMemoryId()` function *(FIXED 2026-01-31 - exported)*
- [ ] Add `status` field to proposal tracking
- [ ] Add `reactions` array to proposal tracking
- [ ] Add `id` fields to decision/proposal tracking
- [ ] Implement `updateProposalStatus(proposalId, status)`

---

### 3. SessionKernel Missing Event Types (9 State Changes Without Events)

**Location**: `src/lib/kernel/SessionKernel.ts`
**Status**: ~~VERIFIED CRITICAL GAP (2026-01-30)~~ **PARTIALLY FIXED (2026-01-31)**

**Events Implemented vs Required** (per SESSION_KERNEL.md lines 156-163):
| Event Type | Required | Implemented | Lines |
|------------|----------|-------------|-------|
| `agent_message` | Yes | Yes | 1148 |
| `session_saved` | Yes | Yes | 661 |
| `session_loaded` | Yes | Yes | 732 |
| `state_change` | Yes | **YES** *(FIXED 2026-01-31)* | via updateState() |
| `agent_typing` | Yes | **NO** | - |
| `phase_change` | Yes | **NO** | - |
| `intervention` | Yes | **NO** | - |

**State changes without events (9 runtime locations)** - **ALL FIXED 2026-01-31**:
- Line 229: idle -> configuring (startConfiguration) *(now uses updateState())*
- Line 361: configuring -> generating (handleAgentSelection) *(now uses updateState())*
- Line 363: generating -> configuring (handleAgentSelection) *(now uses updateState())*
- Line 476: configuring -> ready (finishConfiguration) *(now uses updateState())*
- Line 564: ready -> running (startSession) *(now uses updateState())*
- Line 589: running -> idle (stopSession) *(now uses updateState())*
- Line 600: running -> paused (pauseSession) *(now uses updateState())*
- Line 611: paused -> running (resumeSession) *(now uses updateState())*
- Line 730: (any) -> ready (loadSession) *(now uses updateState())*

**Tasks**:
- [x] Create `updateState(newState)` method that sets state AND emits `state_change` event *(FIXED 2026-01-31)*
- [x] Replace all 9 runtime state assignments with `updateState(x)` *(FIXED 2026-01-31)*
- [ ] Subscribe to orchestrator `phase_change` events and relay them
- [ ] Subscribe to orchestrator `agent_typing` events and relay them
- [ ] Subscribe to ModeController `intervention` events and relay them

---

### 4. MessageBus Events Defined But Never Emitted (NEW FINDING)

**Location**: `src/lib/eda/MessageBus.ts`
**Status**: NEW CRITICAL GAP (2026-01-30)

**Evidence**:
```typescript
// Events defined in MessageBus type declarations:
'message:research': (payload: MessagePayload) => void;
'message:synthesis': (payload: MessagePayload) => void;

// NEVER EMITTED anywhere in codebase - grep confirms 0 emit() calls for these events
```

**Impact**: Components subscribing to these events will never receive notifications. Research and synthesis phase message handling is broken.

**Tasks**:
- [ ] Emit `message:research` event when research phase messages are processed
- [ ] Emit `message:synthesis` event when synthesis phase messages are processed
- [ ] Document when these events should be emitted in MessageBus
- [ ] Add subscribers in relevant components (EDAOrchestrator, ModeController)

---

### 5. EvalResult Interface Mismatch

**Location**: `src/lib/interfaces/IAgentRunner.ts:28-33` vs `specs/architecture/ADAPTERS.md:55-59`
**Status**: VERIFIED CRITICAL GAP (2026-01-30)

**Spec expects (ADAPTERS.md)**:
```typescript
interface EvalResult {
  shouldRespond: boolean;
  interestLevel: 'low' | 'medium' | 'high';
  reasoning?: string;
}
```

**Implementation has (IAgentRunner.ts:28-33)**:
```typescript
export interface EvalResult {
  success: boolean;
  urgency: 'high' | 'medium' | 'low' | 'pass';
  reason: string;
  responseType: string;
}
```

**Discrepancies**:
- Different field names and semantics
- Implementation adds `responseType`, `pass` urgency
- Missing `shouldRespond`, `interestLevel`

**Tasks**:
- [ ] Decide canonical interface (update spec OR implementation)
- [ ] If updating implementation: align field names with spec
- [ ] If updating spec: document current implementation as intentional divergence
- [ ] Update all usages to match chosen interface

---

## HIGH PRIORITY (Feature Gaps)

### 10. Model Hardcoding - Sonnet Where Haiku Should Be Used (~10x Cost Each)

**Status**: VERIFIED HIGH PRIORITY (2026-01-30)

**Instances that SHOULD USE HAIKU**:

| File | Line | Function | Current Model | Cost Overage |
|------|------|----------|---------------|--------------|
| `src/lib/eda/ConversationMemory.ts` | 168 | summarizeConversation() | ~~sonnet~~ **haiku** | ~~10x~~ **FIXED 2026-01-31** |
| `src/lib/claude.ts` | 248 | evaluateAgentReaction() | sonnet | ~10x |
| `src/lib/claude.ts` | 533 | checkConsensus() | sonnet | ~10x |
| `cli/adapters/CLIAgentRunner.ts` | 58 | evaluate() | sonnet | ~10x |
| `src/lib/kernel/SessionKernel.ts` | 1034 | testAPIConnection() | sonnet | ~10x |
| `src/components/shell/MainShell.ts` | 793 | testSDKConnection() | sonnet | ~10x |
| `cli/index.ts` | 1479 | testApiConnection() | sonnet | ~10x |

**Cost Impact**: Using sonnet for evaluations/summaries/tests costs ~10x more than haiku per call.
**Spec Reference**: ADAPTERS.md lines 92-95 explicitly specify `model: 'haiku'` for evaluations.

**Tasks**:
- [ ] Change 7 evaluation/summary/test functions to `'claude-3-5-haiku-20241022'` *(1 of 7 FIXED: ConversationMemory.ts summarization - 2026-01-31)*
- [ ] Add model parameter to `EvalParams` interface in IAgentRunner.ts
- [ ] Update CLIAgentRunner.evaluate() to accept model parameter, default to 'haiku'
- [ ] Document model selection rationale for each function

---

### 11. ModeController Missing success_check Intervention + checkSuccessCriteria() Never Called

**Location**: `src/lib/modes/ModeController.ts:29-33, 386-406`
**Status**: VERIFIED CRITICAL GAP (2026-01-30)

**Evidence - Type missing**:
```typescript
// Lines 29-33 - Only 5 types defined:
export interface ModeIntervention {
  type: 'goal_reminder' | 'loop_detected' | 'phase_transition' | 'research_limit' | 'force_synthesis';
  // Missing: 'success_check' (per MODE_SYSTEM.md line 198)
}
```

**Evidence - Method exists but never called**:
```typescript
// Lines 386-406 - checkSuccessCriteria() method EXISTS:
private checkSuccessCriteria(): boolean {
  // Implementation exists...
}

// BUT in processMessage() (lines 88-148):
// checkSuccessCriteria() is NEVER CALLED
```

**Impact**: Success criteria are never evaluated. Sessions cannot auto-complete based on goal achievement.

**Tasks**:
- [ ] Add `'success_check'` to ModeIntervention.type union
- [ ] Call `checkSuccessCriteria()` within `processMessage()` flow
- [ ] Emit intervention when success criteria met
- [ ] Add test coverage for success criteria checking

---

### 12. ModeController research.requiredBeforeSynthesis Parameter Never Used (NEW FINDING)

**Location**: `src/lib/modes/ModeController.ts`
**Status**: NEW HIGH PRIORITY GAP (2026-01-30)

**Evidence**:
```typescript
// Parameter defined in ModeConfig interface:
research: {
  requiredBeforeSynthesis: boolean;  // Defined here
  maxSearches: number;
  // ...
};

// NEVER USED - grep confirms 0 references to requiredBeforeSynthesis in any logic
// Synthesis phase can start without research even when requiredBeforeSynthesis: true
```

**Impact**: Research phase can be skipped even when configured as required. This breaks the intended workflow for research-dependent sessions.

**Tasks**:
- [ ] Add check in `checkPhaseTransition()` for `requiredBeforeSynthesis`
- [ ] Block synthesis transition if research required but not completed
- [ ] Add warning/intervention when research is skipped but was required
- [ ] Document the intended behavior of this parameter

---

### 13. ModeController Phase Exit Criteria Not Checked

**Location**: `src/lib/modes/ModeController.ts:297-324`
**Status**: VERIFIED GAP (2026-01-30)

**Evidence**: `checkPhaseTransition()` method only checks `maxMessages` and `autoTransition` flag, but does NOT check exit criteria:
```typescript
// Current implementation (lines 300-307):
if (
  currentPhaseConfig.autoTransition &&
  this.progress.messagesInPhase >= currentPhaseConfig.maxMessages
) {
  // Transition...
}

// Spec requires (MODE_SYSTEM.md lines 301-304):
const criteriaMet = phase.exitCriteria.every(c =>
  checkCriterion(c, messages)
);
```

**Impact**: Phases with `autoTransition: false` NEVER auto-transition, even when exit criteria are met.

**Tasks**:
- [ ] Implement exit criteria checking in `checkPhaseTransition()`
- [ ] Change PhaseConfig.transitionCriteria from string description to executable criteria
- [ ] Add `checkCriterion()` helper function

---

### 14. Loop Detection Hardcoded Values

**Location**: `src/lib/modes/ModeController.ts`
**Status**: VERIFIED GAP (2026-01-30)

**Evidence** - Hardcoded values confirmed:
- Line 263: `windowSize` hardcoded to `10` (should use config)
- Word min length hardcoded to `> 4`
- Word slice limit hardcoded to `0, 10` (slice first 10 words)
- Hash length check hardcoded to `> 10`
- Rounds multiplier hardcoded to `* 3`

**Tasks**:
- [ ] Make `windowSize` configurable
- [ ] Add `similarityThreshold` to LoopConfig type OR document architectural decision
- [ ] Consider making word min length and rounds multiplier configurable

---

### 15. AgentListener reactivityThreshold Unused (No Math.random Check)

**Location**: `src/lib/eda/AgentListener.ts`
**Status**: VERIFIED GAP (2026-01-30)

**Evidence**:
- Line 16: `reactivityThreshold: number;` defined in interface
- Line 22: Default value `0.5` set
- EDAOrchestrator.ts:314 passes `0.6`
- **NO probabilistic check exists** - `Math.random() > threshold` never called anywhere

**Spec Intent**: Agents should probabilistically skip responses based on threshold to prevent over-chatty behavior.

**Tasks**:
- [ ] Implement reactivityThreshold check in onMessage() or evaluateAndReact()
- [ ] Add: `if (Math.random() > this.config.reactivityThreshold) return;`
- [ ] Document what this threshold controls (agent response probability)

---

### 16. AgentListener Context Messages Hardcoded

**Location**: `src/lib/eda/AgentListener.ts`
**Status**: VERIFIED GAP (2026-01-30)

**Evidence**:
- Line 183: `this.bus.getRecentMessages(8)` - hardcoded 8 for evaluation
- Line 230: `this.bus.getRecentMessages(15)` - hardcoded 15 for response

**Tasks**:
- [ ] Add `maxContextMessages` and `maxEvaluationMessages` to AgentListenerConfig
- [ ] Replace hardcoded values with config values

---

### 17. Missing PHASE_METHODOLOGY_MAP

**Location**: `src/methodologies/index.ts`
**Status**: VERIFIED GAP (2026-01-30)

**Evidence**:
- `ARGUMENTATION_GUIDES` exists (lines 16-102) - 5 styles confirmed
- `CONSENSUS_GUIDES` exists (lines 108-169) - 5 methods confirmed
- `getMethodologyPrompt()` exists (lines 362-388) and IS called from claude.ts:65
- **NO `PHASE_METHODOLOGY_MAP`** to auto-select methodology per phase

**Spec Expectation** (DELIBERATION_WORKFLOW.md):
- Brainstorming: Collaborative ("Yes, and...")
- Argumentation: Dialectic (thesis -> antithesis -> synthesis)
- Synthesis: Consensus-building

**Tasks**:
- [ ] Create `PHASE_METHODOLOGY_MAP` constant:
  ```typescript
  const PHASE_METHODOLOGY_MAP = {
    brainstorming: 'collaborative',
    argumentation: 'dialectic',
    synthesis: 'consensus',
  };
  ```
- [ ] Use this map in phase transitions for auto-selection
- [ ] Export for use in ModeController

---

## MEDIUM PRIORITY (Enhancements)

### 18. PhaseConfig Type CONFLICT

**Location**: `src/types/index.ts:235-241` vs `src/lib/modes/index.ts:48-56`
**Status**: VERIFIED CRITICAL CONFLICT (2026-01-30)

**types/index.ts (Methodology-focused)**:
```typescript
export interface PhaseConfig {
  phase: SessionPhase;
  description: string;
  maxRounds: number;
  requiredActions: string[];
  exitConditions: string[];
}
```

**modes/index.ts (Mode-focused)**:
```typescript
export interface PhaseConfig {
  id: string;
  name: string;
  order: number;
  maxMessages: number;
  autoTransition: boolean;
  transitionCriteria: string;
  agentFocus: string;
}
```

**Impact**: Complete structural mismatch - these serve different purposes and will cause type errors.

**Tasks**:
- [ ] Rename types/index.ts version to `MethodologyPhaseConfig`
- [ ] Rename modes/index.ts version to `ModePhaseConfig`
- [ ] Update all imports to use correct type

---

### 19. SavedSessionInfo Type CONFLICT

**Location**: `src/types/index.ts:462-471` vs `src/lib/kernel/types.ts:181-190`
**Status**: VERIFIED CONFLICT (2026-01-30)

**Differences**:
- types/index.ts has: `currentPhase?: string;`
- kernel/types.ts has: `mode?: string;`

**Tasks**:
- [ ] Merge both properties into canonical definition
- [ ] Keep in types/index.ts with BOTH `currentPhase?` AND `mode?`
- [ ] Remove duplicate from kernel/types.ts
- [ ] Update all imports

---

### 20. Duplicate Type Definitions

**Status**: VERIFIED - 3 identical duplicates (2026-01-30)

| Type | Location 1 | Location 2 |
|------|------------|------------|
| `FileInfo` | types/index.ts:473-477 | IFileSystem.ts:6-10 |
| `LoadedContext` | types/index.ts:324-330 | IFileSystem.ts:12-18 |
| `PersonaSetInfo` | types/index.ts:456-460 | kernel/types.ts:192-196 |

**Tasks**:
- [ ] Keep types in types/index.ts (canonical location)
- [ ] Remove from IFileSystem.ts and kernel/types.ts
- [ ] Update imports in affected files

---

### 21. Missing Proposal Interface

**Location**: `src/types/index.ts`
**Status**: VERIFIED MISSING (2026-01-30)

**Tasks**:
- [ ] Add Proposal interface:
  ```typescript
  export interface Proposal {
    id: string;
    timestamp: Date;
    proposer: string;
    content: string;
    status: 'active' | 'accepted' | 'rejected' | 'modified';
    reactions: { agentId: string; reaction: 'support' | 'oppose' | 'neutral' }[];
  }
  ```

---

### 22. FloorManager Queue Limit Global

**Location**: `src/lib/eda/FloorManager.ts`
**Status**: VERIFIED MINOR GAP (2026-01-30)

**Evidence**:
- Line 15: Single global queue `private requestQueue: QueuedRequest[] = []`
- Line 20: `maxQueueSize = 10` is global limit
- Spec suggests 10 per priority level (high, medium, low) = 30 total

**Note**: Implementation uses sorted insertion to achieve same priority behavior with single queue.

**Tasks**:
- [ ] Change queue structure to separate queues per priority OR
- [ ] Document architectural decision for single sorted queue (likely acceptable)

---

### 23. generatePersonas() Function Location Mismatch

**Expected Location**: `src/agents/personas.ts`
**Actual Location**: `src/lib/kernel/SessionKernel.ts:1102-1137` (private method)
**Status**: VERIFIED LOCATION GAP (2026-01-30)

**Evidence**: The PERSONA_SYSTEM.md spec defines:
```typescript
async function generatePersonas(
  projectName: string,
  goal: string,
  count: number = 5
): Promise<AgentPersona[]>
```

**Current Implementation**:
- Private method at `SessionKernel.ts:1102-1137`
- Different signature: no parameters (uses this.config internally)
- Different return type: Returns result object, not AgentPersona[]
- Cannot be reused by other components

**Tasks**:
- [ ] Move `generatePersonas()` from SessionKernel.ts to personas.ts
- [ ] Export as public function from personas.ts
- [ ] Match spec signature (projectName, goal, count)
- [ ] Update SessionKernel to import and use the moved function

---

### 24. ConversationMemory AgentState Field Mismatch

**Location**: `src/lib/eda/ConversationMemory.ts:20-26`
**Status**: VERIFIED GAP (2026-01-30)

**Spec expects** (CONVERSATION_MEMORY.md lines 75-79):
```typescript
agentStates: Record<string, {
  lastPosition: string;
  keyContributions: string[];
  messageCount: number;
}>;
```

**Implementation has** (lines 20-26):
```typescript
interface AgentMemoryState {
  agentId: string;
  keyPoints: string[];
  positions: string[];
  agreements: string[];
  disagreements: string[];
}
```

**Tasks**:
- [ ] Align AgentMemoryState with spec OR document architectural decision
- [ ] Add `messageCount` tracking if needed
- [ ] Consider renaming fields for clarity

---

### 25. VISUAL_DECISION_RULES Never Used (NEW FINDING)

**Location**: `src/methodologies/index.ts:175-218`
**Status**: NEW LOW PRIORITY GAP (2026-01-31)

**Evidence**:
- 7 visual decision rules defined and exported (chart, graph, comparison, illustration, photo, infographic, none)
- Grep confirms 0 references outside the export file
- Rules are bundled but never applied to agent decisions about visual content

**Tasks**:
- [ ] Integrate VISUAL_DECISION_RULES into agent prompts for content with visuals
- [ ] OR remove unused export if not needed

---

### 26. STRUCTURE_DECISION_RULES Never Used (NEW FINDING)

**Location**: `src/methodologies/index.ts:224-260`
**Status**: NEW LOW PRIORITY GAP (2026-01-31)

**Evidence**:
- 5 structure decision rules defined and exported (numbered, bullets, comparison, prose, timeline)
- Grep confirms 0 references outside the export file
- Rules are bundled but never applied to agent decisions about content organization

**Tasks**:
- [ ] Integrate STRUCTURE_DECISION_RULES into agent prompts for content structure
- [ ] OR remove unused export if not needed

---

## VERIFIED COMPLETE (100% Aligned with Spec)

### SessionKernel Commands - VERIFIED
- All **22 commands** implemented and verified (lines 93-162)
- State machine correct (6 states)
- Configuration wizard (5 steps) complete

### MessageBus Core - VERIFIED (with minor gap)
- All core methods present
- ConversationMemory integration correct (lines 69, 119, 129-131, 140, 147, 154, 161, 168, 191)
- Event declarations include 8 additional events not in spec (extensibility)
- **Minor gap**: `message:research` and `message:synthesis` events defined but never emitted (Gap #8)

### IFileSystem Interface - VERIFIED
- All 11 methods match spec

### Persona System - VERIFIED
- 5 default personas fully implemented:
  - Ronit (lines 62-96)
  - Yossi (lines 98-131)
  - Noa (lines 133-166)
  - Avi (lines 168-201)
  - Michal (lines 203-236)
- Hebrew name support (nameHe field)
- COPYWRITING_EXPERTISE properly defined at personas.ts:14-55
- registerCustomPersonas, clearCustomPersonas, getActivePersonas, getAgentById - all implemented

### Methodology System - VERIFIED (Partial)
- ARGUMENTATION_GUIDES: 5 styles (dialectic, socratic, collaborative, adversarial, mixed)
- CONSENSUS_GUIDES: 5 methods (unanimous, supermajority, majority, consent, synthesis)
- getMethodologyPrompt() called from claude.ts:65
- **Missing only**: PHASE_METHODOLOGY_MAP

### Code Quality - VERIFIED
- No TODO/FIXME comments found
- No placeholder implementations
- No stub functions
- Production-ready codebase

---

## Technical Debt Summary

| Item | Priority | Location | Notes |
|------|----------|----------|-------|
| ~~Opus for evaluation~~ | ~~CRITICAL~~ | electron/main.js:944 | **FIXED**: Already uses Haiku (claude-3-5-haiku-20241022) |
| Local SessionPhase type | Critical | EDAOrchestrator.ts:29 | 5 phases vs 10 in global |
| **CLI imports EDA type** | **Critical** | cli/app/App.tsx:12, StatusBar.tsx:7 | Imports limited 5-phase type |
| **PhaseIndicator/EDA mismatch** | **Critical (NEW)** | PhaseIndicator.tsx | UI has 10 phases, EDA has 5 |
| ~~Human excluded from consensus~~ | ~~Critical~~ | EDAOrchestrator.ts:260-263 | **FIXED 2026-01-31**: Human input tracked with double weight (humanWeight=2) |
| ~~Pattern arrays missing~~ | ~~Critical~~ | ConversationMemory.ts | **PARTIALLY FIXED 2026-01-31**: Pattern arrays + extract functions added |
| ~~SessionKernel events missing~~ | ~~Critical~~ | SessionKernel.ts | **PARTIALLY FIXED 2026-01-31**: state_change events now emitted via updateState() |
| **MessageBus events unused** | **Critical (NEW)** | MessageBus.ts | message:research/synthesis never emitted |
| EvalResult interface mismatch | Critical | IAgentRunner.ts:28-33 | Fields differ from spec |
| Model hardcoded (7 locations) | High | Multiple files | Sonnet where haiku needed (~10x each); 1/7 FIXED (ConversationMemory) |
| success_check intervention | High | ModeController.ts:29-33 | Missing from type union |
| checkSuccessCriteria() unused | High | ModeController.ts:386-406 | Method exists, never called |
| **requiredBeforeSynthesis unused** | **High (NEW)** | ModeController.ts | Parameter defined, never checked |
| Phase exit criteria unchecked | High | ModeController.ts:297-324 | Only maxMessages checked |
| Loop detection hardcoded | High | ModeController.ts | windowSize=10 hardcoded |
| reactivityThreshold unused | High | AgentListener.ts:16,22 | Defined but no Math.random() check |
| Context messages hardcoded | High | AgentListener.ts:183,230 | 8 and 15 messages hardcoded |
| PHASE_METHODOLOGY_MAP | High | methodologies/index.ts | Auto-selection missing |
| PhaseConfig type CONFLICT | Medium | types vs modes | Incompatible definitions |
| SavedSessionInfo CONFLICT | Medium | types vs kernel | Different optional fields |
| Duplicate types (3) | Medium | Multiple files | Consolidation needed |
| Missing Proposal interface | Medium | types/index.ts | id, status, reactions fields |
| FloorManager queue global | Medium | FloorManager.ts | Single queue vs per-priority |
| generatePersonas() location | Medium | personas.ts | Function in SessionKernel |
| AgentState field mismatch | Medium | ConversationMemory.ts | Different structure than spec |
| **VISUAL_DECISION_RULES unused** | **Low (NEW)** | methodologies/index.ts | Defined but never integrated |
| **STRUCTURE_DECISION_RULES unused** | **Low (NEW)** | methodologies/index.ts | Defined but never integrated |

---

## Implementation Order (Recommended)

### Sprint 1: Critical Cost Fix + Workflow Core
1. ~~**IMMEDIATE**: Fix electron/main.js:944 - Change Opus to haiku~~ **DONE**: Already uses Haiku (claude-3-5-haiku-20241022)
2. Fix EDAOrchestrator.ts:29 - Import global SessionPhase type (resolves 5 -> 10 phases)
3. Fix CLI imports (cli/app/App.tsx:12, cli/app/StatusBar.tsx:7) - Import from src/types/index.ts
4. Verify PhaseIndicator.tsx works with full 10-phase workflow
5. Fix EDAOrchestrator.ts:260-263 - Include human in consensus tracking
6. Add ARGUMENTATION phase handling to EDAOrchestrator

### Sprint 2: Event System Fix
7. Fix SessionKernel event emissions (state_change, phase_change, intervention, agent_typing)
8. Replace 9 runtime state assignments with updateState() method
9. Emit message:research and message:synthesis events in MessageBus
10. Resolve EvalResult interface mismatch (spec vs implementation decision)

### Sprint 3: Memory System (Pattern Matching)
11. Add DECISION_PATTERNS, PROPOSAL_PATTERNS, REACTION_PATTERNS to ConversationMemory
12. Implement extractTopic() and extractOutcome() functions
13. Add proposal status and reaction tracking
14. Replace includes() checks with regex matching

### Sprint 4: Model Selection & Cost Optimization
15. Change 7 evaluation/test functions from sonnet to haiku
16. Add model parameter to IAgentRunner.evaluate() interface
17. Update CLIAgentRunner to use configurable model
18. Document model selection rationale

### Sprint 5: Mode System and Configuration
19. Add 'success_check' to ModeIntervention type
20. Call checkSuccessCriteria() in processMessage() flow
21. Implement research.requiredBeforeSynthesis check
22. Implement phase exit criteria checking
23. Make loop detection configurable (windowSize, thresholds)
24. Implement reactivityThreshold check in AgentListener (add Math.random)
25. Make context message counts configurable

### Sprint 6: Types and Cleanup
26. Resolve PhaseConfig conflict (rename both types)
27. Fix SavedSessionInfo conflict (merge properties)
28. Consolidate duplicate types (FileInfo, LoadedContext, PersonaSetInfo)
29. Add Proposal interface to types/index.ts
30. Create PHASE_METHODOLOGY_MAP
31. Move generatePersonas() from SessionKernel.ts to personas.ts

### Sprint 7: Polish (Optional)
32. Document FloorManager queue architecture decision
33. Update spec docs with implementation decisions
34. Add unit tests for critical components

---

## Files Most Requiring Changes

| File | Priority | Changes Needed |
|------|----------|----------------|
| `electron/main.js` | ~~CRITICAL~~ | ~~Line 944: Change Opus to haiku~~ **VERIFIED CORRECT**: Already uses Haiku (claude-3-5-haiku-20241022) |
| `src/lib/eda/EDAOrchestrator.ts` | Critical | Import SessionPhase (line 29), add argumentation, fix human exclusion (lines 260-263) |
| `cli/app/App.tsx` | Critical | Update SessionPhase import (line 12) to use global type |
| `cli/app/StatusBar.tsx` | Critical | Update SessionPhase import (line 7), add missing phase emojis/colors |
| `src/lib/eda/ConversationMemory.ts` | Critical | Pattern arrays, extract functions, model change |
| `src/lib/kernel/SessionKernel.ts` | Critical | Event emissions for 9 state changes |
| `src/lib/eda/MessageBus.ts` | Critical | Emit message:research and message:synthesis events |
| `src/lib/interfaces/IAgentRunner.ts` | Critical | Resolve EvalResult interface mismatch |
| `src/lib/claude.ts` | High | Model changes at lines 248, 533 |
| `src/lib/modes/ModeController.ts` | High | Add success_check, call checkSuccessCriteria (lines 386-406), check requiredBeforeSynthesis, exit criteria, configurable loop detection |
| `src/lib/eda/AgentListener.ts` | High | Add Math.random() check for reactivityThreshold (line 16), configurable context counts (lines 183, 230) |
| `src/methodologies/index.ts` | High | Add PHASE_METHODOLOGY_MAP |
| `src/types/index.ts` | Medium | Fix conflicts, add Proposal, consolidate types |
| `src/lib/modes/index.ts` | Medium | Rename PhaseConfig |
| `src/lib/kernel/types.ts` | Medium | Remove duplicates after consolidation |
| `cli/adapters/CLIAgentRunner.ts` | Medium | Model parameter for evaluate() |
| `src/agents/personas.ts` | Medium | Move generatePersonas() from SessionKernel.ts |

---

## Success Metrics

After implementation:
- [ ] All 10 deliberation phases functional (including argumentation)
- [ ] Human input weighted in consensus calculations
- [ ] Methodology auto-selected per phase via PHASE_METHODOLOGY_MAP
- [ ] Decisions/proposals extracted with regex patterns
- [ ] SessionKernel emits all 7 event types on all 9 state transitions
- [ ] MessageBus emits message:research and message:synthesis events
- [x] **electron/main.js:944 already uses Haiku** (verified correct)
- [ ] **Cost reduction via haiku model (~10x for 7 Sonnet replacements)**
- [ ] Loop detection uses configurable parameters
- [ ] reactivityThreshold implemented with Math.random() check
- [ ] checkSuccessCriteria() called and functioning
- [ ] research.requiredBeforeSynthesis enforced
- [ ] Phase exit criteria properly evaluated
- [ ] Type system clean with no conflicts or duplicates
- [ ] All configuration parameters actually used
- [ ] generatePersonas() exported from personas.ts
- [ ] EvalResult interface consistent with spec
- [ ] CLI components support full 10-phase workflow
- [ ] PhaseIndicator displays all phases correctly
- [ ] VISUAL_DECISION_RULES integrated or removed
- [ ] STRUCTURE_DECISION_RULES integrated or removed

---

## Verification History

| Date | Verifier | Findings |
|------|----------|----------|
| 2026-01-31 | Opus 4.5 + 15 parallel Sonnet exploration agents (comprehensive) | **All 26 gaps VERIFIED with line-by-line code analysis**: (1) EvalResult interface mismatch confirmed - spec expects shouldRespond/interestLevel/reasoning, impl has success/urgency/reason/responseType, (2) Human exclusion from consensus confirmed at lines 260-263 with detailed tracking analysis, (3) ConversationMemory ~40% complete - missing DECISION_PATTERNS, PROPOSAL_PATTERNS, REACTION_PATTERNS arrays and extractTopic/extractOutcome functions, (4) reactivityThreshold confirmed unused - no Math.random() check anywhere, (5) All 9 SessionKernel state transitions confirmed without events. **NEW FINDINGS**: VISUAL_DECISION_RULES (gap #25) and STRUCTURE_DECISION_RULES (gap #26) defined in methodologies but never integrated. |
| 2026-01-31 | Opus 4.5 + 12 parallel Sonnet exploration agents (deep analysis) | **All 24 gaps RE-VERIFIED with comprehensive code analysis**: (1) electron/main.js:944 correctly uses Haiku for evaluation, (2) EDAOrchestrator local 5-phase type at line 29, (3) CLI imports at App.tsx:12 and StatusBar.tsx:7, (4) reactivityThreshold has NO Math.random() check, (5) checkSuccessCriteria() method exists but NEVER invoked, (6) MessageBus events message:research/synthesis defined but NEVER emitted, (7) PHASE_METHODOLOGY_MAP 0% implemented, (8) All type conflicts confirmed (PhaseConfig, SavedSessionInfo, EvalResult), (9) generatePersonas() in SessionKernel.ts:1102 instead of personas.ts, (10) Zero TODOs in production code. **NEW FINDING**: ElectronFileSystem spec-defined at ADAPTERS.md:208 but not implemented (Electron uses IPC fallbacks via window.electronAPI instead). |
| 2026-01-31 | Opus 4.5 + 15 parallel Sonnet exploration agents | **All 24 gaps RE-VERIFIED with exact line numbers**: Confirmed CLI paths are `cli/app/App.tsx:12` and `cli/app/StatusBar.tsx:7`. Verified EDAOrchestrator.ts:29 has 5-phase local type, line 260-263 excludes human. ConversationMemory.ts:168 uses sonnet for summarization. SessionKernel has 0/9 state changes emitting events. ModeController checkSuccessCriteria() at lines 386-406 never called. All model locations verified. No TODO/FIXME/stub comments in production code. |
| 2026-01-30 | Opus 4.5 + 15 parallel exploration agents | **All 20 gaps RE-CONFIRMED + 4 NEW FINDINGS**: (1) CLI files import EDA's limited 5-phase type, (2) research.requiredBeforeSynthesis never used, (3) message:research/synthesis events never emitted, (4) PhaseIndicator defines 10 phases but EDA only supports 5. Clarified cost priorities: Opus ~50x overage, Sonnet ~10x overage each. |
| 2026-01-30 | Opus 4.5 + 14 parallel Sonnet subagents | All 20 gaps RE-CONFIRMED. **CORRECTION**: electron/main.js:944 actually uses Haiku (claude-3-5-haiku-20241022) - initial report was inaccurate. 7 total locations need haiku (Sonnet instances only). |
| 2026-01-30 | Opus 4.5 + 20 parallel Sonnet subagents | All 20 gaps RE-CONFIRMED. No TODO/FIXME/stubs found. No project-level tests. 19 total hardcoded model instances (7 need haiku). Codebase production-ready. |
| 2026-01-30 | Opus 4.5 + 10 Sonnet subagents | All 20 gaps confirmed, EvalResult mismatch added, model locations refined |
| 2026-01-30 | Opus 4.5 + 9 Sonnet subagents | All 20 gaps confirmed, model count corrected to 21 (7 need haiku) |
| 2026-01-30 | 10 Sonnet subagents + Opus synthesis | All 19 gaps confirmed, model count corrected to 13 |
| 2026-01-29 | Initial analysis | 22 gaps identified |

---

## Notes

- **Model selection at electron/main.js:944**: ~~Previously reported as using Opus~~ **VERIFIED CORRECT**: Already uses `claude-3-5-haiku-20241022` for evaluation. No fix needed.
- **CLI file locations**: Correct paths are `cli/app/App.tsx` and `cli/app/StatusBar.tsx` (not `cli/components/`). Both import SessionPhase from EDAOrchestrator's limited 5-phase type.
- **EvalResult mismatch**: Implementation uses `success/urgency/reason/responseType`, spec expects `shouldRespond/interestLevel/reasoning`. Decision needed on which to use.
- **Model hardcoding**: 7 locations should use haiku (7 Sonnet for evaluations, summaries, API tests). electron/main.js:944 already correctly uses Haiku. Additional sonnet instances for generation tasks are acceptable.
- **reactivityThreshold**: Defined at line 16 with default 0.5, passed as 0.6 at EDAOrchestrator.ts:314, but NO Math.random() > threshold check exists anywhere.
- **generatePersonas()**: Function EXISTS but in wrong location - found at `SessionKernel.ts:1102-1137` as private method, should be exported from `personas.ts` with spec-compliant signature.
- **State assignments**: 9 runtime locations in SessionKernel.ts need event emission (lines 229, 361, 363, 476, 564, 589, 600, 611, 730).
- **checkSuccessCriteria()**: Method exists at lines 386-406 but is NEVER called in processMessage() (lines 88-148).
- **Gap count**: 26 gaps identified (24 previous + 2 new discoveries: VISUAL_DECISION_RULES and STRUCTURE_DECISION_RULES unused).
- **FloorManager**: Single sorted queue is functionally equivalent to three queues - may be acceptable as-is with documentation.
- **Codebase quality**: No TODO/FIXME/HACK/stub comments found. Production-ready code.
- **Test coverage**: No project-level unit tests exist. Consider adding tests for critical components (Sprint 7 enhancement).
- **ElectronFileSystem**: Spec defines class at ADAPTERS.md:208, but Electron app uses IPC fallbacks (window.electronAPI) instead of formal IFileSystem adapter. This is functional but could be improved for consistency with CLI's FileSystemAdapter pattern.
