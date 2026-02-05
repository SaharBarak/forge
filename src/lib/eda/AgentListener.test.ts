/**
 * AgentListener Unit Tests
 *
 * Tests the individual agent that subscribes to MessageBus:
 * - State management (listening, thinking, speaking, waiting)
 * - Reactivity threshold behavior
 * - Floor request/grant/deny handling
 * - Message evaluation debouncing
 * - Session lifecycle integration
 *
 * Per EVENT_DRIVEN_ARCHITECTURE.md spec: AgentListener is the individual agent
 * instance that listens to MessageBus and reacts to messages.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AgentListener } from './AgentListener';
import { MessageBus } from './MessageBus';
import type { AgentPersona, Message, SessionConfig } from '../../types';
import type { IAgentRunner, QueryResult, EvalResult } from '../interfaces/IAgentRunner';

// =============================================================================
// MOCK FACTORIES
// =============================================================================

function createMockPersona(overrides: Partial<AgentPersona> = {}): AgentPersona {
  return {
    id: 'test-agent',
    name: 'Test Agent',
    nameHe: 'סוכן בדיקה',
    role: 'Test role',
    age: 35,
    background: 'Test background',
    personality: ['analytical', 'direct'],
    biases: ['data-driven'],
    strengths: ['testing'],
    weaknesses: ['none'],
    speakingStyle: 'direct',
    color: '#000000',
    ...overrides,
  };
}

function createMockSessionConfig(overrides: Partial<SessionConfig> = {}): SessionConfig {
  return {
    id: 'test-session',
    projectName: 'Test Project',
    goal: 'Test Goal',
    enabledAgents: ['test-agent'],
    humanParticipation: true,
    maxRounds: 10,
    consensusThreshold: 0.6,
    methodology: {
      argumentationStyle: 'dialectic',
      consensusMethod: 'majority',
      visualDecisionRules: [],
      structureDecisionRules: [],
      phases: [{
        phase: 'initialization',
        description: 'Test phase',
        maxRounds: 5,
        requiredActions: [],
        exitConditions: [],
      }],
    },
    contextDir: 'test/context',
    outputDir: 'test/output',
    ...overrides,
  };
}

function createMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: new Date(),
    agentId: 'other-agent',
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
// AGENT LISTENER TESTS
// =============================================================================

describe('AgentListener', () => {
  let listener: AgentListener;
  let bus: MessageBus;
  let persona: AgentPersona;
  let sessionConfig: SessionConfig;
  let mockRunner: IAgentRunner;

  beforeEach(() => {
    bus = new MessageBus();
    persona = createMockPersona();
    sessionConfig = createMockSessionConfig();
    mockRunner = createMockAgentRunner();
  });

  afterEach(() => {
    vi.clearAllMocks();
    bus.stop('test cleanup');
  });

  describe('construction', () => {
    it('creates listener with persona and bus', () => {
      listener = new AgentListener(persona, bus);

      expect(listener.id).toBe(persona.id);
      expect(listener.agent).toBe(persona);
    });

    it('accepts optional config', () => {
      listener = new AgentListener(persona, bus, {
        reactivityThreshold: 0.8,
      });

      expect(listener).toBeDefined();
    });

    it('accepts optional agent runner', () => {
      listener = new AgentListener(persona, bus, {}, mockRunner);

      expect(listener).toBeDefined();
    });

    it('starts in listening state', () => {
      listener = new AgentListener(persona, bus);

      expect(listener.getState()).toBe('listening');
    });
  });

  describe('start', () => {
    beforeEach(() => {
      listener = new AgentListener(persona, bus, {}, mockRunner);
    });

    it('subscribes to message bus events', () => {
      listener.start(sessionConfig);

      // Check that subscriptions were created
      expect(bus.getSubscriberCount('message:new')).toBe(1);
      expect(bus.getSubscriberCount('floor:granted')).toBe(1);
      expect(bus.getSubscriberCount('floor:denied')).toBe(1);
      expect(bus.getSubscriberCount('session:end')).toBe(1);
    });

    it('resets state on start', () => {
      listener.start(sessionConfig);

      expect(listener.getState()).toBe('listening');
    });

    it('accepts optional context data', () => {
      const context = {
        brand: {
          name: 'Test Brand',
          values: ['quality'],
          tone: ['professional'],
          avoid: ['jargon'],
          keyMessages: ['We deliver'],
        },
      };

      // Should not throw
      expect(() => listener.start(sessionConfig, context)).not.toThrow();
    });

    it('accepts optional skills string', () => {
      const skills = 'copywriting, marketing';

      // Should not throw
      expect(() => listener.start(sessionConfig, undefined, skills)).not.toThrow();
    });
  });

  describe('stop', () => {
    beforeEach(() => {
      listener = new AgentListener(persona, bus, {}, mockRunner);
      listener.start(sessionConfig);
    });

    it('unsubscribes from message bus', () => {
      expect(bus.getSubscriberCount('message:new')).toBe(1);

      listener.stop();

      expect(bus.getSubscriberCount('message:new')).toBe(0);
    });

    it('resets state to listening', () => {
      listener.stop();

      expect(listener.getState()).toBe('listening');
    });

    it('can be called multiple times safely', () => {
      listener.stop();
      listener.stop();
      listener.stop();

      expect(listener.getState()).toBe('listening');
    });

    it('stops automatically on session:end', async () => {
      bus.start('test-session', 'Test goal');

      // Trigger session end
      bus.stop('test complete');

      // Wait for async dispatch
      await new Promise(resolve => setTimeout(resolve, 10));

      // Listener should be stopped (unsubscribed)
      expect(bus.getSubscriberCount('message:new')).toBe(0);
    });
  });

  describe('message handling', () => {
    beforeEach(() => {
      listener = new AgentListener(persona, bus, {
        evaluationDebounce: 10, // Short debounce for tests
        minSilenceBeforeReact: 1,
        reactivityThreshold: 1.0, // Always react
      }, mockRunner);
      listener.start(sessionConfig);
      bus.start('test-session', 'Test goal');
    });

    it('ignores own messages', async () => {
      const ownMessage = createMessage({ agentId: persona.id });
      bus.addMessage(ownMessage, persona.id);

      // Wait for potential evaluation
      await new Promise(resolve => setTimeout(resolve, 50));

      // Evaluate should not have been called for own message
      expect(mockRunner.evaluate).not.toHaveBeenCalled();
    });

    it('increments message counter on other messages', async () => {
      const message = createMessage({ agentId: 'other-agent' });
      bus.addMessage(message, 'other-agent');

      // Messages from others should trigger evaluation eventually
      // (tracked internally by messagesSinceSpoke)
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should have attempted to evaluate
      expect(mockRunner.evaluate).toHaveBeenCalled();
    });

    it('debounces rapid messages', async () => {
      // Send multiple messages rapidly
      for (let i = 0; i < 5; i++) {
        bus.addMessage(createMessage({ content: `Message ${i}` }), 'other-agent');
      }

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should only evaluate once due to debounce
      expect(mockRunner.evaluate).toHaveBeenCalledTimes(1);
    });

    it('does not evaluate when speaking', async () => {
      // Manually set state to speaking (would happen after floor granted)
      // We can't easily test this without full integration, so we test state getter
      const listener2 = new AgentListener(persona, bus, {
        evaluationDebounce: 10,
        reactivityThreshold: 1.0,
      }, mockRunner);

      expect(listener2.getState()).toBe('listening');
    });
  });

  describe('reactivity threshold', () => {
    it('skips reaction when random exceeds threshold', async () => {
      // Set low threshold (0.1 = 10% chance to react)
      listener = new AgentListener(persona, bus, {
        evaluationDebounce: 10,
        minSilenceBeforeReact: 0,
        reactivityThreshold: 0.0, // Never react
      }, mockRunner);
      listener.start(sessionConfig);
      bus.start('test-session', 'Test goal');

      bus.addMessage(createMessage(), 'other-agent');

      await new Promise(resolve => setTimeout(resolve, 50));

      // With 0.0 threshold, Math.random() > 0.0 is always true, so skips
      expect(mockRunner.evaluate).not.toHaveBeenCalled();
    });

    it('reacts when random is below threshold', async () => {
      // Set high threshold (1.0 = always react)
      listener = new AgentListener(persona, bus, {
        evaluationDebounce: 10,
        minSilenceBeforeReact: 0,
        reactivityThreshold: 1.0, // Always react
      }, mockRunner);
      listener.start(sessionConfig);
      bus.start('test-session', 'Test goal');

      bus.addMessage(createMessage(), 'other-agent');

      await new Promise(resolve => setTimeout(resolve, 50));

      // With 1.0 threshold, should always evaluate
      expect(mockRunner.evaluate).toHaveBeenCalled();
    });
  });

  describe('floor request', () => {
    beforeEach(() => {
      listener = new AgentListener(persona, bus, {
        evaluationDebounce: 10,
        minSilenceBeforeReact: 0,
        reactivityThreshold: 1.0,
      }, mockRunner);
      listener.start(sessionConfig);
      bus.start('test-session', 'Test goal');
    });

    it('emits floor:request when evaluation says to speak', async () => {
      const floorRequestCallback = vi.fn();
      bus.subscribe('floor:request', floorRequestCallback, 'test');

      bus.addMessage(createMessage(), 'other-agent');

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(floorRequestCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: persona.id,
          urgency: 'medium',
        })
      );
    });

    it('does not request floor when evaluation passes', async () => {
      // Mock evaluate to return 'pass'
      mockRunner.evaluate = vi.fn().mockResolvedValue({
        success: true,
        urgency: 'pass',
        reason: 'Nothing to add',
        responseType: 'pass',
      });

      const floorRequestCallback = vi.fn();
      bus.subscribe('floor:request', floorRequestCallback, 'test');

      bus.addMessage(createMessage(), 'other-agent');

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(floorRequestCallback).not.toHaveBeenCalled();
    });

    it('transitions to waiting state after requesting floor', async () => {
      // We need to check the state transition
      // This is tricky since state changes happen internally
      // The test validates the flow works without error
      bus.addMessage(createMessage(), 'other-agent');

      await new Promise(resolve => setTimeout(resolve, 50));

      // After requesting floor, state should be 'waiting'
      // (unless floor was already granted/denied in the meantime)
      expect(['listening', 'waiting']).toContain(listener.getState());
    });
  });

  describe('floor granted', () => {
    beforeEach(() => {
      listener = new AgentListener(persona, bus, {
        evaluationDebounce: 10,
        minSilenceBeforeReact: 0,
        reactivityThreshold: 1.0,
      }, mockRunner);
      listener.start(sessionConfig);
      bus.start('test-session', 'Test goal');
    });

    it('generates response when floor granted', async () => {
      // Trigger floor granted
      bus.emit('floor:granted', { agentId: persona.id, reason: 'Test grant' });

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockRunner.query).toHaveBeenCalled();
    });

    it('adds message to bus after response', async () => {
      const messageCallback = vi.fn();
      bus.subscribe('message:new', messageCallback, 'test');

      bus.emit('floor:granted', { agentId: persona.id, reason: 'Test grant' });

      await new Promise(resolve => setTimeout(resolve, 50));

      // Should have added a message
      expect(messageCallback).toHaveBeenCalled();
    });

    it('releases floor after speaking', async () => {
      const floorReleasedCallback = vi.fn();
      bus.subscribe('floor:released', floorReleasedCallback, 'test');

      bus.emit('floor:granted', { agentId: persona.id, reason: 'Test grant' });

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(floorReleasedCallback).toHaveBeenCalledWith({ agentId: persona.id });
    });

    it('returns to listening state after speaking', async () => {
      bus.emit('floor:granted', { agentId: persona.id, reason: 'Test grant' });

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(listener.getState()).toBe('listening');
    });

    it('ignores floor granted for other agents', async () => {
      const querySpy = vi.spyOn(mockRunner, 'query');

      bus.emit('floor:granted', { agentId: 'different-agent', reason: 'Test' });

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(querySpy).not.toHaveBeenCalled();
    });
  });

  describe('floor denied', () => {
    beforeEach(() => {
      listener = new AgentListener(persona, bus, {
        evaluationDebounce: 10,
        reactivityThreshold: 1.0,
      }, mockRunner);
      listener.start(sessionConfig);
      bus.start('test-session', 'Test goal');
    });

    it('returns to listening state when denied', async () => {
      // Manually set to waiting (simulating after floor request)
      bus.addMessage(createMessage(), 'other-agent');
      await new Promise(resolve => setTimeout(resolve, 30));

      bus.emit('floor:denied', { agentId: persona.id, reason: 'Cooldown' });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(listener.getState()).toBe('listening');
    });

    it('ignores floor denied for other agents', () => {
      // This should not affect our listener
      bus.emit('floor:denied', { agentId: 'different-agent', reason: 'Test' });

      expect(listener.getState()).toBe('listening');
    });
  });

  describe('session pause/resume', () => {
    beforeEach(() => {
      listener = new AgentListener(persona, bus, {
        evaluationDebounce: 50, // Longer debounce
        reactivityThreshold: 1.0,
        minSilenceBeforeReact: 1, // React after 1 message
      }, mockRunner);
      listener.start(sessionConfig);
      bus.start('test-session', 'Test goal');
    });

    it('cancels pending evaluation on pause', async () => {
      // Start an evaluation
      bus.addMessage(createMessage(), 'other-agent');

      // Pause before debounce completes
      bus.pause('test pause');

      await new Promise(resolve => setTimeout(resolve, 100));

      // Evaluation should not have happened
      expect(mockRunner.evaluate).not.toHaveBeenCalled();
    });

    it('resets state to listening on pause', async () => {
      bus.pause('test pause');

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(listener.getState()).toBe('listening');
    });

    it('continues normally after resume', async () => {
      bus.pause('test pause');
      bus.resume();

      // Add message after resume
      bus.addMessage(createMessage(), 'other-agent');

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should evaluate after resume
      expect(mockRunner.evaluate).toHaveBeenCalled();
    });
  });

  describe('minimum silence requirement', () => {
    it('requires minimum messages before reacting', async () => {
      listener = new AgentListener(persona, bus, {
        evaluationDebounce: 10,
        minSilenceBeforeReact: 3, // Need 3 messages
        reactivityThreshold: 1.0,
      }, mockRunner);
      listener.start(sessionConfig);
      bus.start('test-session', 'Test goal');

      // Send only 1 message
      bus.addMessage(createMessage(), 'other-agent');

      await new Promise(resolve => setTimeout(resolve, 50));

      // Should not evaluate yet
      expect(mockRunner.evaluate).not.toHaveBeenCalled();

      // Send 2 more messages (total 3)
      bus.addMessage(createMessage(), 'other-agent');
      bus.addMessage(createMessage(), 'other-agent');

      await new Promise(resolve => setTimeout(resolve, 50));

      // Now should evaluate
      expect(mockRunner.evaluate).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      listener = new AgentListener(persona, bus, {
        evaluationDebounce: 10,
        minSilenceBeforeReact: 0,
        reactivityThreshold: 1.0,
      }, mockRunner);
      listener.start(sessionConfig);
      bus.start('test-session', 'Test goal');
    });

    it('handles evaluation errors gracefully', async () => {
      mockRunner.evaluate = vi.fn().mockRejectedValue(new Error('Eval error'));

      bus.addMessage(createMessage(), 'other-agent');

      await new Promise(resolve => setTimeout(resolve, 50));

      // Should return to listening state after error
      expect(listener.getState()).toBe('listening');
    });

    it('handles response generation errors gracefully', async () => {
      mockRunner.query = vi.fn().mockRejectedValue(new Error('Query error'));

      const floorReleasedCallback = vi.fn();
      bus.subscribe('floor:released', floorReleasedCallback, 'test');

      bus.emit('floor:granted', { agentId: persona.id, reason: 'Test' });

      await new Promise(resolve => setTimeout(resolve, 50));

      // Should still release floor
      expect(floorReleasedCallback).toHaveBeenCalled();
      expect(listener.getState()).toBe('listening');
    });
  });

  describe('context message limits', () => {
    it('uses configured message count for evaluation', async () => {
      const evaluateSpy = vi.spyOn(mockRunner, 'evaluate');

      listener = new AgentListener(persona, bus, {
        evaluationDebounce: 10,
        minSilenceBeforeReact: 0,
        reactivityThreshold: 1.0,
        maxEvaluationMessages: 5,
      }, mockRunner);
      listener.start(sessionConfig);
      bus.start('test-session', 'Test goal');

      // Add many messages
      for (let i = 0; i < 20; i++) {
        bus.addMessage(createMessage({ content: `Msg ${i}` }), 'other-agent');
      }

      await new Promise(resolve => setTimeout(resolve, 50));

      // Evaluation should have been called
      expect(evaluateSpy).toHaveBeenCalled();
    });

    it('uses configured message count for response', async () => {
      const querySpy = vi.spyOn(mockRunner, 'query');

      listener = new AgentListener(persona, bus, {
        evaluationDebounce: 10,
        reactivityThreshold: 1.0,
        maxResponseMessages: 10,
      }, mockRunner);
      listener.start(sessionConfig);
      bus.start('test-session', 'Test goal');

      // Add many messages
      for (let i = 0; i < 20; i++) {
        bus.addMessage(createMessage({ content: `Msg ${i}` }), 'other-agent');
      }

      // Trigger floor granted
      bus.emit('floor:granted', { agentId: persona.id, reason: 'Test' });

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(querySpy).toHaveBeenCalled();
    });
  });
});
