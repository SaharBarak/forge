/**
 * InputWidget — text input with command handling and tab completion
 *
 * blessed.textbox with manual keypress handling. Does NOT use readInput()
 * which would set grabKeys=true and block all screen-level shortcuts.
 */

import type blessed from 'blessed';
import { scheduleRender } from '../screen';

const COMMANDS = [
  { name: 'pause', description: 'Pause debate' },
  { name: 'resume', description: 'Resume debate' },
  { name: 'status', description: 'Show status' },
  { name: 'synthesize', description: 'Move to synthesis' },
  { name: 'synthesize force', description: 'Force synthesis' },
  { name: 'export', description: 'Export transcript' },
  { name: 'help', description: 'Toggle help' },
  { name: 'quit', description: 'Save and exit' },
];

export interface InputHandlers {
  onSubmit: (text: string) => void;
  onCommand: (command: string, args: string[]) => void;
}

/**
 * Activate the textbox for input. Must be called after setup and after each submit/cancel.
 */
export function activateInput(
  widget: blessed.Widgets.TextboxElement,
  screen: blessed.Widgets.Screen,
): void {
  // Focus the widget and show cursor — but do NOT call readInput()
  // which sets grabKeys=true and swallows all keyboard input.
  widget.focus();
  screen.program.showCursor();
  scheduleRender(screen);
}

export function setupInput(
  widget: blessed.Widgets.TextboxElement,
  screen: blessed.Widgets.Screen,
  handlers: InputHandlers,
): void {
  // Manual key handling — avoids readInput() which sets grabKeys=true
  // and prevents all screen-level shortcuts (Ctrl+C, Tab, etc.) from working.
  let inputValue = '';

  screen.on('keypress', (ch: string, key: any) => {
    // Only handle input keys when the widget is focused
    if (screen.focused !== widget) return;

    if (!key) return;

    // Enter — submit
    if (key.name === 'enter') {
      const trimmed = inputValue.trim();
      if (!trimmed) return;

      if (trimmed.startsWith('/')) {
        const parts = trimmed.slice(1).split(/\s+/);
        handlers.onCommand(parts[0], parts.slice(1));
      } else {
        handlers.onSubmit(trimmed);
      }

      inputValue = '';
      widget.setValue('');
      scheduleRender(screen);
      return;
    }

    // Escape — clear input (don't consume, let screen handlers also fire)
    if (key.name === 'escape') {
      inputValue = '';
      widget.setValue('');
      scheduleRender(screen);
      return;
    }

    // Skip keys that should bubble to screen handlers
    if (key.ctrl || key.meta) return;
    if (key.name === 'tab') return;
    if (key.name === 'f1' || key.name === 'f2' || key.name === 'f3' || key.name === 'f5' || key.name === 'f9') return;
    if (key.name === 'pageup' || key.name === 'pagedown') return;
    if (key.name === 'up' || key.name === 'down') return;

    // Backspace
    if (key.name === 'backspace') {
      if (inputValue.length > 0) {
        inputValue = inputValue.slice(0, -1);
        widget.setValue(inputValue);
        scheduleRender(screen);
      }
      return;
    }

    // Regular character input
    if (ch && !/^[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f]$/.test(ch)) {
      inputValue += ch;
      widget.setValue(inputValue);
      scheduleRender(screen);
    }
  });
}
