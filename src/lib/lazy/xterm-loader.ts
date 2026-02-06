/**
 * Lazy loader for xterm.js
 * Dynamically imports ~200kB xterm bundle only when terminal is needed
 */

import type { Terminal, ITerminalOptions } from '@xterm/xterm';
import type { FitAddon } from '@xterm/addon-fit';

// Cached module references
let TerminalClass: typeof Terminal | null = null;
let FitAddonClass: typeof FitAddon | null = null;
let cssLoaded = false;

/**
 * Lazily loads xterm.js and its addons
 * Returns Terminal and FitAddon classes for instantiation
 */
export async function loadXterm(): Promise<{
  Terminal: typeof Terminal;
  FitAddon: typeof FitAddon;
}> {
  // Return cached if already loaded
  if (TerminalClass && FitAddonClass) {
    return {
      Terminal: TerminalClass,
      FitAddon: FitAddonClass,
    };
  }

  // Load CSS once
  if (!cssLoaded) {
    await import('@xterm/xterm/css/xterm.css');
    cssLoaded = true;
  }

  // Dynamic imports - these create separate chunks
  const [xtermModule, fitAddonModule] = await Promise.all([
    import('@xterm/xterm'),
    import('@xterm/addon-fit'),
  ]);

  TerminalClass = xtermModule.Terminal;
  FitAddonClass = fitAddonModule.FitAddon;

  return {
    Terminal: TerminalClass,
    FitAddon: FitAddonClass,
  };
}

/**
 * Creates a terminal instance with fit addon
 * Convenience wrapper that handles lazy loading
 */
export async function createTerminal(
  container: HTMLElement,
  options?: ITerminalOptions
): Promise<{
  terminal: Terminal;
  fitAddon: FitAddon;
  dispose: () => void;
}> {
  const { Terminal, FitAddon } = await loadXterm();

  const terminal = new Terminal(options);
  const fitAddon = new FitAddon();

  terminal.loadAddon(fitAddon);
  terminal.open(container);
  fitAddon.fit();

  return {
    terminal,
    fitAddon,
    dispose: () => {
      terminal.dispose();
    },
  };
}

/**
 * Type-only export for terminal options
 */
export type { ITerminalOptions, Terminal, FitAddon };
