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
  retentionLimits?: RetentionLimits; // Optional for backwards compatibility
}

const SUMMARY_INTERVAL = 12; // Summarize every 12 messages

// Memory retention limits to prevent unbounded growth (#24)
const DEFAULT_RETENTION_LIMITS = {
  maxSummaries: 20,       // Keep last 20 summaries (~240 messages worth)
  maxDecisions: 50,       // Keep last 50 decisions
  maxProposals: 30,       // Keep last 30 proposals
  maxKeyPoints: 10,       // Per agent: keep last 10 key points
  maxPositions: 10,       // Per agent: keep last 10 positions
  maxAgreements: 10,      // Per agent: keep last 10 agreements
  maxDisagreements: 10,   // Per agent: keep last 10 disagreements
};

export interface RetentionLimits {
  maxSummaries?: number;
  maxDecisions?: number;
  maxProposals?: number;
  maxKeyPoints?: number;
  maxPositions?: number;
  maxAgreements?: number;
  maxDisagreements?: number;
}

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

export class ConversationMemory {
  private summaries: MemoryEntry[] = [];
  private decisions: MemoryEntry[] = [];
  private proposals: MemoryEntry[] = [];
  private agentStates: Map<string, AgentMemoryState> = new Map();
  private lastSummarizedIndex = 0;
  private totalMessages = 0;
  private runner?: IAgentRunner;
  private retentionLimits: Required<RetentionLimits>;

  constructor(runner?: IAgentRunner, retentionLimits?: RetentionLimits) {
    this.runner = runner;
    this.retentionLimits = { ...DEFAULT_RETENTION_LIMITS, ...retentionLimits };
  }

  /**
   * Set the agent runner (for summarization)
   */
  setRunner(runner: IAgentRunner): void {
    this.runner = runner;
  }

  /**
   * Set retention limits (for runtime configuration)
   */
  setRetentionLimits(limits: RetentionLimits): void {
    this.retentionLimits = { ...this.retentionLimits, ...limits };
    // Apply limits immediately
    this.enforceRetentionLimits();
  }

  /**
   * Enforce retention limits to prevent memory leaks (#24)
   * Removes oldest entries when limits are exceeded
   */
  private enforceRetentionLimits(): void {
    // Trim summaries
    if (this.summaries.length > this.retentionLimits.maxSummaries) {
      const toRemove = this.summaries.length - this.retentionLimits.maxSummaries;
      this.summaries.splice(0, toRemove);
    }

    // Trim decisions
    if (this.decisions.length > this.retentionLimits.maxDecisions) {
      const toRemove = this.decisions.length - this.retentionLimits.maxDecisions;
      this.decisions.splice(0, toRemove);
    }

    // Trim proposals (keep active ones, remove old completed/rejected first)
    if (this.proposals.length > this.retentionLimits.maxProposals) {
      // Separate active and non-active proposals
      const active = this.proposals.filter(p => p.status === 'active');
      const nonActive = this.proposals.filter(p => p.status !== 'active');
      
      // First, try to fit within limit by removing non-active
      if (nonActive.length > 0) {
        const maxNonActive = Math.max(0, this.retentionLimits.maxProposals - active.length);
        const trimmedNonActive = nonActive.slice(-maxNonActive);
        this.proposals = [...trimmedNonActive, ...active];
      }
      
      // If still over limit (too many active), trim oldest active proposals
      if (this.proposals.length > this.retentionLimits.maxProposals) {
        this.proposals = this.proposals.slice(-this.retentionLimits.maxProposals);
      }
    }

    // Trim agent states
    for (const state of this.agentStates.values()) {
      if (state.keyPoints.length > this.retentionLimits.maxKeyPoints) {
        state.keyPoints = state.keyPoints.slice(-this.retentionLimits.maxKeyPoints);
      }
      if (state.positions.length > this.retentionLimits.maxPositions) {
        state.positions = state.positions.slice(-this.retentionLimits.maxPositions);
      }
      if (state.agreements.length > this.retentionLimits.maxAgreements) {
        state.agreements = state.agreements.slice(-this.retentionLimits.maxAgreements);
      }
      if (state.disagreements.length > this.retentionLimits.maxDisagreements) {
        state.disagreements = state.disagreements.slice(-this.retentionLimits.maxDisagreements);
      }
    }
  }

  /**
   * Get current memory usage statistics
   */
  getMemoryUsage(): {
    summaries: number;
    decisions: number;
    proposals: number;
    agentStates: number;
    totalEntries: number;
    limits: Required<RetentionLimits>;
  } {
    let agentStateEntries = 0;
    for (const state of this.agentStates.values()) {
      agentStateEntries += state.keyPoints.length + state.positions.length +
                          state.agreements.length + state.disagreements.length;
    }

    return {
      summaries: this.summaries.length,
      decisions: this.decisions.length,
      proposals: this.proposals.length,
      agentStates: agentStateEntries,
      totalEntries: this.summaries.length + this.decisions.length + 
                   this.proposals.length + agentStateEntries,
      limits: this.retentionLimits,
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

    // Enforce retention limits after adding new entries (#24)
    this.enforceRetentionLimits();
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
      console.error('[ConversationMemory] Summarization failed:', error);
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
      retentionLimits: this.retentionLimits,
    };
  }

  /**
   * Restore from serialized state
   */
  static fromJSON(
    data: Partial<ConversationMemoryState>,
    runner?: IAgentRunner,
    retentionLimits?: RetentionLimits
  ): ConversationMemory {
    // Merge saved retention limits with provided ones (provided takes precedence)
    const effectiveLimits = { ...data.retentionLimits, ...retentionLimits };
    const memory = new ConversationMemory(runner, effectiveLimits);

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

    // Apply retention limits to restored data (#24)
    memory.enforceRetentionLimits();

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
