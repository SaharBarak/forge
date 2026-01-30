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
  reactivityThreshold: number;  // 0-1, how likely to react
  minSilenceBeforeReact: number; // messages to wait before reacting
  evaluationDebounce: number;    // ms to debounce evaluations
}

const DEFAULT_CONFIG: AgentListenerConfig = {
  reactivityThreshold: 0.5,
  minSilenceBeforeReact: 1,
  evaluationDebounce: 500,
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
        console.log(`[AgentListener:${this.id}] Paused (research/halt)`);
      }, this.id)
    );

    this.unsubscribers.push(
      this.bus.subscribe('session:resume', () => {
        console.log(`[AgentListener:${this.id}] Resumed`);
      }, this.id)
    );

    console.log(`[AgentListener:${this.id}] Started with ${this.agentRunner ? 'injected runner' : 'default runner'}`);
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
    console.log(`[AgentListener:${this.id}] Stopped listening`);
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

    this.state = 'thinking';

    try {
      const recentMessages = this.bus.getRecentMessages(8);
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
        console.log(`[AgentListener:${this.id}] Requesting floor (${reaction.urgency}): ${reaction.reason}`);
      } else {
        this.state = 'listening';
        console.log(`[AgentListener:${this.id}] Passing: ${reaction.reason}`);
      }
    } catch (error) {
      console.error(`[AgentListener:${this.id}] Evaluation error:`, error);
      this.state = 'listening';
    }
  }

  /**
   * Called when granted the floor
   */
  private async onFloorGranted(reason: string): Promise<void> {
    if (!this.sessionConfig || !this.claudeAgent) return;

    this.state = 'speaking';
    console.log(`[AgentListener:${this.id}] Got floor, speaking...`);

    try {
      const recentMessages = this.bus.getRecentMessages(15);
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
      console.error(`[AgentListener:${this.id}] Response error:`, error);
      this.bus.emit('floor:released', { agentId: this.id });
      this.state = 'listening';
    }
  }

  /**
   * Called when floor request is denied
   */
  private onFloorDenied(reason: string): void {
    console.log(`[AgentListener:${this.id}] Floor denied: ${reason}`);
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
