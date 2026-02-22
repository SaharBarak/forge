/**
 * FloorManager - Manages who has the floor in the discussion
 * Handles floor requests, queueing, and turn-taking
 */

import { MessageBus, FloorRequest } from './MessageBus';

interface QueuedRequest extends FloorRequest {
  queuedAt: number;
}

export class FloorManager {
  private bus: MessageBus;
  private currentSpeaker: string | null = null;
  private requestQueue: QueuedRequest[] = [];
  private speakerHistory: { agentId: string; timestamp: number }[] = [];
  private isProcessing = false;

  // Configuration
  private readonly maxQueueSize = 10;
  private readonly speakerCooldown = 2000; // ms before same agent can speak again
  private readonly floorTimeout = 30000; // ms max time on floor

  private floorTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(bus: MessageBus) {
    this.bus = bus;
    this.setupListeners();
  }

  private setupListeners(): void {
    // Listen for floor requests
    this.bus.subscribe('floor:request', (payload) => {
      this.handleFloorRequest(payload);
    }, 'floor-manager');

    // Listen for floor releases
    this.bus.subscribe('floor:released', (payload) => {
      this.handleFloorReleased(payload.agentId);
    }, 'floor-manager');

    // Listen for session events
    this.bus.subscribe('session:start', () => {
      this.reset();
    }, 'floor-manager');

    this.bus.subscribe('session:end', () => {
      this.reset();
    }, 'floor-manager');
  }

  /**
   * Handle incoming floor request
   */
  private handleFloorRequest(request: FloorRequest): void {
    // Check if agent is on cooldown
    const lastSpoke = this.speakerHistory.find((h) => h.agentId === request.agentId);
    if (lastSpoke && Date.now() - lastSpoke.timestamp < this.speakerCooldown) {
      this.bus.emit('floor:denied', {
        agentId: request.agentId,
        reason: 'cooldown',
      });
      return;
    }

    // Add to queue
    const queuedRequest: QueuedRequest = {
      ...request,
      queuedAt: Date.now(),
    };

    // Insert based on urgency (high urgency goes to front)
    this.insertIntoQueue(queuedRequest);


    // Process queue if no one is speaking
    if (!this.currentSpeaker && !this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Insert request into queue based on urgency
   */
  private insertIntoQueue(request: QueuedRequest): void {
    // Remove any existing request from same agent
    this.requestQueue = this.requestQueue.filter((r) => r.agentId !== request.agentId);

    // Find insertion point based on urgency
    const urgencyOrder = { high: 0, medium: 1, low: 2 };
    const insertIndex = this.requestQueue.findIndex(
      (r) => urgencyOrder[r.urgency] > urgencyOrder[request.urgency]
    );

    if (insertIndex === -1) {
      this.requestQueue.push(request);
    } else {
      this.requestQueue.splice(insertIndex, 0, request);
    }

    // Trim queue if too large
    if (this.requestQueue.length > this.maxQueueSize) {
      const removed = this.requestQueue.pop();
      if (removed) {
        this.bus.emit('floor:denied', {
          agentId: removed.agentId,
          reason: 'queue_full',
        });
      }
    }
  }

  /**
   * Process the queue and grant floor to next speaker
   */
  private processQueue(): void {
    if (this.currentSpeaker || this.requestQueue.length === 0) return;

    this.isProcessing = true;
    const nextRequest = this.requestQueue.shift();

    if (!nextRequest) {
      this.isProcessing = false;
      return;
    }

    // Grant floor
    this.currentSpeaker = nextRequest.agentId;
    this.isProcessing = false;


    this.bus.emit('floor:granted', {
      agentId: nextRequest.agentId,
      reason: nextRequest.reason,
    });

    // Set timeout for floor
    this.floorTimeoutId = setTimeout(() => {
      if (this.currentSpeaker === nextRequest.agentId) {
        this.forceRelease(nextRequest.agentId);
      }
    }, this.floorTimeout);
  }

  /**
   * Handle floor release
   */
  private handleFloorReleased(agentId: string): void {
    if (this.currentSpeaker !== agentId) return;

    // Clear timeout
    if (this.floorTimeoutId) {
      clearTimeout(this.floorTimeoutId);
      this.floorTimeoutId = null;
    }

    // Record in history
    this.speakerHistory.push({ agentId, timestamp: Date.now() });

    // Keep history limited
    if (this.speakerHistory.length > 50) {
      this.speakerHistory.shift();
    }

    this.currentSpeaker = null;


    // Small delay before processing next
    setTimeout(() => this.processQueue(), 100);
  }

  /**
   * Force release floor (timeout or interruption)
   */
  forceRelease(agentId: string): void {
    if (this.currentSpeaker === agentId) {
      this.bus.emit('floor:released', { agentId });
    }
  }

  /**
   * Check if an agent has the floor
   */
  hasFloor(agentId: string): boolean {
    return this.currentSpeaker === agentId;
  }

  /**
   * Get current speaker
   */
  getCurrentSpeaker(): string | null {
    return this.currentSpeaker;
  }

  /**
   * Get queue status
   */
  getQueueStatus(): { current: string | null; queued: string[] } {
    return {
      current: this.currentSpeaker,
      queued: this.requestQueue.map((r) => r.agentId),
    };
  }

  /**
   * Reset manager
   */
  reset(): void {
    if (this.floorTimeoutId) {
      clearTimeout(this.floorTimeoutId);
      this.floorTimeoutId = null;
    }
    this.currentSpeaker = null;
    this.requestQueue = [];
    this.speakerHistory = [];
    this.isProcessing = false;
  }
}
