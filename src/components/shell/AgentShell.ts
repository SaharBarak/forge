/**
 * AgentShell - Terminal shell for a single agent
 * Connects to the EDA MessageBus and displays agent's activity
 */

import type { Message } from '../../types';
import { messageBus } from '../../lib/eda/MessageBus';
import { getAgentById } from '../../agents/personas';

type WriteFunction = (text: string) => void;
type WriteLineFunction = (text: string) => void;

const AGENT_COLORS: Record<string, string> = {
  ronit: '\x1b[35m',   // magenta/pink
  yossi: '\x1b[32m',   // green
  noa: '\x1b[34m',     // blue
  avi: '\x1b[33m',     // yellow/orange
  michal: '\x1b[36m',  // cyan
  system: '\x1b[90m',  // gray
  human: '\x1b[37m',   // white
};

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';

export class AgentShell {
  private agentId: string;
  private writeLine: WriteLineFunction;
  private unsubscribers: (() => void)[] = [];
  private isListening = false;

  constructor(
    agentId: string,
    _write: WriteFunction,
    writeLine: WriteLineFunction
  ) {
    this.agentId = agentId;
    this.writeLine = writeLine;
  }

  /**
   * Start listening to the message bus
   */
  start(): void {
    if (this.isListening) return;
    this.isListening = true;

    const color = AGENT_COLORS[this.agentId] || '\x1b[37m';

    // Initial status
    this.writeLine(`${DIM}[${this.getTimestamp()}]${RESET} ${color}${BOLD}Agent initialized${RESET}`);
    this.writeLine(`${DIM}State: LISTENING${RESET}`);
    this.writeLine('');

    // Subscribe to messages
    this.unsubscribers.push(
      messageBus.subscribe('message:new', (payload) => {
        this.onMessage(payload.message, payload.fromAgent);
      }, `shell-${this.agentId}`)
    );

    // Subscribe to floor events
    this.unsubscribers.push(
      messageBus.subscribe('floor:granted', (payload) => {
        if (payload.agentId === this.agentId) {
          this.onFloorGranted();
        }
      }, `shell-${this.agentId}`)
    );

    this.unsubscribers.push(
      messageBus.subscribe('floor:released', (payload) => {
        if (payload.agentId === this.agentId) {
          this.onFloorReleased();
        }
      }, `shell-${this.agentId}`)
    );

    this.unsubscribers.push(
      messageBus.subscribe('floor:request', (payload) => {
        if (payload.agentId === this.agentId) {
          this.onFloorRequested(payload.urgency, payload.reason);
        }
      }, `shell-${this.agentId}`)
    );

    this.unsubscribers.push(
      messageBus.subscribe('session:start', () => {
        this.writeLine(`${DIM}[${this.getTimestamp()}]${RESET} ${color}Session started - listening...${RESET}`);
      }, `shell-${this.agentId}`)
    );

    this.unsubscribers.push(
      messageBus.subscribe('session:end', () => {
        this.writeLine(`${DIM}[${this.getTimestamp()}]${RESET} ${color}Session ended${RESET}`);
      }, `shell-${this.agentId}`)
    );
  }

  /**
   * Stop listening
   */
  stop(): void {
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];
    this.isListening = false;
    this.writeLine(`${DIM}[${this.getTimestamp()}] Agent stopped${RESET}`);
  }

  /**
   * Handle incoming message
   */
  private onMessage(message: Message, fromAgent: string): void {
    const isOwnMessage = fromAgent === this.agentId;
    const color = AGENT_COLORS[fromAgent] || '\x1b[37m';
    const senderName = this.getSenderName(fromAgent);

    if (isOwnMessage) {
      // Own message - show what was said
      this.writeLine(`${DIM}[${this.getTimestamp()}]${RESET} ${color}${BOLD}>>> SPEAKING${RESET}`);
      this.formatAndWriteMessage(message.content, color);
      this.writeLine('');
    } else {
      // Others' messages - show listening
      this.writeLine(`${DIM}[${this.getTimestamp()}]${RESET} ${DIM}Heard ${senderName}:${RESET}`);
      this.writePreview(message.content);
    }
  }

  /**
   * Handle floor granted
   */
  private onFloorGranted(): void {
    const color = AGENT_COLORS[this.agentId] || '\x1b[37m';
    this.writeLine(`${color}${BOLD}┌──────────────────────────────────┐${RESET}`);
    this.writeLine(`${color}${BOLD}│  FLOOR GRANTED - SPEAKING NOW   │${RESET}`);
    this.writeLine(`${color}${BOLD}└──────────────────────────────────┘${RESET}`);
  }

  /**
   * Handle floor released
   */
  private onFloorReleased(): void {
    const color = AGENT_COLORS[this.agentId] || '\x1b[37m';
    this.writeLine(`${DIM}[${this.getTimestamp()}]${RESET} ${color}Floor released. Returning to listening...${RESET}`);
    this.writeLine('');
  }

  /**
   * Handle floor request
   */
  private onFloorRequested(urgency: string, reason: string): void {
    const color = AGENT_COLORS[this.agentId] || '\x1b[37m';
    const urgencyColor = urgency === 'high' ? '\x1b[31m' : urgency === 'medium' ? '\x1b[33m' : '\x1b[32m';
    this.writeLine(`${DIM}[${this.getTimestamp()}]${RESET} ${color}Requesting floor...${RESET}`);
    this.writeLine(`${DIM}  Urgency: ${urgencyColor}${urgency.toUpperCase()}${RESET}`);
    this.writeLine(`${DIM}  Reason: ${reason}${RESET}`);
  }

  /**
   * Format and write a full message
   */
  private formatAndWriteMessage(content: string, color: string): void {
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.startsWith('#')) {
        this.writeLine(`${BOLD}${color}${line}${RESET}`);
      } else if (line.startsWith('**') || line.startsWith('[')) {
        this.writeLine(`${color}${line}${RESET}`);
      } else {
        this.writeLine(`  ${line}`);
      }
    }
  }

  /**
   * Write a preview of a message (full content)
   */
  private writePreview(content: string): void {
    const lines = content.split('\n');
    for (const line of lines) {
      this.writeLine(`${DIM}  ${line}${RESET}`);
    }
  }

  /**
   * Get sender display name
   */
  private getSenderName(agentId: string): string {
    if (agentId === 'human') return 'Human';
    if (agentId === 'system') return 'System';
    const agent = getAgentById(agentId);
    return agent ? agent.name : agentId;
  }

  /**
   * Get timestamp string
   */
  private getTimestamp(): string {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
  }
}
