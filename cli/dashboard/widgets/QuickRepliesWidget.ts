/**
 * QuickRepliesWidget — numbered quick action pills
 */

import type blessed from 'blessed';
import type { QuickReply } from '../../lib/suggestions';

export function updateQuickReplies(
  widget: blessed.Widgets.BoxElement,
  replies: QuickReply[],
): void {
  if (replies.length === 0) {
    widget.setContent('{gray-fg}No suggestions{/gray-fg}');
    return;
  }

  const pills = replies.map((reply, i) => {
    const color = reply.isCommand ? 'yellow' : 'white';
    return `{gray-fg}[{/gray-fg}{cyan-fg}{bold}${i + 1}{/bold}{/cyan-fg}{gray-fg}]{/gray-fg} {${color}-fg}${reply.label}{/${color}-fg}`;
  });

  widget.setContent(pills.join('  ') + '  {gray-fg}Press 1-' + replies.length + ' to select{/gray-fg}');
}
