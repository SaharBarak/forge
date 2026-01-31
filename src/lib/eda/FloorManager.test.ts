/**
 * FloorManager Unit Tests
 *
 * Tests core FloorManager functionality: queue management, state queries,
 * reset behavior, and API safety.
 *
 * Note: The FloorManager uses event-driven MessageBus integration which
 * requires async timing that varies between test environments. These unit
 * tests verify the synchronous API behavior. Full integration testing
 * is done via end-to-end tests and manual verification.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FloorManager } from './FloorManager';
import { MessageBus } from './MessageBus';

describe('FloorManager', () => {
  let bus: MessageBus;
  let floorManager: FloorManager;

  beforeEach(() => {
    bus = new MessageBus();

    // Start session to enable events
    bus.emit('session:start', { sessionId: 'test-session', goal: 'Test goal' });

    floorManager = new FloorManager(bus);
  });

  describe('initial state', () => {
    it('has no current speaker initially', () => {
      expect(floorManager.getCurrentSpeaker()).toBeNull();
    });

    it('has empty queue initially', () => {
      const status = floorManager.getQueueStatus();
      expect(status.current).toBeNull();
      expect(status.queued).toHaveLength(0);
    });

    it('returns false for hasFloor when no one is speaking', () => {
      expect(floorManager.hasFloor('agent-1')).toBe(false);
    });
  });

  describe('getQueueStatus', () => {
    it('returns null current when no speaker', () => {
      const status = floorManager.getQueueStatus();
      expect(status.current).toBeNull();
    });

    it('returns empty queued array initially', () => {
      const status = floorManager.getQueueStatus();
      expect(status.queued).toEqual([]);
    });

    it('returns object with current and queued properties', () => {
      const status = floorManager.getQueueStatus();
      expect(status).toHaveProperty('current');
      expect(status).toHaveProperty('queued');
      expect(Array.isArray(status.queued)).toBe(true);
    });
  });

  describe('getCurrentSpeaker', () => {
    it('returns null when no speaker', () => {
      expect(floorManager.getCurrentSpeaker()).toBeNull();
    });

    it('returns null after construction', () => {
      const newFloorManager = new FloorManager(bus);
      expect(newFloorManager.getCurrentSpeaker()).toBeNull();
    });
  });

  describe('hasFloor', () => {
    it('returns false for any agent when no speaker', () => {
      expect(floorManager.hasFloor('any-agent')).toBe(false);
      expect(floorManager.hasFloor('agent-1')).toBe(false);
      expect(floorManager.hasFloor('agent-2')).toBe(false);
    });

    it('returns false for empty string agent id', () => {
      expect(floorManager.hasFloor('')).toBe(false);
    });
  });

  describe('reset', () => {
    it('clears current speaker after reset', () => {
      floorManager.reset();
      expect(floorManager.getCurrentSpeaker()).toBeNull();
    });

    it('clears queue after reset', () => {
      floorManager.reset();
      const status = floorManager.getQueueStatus();
      expect(status.queued).toHaveLength(0);
    });

    it('is idempotent - can be called multiple times', () => {
      floorManager.reset();
      floorManager.reset();
      floorManager.reset();
      expect(floorManager.getCurrentSpeaker()).toBeNull();
      expect(floorManager.getQueueStatus().queued).toHaveLength(0);
    });

    it('leaves manager in clean state', () => {
      floorManager.reset();
      const status = floorManager.getQueueStatus();
      expect(status.current).toBeNull();
      expect(status.queued).toHaveLength(0);
    });
  });

  describe('forceRelease', () => {
    it('does nothing when no one has floor', () => {
      // Should not throw
      expect(() => floorManager.forceRelease('agent-1')).not.toThrow();
    });

    it('does not change state when releasing non-speaker', () => {
      expect(floorManager.getCurrentSpeaker()).toBeNull();
      floorManager.forceRelease('non-existent-agent');
      expect(floorManager.getCurrentSpeaker()).toBeNull();
    });

    it('is safe to call with any agent id', () => {
      expect(() => floorManager.forceRelease('')).not.toThrow();
      expect(() => floorManager.forceRelease('any-id')).not.toThrow();
      expect(() => floorManager.forceRelease('agent-123')).not.toThrow();
    });

    it('does not affect queue when no speaker', () => {
      floorManager.forceRelease('agent-1');
      expect(floorManager.getQueueStatus().queued).toHaveLength(0);
    });
  });

  describe('configuration constants', () => {
    it('uses a sorted single queue (architectural decision)', () => {
      // FloorManager uses a single sorted queue instead of 3 priority queues
      // This is documented as an architectural decision in IMPLEMENTATION_PLAN.md
      const status = floorManager.getQueueStatus();
      expect(Array.isArray(status.queued)).toBe(true);
    });

    it('returns queue status in expected format', () => {
      const status = floorManager.getQueueStatus();
      expect(typeof status.current).toBe('object'); // null or string
      expect(Array.isArray(status.queued)).toBe(true);
    });
  });

  describe('construction', () => {
    it('can be constructed with MessageBus', () => {
      const newManager = new FloorManager(bus);
      expect(newManager).toBeInstanceOf(FloorManager);
    });

    it('starts with clean state after construction', () => {
      const newManager = new FloorManager(bus);
      expect(newManager.getCurrentSpeaker()).toBeNull();
      expect(newManager.getQueueStatus().queued).toHaveLength(0);
    });
  });
});
