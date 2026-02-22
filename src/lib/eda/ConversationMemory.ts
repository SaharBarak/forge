// @ts-nocheck
/**
 * ConversationMemory - Maintains conversation context and summaries
 * Prevents agents from "forgetting" early conversation by maintaining:
 * 1. Running summaries (updated every N messages)
 * 2. Key decisions and proposals
 * 3. Important insights from each agent
 */

import type { Message, ProposalReaction } from '../../types';
import type { IAgentRunner } from '../interfaces';

/** Status for tracking proposal lifecycle */
export type ProposalStatus = 'active' | 'accepted' | 'rejected' | 'modified';

/**
 * Configuration for memory limits and pruning
 */
export interface MemoryConfig {
  maxSummaries: number;        // Max summaries to keep (oldest pruned first)
  maxDecisions: number;        // Max decisions to keep
  maxProposals: number;        // Max proposals to keep
  maxAgentKeyPoints: number;   // Max key points per agent
  maxAgentPositions: number;   // Max positions per agent
  pruneThreshold: number;      // Trigger pruning when arrays exceed this % of max
}

/**
 * Legacy retention limits interface for backwards compatibility
 * @deprecated Use MemoryConfig instead
 */
export interface RetentionLimits {
  maxSummaries?: number;
  maxDecisions?: number;
  maxProposals?: number;
  maxKeyPoints?: number;
  maxPositions?: number;
  maxAgreements?: number;
  maxDisagreements?: number;
}

/** Default memory configuration */
export const DEFAULT_MEMORY_CONFIG: MemoryConfig = {
  maxSummaries: 20,
  maxDecisions: 50,
  maxProposals: 30,
  maxAgentKeyPoints: 20,
  maxAgentPositions: 15,
  pruneThreshold: 0.9, // Prune when at 90% capacity
};

// Legacy default for backwards compatibility
const DEFAULT_RETENTION_LIMITS: Required<RetentionLimits> = {
  maxSummaries: 20,
  maxDecisions: 50,
  maxProposals: 30,
  maxKeyPoints: 10,
  maxPositions: 10,
  maxAgreements: 10,
  maxDisagreements: 10,
};

export interface MemoryEntry {
  id: string; // Unique identifier for this entry
  type: 'summary' | 'decision' | 'proposal' | 'insight' | 'consensus_point';
  content: string;
  agentId?: string;
  timestamp: Date;
  messageRange?: [number, number]; // Message indices this covers
  // Proposal-specific fields
  status?: ProposalStatus;
  reactions?: ProposalReaction[];
  topic?: string; // Extracted topic for decisions/proposals
}

export interface AgentMemoryState {
  agentId: string;
  keyPoints: string[];        // Agent's main contributions
  positions: string[];        // Stances they've taken (history, not just current)
  agreements: string[];       // Things they've agreed to
  disagreements: string[];    // Things they've pushed back on
  messageCount: number;       // Number of messages from this agent (per spec)
}

export interface ConversationMemoryState {
  summaries: MemoryEntry[];
  decisions: MemoryEntry[];
  proposals: MemoryEntry[];
  agentStates: Record<string, AgentMemoryState>; // Record for JSON serialization
  lastSummarizedIndex: number;
  totalMessages: number;
  config?: MemoryConfig;
  retentionLimits?: RetentionLimits; // Legacy support
}

const SUMMARY_INTERVAL = 12; // Summarize every 12 messages

// Pattern arrays for decision/proposal/reaction detection (per CONVERSATION_MEMORY.md spec)
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
  support: [/I\s+agree/i, /great\s+idea/i, /let's\s+do\s+it/i, /מסכים/i, /רעיון מצוין/i],
  oppose: [/I\s+disagree/i, /won't\s+work/i, /problem\s+with/i, /לא מסכים/i, /בעיה עם/i],
  neutral: [/not\s+sure/i, /need\s+more\s+info/i, /לא בטוח/i],
};

/**
 * Extract the topic from a decision/proposal message
 * (per CONVERSATION_MEMORY.md spec - exported for enhanced decision tracking)
 */
export function extractTopic(content: string): string {
  // Remove type tags
  const cleaned = content.replace(/\[(?:TYPE:\s*)?[\w]+\]/gi, '').trim();

  // Try to extract a quoted topic
  const quoteMatch = cleaned.match(/"([^"]+)"|'([^']+)'/);
  if (quoteMatch) {
    return (quoteMatch[1] || quoteMatch[2]).slice(0, 100);
  }

  // Try to extract text after "about", "regarding", "on"
  const aboutMatch = cleaned.match(/(?:about|regarding|on|for)\s+(.+?)(?:\.|,|$)/i);
  if (aboutMatch) {
    return aboutMatch[1].slice(0, 100);
  }

  // Fall back to first noun phrase (simplified)
  const words = cleaned.split(/\s+/).slice(0, 8);
  return words.join(' ').slice(0, 100);
}

/**
 * Extract the outcome/content from a decision/proposal message
 * (per CONVERSATION_MEMORY.md spec - exported for enhanced decision tracking)
 */
export function extractOutcome(content: string): string {
  // Remove type tags
  const cleaned = content.replace(/\[(?:TYPE:\s*)?[\w]+\]/gi, '').trim();

  // Try to extract text after decision indicators
  const outcomeMatch = cleaned.match(/(?:decided|agreed|concluded|will|should)\s+(?:to\s+)?(.+?)(?:\.|!|$)/i);
  if (outcomeMatch) {
    return outcomeMatch[1].slice(0, 200);
  }

  // Fall back to first sentence
  const sentenceMatch = cleaned.match(/^(.+?[.!?])/);
  if (sentenceMatch) {
    return sentenceMatch[1].slice(0, 200);
  }

  return cleaned.slice(0, 200);
}

/**
 * Detect reaction type from content
 */
function detectReaction(content: string): 'support' | 'oppose' | 'neutral' {
  for (const pattern of REACTION_PATTERNS.support) {
    if (pattern.test(content)) return 'support';
  }
  for (const pattern of REACTION_PATTERNS.oppose) {
    if (pattern.test(content)) return 'oppose';
  }
  for (const pattern of REACTION_PATTERNS.neutral) {
    if (pattern.test(content)) return 'neutral';
  }
  return 'neutral';
}

/**
 * Generate a unique ID
 * (per CONVERSATION_MEMORY.md spec - exported for enhanced decision/proposal tracking)
 */
export function generateMemoryId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Convert legacy RetentionLimits to MemoryConfig
 */
function retentionLimitsToConfig(limits: RetentionLimits): Partial<MemoryConfig> {
  return {
    maxSummaries: limits.maxSummaries,
    maxDecisions: limits.maxDecisions,
    maxProposals: limits.maxProposals,
    maxAgentKeyPoints: limits.maxKeyPoints,
    maxAgentPositions: limits.maxPositions,
  };
}

export class ConversationMemory {
  private summaries: MemoryEntry[] = [];
  private decisions: MemoryEntry[] = [];
  private proposals: MemoryEntry[] = [];
  private agentStates: Map<string, AgentMemoryState> = new Map();
  private lastSummarizedIndex = 0;
  private totalMessages = 0;
  private runner?: IAgentRunner;
  private config: MemoryConfig;

  constructor(runner?: IAgentRunner, config?: Partial<MemoryConfig>) {
    this.runner = runner;
    this.config = { ...DEFAULT_MEMORY_CONFIG, ...config };
  }

  /**
   * Update memory configuration
   */
  setConfig(config: Partial<MemoryConfig>): void {
    this.config = { ...this.config, ...config };
    // Immediately prune if new limits are lower
    this.pruneIfNeeded(true);
  }

  /**
   * Get current memory configuration
   */
  getConfig(): MemoryConfig {
    return { ...this.config };
  }

  /**
   * Set retention limits (legacy API for backwards compatibility)
   * @deprecated Use setConfig() instead
   */
  setRetentionLimits(limits: RetentionLimits): void {
    const configPatch = retentionLimitsToConfig(limits);
    this.setConfig(configPatch);
  }

  /**
   * Set the agent runner (for summarization)
   */
  setRunner(runner: IAgentRunner): void {
    this.runner = runner;
  }

  /**
   * Prune memory arrays if they exceed configured limits
   * @param force - If true, prune to exact limits; otherwise use threshold
   */
  private pruneIfNeeded(force = false): void {
    const threshold = force ? 1.0 : this.config.pruneThreshold;

    // Prune summaries (keep most recent)
    if (this.summaries.length > this.config.maxSummaries * threshold) {
      const toRemove = this.summaries.length - this.config.maxSummaries;
      this.summaries = this.summaries.slice(toRemove);
    }

    // Prune decisions (keep most recent)
    if (this.decisions.length > this.config.maxDecisions * threshold) {
      const toRemove = this.decisions.length - this.config.maxDecisions;
      this.decisions = this.decisions.slice(toRemove);
    }

    // Prune proposals (keep most recent, but prioritize active ones)
    if (this.proposals.length > this.config.maxProposals * threshold) {
      // Separate active and resolved proposals
      const active = this.proposals.filter(p => p.status === 'active');
      const resolved = this.proposals.filter(p => p.status !== 'active');

      const targetTotal = this.config.maxProposals;

      if (active.length >= targetTotal) {
        // Too many active - keep only most recent active ones
        this.proposals = active.slice(-targetTotal);
      } else {
        // Keep all active, fill remaining slots with most recent resolved
        const resolvedToKeep = targetTotal - active.length;
        this.proposals = [
          ...resolved.slice(-resolvedToKeep),
          ...active,
        ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      }
    }

    // Prune agent states
    for (const [agentId, state] of this.agentStates) {
      if (state.keyPoints.length > this.config.maxAgentKeyPoints * threshold) {
        state.keyPoints = state.keyPoints.slice(-this.config.maxAgentKeyPoints);
      }
      if (state.positions.length > this.config.maxAgentPositions * threshold) {
        state.positions = state.positions.slice(-this.config.maxAgentPositions);
      }
      if (state.agreements.length > this.config.maxAgentPositions * threshold) {
        state.agreements = state.agreements.slice(-this.config.maxAgentPositions);
      }
      if (state.disagreements.length > this.config.maxAgentPositions * threshold) {
        state.disagreements = state.disagreements.slice(-this.config.maxAgentPositions);
      }
      this.agentStates.set(agentId, state);
    }
  }

  /**
   * Legacy method for backwards compatibility
   * @deprecated Use pruneIfNeeded() internally; this is kept for existing tests
   */
  private enforceRetentionLimits(): void {
    this.pruneIfNeeded(true);
  }

  /**
   * Get memory usage statistics
   */
  getMemoryUsage(): {
    summaries: { count: number; max: number; usage: number };
    decisions: { count: number; max: number; usage: number };
    proposals: { count: number; max: number; usage: number };
    agents: { count: number; avgKeyPoints: number; avgPositions: number };
  } {
    let totalKeyPoints = 0;
    let totalPositions = 0;
    for (const state of this.agentStates.values()) {
      totalKeyPoints += state.keyPoints.length;
      totalPositions += state.positions.length + state.agreements.length + state.disagreements.length;
    }
    const agentCount = this.agentStates.size || 1;

    return {
      summaries: {
        count: this.summaries.length,
        max: this.config.maxSummaries,
        usage: this.summaries.length / this.config.maxSummaries,
      },
      decisions: {
        count: this.decisions.length,
        max: this.config.maxDecisions,
        usage: this.decisions.length / this.config.maxDecisions,
      },
      proposals: {
        count: this.proposals.length,
        max: this.config.maxProposals,
        usage: this.proposals.length / this.config.maxProposals,
      },
      agents: {
        count: this.agentStates.size,
        avgKeyPoints: totalKeyPoints / agentCount,
        avgPositions: totalPositions / agentCount,
      },
    };
  }

  /**
   * Cleanup inactive agent states (agents that haven't participated recently)
   * Call this periodically for long-running sessions
   */
  cleanupInactiveAgents(activeAgentIds: string[]): number {
    const activeSet = new Set(activeAgentIds);
    let removed = 0;
    
    for (const agentId of this.agentStates.keys()) {
      if (!activeSet.has(agentId) && agentId !== 'human') {
        this.agentStates.delete(agentId);
        removed++;
      }
    }
    
    return removed;
  }

  /**
   * Clear all inactive agents (no recent messages)
   * @param activeAgentIds - Set of currently active agent IDs to keep
   */
  clearInactiveAgents(activeAgentIds: Set<string>): void {
    for (const agentId of this.agentStates.keys()) {
      if (!activeAgentIds.has(agentId)) {
        this.agentStates.delete(agentId);
      }
    }
  }

  /**
   * Process a new message and update memory
   */
  async processMessage(message: Message, allMessages: Message[]): Promise<void> {
    this.totalMessages = allMessages.length;

    // Extract key information from the message
    this.extractFromMessage(message);

    // Check if we need to summarize
    if (this.shouldSummarize()) {
      await this.summarizeConversation(allMessages);
    }

    // Prune if memory usage is high
    this.pruneIfNeeded();
  }

  /**
   * Extract key info from a single message using pattern matching
   * (per CONVERSATION_MEMORY.md spec)
   */
  private extractFromMessage(message: Message): void {
    const agentId = message.agentId;

    // Skip system messages
    if (agentId === 'system') return;

    // Get or create agent state
    if (!this.agentStates.has(agentId)) {
      this.agentStates.set(agentId, {
        agentId,
        keyPoints: [],
        positions: [],
        agreements: [],
        disagreements: [],
        messageCount: 0,
      });
    }

    const state = this.agentStates.get(agentId)!;

    // Increment message count per spec (CONVERSATION_MEMORY.md)
    state.messageCount++;

    const content = message.content;

    // Check for proposals using regex patterns
    const isProposal = message.type === 'proposal' || PROPOSAL_PATTERNS.some(p => p.test(content));
    if (isProposal) {
      this.proposals.push({
        id: generateMemoryId(),
        type: 'proposal',
        content: extractOutcome(content),
        topic: extractTopic(content),
        agentId,
        timestamp: message.timestamp,
        status: 'active', // New proposals start as active
        reactions: [], // Empty reactions array
      });
      state.keyPoints.push(this.extractFirstSentence(content));
    }

    // Check for decisions/consensus using regex patterns
    const isDecision = DECISION_PATTERNS.some(p => p.test(content));
    if (isDecision) {
      this.decisions.push({
        id: generateMemoryId(),
        type: 'decision',
        content: extractOutcome(content),
        topic: extractTopic(content),
        agentId,
        timestamp: message.timestamp,
      });
    }

    // Track agreements/disagreements using patterns
    if (message.type === 'agreement') {
      state.agreements.push(this.extractFirstSentence(content));
    } else {
      // Check content for agreement patterns
      const reactionType = detectReaction(content);
      if (reactionType === 'support') {
        state.agreements.push(this.extractFirstSentence(content));
      } else if (reactionType === 'oppose') {
        state.disagreements.push(this.extractFirstSentence(content));
      }
    }

    if (message.type === 'disagreement') {
      state.disagreements.push(this.extractFirstSentence(content));
    }

    // Prune if needed after adding new entries
    this.pruneIfNeeded();
  }

  /**
   * Check if we need to summarize
   */
  private shouldSummarize(): boolean {
    return (this.totalMessages - this.lastSummarizedIndex) >= SUMMARY_INTERVAL;
  }

  /**
   * Summarize the conversation using AI
   */
  private async summarizeConversation(allMessages: Message[]): Promise<void> {
    if (!this.runner) {
      // Fallback: extract key sentences
      this.createFallbackSummary(allMessages);
      return;
    }

    const startIdx = this.lastSummarizedIndex;
    const endIdx = Math.min(startIdx + SUMMARY_INTERVAL, allMessages.length);
    const messagesToSummarize = allMessages.slice(startIdx, endIdx);

    if (messagesToSummarize.length === 0) return;

    const conversationText = messagesToSummarize.map(m => {
      const sender = m.agentId === 'human' ? 'Human' : m.agentId;
      return `[${sender}]: ${m.content}`;
    }).join('\n\n');

    try {
      const result = await this.runner.query({
        prompt: `Summarize this discussion segment concisely (2-3 sentences). Focus on:
1. Key decisions or agreements reached
2. Main proposals made
3. Unresolved disagreements

Discussion:
${conversationText}

Summary:`,
        systemPrompt: 'You are a concise summarizer. Output only the summary, no preamble.',
        model: 'claude-3-5-haiku-20241022', // Use haiku for fast, cheap summarization (per CONVERSATION_MEMORY.md)
      });

      if (result.success && result.content) {
        this.summaries.push({
          id: generateMemoryId(),
          type: 'summary',
          content: result.content,
          timestamp: new Date(),
          messageRange: [startIdx, endIdx],
        });
      }
    } catch (error) {
      this.createFallbackSummary(allMessages);
    }

    this.lastSummarizedIndex = endIdx;
  }

  /**
   * Create a simple fallback summary without AI
   */
  private createFallbackSummary(allMessages: Message[]): void {
    const startIdx = this.lastSummarizedIndex;
    const endIdx = Math.min(startIdx + SUMMARY_INTERVAL, allMessages.length);
    const messagesToSummarize = allMessages.slice(startIdx, endIdx);

    // Extract first sentence of each message
    const keyPoints = messagesToSummarize
      .filter(m => m.agentId !== 'system')
      .slice(0, 5)
      .map(m => `- ${m.agentId}: ${this.extractFirstSentence(m.content)}`);

    this.summaries.push({
      id: generateMemoryId(),
      type: 'summary',
      content: `Messages ${startIdx + 1}-${endIdx}:\n${keyPoints.join('\n')}`,
      timestamp: new Date(),
      messageRange: [startIdx, endIdx],
    });

    this.lastSummarizedIndex = endIdx;
  }

  /**
   * Extract first sentence from content
   */
  private extractFirstSentence(content: string): string {
    // Remove type tags like [PROPOSAL]
    const cleaned = content.replace(/\[(?:TYPE:\s*)?[\w]+\]/gi, '').trim();

    // Get first sentence (. or newline)
    const match = cleaned.match(/^(.+?[.!?])/);
    if (match) {
      return match[1].slice(0, 150);
    }

    // Fallback: first 100 chars
    return cleaned.slice(0, 100) + (cleaned.length > 100 ? '...' : '');
  }

  /**
   * Get memory context for an agent's prompt
   */
  getMemoryContext(forAgentId?: string): string {
    const parts: string[] = [];

    // Add summaries
    if (this.summaries.length > 0) {
      parts.push('## Conversation Summary (so far)');
      this.summaries.forEach((s, i) => {
        parts.push(`### Segment ${i + 1} (messages ${(s.messageRange?.[0] || 0) + 1}-${s.messageRange?.[1] || 0})`);
        parts.push(s.content);
      });
    }

    // Add key decisions
    if (this.decisions.length > 0) {
      parts.push('\n## Key Decisions & Agreements');
      this.decisions.slice(-5).forEach(d => {
        parts.push(`- ${d.content}`);
      });
    }

    // Add active proposals
    if (this.proposals.length > 0) {
      parts.push('\n## Active Proposals');
      this.proposals.slice(-5).forEach(p => {
        parts.push(`- [${p.agentId}] ${p.content}`);
      });
    }

    // Add agent-specific memory if requested
    if (forAgentId && this.agentStates.has(forAgentId)) {
      const state = this.agentStates.get(forAgentId)!;
      parts.push(`\n## Your Previous Contributions (${forAgentId})`);

      if (state.keyPoints.length > 0) {
        parts.push('Key points you made:');
        state.keyPoints.slice(-3).forEach(p => parts.push(`- ${p}`));
      }

      if (state.agreements.length > 0) {
        parts.push('You agreed with:');
        state.agreements.slice(-2).forEach(a => parts.push(`- ${a}`));
      }
    }

    return parts.join('\n');
  }

  /**
   * Get concise memory for evaluation (shorter)
   */
  getEvalMemoryContext(): string {
    const parts: string[] = [];

    // Just the latest summary
    if (this.summaries.length > 0) {
      const latest = this.summaries[this.summaries.length - 1];
      parts.push(`Prior discussion: ${latest.content}`);
    }

    // Key decisions only
    if (this.decisions.length > 0) {
      parts.push('Agreed: ' + this.decisions.slice(-3).map(d => d.content).join('; '));
    }

    return parts.join('\n');
  }

  /**
   * Serialize memory state
   */
  toJSON(): object {
    return {
      summaries: this.summaries,
      decisions: this.decisions,
      proposals: this.proposals,
      agentStates: Object.fromEntries(this.agentStates),
      lastSummarizedIndex: this.lastSummarizedIndex,
      totalMessages: this.totalMessages,
      config: this.config,
    };
  }

  /**
   * Restore from serialized state
   */
  static fromJSON(
    data: Partial<ConversationMemoryState>,
    runner?: IAgentRunner,
    configOrLimits?: Partial<MemoryConfig> | RetentionLimits
  ): ConversationMemory {
    // Handle both MemoryConfig and legacy RetentionLimits
    let effectiveConfig: Partial<MemoryConfig> | undefined;
    if (configOrLimits) {
      if ('maxKeyPoints' in configOrLimits || 'maxAgreements' in configOrLimits) {
        // Legacy RetentionLimits format
        effectiveConfig = retentionLimitsToConfig(configOrLimits as RetentionLimits);
      } else {
        effectiveConfig = configOrLimits as Partial<MemoryConfig>;
      }
    }
    
    // Merge saved config with provided config (provided takes precedence)
    const finalConfig = { ...data.config, ...effectiveConfig };
    const memory = new ConversationMemory(runner, finalConfig);

    if (data.summaries) memory.summaries = data.summaries;
    if (data.decisions) memory.decisions = data.decisions;
    if (data.proposals) memory.proposals = data.proposals;
    if (data.agentStates) {
      // Restore agent states with backwards compatibility for messageCount
      const entries = Object.entries(data.agentStates as Record<string, AgentMemoryState>);
      for (const [agentId, state] of entries) {
        memory.agentStates.set(agentId, {
          ...state,
          messageCount: state.messageCount ?? 0, // Default for old saved sessions
        });
      }
    }
    if (data.lastSummarizedIndex) memory.lastSummarizedIndex = data.lastSummarizedIndex;
    if (data.totalMessages) memory.totalMessages = data.totalMessages;

    // Prune in case restored data exceeds current config limits
    memory.pruneIfNeeded(true);

    return memory;
  }

  /**
   * Reset memory (for new session)
   */
  reset(): void {
    this.summaries = [];
    this.decisions = [];
    this.proposals = [];
    this.agentStates.clear();
    this.lastSummarizedIndex = 0;
    this.totalMessages = 0;
  }

  /**
   * Compact memory by aggressively pruning to 50% of limits
   * Use when memory pressure is high
   */
  compact(): void {
    const halfLimits: Partial<MemoryConfig> = {
      maxSummaries: Math.ceil(this.config.maxSummaries / 2),
      maxDecisions: Math.ceil(this.config.maxDecisions / 2),
      maxProposals: Math.ceil(this.config.maxProposals / 2),
      maxAgentKeyPoints: Math.ceil(this.config.maxAgentKeyPoints / 2),
      maxAgentPositions: Math.ceil(this.config.maxAgentPositions / 2),
    };

    const originalConfig = this.config;
    this.config = { ...this.config, ...halfLimits };
    this.pruneIfNeeded(true);
    this.config = originalConfig;
  }

  /**
   * Get stats
   */
  getStats(): { summaryCount: number; decisionCount: number; proposalCount: number; agentCount: number } {
    return {
      summaryCount: this.summaries.length,
      decisionCount: this.decisions.length,
      proposalCount: this.proposals.length,
      agentCount: this.agentStates.size,
    };
  }

  /**
   * Update the status of a proposal (per CONVERSATION_MEMORY.md spec)
   * @param proposalId - ID of the proposal to update
   * @param status - New status to set
   * @returns true if proposal was found and updated, false otherwise
   */
  updateProposalStatus(proposalId: string, status: ProposalStatus): boolean {
    const proposal = this.proposals.find(p => p.id === proposalId);
    if (proposal) {
      proposal.status = status;
      return true;
    }
    return false;
  }

  /**
   * Add a reaction to a proposal
   * @param proposalId - ID of the proposal to react to
   * @param reaction - The reaction to add
   * @returns true if proposal was found and reaction added, false otherwise
   */
  addProposalReaction(proposalId: string, reaction: ProposalReaction): boolean {
    const proposal = this.proposals.find(p => p.id === proposalId);
    if (proposal) {
      if (!proposal.reactions) {
        proposal.reactions = [];
      }
      // Check if agent already reacted - update if so
      const existingIdx = proposal.reactions.findIndex(r => r.agentId === reaction.agentId);
      if (existingIdx >= 0) {
        proposal.reactions[existingIdx] = reaction;
      } else {
        proposal.reactions.push(reaction);
      }
      return true;
    }
    return false;
  }

  /**
   * Get a proposal by ID
   * @param proposalId - ID of the proposal to find
   * @returns The proposal if found, undefined otherwise
   */
  getProposal(proposalId: string): MemoryEntry | undefined {
    return this.proposals.find(p => p.id === proposalId);
  }

  /**
   * Get all active proposals
   * @returns Array of proposals with status 'active'
   */
  getActiveProposals(): MemoryEntry[] {
    return this.proposals.filter(p => p.status === 'active');
  }

  /**
   * Get the most recent proposal for reaction tracking
   * @returns The most recent proposal, or undefined if none exist
   */
  getLatestProposal(): MemoryEntry | undefined {
    return this.proposals.length > 0 ? this.proposals[this.proposals.length - 1] : undefined;
  }

  /**
   * Get summaries covering messages after given index (for phase handoff briefs)
   */
  getSummariesSince(messageIndex: number): MemoryEntry[] {
    return this.summaries.filter(s => {
      if (!s.messageRange) return false;
      return s.messageRange[1] > messageIndex;
    });
  }

  /**
   * Get decisions made after given message index (for phase handoff briefs)
   */
  getDecisionsSince(messageIndex: number): MemoryEntry[] {
    return this.decisions.filter(d => {
      if (!d.messageRange) return false;
      return d.messageRange[1] > messageIndex;
    });
  }

  /**
   * Get all proposals (not just active)
   */
  getAllProposals(): MemoryEntry[] {
    return [...this.proposals];
  }

  /**
   * Get all agent memory states (for phase handoff briefs)
   */
  getAllAgentStates(): Map<string, AgentMemoryState> {
    return new Map(this.agentStates);
  }

  getAgentState(agentId: string): AgentMemoryState | undefined {
    return this.agentStates.get(agentId);
  }

  /**
   * Track a reaction from an agent to the latest proposal
   * (Convenience method that auto-detects reaction from content)
   * @param agentId - ID of the reacting agent
   * @param content - Content to analyze for reaction type
   * @returns true if a reaction was tracked, false if no proposals exist
   */
  trackReactionToLatest(agentId: string, content: string): boolean {
    const latest = this.getLatestProposal();
    if (!latest || !latest.id) return false;

    const reactionType = detectReaction(content);
    return this.addProposalReaction(latest.id, {
      agentId,
      reaction: reactionType,
      timestamp: new Date(),
    });
  }
}
