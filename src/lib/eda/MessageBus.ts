/**
 * MessageBus - Central event emitter for EDA
 * All agents subscribe to this bus and react to messages
 */

import type { Message } from '../../types';
import type { IAgentRunner } from '../interfaces';
import { ConversationMemory, type MemoryConfig } from './ConversationMemory';

/**
 * Configuration for MessageBus limits
 */
export interface MessageBusConfig {
  maxMessages: number;              // Max messages in history (oldest pruned)
  maxMessagesForContext: number;    // Max messages returned for agent context
  virtualScrollWindow: number;      // Window size for virtual scrolling support
  pruneThreshold: number;           // Trigger pruning at this % of max
}

/** Default MessageBus configuration */
export const DEFAULT_BUS_CONFIG: MessageBusConfig = {
  maxMessages: 500,
  maxMessagesForContext: 50,
  virtualScrollWindow: 100,
  pruneThreshold: 0.9,
};

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
  | 'session:loaded'        // Session loaded from file
  | 'session:save-requested'    // Save requested from terminal
  | 'session:export-requested'  // Export requested from terminal
  | 'personas:changed'      // Personas were generated or changed
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
  'session:loaded': { metadata: { id: string; projectName: string; goal: string; enabledAgents: string[]; startedAt: string }; messages: Message[] };
  'session:save-requested': Record<string, never>;
  'session:export-requested': { format: string };
  'personas:changed': { count: number };
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
  private memory: ConversationMemory;
  private agentRunner?: IAgentRunner;
  private busConfig: MessageBusConfig;
  private prunedMessageCount = 0; // Track pruned messages for virtual scroll offset

  constructor(busConfig?: Partial<MessageBusConfig>, memoryConfig?: Partial<MemoryConfig>) {
    this.busConfig = { ...DEFAULT_BUS_CONFIG, ...busConfig };
    this.memory = new ConversationMemory(undefined, memoryConfig);
  }

  /**
   * Configure message bus limits
   */
  setBusConfig(config: Partial<MessageBusConfig>): void {
    this.busConfig = { ...this.busConfig, ...config };
    this.pruneMessagesIfNeeded(true);
  }

  /**
   * Configure memory limits
   */
  setMemoryConfig(config: Partial<MemoryConfig>): void {
    this.memory.setConfig(config);
  }

  /**
   * Get current configuration
   */
  getConfig(): { bus: MessageBusConfig; memory: MemoryConfig } {
    return {
      bus: { ...this.busConfig },
      memory: this.memory.getConfig(),
    };
  }

  /**
   * Prune old messages if history exceeds limit
   */
  private pruneMessagesIfNeeded(force = false): void {
    const threshold = force ? 1.0 : this.busConfig.pruneThreshold;
    const maxWithThreshold = this.busConfig.maxMessages * threshold;

    if (this.messageHistory.length > maxWithThreshold) {
      const toRemove = this.messageHistory.length - this.busConfig.maxMessages;
      this.messageHistory = this.messageHistory.slice(toRemove);
      this.prunedMessageCount += toRemove;
    }
  }

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
   * Set the agent runner for memory summarization
   */
  setAgentRunner(runner: IAgentRunner): void {
    this.agentRunner = runner;
    this.memory.setRunner(runner);
  }

  /**
   * Add message to history and emit
   */
  addMessage(message: Message, fromAgent: string): void {
    this.messageHistory.push(message);

    // Process message for memory tracking
    this.memory.processMessage(message, this.messageHistory).catch(err => {
      console.error('[MessageBus] Memory processing error:', err);
    });

    // Prune if needed
    this.pruneMessagesIfNeeded();

    this.emit('message:new', { message, fromAgent });
  }

  /**
   * Get conversation memory context
   */
  getMemoryContext(forAgentId?: string): string {
    return this.memory.getMemoryContext(forAgentId);
  }

  /**
   * Get brief memory context for evaluation
   */
  getEvalMemoryContext(): string {
    return this.memory.getEvalMemoryContext();
  }

  /**
   * Get memory stats
   */
  getMemoryStats(): { summaryCount: number; decisionCount: number; proposalCount: number; agentCount: number } {
    return this.memory.getStats();
  }

  /**
   * Serialize memory for session save
   */
  getMemoryState(): object {
    return this.memory.toJSON();
  }

  /**
   * Restore memory from session load
   */
  restoreMemory(state: object): void {
    this.memory = ConversationMemory.fromJSON(state, this.agentRunner);
  }

  /**
   * Get recent messages for context
   * @param count - Number of messages (capped at maxMessagesForContext)
   */
  getRecentMessages(count = 10): Message[] {
    const effectiveCount = Math.min(count, this.busConfig.maxMessagesForContext);
    return this.messageHistory.slice(-effectiveCount);
  }

  /**
   * Get all messages currently in memory
   * Note: May not include all session messages if pruning occurred
   */
  getAllMessages(): Message[] {
    return [...this.messageHistory];
  }

  /**
   * Get total message count including pruned messages
   */
  getTotalMessageCount(): number {
    return this.prunedMessageCount + this.messageHistory.length;
  }

  /**
   * Get a window of messages for virtual scrolling
   * @param startIndex - Virtual index (accounts for pruned messages)
   * @param count - Number of messages to retrieve
   * @returns Messages in the window, or empty if out of range
   */
  getMessageWindow(startIndex: number, count?: number): Message[] {
    const windowSize = count ?? this.busConfig.virtualScrollWindow;

    // Adjust for pruned messages
    const adjustedStart = startIndex - this.prunedMessageCount;

    if (adjustedStart < 0) {
      // Requested messages have been pruned
      const availableStart = Math.max(0, adjustedStart + windowSize);
      if (availableStart >= this.messageHistory.length) {
        return [];
      }
      return this.messageHistory.slice(availableStart, availableStart + windowSize);
    }

    if (adjustedStart >= this.messageHistory.length) {
      return [];
    }

    return this.messageHistory.slice(adjustedStart, adjustedStart + windowSize);
  }

  /**
   * Get virtual scroll info for UI
   */
  getScrollInfo(): {
    totalCount: number;
    availableStart: number;
    availableEnd: number;
    prunedCount: number;
  } {
    return {
      totalCount: this.getTotalMessageCount(),
      availableStart: this.prunedMessageCount,
      availableEnd: this.prunedMessageCount + this.messageHistory.length - 1,
      prunedCount: this.prunedMessageCount,
    };
  }

  /**
   * Get memory usage statistics
   */
  getUsageStats(): {
    messages: { count: number; max: number; pruned: number; usage: number };
    memory: ReturnType<ConversationMemory['getMemoryUsage']>;
    subscriptions: number;
  } {
    return {
      messages: {
        count: this.messageHistory.length,
        max: this.busConfig.maxMessages,
        pruned: this.prunedMessageCount,
        usage: this.messageHistory.length / this.busConfig.maxMessages,
      },
      memory: this.memory.getMemoryUsage(),
      subscriptions: this.subscriptions.length,
    };
  }

  /**
   * Compact memory to free resources
   * Aggressively prunes to 50% of limits
   */
  compact(): void {
    // Compact message history
    const targetMessages = Math.ceil(this.busConfig.maxMessages / 2);
    if (this.messageHistory.length > targetMessages) {
      const toRemove = this.messageHistory.length - targetMessages;
      this.messageHistory = this.messageHistory.slice(toRemove);
      this.prunedMessageCount += toRemove;
    }

    // Compact conversation memory
    this.memory.compact();
  }

  /**
   * Start the bus
   */
  start(sessionId: string, goal: string): void {
    this.isActive = true;
    this.messageHistory = [];
    this.prunedMessageCount = 0;
    this.memory.reset();
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
    // Clear subscriptions to release references
    this.subscriptions = [];
  }

  /**
   * Full reset - clears all state for a clean slate without emitting events
   */
  fullReset(): void {
    this.isActive = false;
    this.messageHistory = [];
    this.prunedMessageCount = 0;
    this.memory.reset();
    this.subscriptions = [];
  }

  /**
   * Clear inactive agent memory
   * @param activeAgentIds - Set of currently active agent IDs
   */
  clearInactiveAgents(activeAgentIds: Set<string>): void {
    this.memory.clearInactiveAgents(activeAgentIds);
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
