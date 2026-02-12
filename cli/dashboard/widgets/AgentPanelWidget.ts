/**
 * AgentPanelWidget — shows agents with state icons, colored names, contribution bars
 */

import type blessed from 'blessed';
import type { AgentInfo } from '../types';
import { STATE_ICONS, BAR_CHAR, BAR_EMPTY } from '../theme';

/**
 * Map persona color names to blessed tag-compatible colors
 */
function toBlessedColor(color: string): string {
  const colorMap: Record<string, string> = {
    pink: 'magenta',
    orange: 'yellow',
    purple: 'magenta',
  };
  return colorMap[color] || color;
}

/**
 * Build a proportional bar using block characters
 */
function buildBar(count: number, maxCount: number, width: number): string {
  if (maxCount === 0) return BAR_EMPTY.repeat(width);
  const filled = Math.round((count / maxCount) * width);
  return BAR_CHAR.repeat(filled) + BAR_EMPTY.repeat(width - filled);
}

export function updateAgentPanel(
  widget: blessed.Widgets.BoxElement,
  agents: AgentInfo[],
  currentSpeaker: string | null,
): void {
  const maxContributions = Math.max(1, ...agents.map(a => a.contributions));
  const barWidth = 6;

  const lines: string[] = [];

  for (const agent of agents) {
    const isSpeaking = agent.id === currentSpeaker;
    const stateIcon = isSpeaking ? '\u{1F4AC}' : (STATE_ICONS[agent.state] || '\u2022');
    const color = toBlessedColor(agent.color);
    const bar = buildBar(agent.contributions, maxContributions, barWidth);
    const boldStart = isSpeaking ? '{bold}' : '';
    const boldEnd = isSpeaking ? '{/bold}' : '';
    const wireframeIcon = agent.hasWireframe ? ' \u{1F5BC}' : '';

    // Line 1: icon Name (Role) wireframe-icon  bar count
    const roleStr = agent.role ? ` {gray-fg}(${agent.role.slice(0, 15)}){/gray-fg}` : '';
    lines.push(
      `${stateIcon} ${boldStart}{${color}-fg}${agent.name.padEnd(10)}{/${color}-fg}${boldEnd}${roleStr}${wireframeIcon} {cyan-fg}${bar}{/cyan-fg} ${agent.contributions}`
    );

    // Line 2: stance or latest argument summary (gray, indented)
    const detail = agent.currentStance || agent.latestArgument;
    if (detail) {
      const truncated = detail.length > 38 ? detail.slice(0, 37) + '\u2026' : detail;
      lines.push(`   {gray-fg}${truncated}{/gray-fg}`);
    }
  }

  widget.setContent(lines.join('\n'));
}
