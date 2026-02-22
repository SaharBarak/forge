/**
 * Blessed screen creation and lifecycle
 */

import blessed from 'blessed';

export function createScreen(): blessed.Widgets.Screen {
  // Prevent MaxListenersExceededWarning from blessed's mouse/key handlers
  process.stdin.setMaxListeners(25);
  process.stdout.setMaxListeners(25);

  const screen = blessed.screen({
    smartCSR: true,
    title: 'Forge — Multi-Agent Deliberation',
    fullUnicode: true,
    forceUnicode: true,
    fastCSR: true,
    mouse: false,
    cursor: {
      artificial: true,
      shape: 'line',
      blink: true,
      color: 'cyan',
    },
  });

  return screen;
}

// Debounced render — batches multiple widget updates into one render call
let renderScheduled = false;
export function scheduleRender(screen: blessed.Widgets.Screen): void {
  if (renderScheduled) return;
  renderScheduled = true;
  setImmediate(() => {
    renderScheduled = false;
    screen.render();
  });
}
