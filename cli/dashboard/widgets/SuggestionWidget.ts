/**
 * SuggestionWidget — auto-dismiss notification banner
 */

import type blessed from 'blessed';
import type { AgentSuggestionData } from '../../lib/suggestions';
import { scheduleRender } from '../screen';

let dismissTimer: ReturnType<typeof setTimeout> | null = null;

export function showSuggestion(
  widget: blessed.Widgets.BoxElement,
  quickRepliesWidget: blessed.Widgets.BoxElement,
  suggestion: AgentSuggestionData,
  screen: blessed.Widgets.Screen,
): void {
  // Clear previous timer
  if (dismissTimer) clearTimeout(dismissTimer);

  const content = `{yellow-fg}\u{1F4A1} ${suggestion.agentName} suggests:{/yellow-fg} ${suggestion.suggestion}`;
  widget.setContent(content);
  widget.show();
  quickRepliesWidget.hide();
  scheduleRender(screen);

  // Auto-dismiss after 8 seconds
  dismissTimer = setTimeout(() => {
    hideSuggestion(widget, quickRepliesWidget, screen);
  }, 8000);
}

export function hideSuggestion(
  widget: blessed.Widgets.BoxElement,
  quickRepliesWidget: blessed.Widgets.BoxElement,
  screen: blessed.Widgets.Screen,
): void {
  if (dismissTimer) {
    clearTimeout(dismissTimer);
    dismissTimer = null;
  }
  widget.hide();
  quickRepliesWidget.show();
  scheduleRender(screen);
}
