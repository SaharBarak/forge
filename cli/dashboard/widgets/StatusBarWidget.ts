/**
 * StatusBarWidget — keyboard shortcuts footer
 */

import type blessed from 'blessed';

export function updateStatusBar(
  widget: blessed.Widgets.BoxElement,
  statusMessage: string | null,
): void {
  if (statusMessage) {
    widget.setContent(`{yellow-fg}${statusMessage}{/yellow-fg}`);
    return;
  }

  const shortcuts = [
    '{gray-fg}F1{/gray-fg}:Help',
    '{gray-fg}F5{/gray-fg}:Synth',
    '{gray-fg}F9{/gray-fg}:Export',
    '{gray-fg}1-4{/gray-fg}:Quick',
    '{gray-fg}j/k{/gray-fg}:Scroll',
    '{gray-fg}Tab{/gray-fg}:Focus',
    '{gray-fg}Ctrl+C{/gray-fg}:Quit',
  ];

  widget.setContent(shortcuts.join('  '));
}
