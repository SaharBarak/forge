/**
 * EventBusShell - Terminal shell for Event Bus monitoring
 * Displays all events flowing through the MessageBus
 */

import { messageBus, MessageBusEvent } from '../../lib/eda/MessageBus';
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

// Event type colors
const EVENT_COLORS: Record<string, string> = {
  'message': CYAN,
  'floor': MAGENTA,
  'session': GREEN,
  'human': YELLOW,
};

// Event icons
const EVENT_ICONS: Record<string, string> = {
  'message:new': '💬',
  'message:research': '🔍',
  'message:synthesis': '🔄',
  'floor:request': '🙋',
  'floor:granted': '✅',
  'floor:released': '🔓',
  'floor:denied': '❌',
  'session:start': '▶️',
  'session:pause': '⏸️',
  'session:resume': '▶️',
  'session:end': '⏹️',
  'human:requested': '👤',
  'human:received': '📝',
};

export class EventBusShell {
  private writeLine: WriteLineFunction;
  private unsubscribers: (() => void)[] = [];
  private eventCount = 0;
  private startTime: number = Date.now();

  constructor(writeLine: WriteLineFunction) {
    this.writeLine = writeLine;
  }

  /**
   * Start listening to all events
   */
  start(): void {
    this.startTime = Date.now();
    this.eventCount = 0;

    this.writeLine(`${DIM}[${this.getTimestamp()}]${RESET} ${CYAN}Event Bus initialized${RESET}`);
    this.writeLine(`${DIM}Monitoring all events...${RESET}`);
    this.writeLine('');

    // Subscribe to all event types
    const events: MessageBusEvent[] = [
      'message:new',
      'message:research',
      'message:synthesis',
      'floor:request',
      'floor:granted',
      'floor:released',
      'floor:denied',
      'session:start',
      'session:pause',
      'session:resume',
      'session:end',
      'human:requested',
      'human:received',
    ];

    for (const event of events) {
      this.unsubscribers.push(
        messageBus.subscribe(event, (payload) => {
          this.onEvent(event, payload);
        }, 'event-bus-shell')
      );
    }
  }

  /**
   * Stop listening
   */
  stop(): void {
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];
    this.writeLine(`${DIM}[${this.getTimestamp()}] Event Bus shell stopped${RESET}`);
    this.writeLine(`${DIM}Total events: ${this.eventCount}${RESET}`);
  }

  private onEvent(event: MessageBusEvent, payload: unknown): void {
    this.eventCount++;
    const category = event.split(':')[0];
    const color = EVENT_COLORS[category] || CYAN;
    const icon = EVENT_ICONS[event] || '•';

    // Format event name
    const eventName = event.replace(':', ' ').toUpperCase();

    // Build event line
    let line = `${DIM}[${this.getTimestamp()}]${RESET} ${color}${icon} ${BOLD}${eventName}${RESET}`;

    // Add payload summary
    const summary = this.getPayloadSummary(event, payload);
    if (summary) {
      line += ` ${DIM}${summary}${RESET}`;
    }

    this.writeLine(line);

    // Add details for important events
    if (event === 'message:new') {
      this.writeMessageDetails(payload as { message: { content: string }; fromAgent: string });
    } else if (event === 'floor:request') {
      this.writeFloorRequestDetails(payload as { agentId: string; urgency: string; reason: string });
    } else if (event === 'session:start') {
      this.writeSessionStartDetails(payload as { sessionId: string; goal: string });
    }
  }

  private getPayloadSummary(event: MessageBusEvent, payload: unknown): string {
    const p = payload as Record<string, unknown>;

    switch (event) {
      case 'message:new':
        return `from ${this.getAgentName(p.fromAgent as string)}`;
      case 'floor:request':
        return `${this.getAgentName(p.agentId as string)} (${p.urgency})`;
      case 'floor:granted':
        return `→ ${this.getAgentName(p.agentId as string)}`;
      case 'floor:released':
        return `← ${this.getAgentName(p.agentId as string)}`;
      case 'floor:denied':
        return `✗ ${this.getAgentName(p.agentId as string)} (${p.reason})`;
      case 'session:start':
        return `id: ${(p.sessionId as string).slice(0, 8)}...`;
      case 'session:end':
        return p.reason as string;
      case 'human:requested':
        return p.prompt as string;
      case 'human:received':
        return `${((p.content as string) || '').length} chars`;
      default:
        return '';
    }
  }

  private writeMessageDetails(payload: { message: { content: string }; fromAgent: string }): void {
    const lines = payload.message.content.split('\n');
    for (const line of lines) {
      this.writeLine(`  ${DIM}${line}${RESET}`);
    }
  }

  private writeFloorRequestDetails(payload: { agentId: string; urgency: string; reason: string }): void {
    const urgencyColor = payload.urgency === 'high' ? RED : payload.urgency === 'medium' ? YELLOW : GREEN;
    this.writeLine(`  ${DIM}Urgency:${RESET} ${urgencyColor}${payload.urgency}${RESET} ${DIM}|${RESET} ${payload.reason}`);
  }

  private writeSessionStartDetails(payload: { sessionId: string; goal: string }): void {
    this.writeLine(`  ${DIM}Goal: ${payload.goal}${RESET}`);
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

  /**
   * Get stats
   */
  getStats(): { eventCount: number; uptime: number } {
    return {
      eventCount: this.eventCount,
      uptime: Date.now() - this.startTime,
    };
  }
}
