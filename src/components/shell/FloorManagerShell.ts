/**
 * FloorManagerShell - Terminal shell for Floor Manager status
 * Displays who has the floor, queue status, and floor events
 */

import { messageBus } from '../../lib/eda/MessageBus';
import { getAgentById } from '../../agents/personas';

type WriteLineFunction = (text: string) => void;

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const MAGENTA = '\x1b[35m';

const AGENT_COLORS: Record<string, string> = {
  ronit: '\x1b[35m',
  yossi: '\x1b[32m',
  noa: '\x1b[34m',
  avi: '\x1b[33m',
  michal: '\x1b[36m',
  system: '\x1b[90m',
  human: '\x1b[37m',
};

export class FloorManagerShell {
  private writeLine: WriteLineFunction;
  private unsubscribers: (() => void)[] = [];
  private currentSpeaker: string | null = null;
  private queue: string[] = [];

  constructor(writeLine: WriteLineFunction) {
    this.writeLine = writeLine;
  }

  /**
   * Start listening to floor events
   */
  start(): void {
    this.writeLine(`${DIM}[${this.getTimestamp()}]${RESET} ${CYAN}Floor Manager initialized${RESET}`);
    this.writeLine(`${DIM}State: MONITORING${RESET}`);
    this.writeLine('');
    this.renderStatus();

    // Subscribe to floor events
    this.unsubscribers.push(
      messageBus.subscribe('floor:request', (payload) => {
        this.onFloorRequest(payload.agentId, payload.urgency, payload.reason);
      }, 'floor-shell')
    );

    this.unsubscribers.push(
      messageBus.subscribe('floor:granted', (payload) => {
        this.onFloorGranted(payload.agentId, payload.reason);
      }, 'floor-shell')
    );

    this.unsubscribers.push(
      messageBus.subscribe('floor:released', (payload) => {
        this.onFloorReleased(payload.agentId);
      }, 'floor-shell')
    );

    this.unsubscribers.push(
      messageBus.subscribe('floor:denied', (payload) => {
        this.onFloorDenied(payload.agentId, payload.reason);
      }, 'floor-shell')
    );

    this.unsubscribers.push(
      messageBus.subscribe('session:start', () => {
        this.writeLine(`${DIM}[${this.getTimestamp()}]${RESET} ${GREEN}Session started - monitoring floor${RESET}`);
        this.currentSpeaker = null;
        this.queue = [];
        this.renderStatus();
      }, 'floor-shell')
    );

    this.unsubscribers.push(
      messageBus.subscribe('session:end', () => {
        this.writeLine(`${DIM}[${this.getTimestamp()}]${RESET} ${YELLOW}Session ended${RESET}`);
        this.currentSpeaker = null;
        this.queue = [];
      }, 'floor-shell')
    );
  }

  /**
   * Stop listening
   */
  stop(): void {
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];
    this.writeLine(`${DIM}[${this.getTimestamp()}] Floor Manager stopped${RESET}`);
  }

  private onFloorRequest(agentId: string, urgency: string, reason: string): void {
    const color = AGENT_COLORS[agentId] || '\x1b[37m';
    const urgencyColor = urgency === 'high' ? RED : urgency === 'medium' ? YELLOW : GREEN;
    const name = this.getAgentName(agentId);

    this.writeLine(`${DIM}[${this.getTimestamp()}]${RESET} ${color}${BOLD}REQUEST${RESET} ${name}`);
    this.writeLine(`  ${DIM}Urgency:${RESET} ${urgencyColor}${urgency.toUpperCase()}${RESET}`);
    this.writeLine(`  ${DIM}Reason:${RESET} ${reason}`);

    // Add to queue display
    if (!this.queue.includes(agentId)) {
      this.queue.push(agentId);
    }
    this.renderStatus();
  }

  private onFloorGranted(agentId: string, reason: string): void {
    const color = AGENT_COLORS[agentId] || '\x1b[37m';
    const name = this.getAgentName(agentId);

    this.currentSpeaker = agentId;
    this.queue = this.queue.filter(id => id !== agentId);

    this.writeLine('');
    this.writeLine(`${color}${BOLD}┌────────────────────────────────────┐${RESET}`);
    this.writeLine(`${color}${BOLD}│${RESET} ${GREEN}GRANTED${RESET} ${color}${BOLD}${name.padEnd(25)}${RESET}${color}${BOLD}│${RESET}`);
    this.writeLine(`${color}${BOLD}└────────────────────────────────────┘${RESET}`);
    this.writeLine(`  ${DIM}${reason}${RESET}`);
    this.renderStatus();
  }

  private onFloorReleased(agentId: string): void {
    const color = AGENT_COLORS[agentId] || '\x1b[37m';
    const name = this.getAgentName(agentId);

    this.currentSpeaker = null;

    this.writeLine(`${DIM}[${this.getTimestamp()}]${RESET} ${color}${DIM}RELEASED${RESET} ${name}`);
    this.writeLine('');
    this.renderStatus();
  }

  private onFloorDenied(agentId: string, reason: string): void {
    const color = AGENT_COLORS[agentId] || '\x1b[37m';
    const name = this.getAgentName(agentId);

    this.queue = this.queue.filter(id => id !== agentId);

    this.writeLine(`${DIM}[${this.getTimestamp()}]${RESET} ${RED}DENIED${RESET} ${color}${name}${RESET}`);
    this.writeLine(`  ${DIM}Reason: ${reason}${RESET}`);
  }

  private renderStatus(): void {
    const speakerName = this.currentSpeaker ? this.getAgentName(this.currentSpeaker) : 'None';
    const speakerColor = this.currentSpeaker ? (AGENT_COLORS[this.currentSpeaker] || '\x1b[37m') : DIM;

    this.writeLine(`${MAGENTA}───────────────────────────────────${RESET}`);
    this.writeLine(`${DIM}Speaker:${RESET} ${speakerColor}${BOLD}${speakerName}${RESET}`);

    if (this.queue.length > 0) {
      const queueNames = this.queue.map(id => this.getAgentName(id)).join(' → ');
      this.writeLine(`${DIM}Queue (${this.queue.length}):${RESET} ${queueNames}`);
    } else {
      this.writeLine(`${DIM}Queue: empty${RESET}`);
    }
    this.writeLine(`${MAGENTA}───────────────────────────────────${RESET}`);
  }

  private getAgentName(agentId: string): string {
    if (agentId === 'human') return 'Human';
    if (agentId === 'system') return 'System';
    const agent = getAgentById(agentId);
    return agent ? agent.name : agentId;
  }

  private getTimestamp(): string {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
  }
}
