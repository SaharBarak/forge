/**
 * LazyTerminalPane - Lazy-loaded xterm.js wrapper
 * Reduces initial bundle by ~200kB by loading xterm on demand
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { loadXterm, type Terminal, type FitAddon } from '../../lib/lazy';

interface LazyTerminalPaneProps {
  id: string;
  title: string;
  color?: string;
  onInput?: (data: string) => void;
  className?: string;
  onReady?: (handle: TerminalPaneHandle) => void;
}

export interface TerminalPaneHandle {
  write: (text: string) => void;
  writeLine: (text: string) => void;
  clear: () => void;
}

export function LazyTerminalPane({
  id,
  title,
  color = '#00ff00',
  onInput,
  className = '',
  onReady,
}: LazyTerminalPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Write to terminal
  const write = useCallback((text: string) => {
    if (terminalRef.current) {
      terminalRef.current.write(text);
    }
  }, []);

  const writeLine = useCallback((text: string) => {
    if (terminalRef.current) {
      terminalRef.current.writeln(text);
      terminalRef.current.scrollToBottom();
    }
  }, []);

  const clear = useCallback(() => {
    if (terminalRef.current) {
      terminalRef.current.clear();
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    let terminal: Terminal | null = null;
    let fitAddon: FitAddon | null = null;
    let mounted = true;

    // Async initialization with dynamic import
    const initTerminal = async () => {
      try {
        const { Terminal, FitAddon } = await loadXterm();

        if (!mounted || !containerRef.current) return;

        // Create terminal
        terminal = new Terminal({
          theme: {
            background: '#0a0a0a',
            foreground: '#e0e0e0',
            cursor: color,
            cursorAccent: '#0a0a0a',
            selectionBackground: '#444444',
            black: '#0a0a0a',
            red: '#ff5555',
            green: '#50fa7b',
            yellow: '#f1fa8c',
            blue: '#6272a4',
            magenta: '#ff79c6',
            cyan: '#8be9fd',
            white: '#f8f8f2',
            brightBlack: '#6272a4',
            brightRed: '#ff6e6e',
            brightGreen: '#69ff94',
            brightYellow: '#ffffa5',
            brightBlue: '#d6acff',
            brightMagenta: '#ff92df',
            brightCyan: '#a4ffff',
            brightWhite: '#ffffff',
          },
          fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Monaco, monospace',
          fontSize: 13,
          lineHeight: 1.2,
          cursorBlink: true,
          cursorStyle: 'block',
          scrollback: 1000,
          convertEol: true,
        });

        // Add fit addon
        fitAddon = new FitAddon();
        terminal.loadAddon(fitAddon);

        // Open terminal
        terminal.open(containerRef.current);
        fitAddon.fit();

        // Store refs
        terminalRef.current = terminal;
        fitAddonRef.current = fitAddon;

        // Handle input
        if (onInput) {
          terminal.onData(onInput);
        }

        // Handle resize
        const handleResize = () => {
          fitAddon?.fit();
        };
        window.addEventListener('resize', handleResize);

        // Write title
        terminal.writeln(`\x1b[1;36m┌${'─'.repeat(40)}┐\x1b[0m`);
        terminal.writeln(
          `\x1b[1;36m│\x1b[0m \x1b[1;${getColorCode(color)}m${title.padEnd(38)}\x1b[0m \x1b[1;36m│\x1b[0m`
        );
        terminal.writeln(`\x1b[1;36m└${'─'.repeat(40)}┘\x1b[0m`);
        terminal.writeln('');

        setLoading(false);

        // Notify parent that terminal is ready
        if (onReady) {
          onReady({ write, writeLine, clear });
        }

        // Cleanup function stored for later
        return () => {
          window.removeEventListener('resize', handleResize);
          terminal?.dispose();
        };
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load terminal');
          setLoading(false);
        }
      }
    };

    initTerminal();

    return () => {
      mounted = false;
      terminal?.dispose();
    };
  }, [id, title, color, onInput, write, writeLine, clear, onReady]);

  // Expose methods via window (for backwards compatibility)
  useEffect(() => {
    (window as unknown as Record<string, unknown>)[`terminal_${id}`] = {
      write,
      writeLine,
      clear,
    };
    return () => {
      delete (window as unknown as Record<string, unknown>)[`terminal_${id}`];
    };
  }, [id, write, writeLine, clear]);

  if (error) {
    return (
      <div
        className={`terminal-pane ${className}`}
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0a0a',
          color: '#ff5555',
          fontFamily: 'monospace',
        }}
      >
        Error: {error}
      </div>
    );
  }

  return (
    <div
      className={`terminal-pane ${className}`}
      style={{ height: '100%', width: '100%', position: 'relative' }}
    >
      {loading && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0a0a0a',
            color: '#8b949e',
            fontFamily: 'monospace',
            fontSize: '12px',
          }}
        >
          Loading terminal...
        </div>
      )}
      <div
        ref={containerRef}
        style={{
          height: '100%',
          width: '100%',
          padding: '4px',
          boxSizing: 'border-box',
          visibility: loading ? 'hidden' : 'visible',
        }}
      />
    </div>
  );
}

// Helper to get ANSI color code
function getColorCode(hex: string): string {
  const colors: Record<string, string> = {
    '#ff79c6': '35', // magenta/pink
    '#50fa7b': '32', // green
    '#bd93f9': '35', // purple
    '#ffb86c': '33', // orange
    '#8be9fd': '36', // cyan
    '#ff5555': '31', // red
    '#f1fa8c': '33', // yellow
    '#00ff00': '32', // green
  };
  return colors[hex.toLowerCase()] || '37';
}
