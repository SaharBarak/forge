/**
 * ConversationMemory - Maintains conversation context and summaries
 * Prevents agents from "forgetting" early conversation by maintaining:
 * 1. Running summaries (updated every N messages)
 * 2. Key decisions and proposals
 * 3. Important insights from each agent
 */

import type { Message } from '../../types';
import type { IAgentRunner } from '../interfaces';

export interface MemoryEntry {
  type: 'summary' | 'decision' | 'proposal' | 'insight' | 'consensus_point';
  content: string;
  agentId?: string;
  timestamp: Date;
  messageRange?: [number, number]; // Message indices this covers
}

export interface AgentMemoryState {
  agentId: string;
  keyPoints: string[];        // Agent's main contributions
  positions: string[];        // Stances they've taken
  agreements: string[];       // Things they've agreed to
  disagreements: string[];    // Things they've pushed back on
}

export interface ConversationMemoryState {
  summaries: MemoryEntry[];
  decisions: MemoryEntry[];
  proposals: MemoryEntry[];
  agentStates: Record<string, AgentMemoryState>; // Record for JSON serialization
  lastSummarizedIndex: number;
  totalMessages: number;
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
 */
function extractOutcome(content: string): string {
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

  constructor(runner?: IAgentRunner) {
    this.runner = runner;
  }

  /**
   * Set the agent runner (for summarization)
   */
  setRunner(runner: IAgentRunner): void {
    this.runner = runner;
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
      });
    }

    const state = this.agentStates.get(agentId)!;
    const content = message.content;

    // Check for proposals using regex patterns
    const isProposal = message.type === 'proposal' || PROPOSAL_PATTERNS.some(p => p.test(content));
    if (isProposal) {
      this.proposals.push({
        type: 'proposal',
        content: extractOutcome(content),
        agentId,
        timestamp: message.timestamp,
      });
      state.keyPoints.push(this.extractFirstSentence(content));
    }

    // Check for decisions/consensus using regex patterns
    const isDecision = DECISION_PATTERNS.some(p => p.test(content));
    if (isDecision) {
      this.decisions.push({
        type: 'decision',
        content: extractOutcome(content),
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
    };
  }

  /**
   * Restore from serialized state
   */
  static fromJSON(data: Partial<ConversationMemoryState>, runner?: IAgentRunner): ConversationMemory {
    const memory = new ConversationMemory(runner);

    if (data.summaries) memory.summaries = data.summaries;
    if (data.decisions) memory.decisions = data.decisions;
    if (data.proposals) memory.proposals = data.proposals;
    if (data.agentStates) {
      memory.agentStates = new Map(Object.entries(data.agentStates as Record<string, AgentMemoryState>));
    }
    if (data.lastSummarizedIndex) memory.lastSummarizedIndex = data.lastSummarizedIndex;
    if (data.totalMessages) memory.totalMessages = data.totalMessages;

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
}
