/**
 * AgentPanelWidget — shows agents with state icons, colored names, contribution bars, resonance
 */

import type blessed from 'blessed';
import type { AgentInfo } from '../types';
import { STATE_ICONS, BAR_CHAR, BAR_EMPTY, RESONANCE_COLORS, RESONANCE_TREND_ICONS } from '../theme';

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

function getResonanceColor(score: number): string {
  if (score >= 60) return RESONANCE_COLORS.high;
  if (score >= 30) return RESONANCE_COLORS.medium;
  return RESONANCE_COLORS.low;
}

function getResonanceTrendIcon(trend?: 'rising' | 'stable' | 'falling'): string {
  if (!trend) return '';
  return RESONANCE_TREND_ICONS[trend];
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

    // Resonance indicator: R:78^
    let resonanceStr = '';
    if (agent.resonance !== undefined) {
      const rColor = getResonanceColor(agent.resonance);
      const trendIcon = getResonanceTrendIcon(agent.resonanceTrend);
      resonanceStr = ` {${rColor}-fg}R:${agent.resonance}${trendIcon}{/${rColor}-fg}`;
    }

    // Line 1: icon Name (Role) wireframe-icon  bar count R:score^
    const roleStr = agent.role ? ` {gray-fg}(${agent.role.slice(0, 15)}){/gray-fg}` : '';
    lines.push(
      `${stateIcon} ${boldStart}{${color}-fg}${agent.name.padEnd(10)}{/${color}-fg}${boldEnd}${roleStr}${wireframeIcon} {cyan-fg}${bar}{/cyan-fg} ${agent.contributions}${resonanceStr}`
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
