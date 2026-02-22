/**
 * Message formatter — converts Message objects to blessed tagged strings for the chat log
 */

import type { Message } from '../../../src/types';
import { getAgentColor, getAgentDisplayName } from '../../../src/agents/personas';
import { renderMarkdown } from './markdownRenderer';
import { TYPE_BADGES } from '../theme';

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function truncateContent(content: string, maxLines = 20): string {
  const lines = content.split('\n');
  if (lines.length <= maxLines) return content;
  return lines.slice(0, maxLines).join('\n') + '\n  {gray-fg}...{/gray-fg}';
}

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
 * Format a single message as blessed tagged string lines.
 * Returns an array of lines to be logged individually.
 */
export function formatMessage(message: Message): string[] {
  const lines: string[] = [];
  const time = formatTime(message.timestamp);
  const badge = TYPE_BADGES[message.type] || '';
  const content = truncateContent(message.content);
  const rendered = renderMarkdown(content);

  // System messages — dim
  if (message.agentId === 'system') {
    lines.push(`{gray-fg}${rendered}{/gray-fg}`);
    lines.push('');
    return lines;
  }

  // Human messages — green with border
  if (message.agentId === 'human' || message.type === 'human_input') {
    lines.push(`{gray-fg}${time}{/gray-fg} {green-fg}{bold}You{/bold}{/green-fg} {gray-fg}[YOU]{/gray-fg}`);
    lines.push(`{green-fg}\u250C${'─'.repeat(50)}\u2510{/green-fg}`);
    for (const line of rendered.split('\n')) {
      lines.push(`{green-fg}\u2502{/green-fg} {green-fg}${line}{/green-fg}`);
    }
    lines.push(`{green-fg}\u2514${'─'.repeat(50)}\u2518{/green-fg}`);
    lines.push('');
    return lines;
  }

  // Agent messages — colored name + badge + content
  const agentColor = toBlessedColor(getAgentColor(message.agentId));
  const displayName = getAgentDisplayName(message.agentId);

  lines.push(`{gray-fg}${time}{/gray-fg} {${agentColor}-fg}{bold}${displayName}{/bold}{/${agentColor}-fg} {gray-fg}${badge}{/gray-fg}`);
  for (const line of rendered.split('\n')) {
    lines.push(`  ${line}`);
  }
  lines.push('');

  return lines;
}

/**
 * Format typing indicator line
 */
export function formatTypingIndicator(agentId: string, spinnerFrame: string): string {
  const agentColor = toBlessedColor(getAgentColor(agentId));
  const displayName = getAgentDisplayName(agentId);
  return `{${agentColor}-fg}${spinnerFrame} ${displayName} is thinking...{/${agentColor}-fg}`;
}
