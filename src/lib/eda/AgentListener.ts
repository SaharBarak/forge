/**
 * AgentListener - Individual agent that subscribes to the MessageBus
 * Each agent continuously listens and reacts to messages
 * Now powered by IAgentRunner for flexible backend (Electron or CLI)
 */

import type { AgentPersona, Message, SessionConfig, ContextData } from '../../types';
import type { IAgentRunner } from '../interfaces';
import { MessageBus, FloorRequest } from './MessageBus';
import { ClaudeCodeAgent } from '../claude-code-agent';
import { getAgentById } from '../../agents/personas';

type AgentState = 'listening' | 'thinking' | 'speaking' | 'waiting';

interface AgentListenerConfig {
  reactivityThreshold: number;  // 0-1, how likely to react (higher = more reactive)
  minSilenceBeforeReact: number; // messages to wait before reacting
  evaluationDebounce: number;    // ms to debounce evaluations
  maxEvaluationMessages: number; // context messages for evaluation
  maxResponseMessages: number;   // context messages for response generation
}

const DEFAULT_CONFIG: AgentListenerConfig = {
  reactivityThreshold: 0.5,
  minSilenceBeforeReact: 1,
  evaluationDebounce: 500,
  maxEvaluationMessages: 8,  // Messages used when evaluating whether to respond
  maxResponseMessages: 15,    // Messages used when generating actual response
};

export class AgentListener {
  readonly id: string;
  readonly agent: AgentPersona;

  private bus: MessageBus;
  private sessionConfig: SessionConfig | null = null;

  private state: AgentState = 'listening';
  private messagesSinceSpoke = 0;
  private pendingEvaluation: ReturnType<typeof setTimeout> | null = null;
  private unsubscribers: (() => void)[] = [];
  private config: AgentListenerConfig;

  // Claude Code Agent instance
  private claudeAgent: ClaudeCodeAgent | null = null;

  // Optional injected runner (for CLI)
  private agentRunner: IAgentRunner | undefined;

  constructor(
    agent: AgentPersona,
    bus: MessageBus,
    config: Partial<AgentListenerConfig> = {},
    agentRunner?: IAgentRunner
  ) {
    this.id = agent.id;
    this.agent = agent;
    this.bus = bus;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.agentRunner = agentRunner;
  }

  /**
   * Start listening to the bus
   */
  start(sessionConfig: SessionConfig, context?: ContextData, skills?: string): void {
    this.sessionConfig = sessionConfig;
    this.state = 'listening';
    this.messagesSinceSpoke = 0;

    // Initialize Claude Code Agent with optional injected runner
    this.claudeAgent = new ClaudeCodeAgent(
      this.agent,
      sessionConfig,
      context,
      skills,
      this.agentRunner
    );

    // Subscribe to events
    this.unsubscribers.push(
      this.bus.subscribe('message:new', (payload) => {
        this.onMessage(payload.message, payload.fromAgent);
      }, this.id)
    );

    this.unsubscribers.push(
      this.bus.subscribe('floor:granted', (payload) => {
        if (payload.agentId === this.id) {
          this.onFloorGranted(payload.reason);
        }
      }, this.id)
    );

    this.unsubscribers.push(
      this.bus.subscribe('floor:denied', (payload) => {
        if (payload.agentId === this.id) {
          this.onFloorDenied(payload.reason);
        }
      }, this.id)
    );

    this.unsubscribers.push(
      this.bus.subscribe('session:end', () => {
        this.stop();
      }, this.id)
    );

    // Pause during research
    this.unsubscribers.push(
      this.bus.subscribe('session:pause', () => {
        if (this.pendingEvaluation) {
          clearTimeout(this.pendingEvaluation);
          this.pendingEvaluation = null;
        }
        this.state = 'listening'; // Reset state when paused
      }, this.id)
    );

    this.unsubscribers.push(
      this.bus.subscribe('session:resume', () => {
        // Re-evaluate after resume if there are messages we haven't responded to
        // This fixes the bug where agents don't react after session resume (#31)
        if (this.messagesSinceSpoke > 0 && this.state === 'listening') {
          // Schedule evaluation with debounce to allow other agents to also resume
          this.pendingEvaluation = setTimeout(() => {
            this.evaluateAndReact();
          }, this.config.evaluationDebounce + Math.random() * 500);
        }
      }, this.id)
    );

  }

  /**
   * Stop listening
   */
  stop(): void {
    if (this.pendingEvaluation) {
      clearTimeout(this.pendingEvaluation);
      this.pendingEvaluation = null;
    }
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];
    this.state = 'listening';
    this.claudeAgent = null;
  }

  /**
   * Handle new message - core listening logic
   */
  private onMessage(_message: Message, fromAgent: string): void {
    // Don't react to own messages
    if (fromAgent === this.id) {
      this.messagesSinceSpoke = 0;
      return;
    }

    this.messagesSinceSpoke++;

    // Don't evaluate if already speaking or thinking
    if (this.state === 'speaking' || this.state === 'thinking') {
      return;
    }

    // Debounce evaluation
    if (this.pendingEvaluation) {
      clearTimeout(this.pendingEvaluation);
    }

    this.pendingEvaluation = setTimeout(() => {
      this.evaluateAndReact();
    }, this.config.evaluationDebounce);
  }

  /**
   * Evaluate the conversation and decide whether to request floor
   */
  private async evaluateAndReact(): Promise<void> {
    if (!this.sessionConfig || !this.claudeAgent) return;
    if (this.state !== 'listening') return;

    // Check minimum silence
    if (this.messagesSinceSpoke < this.config.minSilenceBeforeReact) {
      return;
    }

    // Probabilistic check - agents don't always react even when they could
    // This prevents over-chatty behavior and creates more natural flow
    // Higher threshold = more likely to react (threshold of 1.0 = always react)
    if (Math.random() > this.config.reactivityThreshold) {
      return;
    }

    this.state = 'thinking';

    try {
      const recentMessages = this.bus.getRecentMessages(this.config.maxEvaluationMessages);
      const conversationHistory = this.formatConversation(recentMessages);

      // Include brief memory context for better evaluation
      const memoryContext = this.bus.getEvalMemoryContext();
      const fullContext = memoryContext
        ? `${memoryContext}\n\n---\nRecent:\n${conversationHistory}`
        : conversationHistory;

      const reaction = await this.claudeAgent.evaluateReaction(
        fullContext,
        this.messagesSinceSpoke
      );

      // Decide if we should request floor
      if (reaction.urgency !== 'pass') {
        const request: FloorRequest = {
          agentId: this.id,
          urgency: reaction.urgency,
          reason: reaction.reason,
          responseType: reaction.responseType,
          timestamp: Date.now(),
        };

        this.state = 'waiting';
        this.bus.emit('floor:request', request);
      } else {
        this.state = 'listening';
      }
    } catch (error) {
      this.state = 'listening';
    }
  }

  /**
   * Called when granted the floor
   */
  private async onFloorGranted(reason: string): Promise<void> {
    if (!this.sessionConfig || !this.claudeAgent) return;

    this.state = 'speaking';

    try {
      const recentMessages = this.bus.getRecentMessages(this.config.maxResponseMessages);
      const conversationHistory = this.formatConversation(recentMessages);

      // Include full memory context for better responses
      const memoryContext = this.bus.getMemoryContext(this.id);
      const fullContext = memoryContext
        ? `${memoryContext}\n\n---\nRecent Discussion:\n${conversationHistory}`
        : conversationHistory;

      const response = await this.claudeAgent.generateResponse(
        fullContext,
        reason
      );

      // Create message
      const message: Message = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        agentId: this.id,
        type: response.type as Message['type'],
        content: response.content,
        metadata: {
          triggerReason: reason,
          poweredBy: this.agentRunner ? 'cli-runner' : 'electron-runner',
        },
      };

      // Add to bus (this will notify all listeners)
      this.bus.addMessage(message, this.id);

      // Release floor
      this.bus.emit('floor:released', { agentId: this.id });
      this.state = 'listening';
      this.messagesSinceSpoke = 0;

    } catch (error) {
      this.bus.emit('floor:released', { agentId: this.id });
      this.state = 'listening';
    }
  }

  /**
   * Called when floor request is denied
   */
  private onFloorDenied(reason: string): void {
    this.state = 'listening';
  }

  /**
   * Format messages into conversation string
   */
  private formatConversation(messages: Message[]): string {
    return messages.map((msg) => {
      const sender = msg.agentId === 'human' ? 'Human' :
                     msg.agentId === 'system' ? 'System' :
                     getAgentById(msg.agentId)?.name || msg.agentId;
      return `[${sender}]: ${msg.content}`;
    }).join('\n\n');
  }

  /**
   * Get current state
   */
  getState(): AgentState {
    return this.state;
  }
}
