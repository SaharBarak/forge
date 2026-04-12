/**
 * AgentShell — terminal pane for a single debate agent.
 *
 * Connects to the EDA MessageBus and renders the agent's activity using the
 * Forge rendering pipeline: markdown → ANSI, semantic theme, spinner during
 * generation, styled floor grant/release indicators.
 */

import type { Message } from '../../types';
import { messageBus } from '../../lib/eda/MessageBus';
import { getAgentById } from '../../agents/personas';
import { renderMarkdown } from '../../lib/render/markdown';
import { createSpinner, type Spinner } from '../../lib/render/spinner';
import {
  forgeTheme,
  style,
  agentColor,
} from '../../lib/render/theme';
import { separator } from '../../lib/render/borders';

type WriteFn = (text: string) => void;

export class AgentShell {
  private readonly agentId: string;
  private readonly write: WriteFn;
  private unsubscribers: (() => void)[] = [];
  private isListening = false;
  private spinner: Spinner | null = null;
  private spinnerInterval: ReturnType<typeof setInterval> | null = null;

  constructor(agentId: string, write: WriteFn, _writeLine: WriteFn) {
    this.agentId = agentId;
    // Normalize: always use write (with \r\n appended by callers as needed).
    // xterm.js needs \r\n, not just \n.
    this.write = write;
  }

  start(): void {
    if (this.isListening) return;
    this.isListening = true;

    const color = agentColor(this.agentId);
    this.writeLn(style(forgeTheme.dim, `[${this.ts()}]`) + ' ' + style(`${forgeTheme.bold}${color}`, 'Agent initialized'));
    this.writeLn(style(forgeTheme.dim, 'State: LISTENING'));
    this.writeLn('');

    this.unsubscribers.push(
      messageBus.subscribe('message:new', (payload) => {
        this.onMessage(payload.message, payload.fromAgent);
      }, `shell-${this.agentId}`)
    );

    this.unsubscribers.push(
      messageBus.subscribe('floor:granted', (payload) => {
        if (payload.agentId === this.agentId) this.onFloorGranted();
      }, `shell-${this.agentId}`)
    );

    this.unsubscribers.push(
      messageBus.subscribe('floor:released', (payload) => {
        if (payload.agentId === this.agentId) this.onFloorReleased();
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
        this.writeLn(style(forgeTheme.dim, `[${this.ts()}]`) + ' ' + style(agentColor(this.agentId), 'Session started — listening…'));
      }, `shell-${this.agentId}`)
    );

    this.unsubscribers.push(
      messageBus.subscribe('session:end', () => {
        this.stopSpinner();
        this.writeLn(style(forgeTheme.dim, `[${this.ts()}]`) + ' ' + style(agentColor(this.agentId), 'Session ended'));
      }, `shell-${this.agentId}`)
    );
  }

  stop(): void {
    this.stopSpinner();
    this.unsubscribers.forEach((u) => u());
    this.unsubscribers = [];
    this.isListening = false;
    this.writeLn(style(forgeTheme.dim, `[${this.ts()}] Agent stopped`));
  }

  // ---- event handlers ----

  private onMessage(message: Message, fromAgent: string): void {
    this.stopSpinner();
    const isOwn = fromAgent === this.agentId;
    const color = agentColor(fromAgent);

    if (isOwn) {
      this.writeLn(
        style(forgeTheme.dim, `[${this.ts()}]`) + ' ' +
        style(`${forgeTheme.bold}${color}`, '>>> SPEAKING')
      );
      // Render the agent's markdown output with full formatting.
      const rendered = renderMarkdown(message.content, 72);
      this.writeRaw(rendered);
      this.writeLn('');
    } else {
      const name = this.senderName(fromAgent);
      this.writeLn(
        style(forgeTheme.dim, `[${this.ts()}]`) + ' ' +
        style(forgeTheme.dim, `Heard ${name}:`)
      );
      // Others' messages: render markdown but dimmed, truncated preview.
      const preview = message.content.slice(0, 200) + (message.content.length > 200 ? '…' : '');
      const rendered = renderMarkdown(preview, 72);
      this.writeRaw(style(forgeTheme.dim, rendered));
    }
  }

  private onFloorGranted(): void {
    const color = agentColor(this.agentId);
    this.writeLn(separator(36));
    this.writeLn(style(`${forgeTheme.bold}${color}`, '  ● FLOOR GRANTED — SPEAKING NOW'));
    this.writeLn(separator(36));
    this.startSpinner('Generating response…');
  }

  private onFloorReleased(): void {
    this.stopSpinner();
    this.writeLn(
      style(forgeTheme.dim, `[${this.ts()}]`) + ' ' +
      style(agentColor(this.agentId), 'Floor released. Listening…')
    );
    this.writeLn('');
  }

  private onFloorRequested(urgency: string, reason: string): void {
    const color = agentColor(this.agentId);
    const urgencyColor =
      urgency === 'high' ? forgeTheme.status.error
        : urgency === 'medium' ? forgeTheme.status.warning
          : forgeTheme.status.success;

    this.writeLn(style(forgeTheme.dim, `[${this.ts()}]`) + ' ' + style(color, 'Requesting floor…'));
    this.writeLn(`  Urgency: ${style(urgencyColor, urgency.toUpperCase())}`);
    this.writeLn(style(forgeTheme.dim, `  Reason: ${reason}`));
  }

  // ---- spinner ----

  private startSpinner(label: string): void {
    this.stopSpinner();
    this.spinner = createSpinner();
    this.spinnerInterval = setInterval(() => {
      if (this.spinner) {
        this.write(this.spinner.tick(label));
      }
    }, 80);
  }

  private stopSpinner(): void {
    if (this.spinnerInterval) {
      clearInterval(this.spinnerInterval);
      this.spinnerInterval = null;
    }
    if (this.spinner) {
      this.write(this.spinner.finish(''));
      this.spinner = null;
    }
  }

  // ---- helpers ----

  private writeLn(text: string): void {
    this.write(text + '\r\n');
  }

  private writeRaw(text: string): void {
    // markdansi output uses \n — normalize to \r\n for xterm.js.
    this.write(text.replace(/\n/g, '\r\n'));
  }

  private senderName(agentId: string): string {
    if (agentId === 'human') return 'Human';
    if (agentId === 'system') return 'System';
    return getAgentById(agentId)?.name ?? agentId;
  }

  private ts(): string {
    const n = new Date();
    return `${n.getHours().toString().padStart(2, '0')}:${n.getMinutes().toString().padStart(2, '0')}:${n.getSeconds().toString().padStart(2, '0')}`;
  }
}
