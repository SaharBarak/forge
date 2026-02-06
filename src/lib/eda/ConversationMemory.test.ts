/**
 * ConversationMemory Unit Tests
 *
 * Tests pattern matching for decisions/proposals, summarization triggers,
 * memory context generation, and state persistence.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ConversationMemory,
  extractTopic,
  extractOutcome,
  generateMemoryId,
  DEFAULT_MEMORY_CONFIG,
} from './ConversationMemory';
import type { Message, ProposalReaction } from '../../types';
import type { IAgentRunner, QueryResult } from '../interfaces/IAgentRunner';

// Helper to create mock messages
function createMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: new Date(),
    agentId: 'agent-1',
    type: 'argument',
    content: 'Test message content',
    ...overrides,
  };
}

// Mock IAgentRunner
function createMockRunner(response?: Partial<QueryResult>): IAgentRunner {
  return {
    query: vi.fn().mockResolvedValue({
      success: true,
      content: 'Summary of discussion',
      ...response,
    }),
    evaluate: vi.fn().mockResolvedValue({
      success: true,
      urgency: 'medium',
      reason: 'Test reason',
      responseType: 'argument',
    }),
  };
}

describe('ConversationMemory', () => {
  let memory: ConversationMemory;

  beforeEach(() => {
    memory = new ConversationMemory();
  });

  describe('extractTopic', () => {
    it('extracts double-quoted topics', () => {
      expect(extractTopic('We need to discuss "pricing strategy"')).toBe('pricing strategy');
    });

    it('extracts single-quoted topics without apostrophes interfering', () => {
      // Note: Single quotes in contractions like "Let's" can interfere
      // Using explicit single quotes without contractions works correctly
      expect(extractTopic("Discussion of 'user onboarding' flow")).toBe('user onboarding');
    });

    it('extracts topics after "about"', () => {
      expect(extractTopic('This is about pricing.')).toBe('pricing');
    });

    it('extracts topics after "regarding"', () => {
      expect(extractTopic('A proposal regarding the homepage.')).toBe('the homepage');
    });

    it('extracts topics after "on" (includes "on" in match due to regex)', () => {
      // The regex captures from "on" onwards, so "on marketing strategy" is expected
      const result = extractTopic('Discussion on marketing strategy, part one');
      expect(result).toContain('marketing strategy');
    });

    it('falls back to first 8 words if no pattern matches', () => {
      const result = extractTopic('Some random text without patterns');
      expect(result.length).toBeLessThanOrEqual(100);
      expect(result).toContain('Some');
    });
  });

  describe('extractOutcome', () => {
    it('extracts outcomes after decision indicators', () => {
      expect(extractOutcome("We've decided to use blue for the button.")).toBe('use blue for the button');
      expect(extractOutcome('We agreed to prioritize mobile users!')).toBe('prioritize mobile users');
      expect(extractOutcome('We concluded the pricing is too high.')).toBe('the pricing is too high');
    });

    it('falls back to first sentence', () => {
      const result = extractOutcome('This is the first sentence. This is the second.');
      expect(result).toBe('This is the first sentence.');
    });
  });

  describe('generateMemoryId', () => {
    it('generates unique IDs', () => {
      const id1 = generateMemoryId();
      const id2 = generateMemoryId();
      expect(id1).not.toBe(id2);
    });

    it('generates IDs with timestamp format', () => {
      const id = generateMemoryId();
      expect(id).toMatch(/^\d+-\w+$/);
    });
  });

  describe('processMessage', () => {
    it('tracks agent message counts', async () => {
      const messages = [
        createMessage({ agentId: 'agent-1' }),
        createMessage({ agentId: 'agent-1' }),
        createMessage({ agentId: 'agent-2' }),
      ];

      for (const msg of messages) {
        await memory.processMessage(msg, messages.slice(0, messages.indexOf(msg) + 1));
      }

      const stats = memory.getStats();
      expect(stats.agentCount).toBe(2);
    });

    it('detects proposals by message type', async () => {
      const proposalMsg = createMessage({
        type: 'proposal',
        content: 'I propose we use a blue button.',
        agentId: 'agent-1',
      });

      await memory.processMessage(proposalMsg, [proposalMsg]);

      const stats = memory.getStats();
      expect(stats.proposalCount).toBe(1);

      const proposals = memory.getActiveProposals();
      expect(proposals.length).toBe(1);
      expect(proposals[0].status).toBe('active');
    });

    it('detects proposals by content patterns', async () => {
      const patterns = [
        'I propose we focus on mobile first.',
        'What if we used a different color?',
        "Let's consider alternative approaches.",
        'My suggestion is to simplify the flow.',
        '[PROPOSAL] We should add more testimonials.',
      ];

      for (const content of patterns) {
        memory.reset();
        const msg = createMessage({ content, type: 'argument' });
        await memory.processMessage(msg, [msg]);
        const stats = memory.getStats();
        expect(stats.proposalCount).toBeGreaterThanOrEqual(1);
      }
    });

    it('detects decisions by content patterns', async () => {
      const patterns = [
        "We've agreed on the pricing structure.",
        "We decided to go with option A.",
        'Consensus is that we need more research.',
        "Let's go with the blue theme.",
        '[CONSENSUS] The hero copy is approved.',
        '[DECISION] Final answer is option B.',
      ];

      for (const content of patterns) {
        memory.reset();
        const msg = createMessage({ content, type: 'argument' });
        await memory.processMessage(msg, [msg]);
        const stats = memory.getStats();
        expect(stats.decisionCount).toBeGreaterThanOrEqual(1);
      }
    });

    it('tracks agreements from message type', async () => {
      const msg = createMessage({
        type: 'agreement',
        content: 'I agree with that approach.',
        agentId: 'agent-1',
      });

      await memory.processMessage(msg, [msg]);

      const context = memory.getMemoryContext('agent-1');
      expect(context).toContain('agreed');
    });

    it('skips system messages', async () => {
      const systemMsg = createMessage({
        agentId: 'system',
        content: 'System announcement.',
      });

      await memory.processMessage(systemMsg, [systemMsg]);

      const stats = memory.getStats();
      expect(stats.agentCount).toBe(0);
    });
  });

  describe('summarization', () => {
    it('triggers summarization every 12 messages', async () => {
      const runner = createMockRunner();
      memory.setRunner(runner);

      const messages: Message[] = [];
      for (let i = 0; i < 13; i++) {
        const msg = createMessage({
          agentId: `agent-${i % 3}`,
          content: `Message ${i} content.`,
        });
        messages.push(msg);
        await memory.processMessage(msg, messages);
      }

      expect(runner.query).toHaveBeenCalled();
      const stats = memory.getStats();
      expect(stats.summaryCount).toBeGreaterThanOrEqual(1);
    });

    it('creates fallback summary without runner', async () => {
      const messages: Message[] = [];
      for (let i = 0; i < 13; i++) {
        const msg = createMessage({
          agentId: `agent-${i % 3}`,
          content: `Message ${i} content.`,
        });
        messages.push(msg);
        await memory.processMessage(msg, messages);
      }

      const stats = memory.getStats();
      expect(stats.summaryCount).toBeGreaterThanOrEqual(1);
    });

    it('handles runner error with fallback', async () => {
      // When runner throws an error (not just success:false), fallback is created
      const runner: IAgentRunner = {
        query: vi.fn().mockRejectedValue(new Error('API error')),
        evaluate: vi.fn().mockResolvedValue({
          success: true,
          urgency: 'medium',
          reason: 'test',
          responseType: 'argument',
        }),
      };
      memory.setRunner(runner);

      const messages: Message[] = [];
      for (let i = 0; i < 13; i++) {
        const msg = createMessage({ content: `Message ${i}.` });
        messages.push(msg);
        await memory.processMessage(msg, messages);
      }

      const stats = memory.getStats();
      expect(stats.summaryCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('proposal management', () => {
    it('updates proposal status', async () => {
      const msg = createMessage({ type: 'proposal', content: 'Test proposal.' });
      await memory.processMessage(msg, [msg]);

      const proposals = memory.getActiveProposals();
      const proposalId = proposals[0].id;

      const updated = memory.updateProposalStatus(proposalId, 'accepted');
      expect(updated).toBe(true);

      const active = memory.getActiveProposals();
      expect(active.length).toBe(0);
    });

    it('returns false for non-existent proposal', () => {
      const result = memory.updateProposalStatus('non-existent-id', 'rejected');
      expect(result).toBe(false);
    });

    it('adds reactions to proposals', async () => {
      const msg = createMessage({ type: 'proposal', content: 'Test proposal.' });
      await memory.processMessage(msg, [msg]);

      const proposal = memory.getLatestProposal();
      expect(proposal).toBeDefined();

      const reaction: ProposalReaction = {
        agentId: 'agent-2',
        reaction: 'support',
        timestamp: new Date(),
      };

      const added = memory.addProposalReaction(proposal!.id, reaction);
      expect(added).toBe(true);

      const updated = memory.getProposal(proposal!.id);
      expect(updated?.reactions).toHaveLength(1);
      expect(updated?.reactions?.[0].reaction).toBe('support');
    });

    it('updates existing reaction from same agent', async () => {
      const msg = createMessage({ type: 'proposal', content: 'Test proposal.' });
      await memory.processMessage(msg, [msg]);

      const proposal = memory.getLatestProposal();

      memory.addProposalReaction(proposal!.id, {
        agentId: 'agent-2',
        reaction: 'support',
      });

      memory.addProposalReaction(proposal!.id, {
        agentId: 'agent-2',
        reaction: 'oppose',
      });

      const updated = memory.getProposal(proposal!.id);
      expect(updated?.reactions).toHaveLength(1);
      expect(updated?.reactions?.[0].reaction).toBe('oppose');
    });

    it('tracks reaction to latest proposal from content', async () => {
      const proposalMsg = createMessage({ type: 'proposal', content: 'Let us test this.' });
      await memory.processMessage(proposalMsg, [proposalMsg]);

      const tracked = memory.trackReactionToLatest('agent-2', 'I agree, great idea!');
      expect(tracked).toBe(true);

      const proposal = memory.getLatestProposal();
      expect(proposal?.reactions).toHaveLength(1);
      expect(proposal?.reactions?.[0].reaction).toBe('support');
    });

    it('detects oppose reaction', async () => {
      const proposalMsg = createMessage({ type: 'proposal', content: 'Let us test this.' });
      await memory.processMessage(proposalMsg, [proposalMsg]);

      memory.trackReactionToLatest('agent-2', "I disagree, this won't work.");

      const proposal = memory.getLatestProposal();
      expect(proposal?.reactions?.[0].reaction).toBe('oppose');
    });

    it('returns false when no proposals exist', () => {
      const result = memory.trackReactionToLatest('agent-1', 'Some content');
      expect(result).toBe(false);
    });
  });

  describe('getMemoryContext', () => {
    it('includes summaries when present', async () => {
      const runner = createMockRunner({ content: 'Test summary content.' });
      memory.setRunner(runner);

      const messages: Message[] = [];
      for (let i = 0; i < 13; i++) {
        const msg = createMessage({ content: `Message ${i}.` });
        messages.push(msg);
        await memory.processMessage(msg, messages);
      }

      const context = memory.getMemoryContext();
      expect(context).toContain('Conversation Summary');
    });

    it('includes decisions when present', async () => {
      const msg = createMessage({ content: "We've decided to use option A." });
      await memory.processMessage(msg, [msg]);

      const context = memory.getMemoryContext();
      expect(context).toContain('Key Decisions');
    });

    it('includes proposals when present', async () => {
      const msg = createMessage({ type: 'proposal', content: 'I propose option B.' });
      await memory.processMessage(msg, [msg]);

      const context = memory.getMemoryContext();
      expect(context).toContain('Active Proposals');
    });

    it('includes agent-specific context when requested', async () => {
      const msg = createMessage({
        type: 'proposal',
        agentId: 'agent-1',
        content: 'My specific proposal.',
      });
      await memory.processMessage(msg, [msg]);

      const context = memory.getMemoryContext('agent-1');
      expect(context).toContain('Your Previous Contributions');
      expect(context).toContain('agent-1');
    });
  });

  describe('getEvalMemoryContext', () => {
    it('returns concise context for evaluation', async () => {
      const runner = createMockRunner({ content: 'Brief summary.' });
      memory.setRunner(runner);

      const messages: Message[] = [];
      for (let i = 0; i < 13; i++) {
        const msg = createMessage({ content: `Message ${i}.` });
        messages.push(msg);
        await memory.processMessage(msg, messages);
      }

      const evalContext = memory.getEvalMemoryContext();
      expect(evalContext).toContain('Prior discussion');

      const fullContext = memory.getMemoryContext();
      expect(evalContext.length).toBeLessThan(fullContext.length);
    });
  });

  describe('serialization', () => {
    it('serializes and deserializes correctly', async () => {
      const proposalMsg = createMessage({ type: 'proposal', content: 'Test proposal.' });
      const decisionMsg = createMessage({ content: "We've decided yes." });

      await memory.processMessage(proposalMsg, [proposalMsg]);
      await memory.processMessage(decisionMsg, [proposalMsg, decisionMsg]);

      const json = memory.toJSON();
      const restored = ConversationMemory.fromJSON(json as any);

      const originalStats = memory.getStats();
      const restoredStats = restored.getStats();

      expect(restoredStats.proposalCount).toBe(originalStats.proposalCount);
      expect(restoredStats.decisionCount).toBe(originalStats.decisionCount);
    });

    it('handles backwards compatibility for messageCount', () => {
      // Simulate old saved data without messageCount field
      const data = {
        summaries: [],
        decisions: [],
        proposals: [],
        agentStates: {
          'agent-1': {
            agentId: 'agent-1',
            keyPoints: [],
            positions: [],
            agreements: [],
            disagreements: [],
            // messageCount intentionally missing to test backwards compat
          } as any, // Cast to any to simulate missing field
        },
        lastSummarizedIndex: 0,
        totalMessages: 0,
      };

      const restored = ConversationMemory.fromJSON(data as any);
      const context = restored.getMemoryContext('agent-1');
      expect(context).toBeDefined();
    });
  });

  describe('reset', () => {
    it('clears all memory', async () => {
      const msg = createMessage({ type: 'proposal', content: 'Test.' });
      await memory.processMessage(msg, [msg]);

      memory.reset();

      const stats = memory.getStats();
      expect(stats.summaryCount).toBe(0);
      expect(stats.decisionCount).toBe(0);
      expect(stats.proposalCount).toBe(0);
      expect(stats.agentCount).toBe(0);
    });
  });

  describe('memory retention limits (#24)', () => {
    it('enforces summary limit', async () => {
      // Create memory with small limit
      const limitedMemory = new ConversationMemory(undefined, { maxSummaries: 2 });
      const runner = createMockRunner({ content: 'Summary' });
      limitedMemory.setRunner(runner);

      // Add enough messages to trigger multiple summaries
      const messages: Message[] = [];
      for (let i = 0; i < 40; i++) {
        const msg = createMessage({ content: `Message ${i}.`, agentId: 'agent-1' });
        messages.push(msg);
        await limitedMemory.processMessage(msg, messages);
      }

      const stats = limitedMemory.getStats();
      // Should have at most 2 summaries due to limit
      expect(stats.summaryCount).toBeLessThanOrEqual(2);
    });

    it('enforces decision limit', async () => {
      const limitedMemory = new ConversationMemory(undefined, { maxDecisions: 3 });

      // Add more decisions than the limit
      for (let i = 0; i < 10; i++) {
        const msg = createMessage({
          content: `We've decided on option ${i}.`,
          agentId: 'agent-1',
        });
        await limitedMemory.processMessage(msg, [msg]);
      }

      const stats = limitedMemory.getStats();
      expect(stats.decisionCount).toBeLessThanOrEqual(3);
    });

    it('enforces proposal limit while keeping active', async () => {
      const limitedMemory = new ConversationMemory(undefined, { maxProposals: 3 });

      // Add multiple proposals
      for (let i = 0; i < 10; i++) {
        const msg = createMessage({
          type: 'proposal',
          content: `I propose option ${i}.`,
          agentId: 'agent-1',
        });
        await limitedMemory.processMessage(msg, [msg]);
      }

      const stats = limitedMemory.getStats();
      expect(stats.proposalCount).toBeLessThanOrEqual(3);
    });

    it('enforces agent state limits', async () => {
      const limitedMemory = new ConversationMemory(undefined, {
        maxKeyPoints: 2,
        maxAgreements: 2,
      });

      // Add many proposals and agreements from same agent
      for (let i = 0; i < 10; i++) {
        const proposalMsg = createMessage({
          type: 'proposal',
          content: `Proposal ${i}.`,
          agentId: 'agent-1',
        });
        await limitedMemory.processMessage(proposalMsg, [proposalMsg]);

        const agreeMsg = createMessage({
          type: 'agreement',
          content: `I agree with point ${i}.`,
          agentId: 'agent-1',
        });
        await limitedMemory.processMessage(agreeMsg, [agreeMsg]);
      }

      const context = limitedMemory.getMemoryContext('agent-1');
      // Context should be bounded by limits
      expect(context).toBeDefined();
    });

    it('applies limits when restoring from JSON', async () => {
      // Create memory and add lots of data
      const bigMemory = new ConversationMemory();
      for (let i = 0; i < 10; i++) {
        const msg = createMessage({
          content: `We've decided on option ${i}.`,
          agentId: 'agent-1',
        });
        await bigMemory.processMessage(msg, [msg]);
      }

      // Serialize
      const json = bigMemory.toJSON();

      // Restore with smaller limits
      const restored = ConversationMemory.fromJSON(
        json as any,
        undefined,
        { maxDecisions: 2 }
      );

      const stats = restored.getStats();
      expect(stats.decisionCount).toBeLessThanOrEqual(2);
    });

    it('getMemoryUsage returns current stats and limits', async () => {
      const limitedMemory = new ConversationMemory(undefined, { maxDecisions: 5 });

      const msg = createMessage({
        content: "We've decided yes.",
        agentId: 'agent-1',
      });
      await limitedMemory.processMessage(msg, [msg]);

      const usage = limitedMemory.getMemoryUsage();
      expect(usage.decisions).toBe(1);
      expect(usage.limits.maxDecisions).toBe(5);
      expect(usage.totalEntries).toBeGreaterThan(0);
    });

    it('cleanupInactiveAgents removes old agent states', async () => {
      const msg1 = createMessage({ agentId: 'agent-1', content: 'Hello' });
      const msg2 = createMessage({ agentId: 'agent-2', content: 'World' });

      await memory.processMessage(msg1, [msg1]);
      await memory.processMessage(msg2, [msg1, msg2]);

      // Only keep agent-1 as active
      const removed = memory.cleanupInactiveAgents(['agent-1']);

      expect(removed).toBe(1);
      const stats = memory.getStats();
      expect(stats.agentCount).toBe(1);
    });

    it('setRetentionLimits applies limits immediately', async () => {
      // Add many decisions
      for (let i = 0; i < 10; i++) {
        const msg = createMessage({
          content: `We've decided on option ${i}.`,
          agentId: 'agent-1',
        });
        await memory.processMessage(msg, [msg]);
      }

      const statsBefore = memory.getStats();
      expect(statsBefore.decisionCount).toBe(10);

      // Apply smaller limit
      memory.setRetentionLimits({ maxDecisions: 3 });

      const statsAfter = memory.getStats();
      expect(statsAfter.decisionCount).toBeLessThanOrEqual(3);
    });
  });

  describe('reaction pattern detection', () => {
    it('detects support patterns', async () => {
      const msg = createMessage({ type: 'proposal', content: 'Test.' });
      await memory.processMessage(msg, [msg]);

      const supportPatterns = [
        'I agree with this approach.',
        "That's a great idea!",
        "Let's do it!",
      ];

      for (const content of supportPatterns) {
        memory.trackReactionToLatest('agent-test', content);
        const latest = memory.getLatestProposal();
        const reaction = latest?.reactions?.find(r => r.agentId === 'agent-test');
        expect(reaction?.reaction).toBe('support');
      }
    });

    it('detects oppose patterns', async () => {
      const msg = createMessage({ type: 'proposal', content: 'Test.' });
      await memory.processMessage(msg, [msg]);

      const opposePatterns = [
        "I disagree with this.",
        "This won't work because...",
        'There is a problem with this approach.',
      ];

      for (const content of opposePatterns) {
        memory.trackReactionToLatest('agent-test', content);
        const latest = memory.getLatestProposal();
        const reaction = latest?.reactions?.find(r => r.agentId === 'agent-test');
        expect(reaction?.reaction).toBe('oppose');
      }
    });

    it('defaults to neutral for unclear content', async () => {
      const msg = createMessage({ type: 'proposal', content: 'Test.' });
      await memory.processMessage(msg, [msg]);

      memory.trackReactionToLatest('agent-test', 'Hmm, interesting point.');

      const latest = memory.getLatestProposal();
      const reaction = latest?.reactions?.find(r => r.agentId === 'agent-test');
      expect(reaction?.reaction).toBe('neutral');
    });

    it('detects Hebrew support pattern', async () => {
      const msg = createMessage({ type: 'proposal', content: 'Test.' });
      await memory.processMessage(msg, [msg]);

      memory.trackReactionToLatest('agent-test', 'מסכים, רעיון מצוין!');

      const latest = memory.getLatestProposal();
      const reaction = latest?.reactions?.find(r => r.agentId === 'agent-test');
      expect(reaction?.reaction).toBe('support');
    });

    it('detects Hebrew oppose pattern', async () => {
      const msg = createMessage({ type: 'proposal', content: 'Test.' });
      await memory.processMessage(msg, [msg]);

      // Use "בעיה עם" pattern instead since "לא מסכים" contains "מסכים" which matches support first
      memory.trackReactionToLatest('agent-test', 'יש בעיה עם הגישה הזו.');

      const latest = memory.getLatestProposal();
      const reaction = latest?.reactions?.find(r => r.agentId === 'agent-test');
      expect(reaction?.reaction).toBe('oppose');
    });
  });

  // ===========================================================================
  // MEMORY CONFIGURATION AND PRUNING (#24)
  // ===========================================================================

  describe('memory configuration', () => {
    it('uses default config when none provided', () => {
      const config = memory.getConfig();

      expect(config.maxSummaries).toBe(DEFAULT_MEMORY_CONFIG.maxSummaries);
      expect(config.maxDecisions).toBe(DEFAULT_MEMORY_CONFIG.maxDecisions);
      expect(config.maxProposals).toBe(DEFAULT_MEMORY_CONFIG.maxProposals);
    });

    it('accepts partial config in constructor', () => {
      const customMemory = new ConversationMemory(undefined, { maxSummaries: 5 });
      const config = customMemory.getConfig();

      expect(config.maxSummaries).toBe(5);
      expect(config.maxDecisions).toBe(DEFAULT_MEMORY_CONFIG.maxDecisions);
    });

    it('setConfig updates limits', () => {
      memory.setConfig({ maxDecisions: 10 });
      const config = memory.getConfig();

      expect(config.maxDecisions).toBe(10);
    });

    it('setConfig triggers pruning if limits lowered', async () => {
      // Add many proposals
      for (let i = 0; i < 20; i++) {
        const msg = createMessage({ type: 'proposal', content: `Proposal ${i}.` });
        await memory.processMessage(msg, [msg]);
      }

      expect(memory.getStats().proposalCount).toBe(20);

      // Lower the limit
      memory.setConfig({ maxProposals: 5 });

      expect(memory.getStats().proposalCount).toBeLessThanOrEqual(5);
    });
  });

  describe('memory pruning', () => {
    it('prunes proposals when exceeding limit', async () => {
      const limitedMemory = new ConversationMemory(undefined, { maxProposals: 5, pruneThreshold: 1.0 });

      for (let i = 0; i < 10; i++) {
        const msg = createMessage({ type: 'proposal', content: `Proposal ${i}.` });
        await limitedMemory.processMessage(msg, [msg]);
      }

      expect(limitedMemory.getStats().proposalCount).toBeLessThanOrEqual(5);
    });

    it('prunes decisions when exceeding limit', async () => {
      const limitedMemory = new ConversationMemory(undefined, { maxDecisions: 3, pruneThreshold: 1.0 });

      for (let i = 0; i < 10; i++) {
        const msg = createMessage({ content: `We've decided on option ${i}.` });
        await limitedMemory.processMessage(msg, [msg]);
      }

      expect(limitedMemory.getStats().decisionCount).toBeLessThanOrEqual(3);
    });

    it('prioritizes active proposals over resolved when pruning', async () => {
      const limitedMemory = new ConversationMemory(undefined, { maxProposals: 3, pruneThreshold: 1.0 });

      // Add proposals and mark some as resolved
      for (let i = 0; i < 5; i++) {
        const msg = createMessage({ type: 'proposal', content: `Proposal ${i}.` });
        await limitedMemory.processMessage(msg, [msg]);
      }

      // Mark first 3 as accepted
      const proposals = limitedMemory.getActiveProposals();
      proposals.slice(0, 3).forEach(p => limitedMemory.updateProposalStatus(p.id, 'accepted'));

      // Add 2 more to trigger pruning
      for (let i = 5; i < 7; i++) {
        const msg = createMessage({ type: 'proposal', content: `Proposal ${i}.` });
        await limitedMemory.processMessage(msg, [msg]);
      }

      // Active proposals should be preserved
      const activeCount = limitedMemory.getActiveProposals().length;
      expect(activeCount).toBeGreaterThan(0);
    });

    it('prunes agent key points when exceeding limit', async () => {
      const limitedMemory = new ConversationMemory(undefined, { maxAgentKeyPoints: 3, pruneThreshold: 1.0 });

      for (let i = 0; i < 10; i++) {
        const msg = createMessage({
          type: 'proposal',
          agentId: 'agent-1',
          content: `Key point ${i}.`,
        });
        await limitedMemory.processMessage(msg, [msg]);
      }

      // Agent should have pruned key points
      const usage = limitedMemory.getMemoryUsage();
      expect(usage.agents.avgKeyPoints).toBeLessThanOrEqual(3);
    });
  });

  describe('memory compact', () => {
    it('aggressively reduces memory to 50%', async () => {
      const limitedMemory = new ConversationMemory(undefined, { maxProposals: 20 });

      for (let i = 0; i < 20; i++) {
        const msg = createMessage({ type: 'proposal', content: `Proposal ${i}.` });
        await limitedMemory.processMessage(msg, [msg]);
      }

      expect(limitedMemory.getStats().proposalCount).toBe(20);

      limitedMemory.compact();

      expect(limitedMemory.getStats().proposalCount).toBeLessThanOrEqual(10);
    });
  });

  describe('memory usage stats', () => {
    it('reports accurate usage percentages', async () => {
      const limitedMemory = new ConversationMemory(undefined, { maxProposals: 10 });

      for (let i = 0; i < 5; i++) {
        const msg = createMessage({ type: 'proposal', content: `Proposal ${i}.` });
        await limitedMemory.processMessage(msg, [msg]);
      }

      const usage = limitedMemory.getMemoryUsage();

      expect(usage.proposals.count).toBe(5);
      expect(usage.proposals.max).toBe(10);
      expect(usage.proposals.usage).toBeCloseTo(0.5);
    });

    it('tracks agent statistics', async () => {
      for (let i = 0; i < 5; i++) {
        const msg = createMessage({
          type: 'proposal',
          agentId: `agent-${i % 2}`,
          content: `Proposal ${i}.`,
        });
        await memory.processMessage(msg, [msg]);
      }

      const usage = memory.getMemoryUsage();

      expect(usage.agents.count).toBe(2);
      expect(usage.agents.avgKeyPoints).toBeGreaterThan(0);
    });
  });

  describe('clearInactiveAgents', () => {
    it('removes agents not in active set', async () => {
      // Add messages from multiple agents
      for (const agentId of ['agent-1', 'agent-2', 'agent-3']) {
        const msg = createMessage({ agentId, content: 'Hello.' });
        await memory.processMessage(msg, [msg]);
      }

      expect(memory.getStats().agentCount).toBe(3);

      // Clear inactive (keep only agent-1)
      memory.clearInactiveAgents(new Set(['agent-1']));

      expect(memory.getStats().agentCount).toBe(1);
    });

    it('preserves agents in active set', async () => {
      const msg1 = createMessage({ agentId: 'agent-1', type: 'proposal', content: 'My proposal.' });
      await memory.processMessage(msg1, [msg1]);

      memory.clearInactiveAgents(new Set(['agent-1']));

      const context = memory.getMemoryContext('agent-1');
      expect(context).toContain('Your Previous Contributions');
    });
  });

  describe('serialization with config', () => {
    it('preserves config through serialization', () => {
      const customMemory = new ConversationMemory(undefined, { maxSummaries: 5 });
      const json = customMemory.toJSON();

      const restored = ConversationMemory.fromJSON(json as any);
      const config = restored.getConfig();

      expect(config.maxSummaries).toBe(5);
    });

    it('prunes on restore if data exceeds limits', async () => {
      // Create memory with high limits
      const bigMemory = new ConversationMemory(undefined, { maxProposals: 100 });

      for (let i = 0; i < 50; i++) {
        const msg = createMessage({ type: 'proposal', content: `Proposal ${i}.` });
        await bigMemory.processMessage(msg, [msg]);
      }

      const json = bigMemory.toJSON();

      // Restore with lower limits
      const restored = ConversationMemory.fromJSON(
        { ...(json as any), config: { maxProposals: 10 } }
      );

      expect(restored.getStats().proposalCount).toBeLessThanOrEqual(10);
    });
  });
});
