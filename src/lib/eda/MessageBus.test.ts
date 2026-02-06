/**
 * MessageBus Unit Tests
 *
 * Tests the central event emitter for the event-driven architecture:
 * - Event subscription and unsubscription
 * - Event emission and delivery
 * - Message history tracking
 * - Memory integration
 * - Session lifecycle events
 *
 * Per EVENT_DRIVEN_ARCHITECTURE.md spec: MessageBus is the singleton event hub
 * for all inter-component communication.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MessageBus } from './MessageBus';
import type { Message } from '../../types';
import type { IAgentRunner, QueryResult, EvalResult } from '../interfaces/IAgentRunner';

// =============================================================================
// MOCK FACTORIES
// =============================================================================

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

function createMockAgentRunner(overrides: Partial<IAgentRunner> = {}): IAgentRunner {
  return {
    query: vi.fn().mockResolvedValue({
      success: true,
      content: 'Mock agent response',
    } as QueryResult),
    evaluate: vi.fn().mockResolvedValue({
      success: true,
      urgency: 'medium',
      reason: 'Test evaluation',
      responseType: 'argument',
    } as EvalResult),
    ...overrides,
  };
}

// =============================================================================
// MESSAGE BUS TESTS
// =============================================================================

describe('MessageBus', () => {
  let bus: MessageBus;

  beforeEach(() => {
    // Create fresh instance for each test
    bus = new MessageBus();
  });

  afterEach(() => {
    vi.clearAllMocks();
    // Stop bus to clear subscriptions
    bus.stop('test cleanup');
  });

  describe('initial state', () => {
    it('starts inactive', () => {
      expect(bus.active).toBe(false);
    });

    it('has no messages initially', () => {
      expect(bus.getAllMessages()).toEqual([]);
    });

    it('has no subscribers initially', () => {
      expect(bus.getSubscriberCount('message:new')).toBe(0);
    });
  });

  // ===========================================================================
  // SUBSCRIPTION
  // ===========================================================================

  describe('subscribe', () => {
    it('adds subscriber for event', () => {
      bus.subscribe('message:new', () => {}, 'test-subscriber');

      expect(bus.getSubscriberCount('message:new')).toBe(1);
    });

    it('allows multiple subscribers for same event', () => {
      bus.subscribe('message:new', () => {}, 'subscriber-1');
      bus.subscribe('message:new', () => {}, 'subscriber-2');
      bus.subscribe('message:new', () => {}, 'subscriber-3');

      expect(bus.getSubscriberCount('message:new')).toBe(3);
    });

    it('returns unsubscribe function', () => {
      const unsubscribe = bus.subscribe('message:new', () => {}, 'test');

      expect(typeof unsubscribe).toBe('function');
    });

    it('unsubscribe removes subscriber', () => {
      const unsubscribe = bus.subscribe('message:new', () => {}, 'test');
      expect(bus.getSubscriberCount('message:new')).toBe(1);

      unsubscribe();
      expect(bus.getSubscriberCount('message:new')).toBe(0);
    });

    it('unsubscribe only removes specific subscriber', () => {
      const unsubscribe1 = bus.subscribe('message:new', () => {}, 'subscriber-1');
      bus.subscribe('message:new', () => {}, 'subscriber-2');

      expect(bus.getSubscriberCount('message:new')).toBe(2);

      unsubscribe1();
      expect(bus.getSubscriberCount('message:new')).toBe(1);
    });

    it('allows same subscriber to subscribe to multiple events', () => {
      bus.subscribe('message:new', () => {}, 'multi-subscriber');
      bus.subscribe('floor:request', () => {}, 'multi-subscriber');

      expect(bus.getSubscriberCount('message:new')).toBe(1);
      expect(bus.getSubscriberCount('floor:request')).toBe(1);
    });
  });

  // ===========================================================================
  // EMIT
  // ===========================================================================

  describe('emit', () => {
    it('does not deliver events when inactive (except session events)', async () => {
      const callback = vi.fn();
      bus.subscribe('message:new', callback, 'test');

      bus.emit('message:new', { message: createMessage(), fromAgent: 'agent-1' });

      // Wait for async dispatch
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(callback).not.toHaveBeenCalled();
    });

    it('delivers session events even when inactive', async () => {
      const callback = vi.fn();
      bus.subscribe('session:start', callback, 'test');

      bus.emit('session:start', { sessionId: 'test-id', goal: 'Test goal' });

      // Wait for async dispatch
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(callback).toHaveBeenCalledWith({ sessionId: 'test-id', goal: 'Test goal' });
    });

    it('delivers events when active', async () => {
      const callback = vi.fn();
      bus.subscribe('message:new', callback, 'test');

      bus.start('test-session', 'Test goal');

      const message = createMessage();
      bus.emit('message:new', { message, fromAgent: 'agent-1' });

      // Wait for async dispatch
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(callback).toHaveBeenCalledWith({ message, fromAgent: 'agent-1' });
    });

    it('delivers to all subscribers of an event', async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      bus.subscribe('message:new', callback1, 'sub-1');
      bus.subscribe('message:new', callback2, 'sub-2');
      bus.subscribe('message:new', callback3, 'sub-3');

      bus.start('test-session', 'Test goal');
      bus.emit('message:new', { message: createMessage(), fromAgent: 'agent-1' });

      // Wait for async dispatch
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
      expect(callback3).toHaveBeenCalled();
    });

    it('only delivers to subscribers of the emitted event', async () => {
      const messageCallback = vi.fn();
      const floorCallback = vi.fn();

      bus.subscribe('message:new', messageCallback, 'message-sub');
      bus.subscribe('floor:request', floorCallback, 'floor-sub');

      bus.start('test-session', 'Test goal');
      bus.emit('message:new', { message: createMessage(), fromAgent: 'agent-1' });

      // Wait for async dispatch
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(messageCallback).toHaveBeenCalled();
      expect(floorCallback).not.toHaveBeenCalled();
    });

    it('continues delivering to other subscribers if one takes time', async () => {
      // Test that callbacks are dispatched independently via setTimeout
      const slowCallback = vi.fn().mockImplementation(() => {
        // Simulate slow callback - doesn't block others due to setTimeout
      });
      const fastCallback = vi.fn();

      bus.subscribe('message:new', slowCallback, 'slow-sub');
      bus.subscribe('message:new', fastCallback, 'fast-sub');

      bus.start('test-session', 'Test goal');

      // Should not throw
      expect(() => {
        bus.emit('message:new', { message: createMessage(), fromAgent: 'agent-1' });
      }).not.toThrow();

      // Wait for async dispatch
      await new Promise(resolve => setTimeout(resolve, 10));

      // Both callbacks should have been called
      expect(slowCallback).toHaveBeenCalled();
      expect(fastCallback).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // MESSAGE HISTORY
  // ===========================================================================

  describe('message history', () => {
    beforeEach(() => {
      bus.start('test-session', 'Test goal');
    });

    it('addMessage adds to history', () => {
      const message = createMessage();
      bus.addMessage(message, 'agent-1');

      expect(bus.getAllMessages()).toHaveLength(1);
      expect(bus.getAllMessages()[0]).toEqual(message);
    });

    it('addMessage emits message:new event', async () => {
      const callback = vi.fn();
      bus.subscribe('message:new', callback, 'test');

      const message = createMessage();
      bus.addMessage(message, 'agent-1');

      // Wait for async dispatch
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(callback).toHaveBeenCalledWith({ message, fromAgent: 'agent-1' });
    });

    it('getAllMessages returns copy of history', () => {
      const message = createMessage();
      bus.addMessage(message, 'agent-1');

      const messages = bus.getAllMessages();
      messages.push(createMessage()); // Modify the copy

      expect(bus.getAllMessages()).toHaveLength(1);
    });

    it('getRecentMessages returns last N messages', () => {
      for (let i = 0; i < 20; i++) {
        bus.addMessage(createMessage({ content: `Message ${i}` }), 'agent-1');
      }

      const recent = bus.getRecentMessages(5);
      expect(recent).toHaveLength(5);
      expect(recent[0].content).toBe('Message 15');
      expect(recent[4].content).toBe('Message 19');
    });

    it('getRecentMessages defaults to 10', () => {
      for (let i = 0; i < 20; i++) {
        bus.addMessage(createMessage({ content: `Message ${i}` }), 'agent-1');
      }

      const recent = bus.getRecentMessages();
      expect(recent).toHaveLength(10);
    });

    it('getRecentMessages returns all if less than count', () => {
      bus.addMessage(createMessage(), 'agent-1');
      bus.addMessage(createMessage(), 'agent-2');

      const recent = bus.getRecentMessages(10);
      expect(recent).toHaveLength(2);
    });
  });

  // ===========================================================================
  // SESSION LIFECYCLE
  // ===========================================================================

  describe('session lifecycle', () => {
    it('start activates the bus', () => {
      expect(bus.active).toBe(false);

      bus.start('test-session', 'Test goal');

      expect(bus.active).toBe(true);
    });

    it('start emits session:start event', async () => {
      const callback = vi.fn();
      bus.subscribe('session:start', callback, 'test');

      bus.start('test-session', 'Test goal');

      // Wait for async dispatch
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(callback).toHaveBeenCalledWith({
        sessionId: 'test-session',
        goal: 'Test goal',
      });
    });

    it('start clears message history', () => {
      bus.start('session-1', 'Goal 1');
      bus.addMessage(createMessage(), 'agent-1');
      bus.addMessage(createMessage(), 'agent-2');

      expect(bus.getAllMessages()).toHaveLength(2);

      bus.start('session-2', 'Goal 2');

      expect(bus.getAllMessages()).toHaveLength(0);
    });

    it('pause emits session:pause event', async () => {
      const callback = vi.fn();
      bus.subscribe('session:pause', callback, 'test');
      bus.start('test-session', 'Test goal');

      bus.pause('user request');

      // Wait for async dispatch
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(callback).toHaveBeenCalledWith({ reason: 'user request' });
    });

    it('resume emits session:resume event', async () => {
      const callback = vi.fn();
      bus.subscribe('session:resume', callback, 'test');
      bus.start('test-session', 'Test goal');

      bus.resume();

      // Wait for async dispatch
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(callback).toHaveBeenCalledWith({});
    });

    it('stop deactivates the bus', () => {
      bus.start('test-session', 'Test goal');
      expect(bus.active).toBe(true);

      bus.stop('test complete');

      expect(bus.active).toBe(false);
    });

    it('stop emits session:end event', async () => {
      const callback = vi.fn();
      bus.subscribe('session:end', callback, 'test');
      bus.start('test-session', 'Test goal');

      bus.stop('test complete');

      // Wait for async dispatch
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(callback).toHaveBeenCalledWith({ reason: 'test complete' });
    });

    it('stop clears all subscriptions', () => {
      bus.subscribe('message:new', () => {}, 'sub-1');
      bus.subscribe('floor:request', () => {}, 'sub-2');

      expect(bus.getSubscriberCount('message:new')).toBe(1);
      expect(bus.getSubscriberCount('floor:request')).toBe(1);

      bus.stop('cleanup');

      expect(bus.getSubscriberCount('message:new')).toBe(0);
      expect(bus.getSubscriberCount('floor:request')).toBe(0);
    });
  });

  // ===========================================================================
  // MEMORY INTEGRATION
  // ===========================================================================

  describe('memory integration', () => {
    beforeEach(() => {
      bus.start('test-session', 'Test goal');
    });

    it('setAgentRunner configures runner for memory', () => {
      const runner = createMockAgentRunner();

      // Should not throw
      expect(() => bus.setAgentRunner(runner)).not.toThrow();
    });

    it('getMemoryStats returns stats from memory', () => {
      const stats = bus.getMemoryStats();

      expect(stats).toHaveProperty('summaryCount');
      expect(stats).toHaveProperty('decisionCount');
      expect(stats).toHaveProperty('proposalCount');
      expect(stats).toHaveProperty('agentCount');
    });

    it('getMemoryContext returns context string', () => {
      const context = bus.getMemoryContext();

      expect(typeof context).toBe('string');
    });

    it('getMemoryContext accepts optional agentId', () => {
      const context = bus.getMemoryContext('agent-1');

      expect(typeof context).toBe('string');
    });

    it('getEvalMemoryContext returns brief context', () => {
      const context = bus.getEvalMemoryContext();

      expect(typeof context).toBe('string');
    });

    it('getMemoryState returns serializable state', () => {
      const state = bus.getMemoryState();

      expect(typeof state).toBe('object');
      expect(() => JSON.stringify(state)).not.toThrow();
    });

    it('restoreMemory restores from saved state', () => {
      // Add some messages
      bus.addMessage(createMessage(), 'agent-1');
      bus.addMessage(createMessage(), 'agent-2');

      // Save state
      const savedState = bus.getMemoryState();

      // Create new bus and restore
      const newBus = new MessageBus();
      newBus.start('new-session', 'New goal');

      // Should not throw
      expect(() => newBus.restoreMemory(savedState)).not.toThrow();

      newBus.stop('cleanup');
    });
  });

  // ===========================================================================
  // EVENT TYPES
  // ===========================================================================

  describe('event types', () => {
    beforeEach(() => {
      bus.start('test-session', 'Test goal');
    });

    it('emits floor:request event', async () => {
      const callback = vi.fn();
      bus.subscribe('floor:request', callback, 'test');

      bus.emit('floor:request', {
        agentId: 'agent-1',
        urgency: 'high',
        reason: 'Important point',
        responseType: 'argument',
        timestamp: Date.now(),
      });

      await new Promise(resolve => setTimeout(resolve, 10));
      expect(callback).toHaveBeenCalled();
    });

    it('emits floor:granted event', async () => {
      const callback = vi.fn();
      bus.subscribe('floor:granted', callback, 'test');

      bus.emit('floor:granted', {
        agentId: 'agent-1',
        reason: 'Highest urgency',
      });

      await new Promise(resolve => setTimeout(resolve, 10));
      expect(callback).toHaveBeenCalled();
    });

    it('emits floor:released event', async () => {
      const callback = vi.fn();
      bus.subscribe('floor:released', callback, 'test');

      bus.emit('floor:released', { agentId: 'agent-1' });

      await new Promise(resolve => setTimeout(resolve, 10));
      expect(callback).toHaveBeenCalled();
    });

    it('emits floor:denied event', async () => {
      const callback = vi.fn();
      bus.subscribe('floor:denied', callback, 'test');

      bus.emit('floor:denied', {
        agentId: 'agent-1',
        reason: 'Cooldown active',
      });

      await new Promise(resolve => setTimeout(resolve, 10));
      expect(callback).toHaveBeenCalled();
    });

    it('emits message:research event', async () => {
      const callback = vi.fn();
      bus.subscribe('message:research', callback, 'test');

      bus.emit('message:research', {
        request: { topic: 'pricing' },
        fromAgent: 'agent-1',
      });

      await new Promise(resolve => setTimeout(resolve, 10));
      expect(callback).toHaveBeenCalled();
    });

    it('emits message:synthesis event', async () => {
      const callback = vi.fn();
      bus.subscribe('message:synthesis', callback, 'test');

      bus.emit('message:synthesis', {
        synthesis: 'Summary of discussion',
        round: 1,
      });

      await new Promise(resolve => setTimeout(resolve, 10));
      expect(callback).toHaveBeenCalled();
    });

    it('emits session:loaded event', async () => {
      const callback = vi.fn();
      bus.subscribe('session:loaded', callback, 'test');

      bus.emit('session:loaded', {
        metadata: {
          id: 'session-1',
          projectName: 'Test',
          goal: 'Test goal',
          enabledAgents: ['agent-1'],
          startedAt: new Date().toISOString(),
        },
        messages: [],
      });

      await new Promise(resolve => setTimeout(resolve, 10));
      expect(callback).toHaveBeenCalled();
    });

    it('emits session:save-requested event', async () => {
      const callback = vi.fn();
      bus.subscribe('session:save-requested', callback, 'test');

      bus.emit('session:save-requested', {});

      await new Promise(resolve => setTimeout(resolve, 10));
      expect(callback).toHaveBeenCalled();
    });

    it('emits session:export-requested event', async () => {
      const callback = vi.fn();
      bus.subscribe('session:export-requested', callback, 'test');

      bus.emit('session:export-requested', { format: 'md' });

      await new Promise(resolve => setTimeout(resolve, 10));
      expect(callback).toHaveBeenCalled();
    });

    it('emits personas:changed event', async () => {
      const callback = vi.fn();
      bus.subscribe('personas:changed', callback, 'test');

      bus.emit('personas:changed', { count: 5 });

      await new Promise(resolve => setTimeout(resolve, 10));
      expect(callback).toHaveBeenCalled();
    });

    it('emits human:requested event', async () => {
      const callback = vi.fn();
      bus.subscribe('human:requested', callback, 'test');

      bus.emit('human:requested', { prompt: 'Please provide input' });

      await new Promise(resolve => setTimeout(resolve, 10));
      expect(callback).toHaveBeenCalled();
    });

    it('emits human:received event', async () => {
      const callback = vi.fn();
      bus.subscribe('human:received', callback, 'test');

      bus.emit('human:received', { content: 'User input here' });

      await new Promise(resolve => setTimeout(resolve, 10));
      expect(callback).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // MESSAGE LIMITS AND PRUNING (#24)
  // ===========================================================================

  describe('message limits and pruning', () => {
    it('enforces maxMessages limit', () => {
      const limitedBus = new MessageBus({ maxMessages: 10 });
      limitedBus.start('test-session', 'Test goal');

      for (let i = 0; i < 20; i++) {
        limitedBus.addMessage(createMessage({ content: `Message ${i}` }), 'agent-1');
      }

      // Should have pruned to max
      expect(limitedBus.getAllMessages().length).toBeLessThanOrEqual(10);

      limitedBus.stop('cleanup');
    });

    it('tracks pruned message count', () => {
      const limitedBus = new MessageBus({ maxMessages: 10, pruneThreshold: 1.0 });
      limitedBus.start('test-session', 'Test goal');

      for (let i = 0; i < 20; i++) {
        limitedBus.addMessage(createMessage({ content: `Message ${i}` }), 'agent-1');
      }

      expect(limitedBus.getTotalMessageCount()).toBe(20);

      limitedBus.stop('cleanup');
    });

    it('getRecentMessages respects maxMessagesForContext', () => {
      const limitedBus = new MessageBus({ maxMessages: 100, maxMessagesForContext: 5 });
      limitedBus.start('test-session', 'Test goal');

      for (let i = 0; i < 50; i++) {
        limitedBus.addMessage(createMessage({ content: `Message ${i}` }), 'agent-1');
      }

      // Even if we ask for 20, should be capped at 5
      const recent = limitedBus.getRecentMessages(20);
      expect(recent.length).toBe(5);

      limitedBus.stop('cleanup');
    });

    it('setBusConfig updates limits', () => {
      const limitedBus = new MessageBus({ maxMessages: 100 });
      limitedBus.start('test-session', 'Test goal');

      for (let i = 0; i < 50; i++) {
        limitedBus.addMessage(createMessage({ content: `Message ${i}` }), 'agent-1');
      }

      expect(limitedBus.getAllMessages().length).toBe(50);

      // Lower the limit
      limitedBus.setBusConfig({ maxMessages: 20 });

      // Should have pruned
      expect(limitedBus.getAllMessages().length).toBeLessThanOrEqual(20);

      limitedBus.stop('cleanup');
    });

    it('compact aggressively prunes to 50%', () => {
      const limitedBus = new MessageBus({ maxMessages: 100 });
      limitedBus.start('test-session', 'Test goal');

      for (let i = 0; i < 100; i++) {
        limitedBus.addMessage(createMessage({ content: `Message ${i}` }), 'agent-1');
      }

      limitedBus.compact();

      // Should be at ~50 messages after compact
      expect(limitedBus.getAllMessages().length).toBeLessThanOrEqual(50);

      limitedBus.stop('cleanup');
    });

    it('getUsageStats reports accurate statistics', () => {
      const limitedBus = new MessageBus({ maxMessages: 100 });
      limitedBus.start('test-session', 'Test goal');

      for (let i = 0; i < 50; i++) {
        limitedBus.addMessage(createMessage({ content: `Message ${i}` }), 'agent-1');
      }

      const stats = limitedBus.getUsageStats();

      expect(stats.messages.count).toBe(50);
      expect(stats.messages.max).toBe(100);
      expect(stats.messages.usage).toBeCloseTo(0.5);
      expect(stats.memory).toBeDefined();
      expect(stats.subscriptions).toBe(0);

      limitedBus.stop('cleanup');
    });

    it('start resets pruned message count', () => {
      const limitedBus = new MessageBus({ maxMessages: 5, pruneThreshold: 1.0 });
      limitedBus.start('session-1', 'Goal 1');

      for (let i = 0; i < 10; i++) {
        limitedBus.addMessage(createMessage(), 'agent-1');
      }

      expect(limitedBus.getTotalMessageCount()).toBe(10);

      // Restart should reset
      limitedBus.start('session-2', 'Goal 2');

      expect(limitedBus.getTotalMessageCount()).toBe(0);

      limitedBus.stop('cleanup');
    });
  });

  // ===========================================================================
  // VIRTUAL SCROLLING SUPPORT (#24)
  // ===========================================================================

  describe('virtual scrolling', () => {
    let scrollBus: MessageBus;

    beforeEach(() => {
      scrollBus = new MessageBus({ maxMessages: 50, virtualScrollWindow: 10, pruneThreshold: 1.0 });
      scrollBus.start('test-session', 'Test goal');

      // Add 100 messages (50 will be pruned)
      for (let i = 0; i < 100; i++) {
        scrollBus.addMessage(createMessage({ content: `Message ${i}` }), 'agent-1');
      }
    });

    afterEach(() => {
      scrollBus.stop('cleanup');
    });

    it('getMessageWindow returns correct window from available messages', () => {
      const scrollInfo = scrollBus.getScrollInfo();
      const window = scrollBus.getMessageWindow(scrollInfo.availableStart, 10);

      expect(window.length).toBe(10);
      expect(window[0].content).toBe('Message 50'); // First available after pruning
    });

    it('getScrollInfo reports virtual scroll boundaries', () => {
      const info = scrollBus.getScrollInfo();

      expect(info.totalCount).toBe(100);
      expect(info.prunedCount).toBe(50);
      expect(info.availableStart).toBe(50);
      expect(info.availableEnd).toBe(99);
    });

    it('getMessageWindow handles out of range start', () => {
      // Request pruned messages
      const window = scrollBus.getMessageWindow(0, 10);

      // Should return what's available or empty
      expect(window.length).toBeLessThanOrEqual(10);
    });

    it('getMessageWindow handles end of list', () => {
      const scrollInfo = scrollBus.getScrollInfo();
      const window = scrollBus.getMessageWindow(scrollInfo.availableEnd - 5, 10);

      // Should return remaining messages
      expect(window.length).toBeLessThanOrEqual(10);
    });

    it('getMessageWindow uses default window size from config', () => {
      const window = scrollBus.getMessageWindow(50); // No count specified

      expect(window.length).toBe(10); // Uses virtualScrollWindow config
    });
  });

  // ===========================================================================
  // INACTIVE AGENT CLEANUP (#24)
  // ===========================================================================

  describe('inactive agent cleanup', () => {
    beforeEach(() => {
      bus.start('test-session', 'Test goal');
    });

    it('clearInactiveAgents removes unused agents from memory', async () => {
      // Add messages from multiple agents
      bus.addMessage(createMessage({ agentId: 'agent-1', content: 'Hello' }), 'agent-1');
      bus.addMessage(createMessage({ agentId: 'agent-2', content: 'Hi there' }), 'agent-2');
      bus.addMessage(createMessage({ agentId: 'agent-3', content: 'Greetings' }), 'agent-3');

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 50));

      // Clear inactive (keep only agent-1)
      bus.clearInactiveAgents(new Set(['agent-1']));

      // Memory context should only have agent-1 data
      const context = bus.getMemoryContext('agent-1');
      expect(typeof context).toBe('string');
    });
  });

  // ===========================================================================
  // CONFIGURATION (#24)
  // ===========================================================================

  describe('configuration', () => {
    it('getConfig returns current configuration', () => {
      const config = bus.getConfig();

      expect(config.bus).toBeDefined();
      expect(config.bus.maxMessages).toBeDefined();
      expect(config.memory).toBeDefined();
      expect(config.memory.maxSummaries).toBeDefined();
    });

    it('setMemoryConfig updates memory limits', () => {
      bus.setMemoryConfig({ maxSummaries: 5 });

      const config = bus.getConfig();
      expect(config.memory.maxSummaries).toBe(5);
    });

    it('accepts partial bus config in constructor', () => {
      const customBus = new MessageBus({ maxMessages: 200 });
      const config = customBus.getConfig();

      expect(config.bus.maxMessages).toBe(200);
      // Defaults should still be set
      expect(config.bus.maxMessagesForContext).toBeDefined();

      customBus.stop('cleanup');
    });

    it('accepts partial memory config in constructor', () => {
      const customBus = new MessageBus(undefined, { maxDecisions: 10 });
      const config = customBus.getConfig();

      expect(config.memory.maxDecisions).toBe(10);
      // Defaults should still be set
      expect(config.memory.maxSummaries).toBeDefined();

      customBus.stop('cleanup');
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('edge cases', () => {
    it('handles rapid subscribe/unsubscribe', () => {
      const unsubs: (() => void)[] = [];

      for (let i = 0; i < 100; i++) {
        unsubs.push(bus.subscribe('message:new', () => {}, `sub-${i}`));
      }

      expect(bus.getSubscriberCount('message:new')).toBe(100);

      // Unsubscribe in random order
      while (unsubs.length > 0) {
        const idx = Math.floor(Math.random() * unsubs.length);
        unsubs[idx]();
        unsubs.splice(idx, 1);
      }

      expect(bus.getSubscriberCount('message:new')).toBe(0);
    });

    it('handles large message history', () => {
      // Use a bus with high limit for this test
      const largeBus = new MessageBus({ maxMessages: 2000 });
      largeBus.start('test-session', 'Test goal');

      for (let i = 0; i < 1000; i++) {
        largeBus.addMessage(createMessage({ content: `Message ${i}` }), 'agent-1');
      }

      expect(largeBus.getAllMessages()).toHaveLength(1000);
      expect(largeBus.getRecentMessages(10)).toHaveLength(10);

      largeBus.stop('cleanup');
    });

    it('can be restarted multiple times', () => {
      bus.start('session-1', 'Goal 1');
      bus.addMessage(createMessage(), 'agent-1');
      bus.stop('done');

      bus.start('session-2', 'Goal 2');
      expect(bus.active).toBe(true);
      expect(bus.getAllMessages()).toHaveLength(0);
      bus.stop('done');

      bus.start('session-3', 'Goal 3');
      expect(bus.active).toBe(true);
      bus.stop('done');
    });

    it('handles concurrent emit calls', async () => {
      bus.start('test-session', 'Test goal');
      const receivedMessages: string[] = [];

      bus.subscribe('message:new', (payload) => {
        receivedMessages.push(payload.message.content);
      }, 'test');

      // Emit multiple messages concurrently
      const messages = Array.from({ length: 10 }, (_, i) =>
        createMessage({ content: `Message ${i}` })
      );

      messages.forEach((msg) => {
        bus.emit('message:new', { message: msg, fromAgent: 'agent-1' });
      });

      // Wait for all async dispatches
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(receivedMessages).toHaveLength(10);
    });
  });
});
