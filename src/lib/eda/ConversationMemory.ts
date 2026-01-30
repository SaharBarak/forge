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
   * Extract key info from a single message
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
    const content = message.content.toLowerCase();

    // Track message types
    if (message.type === 'proposal') {
      this.proposals.push({
        type: 'proposal',
        content: this.extractFirstSentence(message.content),
        agentId,
        timestamp: message.timestamp,
      });
      state.keyPoints.push(this.extractFirstSentence(message.content));
    }

    if (message.type === 'agreement') {
      state.agreements.push(this.extractFirstSentence(message.content));
    }

    if (message.type === 'disagreement') {
      state.disagreements.push(this.extractFirstSentence(message.content));
    }

    // Look for consensus-related keywords
    if (content.includes('consensus') || content.includes('הסכמה') ||
        content.includes('agree') || content.includes('מסכים')) {
      this.decisions.push({
        type: 'consensus_point',
        content: this.extractFirstSentence(message.content),
        agentId,
        timestamp: message.timestamp,
      });
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
        model: 'claude-sonnet-4-20250514',
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
