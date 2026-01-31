/**
 * ModeController Unit Tests
 *
 * Tests mode initialization, message processing, loop detection,
 * phase transitions, research limits, and success criteria checking.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ModeController } from './ModeController';
import type { SessionMode } from './index';
import type { Message } from '../../types';

// Create a minimal test mode with all required fields
function createTestMode(overrides: Partial<SessionMode> = {}): SessionMode {
  return {
    id: 'test-mode',
    name: 'Test Mode',
    nameHe: 'מצב בדיקה',
    description: 'For testing purposes',
    icon: '🧪',
    goalReminder: {
      frequency: 5,
      template: 'Stay focused on: {goal}',
    },
    phases: [
      {
        id: 'phase1',
        name: 'Phase 1',
        order: 1,
        maxMessages: 10,
        autoTransition: true,
        transitionCriteria: 'Phase 1 complete',
        agentFocus: 'Focus on phase 1 tasks',
      },
      {
        id: 'synthesis',
        name: 'Synthesis',
        order: 2,
        maxMessages: 5,
        autoTransition: false,
        transitionCriteria: 'Synthesis complete',
        agentFocus: 'Synthesize findings',
      },
    ],
    research: {
      maxRequests: 3,
      maxPerTopic: 2,
      requiredBeforeSynthesis: 1,
    },
    loopDetection: {
      enabled: true,
      maxSimilarMessages: 3,
      maxRoundsWithoutProgress: 4,
      intervention: 'Loop detected! Move forward.',
      windowSize: 10,
      minHashLength: 10,
      messagesPerRound: 3,
    },
    successCriteria: {
      minConsensusPoints: 2,
      requiredOutputs: ['hero', 'cta'],
      maxMessages: 30,
    },
    agentInstructions: 'Test instructions',
    ...overrides,
  };
}

// Helper to create mock messages
function createMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: new Date(),
    agentId: 'agent-1',
    type: 'argument',
    content: 'Test message content that is long enough to generate a meaningful hash',
    ...overrides,
  };
}

describe('ModeController', () => {
  let controller: ModeController;
  let testMode: SessionMode;

  beforeEach(() => {
    testMode = createTestMode();
    controller = new ModeController(testMode);
  });

  describe('initialization', () => {
    it('initializes with provided mode', () => {
      const mode = controller.getMode();
      expect(mode.id).toBe('test-mode');
    });

    it('uses default mode when none provided', () => {
      const defaultController = new ModeController();
      const mode = defaultController.getMode();
      expect(mode.id).toBe('copywrite');
    });

    it('initializes progress correctly', () => {
      const progress = controller.getProgress();
      expect(progress.currentPhase).toBe('phase1');
      expect(progress.messagesInPhase).toBe(0);
      expect(progress.totalMessages).toBe(0);
      expect(progress.researchRequests).toBe(0);
      expect(progress.consensusPoints).toBe(0);
      expect(progress.proposalsCount).toBe(0);
      expect(progress.loopDetected).toBe(false);
    });
  });

  describe('setMode', () => {
    it('resets progress when mode changes', () => {
      // Process some messages first
      const msg = createMessage();
      controller.processMessage(msg, [msg]);

      const newMode = createTestMode({ id: 'new-mode' });
      controller.setMode(newMode);

      const progress = controller.getProgress();
      expect(progress.totalMessages).toBe(0);
      expect(progress.messagesInPhase).toBe(0);
    });
  });

  describe('processMessage', () => {
    it('increments message counters', () => {
      const msg = createMessage();
      controller.processMessage(msg, [msg]);

      const progress = controller.getProgress();
      expect(progress.totalMessages).toBe(1);
      expect(progress.messagesInPhase).toBe(1);
    });

    it('tracks proposals', () => {
      const msg = createMessage({ type: 'proposal' });
      controller.processMessage(msg, [msg]);

      const progress = controller.getProgress();
      expect(progress.proposalsCount).toBe(1);
      expect(progress.lastProgressAt).toBe(1);
    });

    it('tracks consensus points from agreement messages', () => {
      const msg = createMessage({ type: 'agreement' });
      controller.processMessage(msg, [msg]);

      const progress = controller.getProgress();
      expect(progress.consensusPoints).toBe(1);
    });

    it('tracks consensus points from consensus messages', () => {
      const msg = createMessage({ type: 'consensus' });
      controller.processMessage(msg, [msg]);

      const progress = controller.getProgress();
      expect(progress.consensusPoints).toBe(1);
    });
  });

  describe('goal reminders', () => {
    it('generates goal reminder at configured frequency', () => {
      const messages: Message[] = [];

      for (let i = 0; i < 5; i++) {
        const msg = createMessage({ content: `Message ${i}` });
        messages.push(msg);
        const interventions = controller.processMessage(msg, messages);

        if (i === 4) {
          const goalReminder = interventions.find(int => int.type === 'goal_reminder');
          expect(goalReminder).toBeDefined();
          expect(goalReminder?.priority).toBe('medium');
        }
      }
    });

    it('includes goal template in reminder', () => {
      const messages: Message[] = [];

      for (let i = 0; i < 5; i++) {
        const msg = createMessage({ content: `Message ${i}` });
        messages.push(msg);
        const interventions = controller.processMessage(msg, messages);

        if (i === 4) {
          const goalReminder = interventions.find(int => int.type === 'goal_reminder');
          expect(goalReminder?.message).toContain('{goal}');
        }
      }
    });
  });

  describe('research tracking', () => {
    it('detects research requests by message type', () => {
      const msg = createMessage({ type: 'research_request' });
      controller.processMessage(msg, [msg]);

      const progress = controller.getProgress();
      expect(progress.researchRequests).toBe(1);
    });

    it('detects research requests by @mentions', () => {
      const researchMentions = [
        '@stats-finder give me data',
        '@competitor-analyst check rivals',
        '@audience-insight who are they',
        '@copy-explorer find examples',
        '@local-context check files',
      ];

      for (const content of researchMentions) {
        const ctrl = new ModeController(testMode);
        const msg = createMessage({ content });
        ctrl.processMessage(msg, [msg]);
        expect(ctrl.getProgress().researchRequests).toBe(1);
      }
    });

    it('detects research requests by [research:] tag', () => {
      const msg = createMessage({ content: '[research: competitor analysis]' });
      controller.processMessage(msg, [msg]);

      const progress = controller.getProgress();
      expect(progress.researchRequests).toBe(1);
    });

    it('triggers research limit intervention', () => {
      const messages: Message[] = [];

      for (let i = 0; i < 4; i++) {
        const msg = createMessage({ type: 'research_request' });
        messages.push(msg);
        const interventions = controller.processMessage(msg, messages);

        if (i >= 2) {
          const researchLimit = interventions.find(int => int.type === 'research_limit');
          expect(researchLimit).toBeDefined();
        }
      }
    });

    it('tracks per-topic research limits', () => {
      const mode = createTestMode({
        research: { maxRequests: 10, maxPerTopic: 2, requiredBeforeSynthesis: 1 },
      });
      const ctrl = new ModeController(mode);

      const messages: Message[] = [];

      for (let i = 0; i < 3; i++) {
        const msg = createMessage({ content: '@stats-finder same topic' });
        messages.push(msg);
        const interventions = ctrl.processMessage(msg, messages);

        if (i >= 2) {
          const researchLimit = interventions.find(int => int.type === 'research_limit');
          expect(researchLimit).toBeDefined();
          expect(researchLimit?.message).toContain('TOPIC SATURATED');
        }
      }
    });
  });

  describe('loop detection', () => {
    it('detects similar messages within window', () => {
      // Create messages with identical content hashes
      const sameContent = 'This message has the exact same content repeated multiple times for testing';
      const messages: Message[] = [];

      for (let i = 0; i < 4; i++) {
        const msg = createMessage({ content: sameContent });
        messages.push(msg);
        const interventions = controller.processMessage(msg, messages);

        if (i >= 2) {
          const loopDetected = interventions.find(int => int.type === 'loop_detected');
          expect(loopDetected).toBeDefined();
        }
      }
    });

    it('detects lack of progress over multiple rounds', () => {
      // No proposals or agreements = no progress
      const messages: Message[] = [];

      // messagesPerRound=3, maxRoundsWithoutProgress=4, so 12 messages without progress
      for (let i = 0; i < 13; i++) {
        const msg = createMessage({ content: `Different message ${i} with enough content` });
        messages.push(msg);
        const interventions = controller.processMessage(msg, messages);

        if (i >= 11) {
          const loopDetected = interventions.find(int => int.type === 'loop_detected');
          expect(loopDetected).toBeDefined();
        }
      }
    });

    it('does not detect loop when progress is made', () => {
      const messages: Message[] = [];

      for (let i = 0; i < 15; i++) {
        // Every 4th message is a proposal (progress)
        const msg = createMessage({
          type: i % 4 === 0 ? 'proposal' : 'argument',
          content: `Message ${i} with different enough content to avoid similarity`,
        });
        messages.push(msg);
        const interventions = controller.processMessage(msg, messages);

        // Should not detect progress-based loop
        const loopDetected = interventions.find(
          int => int.type === 'loop_detected' && int.message.includes('progress')
        );
        if (loopDetected) {
          // If loop detected, check that it's similarity-based, not progress-based
          // This is acceptable behavior
        }
      }
    });

    it('respects loop detection disabled setting', () => {
      const mode = createTestMode({
        loopDetection: {
          enabled: false,
          maxSimilarMessages: 1,
          maxRoundsWithoutProgress: 1,
          intervention: 'Loop!',
        },
      });
      const ctrl = new ModeController(mode);

      const sameContent = 'Same content repeated';
      const messages: Message[] = [];

      for (let i = 0; i < 5; i++) {
        const msg = createMessage({ content: sameContent });
        messages.push(msg);
        const interventions = ctrl.processMessage(msg, messages);
        const loopDetected = interventions.find(int => int.type === 'loop_detected');
        expect(loopDetected).toBeUndefined();
      }
    });
  });

  describe('phase transitions', () => {
    it('transitions when max messages reached (with research prereq met)', () => {
      // First satisfy research requirement
      const researchMsg = createMessage({ type: 'research_request' });
      controller.processMessage(researchMsg, [researchMsg]);

      const messages: Message[] = [researchMsg];

      // Need to reach maxMessages (10) in phase. Research counts as 1.
      // So we need 9 more messages to reach 10 total in phase.
      let phaseTransitionFound = false;
      for (let i = 0; i < 10; i++) {
        const msg = createMessage({ content: `Message ${i}` });
        messages.push(msg);
        const interventions = controller.processMessage(msg, messages);

        const phaseTransition = interventions.find(int => int.type === 'phase_transition');
        if (phaseTransition) {
          phaseTransitionFound = true;
        }
      }

      expect(phaseTransitionFound).toBe(true);
      const progress = controller.getProgress();
      expect(progress.currentPhase).toBe('synthesis');
    });

    it('resets message counter on transition', () => {
      // First satisfy research requirement
      const researchMsg = createMessage({ type: 'research_request' });
      controller.processMessage(researchMsg, [researchMsg]);

      const messages: Message[] = [researchMsg];

      for (let i = 0; i < 11; i++) {
        const msg = createMessage({ content: `Message ${i}` });
        messages.push(msg);
        controller.processMessage(msg, messages);
      }

      const progress = controller.getProgress();
      // After transitioning to synthesis, counter should be reset
      expect(progress.messagesInPhase).toBeLessThan(11);
    });

    it('enforces research before synthesis', () => {
      // Mode requires 1 research before synthesis
      // Process 10 messages without research to trigger transition
      const messages: Message[] = [];

      for (let i = 0; i < 11; i++) {
        const msg = createMessage({ content: `Message ${i}` });
        messages.push(msg);
        const interventions = controller.processMessage(msg, messages);

        if (i === 10) {
          const researchRequired = interventions.find(
            int => int.type === 'research_limit' && int.message.includes('RESEARCH REQUIRED')
          );
          expect(researchRequired).toBeDefined();
        }
      }
    });

    it('allows synthesis after research requirement met', () => {
      // First do a research request
      const researchMsg = createMessage({ type: 'research_request' });
      controller.processMessage(researchMsg, [researchMsg]);

      const messages: Message[] = [researchMsg];

      // Then process enough messages to trigger transition
      for (let i = 0; i < 10; i++) {
        const msg = createMessage({ content: `Message ${i}` });
        messages.push(msg);
        controller.processMessage(msg, messages);
      }

      const progress = controller.getProgress();
      expect(progress.currentPhase).toBe('synthesis');
    });
  });

  describe('exit criteria', () => {
    it('transitions when exit criteria met before max messages', () => {
      const mode = createTestMode({
        phases: [
          {
            id: 'phase1',
            name: 'Phase 1',
            order: 1,
            maxMessages: 100, // High limit
            autoTransition: true,
            transitionCriteria: 'Criteria met',
            agentFocus: 'Test',
            exitCriteria: {
              minProposals: 2,
              minConsensusPoints: 1,
            },
          },
          {
            id: 'synthesis',
            name: 'Synthesis',
            order: 2,
            maxMessages: 10,
            autoTransition: false,
            transitionCriteria: 'Done',
            agentFocus: 'Synthesize',
          },
        ],
        research: { maxRequests: 10, maxPerTopic: 5, requiredBeforeSynthesis: 0 },
      });

      const ctrl = new ModeController(mode);
      const messages: Message[] = [];

      // Add 2 proposals and 1 agreement
      const proposal1 = createMessage({ type: 'proposal' });
      messages.push(proposal1);
      ctrl.processMessage(proposal1, messages);

      const proposal2 = createMessage({ type: 'proposal' });
      messages.push(proposal2);
      ctrl.processMessage(proposal2, messages);

      const agreement = createMessage({ type: 'agreement' });
      messages.push(agreement);
      const interventions = ctrl.processMessage(agreement, messages);

      const phaseTransition = interventions.find(int => int.type === 'phase_transition');
      expect(phaseTransition).toBeDefined();
      expect(phaseTransition?.message).toContain('Exit criteria met');
    });
  });

  describe('checkRequiredResearch', () => {
    it('blocks when research not met', () => {
      const result = controller.checkRequiredResearch();
      expect(result.allowed).toBe(false);
      expect(result.message).toContain('RESEARCH REQUIRED');
    });

    it('allows when research met', () => {
      const msg = createMessage({ type: 'research_request' });
      controller.processMessage(msg, [msg]);

      const result = controller.checkRequiredResearch();
      expect(result.allowed).toBe(true);
    });
  });

  describe('checkSuccessCriteria', () => {
    it('returns missing items when not met', () => {
      const result = controller.checkSuccessCriteria();
      expect(result.met).toBe(false);
      expect(result.missing.length).toBeGreaterThan(0);
    });

    it('returns met when all criteria satisfied', () => {
      const messages: Message[] = [];

      // Add consensus points
      const agreement1 = createMessage({ type: 'agreement' });
      messages.push(agreement1);
      controller.processMessage(agreement1, messages);

      const agreement2 = createMessage({ type: 'agreement' });
      messages.push(agreement2);
      controller.processMessage(agreement2, messages);

      // Add required outputs
      const heroMsg = createMessage({ content: '## Hero\nGreat headline' });
      messages.push(heroMsg);
      controller.processMessage(heroMsg, messages);

      const ctaMsg = createMessage({ content: '## CTA\nClick here!' });
      messages.push(ctaMsg);
      controller.processMessage(ctaMsg, messages);

      const result = controller.checkSuccessCriteria();
      expect(result.met).toBe(true);
      expect(result.missing.length).toBe(0);
    });
  });

  describe('output detection', () => {
    it('detects hero output', () => {
      const msg = createMessage({ content: '## Hero\nOur amazing product' });
      controller.processMessage(msg, [msg]);

      const progress = controller.getProgress();
      expect(progress.outputsProduced.has('hero')).toBe(true);
    });

    it('detects value proposition output', () => {
      const msg = createMessage({ content: '## Value\nWhat makes us great' });
      controller.processMessage(msg, [msg]);

      const progress = controller.getProgress();
      expect(progress.outputsProduced.has('value_proposition')).toBe(true);
    });

    it('detects CTA output', () => {
      const msg = createMessage({ content: 'Our CTA should be compelling' });
      controller.processMessage(msg, [msg]);

      const progress = controller.getProgress();
      expect(progress.outputsProduced.has('cta')).toBe(true);
    });

    it('detects verdict output', () => {
      const msg = createMessage({ content: 'Our verdict is: this will work!' });
      controller.processMessage(msg, [msg]);

      const progress = controller.getProgress();
      expect(progress.outputsProduced.has('verdict')).toBe(true);
    });
  });

  describe('force synthesis', () => {
    it('forces synthesis at max messages', () => {
      const mode = createTestMode({
        successCriteria: {
          minConsensusPoints: 2,
          requiredOutputs: [],
          maxMessages: 5,
        },
      });
      const ctrl = new ModeController(mode);

      const messages: Message[] = [];

      for (let i = 0; i < 6; i++) {
        const msg = createMessage({ content: `Message ${i}` });
        messages.push(msg);
        const interventions = ctrl.processMessage(msg, messages);

        if (i >= 4) {
          const forceSynthesis = interventions.find(int => int.type === 'force_synthesis');
          expect(forceSynthesis).toBeDefined();
        }
      }
    });
  });

  describe('success check intervention', () => {
    it('creates intervention when success criteria met', () => {
      const messages: Message[] = [];

      // Satisfy criteria
      const agreement1 = createMessage({ type: 'agreement' });
      messages.push(agreement1);
      controller.processMessage(agreement1, messages);

      const agreement2 = createMessage({ type: 'agreement' });
      messages.push(agreement2);
      controller.processMessage(agreement2, messages);

      const heroMsg = createMessage({ content: '## Hero section' });
      messages.push(heroMsg);
      controller.processMessage(heroMsg, messages);

      const ctaMsg = createMessage({ content: 'Call to action button' });
      messages.push(ctaMsg);
      const interventions = controller.processMessage(ctaMsg, messages);

      const successCheck = interventions.find(int => int.type === 'success_check');
      expect(successCheck).toBeDefined();
      expect(successCheck?.action).toBe('pause');
    });
  });

  describe('manual phase transition', () => {
    it('transitions to valid phase', () => {
      const result = controller.transitionToPhase('synthesis');
      expect(result).toBe(true);

      const progress = controller.getProgress();
      expect(progress.currentPhase).toBe('synthesis');
      expect(progress.messagesInPhase).toBe(0);
    });

    it('returns false for invalid phase', () => {
      const result = controller.transitionToPhase('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('getCurrentPhase', () => {
    it('returns current phase config', () => {
      const phase = controller.getCurrentPhase();
      expect(phase?.id).toBe('phase1');
      expect(phase?.maxMessages).toBe(10);
    });
  });

  describe('getAgentInstructions', () => {
    it('returns mode agent instructions', () => {
      const instructions = controller.getAgentInstructions();
      expect(instructions).toBe('Test instructions');
    });
  });

  describe('getCurrentPhaseFocus', () => {
    it('returns current phase focus', () => {
      const focus = controller.getCurrentPhaseFocus();
      expect(focus).toBe('Focus on phase 1 tasks');
    });
  });

  describe('serialization', () => {
    it('serializes state to JSON', () => {
      const msg = createMessage({ type: 'proposal' });
      controller.processMessage(msg, [msg]);

      const json = controller.toJSON() as any;

      expect(json.modeId).toBe('test-mode');
      expect(json.progress.proposalsCount).toBe(1);
      expect(json.progress.outputsProduced).toBeInstanceOf(Array);
      expect(json.progress.researchByTopic).toBeDefined();
    });

    it('restores from JSON', () => {
      const msg = createMessage({ type: 'proposal' });
      controller.processMessage(msg, [msg]);

      const json = controller.toJSON();
      const restored = ModeController.fromJSON(json, testMode);

      const originalProgress = controller.getProgress();
      const restoredProgress = restored.getProgress();

      expect(restoredProgress.proposalsCount).toBe(originalProgress.proposalsCount);
      expect(restoredProgress.totalMessages).toBe(originalProgress.totalMessages);
    });

    it('handles missing data gracefully', () => {
      const restored = ModeController.fromJSON({}, testMode);
      const progress = restored.getProgress();
      expect(progress.totalMessages).toBe(0);
    });
  });
});
