/**
 * ModeController - Enforces mode rules, detects loops, and keeps agents on track
 *
 * This is the "referee" that:
 * 1. Injects goal reminders periodically
 * 2. Detects when agents are going in circles
 * 3. Enforces phase transitions
 * 4. Limits research requests
 * 5. Tracks progress toward success criteria
 */

import type { Message } from '../../types';
import type { SessionMode, ModePhaseConfig, ExitCriteria } from './index';
import { getDefaultMode } from './index';

export interface ModeProgress {
  currentPhase: string;
  messagesInPhase: number;
  totalMessages: number;
  researchRequests: number;
  researchByTopic: Map<string, number>;
  consensusPoints: number;
  proposalsCount: number;
  lastProgressAt: number; // Message index of last "progress" (new proposal, decision, etc.)
  loopDetected: boolean;
  outputsProduced: Set<string>;
}

export interface ModeIntervention {
  type: 'goal_reminder' | 'loop_detected' | 'phase_transition' | 'research_limit' | 'force_synthesis' | 'success_check';
  message: string;
  priority: 'low' | 'medium' | 'high';
  action?: 'inject_message' | 'transition_phase' | 'pause';
}

export class ModeController {
  private mode: SessionMode;
  private progress: ModeProgress;
  private messageHashes: string[] = []; // For similarity detection
  private interventionHistory: ModeIntervention[] = [];

  constructor(mode?: SessionMode) {
    this.mode = mode || getDefaultMode();
    this.progress = this.createInitialProgress();
  }

  private createInitialProgress(): ModeProgress {
    return {
      currentPhase: this.mode.phases[0]?.id || 'discuss',
      messagesInPhase: 0,
      totalMessages: 0,
      researchRequests: 0,
      researchByTopic: new Map(),
      consensusPoints: 0,
      proposalsCount: 0,
      lastProgressAt: 0,
      loopDetected: false,
      outputsProduced: new Set(),
    };
  }

  /**
   * Set a new mode
   */
  setMode(mode: SessionMode): void {
    this.mode = mode;
    this.progress = this.createInitialProgress();
    this.messageHashes = [];
    this.interventionHistory = [];
  }

  /**
   * Get current mode
   */
  getMode(): SessionMode {
    return this.mode;
  }

  /**
   * Get current progress
   */
  getProgress(): ModeProgress {
    return { ...this.progress };
  }

  /**
   * Process a new message and return any interventions needed
   */
  processMessage(message: Message, _allMessages: Message[]): ModeIntervention[] {
    const interventions: ModeIntervention[] = [];

    this.progress.totalMessages++;
    this.progress.messagesInPhase++;

    // Track message for loop detection
    this.trackMessageSimilarity(message);

    // Check for research requests
    if (this.isResearchRequest(message)) {
      this.trackResearchRequest(message);
      const researchIntervention = this.checkResearchLimits();
      if (researchIntervention) {
        interventions.push(researchIntervention);
      }
    }

    // Check for proposals (progress)
    if (message.type === 'proposal') {
      this.progress.proposalsCount++;
      this.progress.lastProgressAt = this.progress.totalMessages;
    }

    // Check for consensus/agreement
    if (message.type === 'agreement' || message.type === 'consensus') {
      this.progress.consensusPoints++;
      this.progress.lastProgressAt = this.progress.totalMessages;
    }

    // Check for outputs (copy sections, verdicts, etc.)
    this.detectOutputs(message);

    // Check for goal reminder
    if (this.shouldRemindGoal()) {
      interventions.push(this.createGoalReminder());
    }

    // Check for loops
    const loopIntervention = this.detectLoop();
    if (loopIntervention) {
      this.progress.loopDetected = true;
      interventions.push(loopIntervention);
    }

    // Check for phase transition
    const phaseIntervention = this.checkPhaseTransition();
    if (phaseIntervention) {
      interventions.push(phaseIntervention);
    }

    // Check for forced synthesis
    if (this.shouldForceSynthesis()) {
      interventions.push(this.createForcedSynthesisIntervention());
    }

    // Check success criteria (per MODE_SYSTEM.md spec)
    const successCheck = this.checkSuccessCriteria();
    if (successCheck.met) {
      interventions.push(this.createSuccessCheckIntervention());
    }

    // Store intervention history
    this.interventionHistory.push(...interventions);

    return interventions;
  }

  /**
   * Check if message is a research request
   */
  private isResearchRequest(message: Message): boolean {
    const content = message.content.toLowerCase();
    return (
      message.type === 'research_request' ||
      content.includes('@stats-finder') ||
      content.includes('@competitor-analyst') ||
      content.includes('@audience-insight') ||
      content.includes('@copy-explorer') ||
      content.includes('@local-context') ||
      content.includes('[research:')
    );
  }

  /**
   * Track research request and topic
   */
  private trackResearchRequest(message: Message): void {
    this.progress.researchRequests++;

    // Extract topic (simple heuristic)
    const content = message.content.toLowerCase();
    const topicMatch = content.match(/@(\w+-\w+)|(\[research:\s*(\w+)\])/);
    if (topicMatch) {
      const topic = topicMatch[1] || topicMatch[3] || 'general';
      const count = this.progress.researchByTopic.get(topic) || 0;
      this.progress.researchByTopic.set(topic, count + 1);
    }
  }

  /**
   * Check research limits
   */
  private checkResearchLimits(): ModeIntervention | null {
    const limits = this.mode.research;

    if (this.progress.researchRequests >= limits.maxRequests) {
      return {
        type: 'research_limit',
        priority: 'high',
        message: `⚠️ **RESEARCH LIMIT REACHED** (${limits.maxRequests} requests)

We have enough research. Time to USE what we've learned.

STOP requesting more data. START writing/deciding based on what we have.
If we don't have perfect information, that's okay. Make the best decision with available data.`
      };
    }

    // Check per-topic limits
    for (const [topic, count] of this.progress.researchByTopic) {
      if (count >= limits.maxPerTopic) {
        return {
          type: 'research_limit',
          priority: 'medium',
          message: `⚠️ **TOPIC SATURATED**: We've researched "${topic}" ${count} times.

Move on. Use what we have. Repeated research on the same topic suggests we're avoiding the actual work.`
        };
      }
    }

    return null;
  }

  /**
   * Check if we should remind of the goal
   */
  private shouldRemindGoal(): boolean {
    const frequency = this.mode.goalReminder.frequency;
    return (
      this.progress.totalMessages > 0 &&
      this.progress.totalMessages % frequency === 0
    );
  }

  /**
   * Create goal reminder intervention
   */
  private createGoalReminder(): ModeIntervention {
    return {
      type: 'goal_reminder',
      priority: 'medium',
      message: this.mode.goalReminder.template, // {goal} will be replaced by orchestrator
    };
  }

  /**
   * Track message similarity for loop detection
   */
  private trackMessageSimilarity(message: Message): void {
    // Create a simple hash of key terms
    const content = message.content.toLowerCase();
    const words = content
      .split(/\s+/)
      .filter(w => w.length > 4)
      .sort()
      .slice(0, 10)
      .join('|');
    this.messageHashes.push(words);
  }

  /**
   * Detect if agents are going in circles
   * Uses configurable parameters for window size and hash comparison
   */
  private detectLoop(): ModeIntervention | null {
    if (!this.mode.loopDetection.enabled) return null;

    const settings = this.mode.loopDetection;

    // Use configurable parameters with defaults
    const windowSize = settings.windowSize ?? 10;
    const minHashLength = settings.minHashLength ?? 10;
    const messagesPerRound = settings.messagesPerRound ?? 3;

    // Check for similar messages within the window
    const recentHashes = this.messageHashes.slice(-windowSize);
    const hashCounts = new Map<string, number>();
    for (const hash of recentHashes) {
      if (hash.length > minHashLength) { // Only meaningful hashes
        hashCounts.set(hash, (hashCounts.get(hash) || 0) + 1);
      }
    }

    for (const count of hashCounts.values()) {
      if (count >= settings.maxSimilarMessages) {
        return {
          type: 'loop_detected',
          priority: 'high',
          message: settings.intervention,
        };
      }
    }

    // Check for rounds without progress
    const messagesSinceProgress = this.progress.totalMessages - this.progress.lastProgressAt;
    if (messagesSinceProgress >= settings.maxRoundsWithoutProgress * messagesPerRound) {
      return {
        type: 'loop_detected',
        priority: 'high',
        message: settings.intervention,
      };
    }

    return null;
  }

  /**
   * Check for phase transition
   * Per MODE_SYSTEM.md: Enforces requiredBeforeSynthesis and phase exit criteria
   */
  private checkPhaseTransition(): ModeIntervention | null {
    const currentPhaseConfig = this.mode.phases.find(p => p.id === this.progress.currentPhase);
    if (!currentPhaseConfig) return null;

    // Skip if not autoTransition
    if (!currentPhaseConfig.autoTransition) return null;

    // Check if max messages reached OR exit criteria met (whichever comes first)
    const maxMessagesReached = this.progress.messagesInPhase >= currentPhaseConfig.maxMessages;
    const exitCriteriaMet = this.checkExitCriteria(currentPhaseConfig.exitCriteria);

    // Transition if either condition is met
    if (maxMessagesReached || exitCriteriaMet.met) {
      const nextPhase = this.mode.phases.find(p => p.order === currentPhaseConfig.order + 1);
      if (nextPhase) {
        // Check if transitioning to synthesis requires research first
        // Per spec: requiredBeforeSynthesis enforces minimum research before synthesis
        if (this.isSynthesisPhase(nextPhase.id)) {
          const researchCheck = this.checkRequiredResearch();
          if (!researchCheck.allowed) {
            return {
              type: 'research_limit',
              priority: 'high',
              message: researchCheck.message
            };
          }
        }

        this.progress.currentPhase = nextPhase.id;
        this.progress.messagesInPhase = 0;

        // Include info about why we transitioned
        const transitionReason = exitCriteriaMet.met
          ? 'Exit criteria met'
          : `Max messages (${currentPhaseConfig.maxMessages}) reached`;

        return {
          type: 'phase_transition',
          priority: 'high',
          message: `📍 **PHASE TRANSITION**: Moving to "${nextPhase.name}"

**Reason**: ${transitionReason}
**Focus now on**: ${nextPhase.agentFocus}

Previous phase complete. Carry forward what we learned, but shift focus.`
        };
      }
    }

    return null;
  }

  /**
   * Check if structured exit criteria are met for current phase
   * Per MODE_SYSTEM.md spec: Phases should check specific criteria, not just message count
   */
  private checkExitCriteria(criteria?: ExitCriteria): { met: boolean; details: string[] } {
    // If no criteria specified, never consider them "met" (rely on maxMessages)
    if (!criteria) {
      return { met: false, details: [] };
    }

    const details: string[] = [];
    let allMet = true;

    // Check minimum proposals
    if (criteria.minProposals !== undefined) {
      const met = this.progress.proposalsCount >= criteria.minProposals;
      if (!met) {
        allMet = false;
        details.push(`Proposals: ${this.progress.proposalsCount}/${criteria.minProposals}`);
      }
    }

    // Check minimum consensus points
    if (criteria.minConsensusPoints !== undefined) {
      const met = this.progress.consensusPoints >= criteria.minConsensusPoints;
      if (!met) {
        allMet = false;
        details.push(`Consensus: ${this.progress.consensusPoints}/${criteria.minConsensusPoints}`);
      }
    }

    // Check minimum research requests
    if (criteria.minResearchRequests !== undefined) {
      const met = this.progress.researchRequests >= criteria.minResearchRequests;
      if (!met) {
        allMet = false;
        details.push(`Research: ${this.progress.researchRequests}/${criteria.minResearchRequests}`);
      }
    }

    // Check required outputs
    if (criteria.requiredOutputs && criteria.requiredOutputs.length > 0) {
      const missing = criteria.requiredOutputs.filter(
        output => !this.progress.outputsProduced.has(output)
      );
      if (missing.length > 0) {
        allMet = false;
        details.push(`Missing outputs: ${missing.join(', ')}`);
      }
    }

    return { met: allMet, details };
  }

  /**
   * Check if a phase is a synthesis-type phase
   */
  private isSynthesisPhase(phaseId: string): boolean {
    const synthesisPhases = ['synthesis', 'synthesize', 'verdict', 'conclude', 'drafting', 'executive-summary'];
    return synthesisPhases.some(s => phaseId.toLowerCase().includes(s));
  }

  /**
   * Check if required research has been completed before synthesis
   * Per spec: research.requiredBeforeSynthesis enforces minimum research
   */
  checkRequiredResearch(): { allowed: boolean; message: string } {
    const required = this.mode.research.requiredBeforeSynthesis;
    const completed = this.progress.researchRequests;

    if (completed < required) {
      return {
        allowed: false,
        message: `⚠️ **RESEARCH REQUIRED BEFORE SYNTHESIS**

נדרש לפחות ${required} בקשות מחקר לפני מעבר לסינתזה.
בוצעו עד כה: ${completed}

**פעולה נדרשת:** הסוכנים צריכים לבקש מידע נוסף מהחוקרים לפני שממשיכים.

**חוקרים זמינים:**
- @stats-finder - נתונים וסטטיסטיקות
- @competitor-analyst - ניתוח מתחרים
- @audience-insight - תובנות קהל יעד
- @copy-explorer - דוגמאות קופי
- @local-context - הקשר מקומי`
      };
    }

    return {
      allowed: true,
      message: `✅ דרישות המחקר התמלאו (${completed}/${required})`
    };
  }

  /**
   * Check if we should force synthesis
   */
  private shouldForceSynthesis(): boolean {
    const maxMessages = this.mode.successCriteria.maxMessages;
    const atLimit = this.progress.totalMessages >= maxMessages;
    const neverSynthesized = !this.mode.phases.some(
      p => p.id === 'synthesis' && this.progress.currentPhase === 'synthesis'
    );

    return atLimit && neverSynthesized;
  }

  /**
   * Create forced synthesis intervention
   */
  private createForcedSynthesisIntervention(): ModeIntervention {
    return {
      type: 'force_synthesis',
      priority: 'high',
      message: `🚨 **SYNTHESIS REQUIRED**: We've reached ${this.mode.successCriteria.maxMessages} messages.

Time's up. No more discussion. We must now:
1. Summarize what we agree on
2. Make decisions on remaining open questions
3. Produce our final output

Each agent: State your final position in 2 sentences. Then let's conclude.`
    };
  }

  /**
   * Create success check intervention when all criteria are met
   * Per MODE_SYSTEM.md spec: notify when session goals have been achieved
   */
  private createSuccessCheckIntervention(): ModeIntervention {
    const outputs = Array.from(this.progress.outputsProduced).join(', ');
    return {
      type: 'success_check',
      priority: 'high',
      action: 'pause',
      message: `✅ **SUCCESS CRITERIA MET**

All session goals have been achieved:
- Consensus points: ${this.progress.consensusPoints}/${this.mode.successCriteria.minConsensusPoints}
- Required outputs: ${outputs}

The session can now be finalized. Review the outputs and confirm completion.`
    };
  }

  /**
   * Detect outputs produced (copy sections, verdicts, etc.)
   */
  private detectOutputs(message: Message): void {
    const content = message.content.toLowerCase();

    // Copywrite outputs
    if (content.includes('## hero') || content.includes('hero:') || content.includes('headline:')) {
      this.progress.outputsProduced.add('hero');
    }
    if (content.includes('value prop') || content.includes('## benefits') || content.includes('## value')) {
      this.progress.outputsProduced.add('value_proposition');
    }
    if (content.includes('cta') || content.includes('call to action') || content.includes('## cta')) {
      this.progress.outputsProduced.add('cta');
    }

    // Validation outputs
    if (content.includes('verdict:') || content.includes('our verdict') || content.includes('final decision')) {
      this.progress.outputsProduced.add('verdict');
    }
    if (content.includes('next steps') || content.includes('## next')) {
      this.progress.outputsProduced.add('next_steps');
    }
  }

  /**
   * Check if success criteria are met
   */
  checkSuccessCriteria(): { met: boolean; missing: string[] } {
    const criteria = this.mode.successCriteria;
    const missing: string[] = [];

    // Check consensus
    if (this.progress.consensusPoints < criteria.minConsensusPoints) {
      missing.push(`Need ${criteria.minConsensusPoints - this.progress.consensusPoints} more consensus points`);
    }

    // Check required outputs
    for (const output of criteria.requiredOutputs) {
      if (!this.progress.outputsProduced.has(output)) {
        missing.push(`Missing output: ${output}`);
      }
    }

    return {
      met: missing.length === 0,
      missing,
    };
  }

  /**
   * Manually transition to a phase
   */
  transitionToPhase(phaseId: string): boolean {
    const phase = this.mode.phases.find(p => p.id === phaseId);
    if (phase) {
      this.progress.currentPhase = phaseId;
      this.progress.messagesInPhase = 0;
      return true;
    }
    return false;
  }

  /**
   * Get current phase config
   */
  getCurrentPhase(): ModePhaseConfig | undefined {
    return this.mode.phases.find(p => p.id === this.progress.currentPhase);
  }

  /**
   * Get mode-specific agent instructions
   */
  getAgentInstructions(): string {
    return this.mode.agentInstructions;
  }

  /**
   * Get phase-specific focus
   */
  getCurrentPhaseFocus(): string {
    const phase = this.getCurrentPhase();
    return phase?.agentFocus || '';
  }

  /**
   * Serialize for session save
   */
  toJSON(): object {
    return {
      modeId: this.mode.id,
      progress: {
        ...this.progress,
        researchByTopic: Object.fromEntries(this.progress.researchByTopic),
        outputsProduced: Array.from(this.progress.outputsProduced),
      },
      messageHashes: this.messageHashes.slice(-20), // Keep last 20
    };
  }

  /**
   * Restore from session load
   */
  static fromJSON(data: any, mode: SessionMode): ModeController {
    const controller = new ModeController(mode);

    if (data.progress) {
      controller.progress = {
        ...data.progress,
        researchByTopic: new Map(Object.entries(data.progress.researchByTopic || {})),
        outputsProduced: new Set(data.progress.outputsProduced || []),
      };
    }

    if (data.messageHashes) {
      controller.messageHashes = data.messageHashes;
    }

    return controller;
  }
}
