/**
 * FloorManagerShell — terminal pane for Floor Manager status.
 *
 * Displays who has the floor, queue status, floor events, and — when
 * proposals are active — a consensus thermometer showing agree/disagree
 * balance and debate intensity sparkline.
 */

import { messageBus } from '../../lib/eda/MessageBus';
import { getAgentById } from '../../agents/personas';
import {
  forgeTheme,
  style,
  agentColor,
} from '../../lib/render/theme';
import { separator } from '../../lib/render/borders';
import {
  consensusThermometer,
  debateIntensity,
  type ConsensusSnapshot,
} from '../../lib/render/consensus';

type WriteLineFn = (text: string) => void;

export class FloorManagerShell {
  private writeLine: WriteLineFn;
  private unsubscribers: (() => void)[] = [];
  private currentSpeaker: string | null = null;
  private queue: string[] = [];
  /** Rolling window of message counts per 30-second bucket for the sparkline. */
  private messageVelocity: number[] = [];
  private velocityBucket = 0;
  private velocityTimer: ReturnType<typeof setInterval> | null = null;

  constructor(writeLine: WriteLineFn) {
    this.writeLine = writeLine;
  }

  start(): void {
    this.writeLine(
      style(forgeTheme.dim, `[${this.ts()}]`) + ' ' +
      style(forgeTheme.status.info, 'Floor Manager initialized')
    );
    this.writeLine(style(forgeTheme.dim, 'State: MONITORING'));
    this.writeLine('');
    this.renderStatus();

    // Track message velocity for debate intensity sparkline.
    this.velocityTimer = setInterval(() => {
      this.messageVelocity.push(this.velocityBucket);
      if (this.messageVelocity.length > 30) this.messageVelocity.shift();
      this.velocityBucket = 0;
    }, 30_000);

    this.unsubscribers.push(
      messageBus.subscribe('message:new', () => {
        this.velocityBucket++;
      }, 'floor-shell-velocity')
    );

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
        this.writeLine(
          style(forgeTheme.dim, `[${this.ts()}]`) + ' ' +
          style(forgeTheme.status.success, 'Session started — monitoring floor')
        );
        this.currentSpeaker = null;
        this.queue = [];
        this.messageVelocity = [];
        this.velocityBucket = 0;
        this.renderStatus();
      }, 'floor-shell')
    );

    this.unsubscribers.push(
      messageBus.subscribe('session:end', () => {
        this.writeLine(
          style(forgeTheme.dim, `[${this.ts()}]`) + ' ' +
          style(forgeTheme.status.warning, 'Session ended')
        );
        this.currentSpeaker = null;
        this.queue = [];
      }, 'floor-shell')
    );
  }

  stop(): void {
    if (this.velocityTimer) clearInterval(this.velocityTimer);
    this.unsubscribers.forEach((u) => u());
    this.unsubscribers = [];
    this.writeLine(style(forgeTheme.dim, `[${this.ts()}] Floor Manager stopped`));
  }

  /**
   * Inject a live consensus snapshot. Called by the orchestrator when a
   * proposal is active. The shell renders a thermometer + stance summary.
   */
  renderConsensus(snapshot: ConsensusSnapshot): void {
    this.writeLine(consensusThermometer(snapshot, 36));
  }

  /**
   * Render the debate intensity sparkline (message velocity over time).
   */
  renderDebateIntensity(): void {
    if (this.messageVelocity.length > 2) {
      this.writeLine(debateIntensity(this.messageVelocity, 20));
    }
  }

  // ---- event handlers ----

  private onFloorRequest(agentId: string, urgency: string, reason: string): void {
    const color = agentColor(agentId);
    const urgencyColor =
      urgency === 'high' ? forgeTheme.status.error
        : urgency === 'medium' ? forgeTheme.status.warning
          : forgeTheme.status.success;
    const name = this.agentName(agentId);

    this.writeLine(
      style(forgeTheme.dim, `[${this.ts()}]`) + ' ' +
      style(`${forgeTheme.bold}${color}`, 'REQUEST') + ' ' + name
    );
    this.writeLine(`  ${style(forgeTheme.dim, 'Urgency:')} ${style(urgencyColor, urgency.toUpperCase())}`);
    this.writeLine(`  ${style(forgeTheme.dim, 'Reason:')} ${reason}`);

    if (!this.queue.includes(agentId)) this.queue.push(agentId);
    this.renderStatus();
  }

  private onFloorGranted(agentId: string, reason: string): void {
    const color = agentColor(agentId);
    const name = this.agentName(agentId);
    this.currentSpeaker = agentId;
    this.queue = this.queue.filter((id) => id !== agentId);

    this.writeLine('');
    this.writeLine(separator(36));
    this.writeLine(
      ' ' + style(forgeTheme.status.success, 'GRANTED') + ' ' +
      style(`${forgeTheme.bold}${color}`, name)
    );
    this.writeLine(separator(36));
    this.writeLine(`  ${style(forgeTheme.dim, reason)}`);
    this.renderStatus();
  }

  private onFloorReleased(agentId: string): void {
    const name = this.agentName(agentId);
    this.currentSpeaker = null;

    this.writeLine(
      style(forgeTheme.dim, `[${this.ts()}]`) + ' ' +
      style(forgeTheme.dim, `RELEASED ${name}`)
    );
    this.writeLine('');
    this.renderStatus();
    this.renderDebateIntensity();
  }

  private onFloorDenied(agentId: string, reason: string): void {
    const color = agentColor(agentId);
    const name = this.agentName(agentId);
    this.queue = this.queue.filter((id) => id !== agentId);

    this.writeLine(
      style(forgeTheme.dim, `[${this.ts()}]`) + ' ' +
      style(forgeTheme.status.error, 'DENIED') + ' ' +
      style(color, name)
    );
    this.writeLine(`  ${style(forgeTheme.dim, `Reason: ${reason}`)}`);
  }

  // ---- status display ----

  private renderStatus(): void {
    const speakerName = this.currentSpeaker ? this.agentName(this.currentSpeaker) : 'None';
    const speakerColor = this.currentSpeaker
      ? `${forgeTheme.bold}${agentColor(this.currentSpeaker)}`
      : forgeTheme.dim;

    this.writeLine(separator(36));
    this.writeLine(`${style(forgeTheme.dim, 'Speaker:')} ${style(speakerColor, speakerName)}`);

    if (this.queue.length > 0) {
      const names = this.queue.map((id) => this.agentName(id)).join(' → ');
      this.writeLine(`${style(forgeTheme.dim, `Queue (${this.queue.length}):`)} ${names}`);
    } else {
      this.writeLine(style(forgeTheme.dim, 'Queue: empty'));
    }
    this.writeLine(separator(36));
  }

  // ---- helpers ----

  private agentName(id: string): string {
    if (id === 'human') return 'Human';
    if (id === 'system') return 'System';
    return getAgentById(id)?.name ?? id;
  }

  private ts(): string {
    const n = new Date();
    return `${n.getHours().toString().padStart(2, '0')}:${n.getMinutes().toString().padStart(2, '0')}:${n.getSeconds().toString().padStart(2, '0')}`;
  }
}
