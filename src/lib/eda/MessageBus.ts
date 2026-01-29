/**
 * MessageBus - Central event emitter for EDA
 * All agents subscribe to this bus and react to messages
 */

import type { Message } from '../../types';

export type MessageBusEvent =
  | 'message:new'           // New message added to conversation
  | 'message:research'      // Research request detected
  | 'message:synthesis'     // Synthesis checkpoint
  | 'floor:request'         // Agent wants to speak
  | 'floor:granted'         // Agent given the floor
  | 'floor:released'        // Agent done speaking
  | 'floor:denied'          // Agent request denied
  | 'session:start'         // Session started
  | 'session:pause'         // Session paused
  | 'session:resume'        // Session resumed
  | 'session:end'           // Session ended
  | 'human:requested'       // Waiting for human input
  | 'human:received';       // Human input received

export interface FloorRequest {
  agentId: string;
  urgency: 'high' | 'medium' | 'low';
  reason: string;
  responseType: string;
  timestamp: number;
}

export interface MessageBusPayload {
  'message:new': { message: Message; fromAgent: string };
  'message:research': { request: unknown; fromAgent: string };
  'message:synthesis': { synthesis: string; round: number };
  'floor:request': FloorRequest;
  'floor:granted': { agentId: string; reason: string };
  'floor:released': { agentId: string };
  'floor:denied': { agentId: string; reason: string };
  'session:start': { sessionId: string; goal: string };
  'session:pause': { reason: string };
  'session:resume': Record<string, never>;
  'session:end': { reason: string };
  'human:requested': { prompt: string };
  'human:received': { content: string };
}

type EventCallback<T extends MessageBusEvent> = (payload: MessageBusPayload[T]) => void;

interface Subscription {
  event: MessageBusEvent;
  callback: EventCallback<MessageBusEvent>;
  subscriberId: string;
}

export class MessageBus {
  private subscriptions: Subscription[] = [];
  private messageHistory: Message[] = [];
  private isActive = false;

  /**
   * Subscribe to an event
   */
  subscribe<T extends MessageBusEvent>(
    event: T,
    callback: EventCallback<T>,
    subscriberId: string
  ): () => void {
    const subscription: Subscription = {
      event,
      callback: callback as EventCallback<MessageBusEvent>,
      subscriberId,
    };
    this.subscriptions.push(subscription);

    // Return unsubscribe function
    return () => {
      this.subscriptions = this.subscriptions.filter((s) => s !== subscription);
    };
  }

  /**
   * Emit an event to all subscribers
   */
  emit<T extends MessageBusEvent>(event: T, payload: MessageBusPayload[T]): void {
    if (!this.isActive && !event.startsWith('session:')) return;

    // Log event for debugging
    console.log(`[MessageBus] ${event}`, payload);

    // Notify all subscribers of this event
    const relevantSubs = this.subscriptions.filter((s) => s.event === event);
    for (const sub of relevantSubs) {
      try {
        // Async dispatch so subscribers don't block each other
        setTimeout(() => sub.callback(payload), 0);
      } catch (error) {
        console.error(`[MessageBus] Error in subscriber ${sub.subscriberId}:`, error);
      }
    }
  }

  /**
   * Add message to history and emit
   */
  addMessage(message: Message, fromAgent: string): void {
    this.messageHistory.push(message);
    this.emit('message:new', { message, fromAgent });
  }

  /**
   * Get recent messages for context
   */
  getRecentMessages(count = 10): Message[] {
    return this.messageHistory.slice(-count);
  }

  /**
   * Get all messages
   */
  getAllMessages(): Message[] {
    return [...this.messageHistory];
  }

  /**
   * Start the bus
   */
  start(sessionId: string, goal: string): void {
    this.isActive = true;
    this.messageHistory = [];
    this.emit('session:start', { sessionId, goal });
  }

  /**
   * Pause the bus
   */
  pause(reason: string): void {
    this.emit('session:pause', { reason });
  }

  /**
   * Resume the bus
   */
  resume(): void {
    this.emit('session:resume', {});
  }

  /**
   * Stop the bus
   */
  stop(reason: string): void {
    this.isActive = false;
    this.emit('session:end', { reason });
    this.subscriptions = [];
  }

  /**
   * Check if active
   */
  get active(): boolean {
    return this.isActive;
  }

  /**
   * Get subscriber count for an event
   */
  getSubscriberCount(event: MessageBusEvent): number {
    return this.subscriptions.filter((s) => s.event === event).length;
  }
}

// Singleton instance
export const messageBus = new MessageBus();
