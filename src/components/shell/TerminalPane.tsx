/**
 * TerminalPane - xterm.js wrapper for terminal-style panes
 */

import { useEffect, useRef, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

interface TerminalPaneProps {
  id: string;
  title: string;
  color?: string;
  onInput?: (data: string) => void;
  className?: string;
}

export function TerminalPane({ id, title, color = '#00ff00', onInput, className = '' }: TerminalPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  // Write to terminal
  const write = useCallback((text: string) => {
    if (terminalRef.current) {
      terminalRef.current.write(text);
    }
  }, []);

  const writeLine = useCallback((text: string) => {
    if (terminalRef.current) {
      terminalRef.current.writeln(text);
    }
  }, []);

  const clear = useCallback(() => {
    if (terminalRef.current) {
      terminalRef.current.clear();
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create terminal
    const terminal = new Terminal({
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
    const fitAddon = new FitAddon();
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
      fitAddon.fit();
    };
    window.addEventListener('resize', handleResize);

    // Write title
    terminal.writeln(`\x1b[1;36m┌${'─'.repeat(40)}┐\x1b[0m`);
    terminal.writeln(`\x1b[1;36m│\x1b[0m \x1b[1;${getColorCode(color)}m${title.padEnd(38)}\x1b[0m \x1b[1;36m│\x1b[0m`);
    terminal.writeln(`\x1b[1;36m└${'─'.repeat(40)}┘\x1b[0m`);
    terminal.writeln('');

    return () => {
      window.removeEventListener('resize', handleResize);
      terminal.dispose();
    };
  }, [id, title, color, onInput]);

  // Expose methods via ref
  useEffect(() => {
    (window as any)[`terminal_${id}`] = {
      write,
      writeLine,
      clear,
    };
    return () => {
      delete (window as any)[`terminal_${id}`];
    };
  }, [id, write, writeLine, clear]);

  return (
    <div className={`terminal-pane ${className}`} style={{ height: '100%', width: '100%' }}>
      <div
        ref={containerRef}
        style={{
          height: '100%',
          width: '100%',
          padding: '4px',
          boxSizing: 'border-box',
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

export type TerminalPaneHandle = {
  write: (text: string) => void;
  writeLine: (text: string) => void;
  clear: () => void;
};
