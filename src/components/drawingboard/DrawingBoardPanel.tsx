/**
 * DrawingBoardPanel - ASCII wireframe side panel
 * Issue #59 — Drawing Board: TUI Side Panel Integration
 *
 * Watches shared/canvas.jsonl and renders ASCII wireframes in a
 * read-only xterm.js terminal panel. Toggleable via Ctrl+D.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { renderFromString } from '../../canvas/renderer';

interface DrawingBoardPanelProps {
  /** Path to the canvas JSONL file */
  canvasPath: string;
  /** Panel width in characters (default 40) */
  panelWidth?: number;
  /** Whether the panel is visible */
  visible: boolean;
}

export function DrawingBoardPanel({ canvasPath, panelWidth = 40, visible }: DrawingBoardPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [_error, setError] = useState<string | null>(null);

  // Render canvas content to the terminal
  const renderCanvas = useCallback(async () => {
    if (!terminalRef.current) return;

    try {
      const content = await window.electronAPI?.readFile?.(canvasPath);
      setError(null);

      if (!content || content.trim() === '') {
        terminalRef.current.clear();
        writeHeader(terminalRef.current, 'No canvas yet');
        return;
      }

      const ascii = renderFromString(content, panelWidth - 4);
      terminalRef.current.clear();
      writeHeader(terminalRef.current, new Date().toLocaleTimeString());
      setLastUpdate(new Date().toLocaleTimeString());

      // Write each line of the ASCII wireframe
      const lines = ascii.split('\n');
      for (const line of lines) {
        terminalRef.current.writeln(`  ${line}`);
      }
    } catch (err) {
      if (terminalRef.current) {
        terminalRef.current.clear();
        writeHeader(terminalRef.current, 'No canvas yet');
        setError(null); // File not found is normal
      }
    }
  }, [canvasPath, panelWidth]);

  // Initialize terminal
  useEffect(() => {
    if (!containerRef.current || !visible) return;

    const terminal = new Terminal({
      theme: {
        background: '#0d1117',
        foreground: '#8b949e',
        cursor: '#0d1117', // Hidden cursor
        cursorAccent: '#0d1117',
      },
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      fontSize: 11,
      lineHeight: 1.2,
      cursorBlink: false,
      scrollback: 500,
      convertEol: true,
      disableStdin: true,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(containerRef.current);
    fitAddon.fit();

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    writeHeader(terminal, 'No canvas yet');

    // Initial render
    renderCanvas();

    // Handle resize
    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, [visible, renderCanvas]);

  // Set up file watcher with debounce
  useEffect(() => {
    if (!visible) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let unwatchFn: (() => void) | null = null;

    const setupWatcher = async () => {
      try {
        // Use Electron's file watching API
        const unwatch = await window.electronAPI?.watchFile?.(canvasPath, () => {
          // Debounce re-renders at 200ms
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            renderCanvas();
          }, 200);
        });

        if (unwatch) {
          unwatchFn = unwatch;
        }
      } catch {
        // Fallback: poll every 2 seconds
        const interval = setInterval(renderCanvas, 2000);
        unwatchFn = () => clearInterval(interval);
      }
    };

    setupWatcher();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (unwatchFn) unwatchFn();
    };
  }, [visible, canvasPath, renderCanvas]);

  if (!visible) return null;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      borderLeft: '1px solid #30363d',
      backgroundColor: '#0d1117',
      minWidth: '300px',
      maxWidth: '500px',
      width: '40%',
    }}>
      {/* Panel Header */}
      <div style={{
        height: '20px',
        backgroundColor: '#161b22',
        borderBottom: '1px solid #30363d',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '2px 8px',
        fontSize: '11px',
        fontFamily: 'monospace',
      }}>
        <span style={{ color: '#f0883e' }}>🎨 CANVAS</span>
        {lastUpdate && (
          <span style={{ color: '#6e7681', fontSize: '10px' }}>
            {lastUpdate}
          </span>
        )}
      </div>

      {/* Terminal Container */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          padding: '4px',
          overflow: 'hidden',
        }}
      />

      {/* Panel Footer */}
      <div style={{
        height: '16px',
        backgroundColor: '#161b22',
        borderTop: '1px solid #30363d',
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
        fontSize: '10px',
        fontFamily: 'monospace',
        color: '#6e7681',
      }}>
        <span>Ctrl+D toggle │ Read-only</span>
      </div>
    </div>
  );
}

/** Write the panel header into the terminal */
function writeHeader(terminal: Terminal, info: string) {
  terminal.writeln('\x1b[1;33m┌────────────────────────────────────┐\x1b[0m');
  terminal.writeln('\x1b[1;33m│\x1b[0m \x1b[1m🎨 DRAWING BOARD\x1b[0m                  \x1b[1;33m│\x1b[0m');
  terminal.writeln(`\x1b[1;33m│\x1b[0m \x1b[2m${info.padEnd(34)}\x1b[0m \x1b[1;33m│\x1b[0m`);
  terminal.writeln('\x1b[1;33m└────────────────────────────────────┘\x1b[0m');
  terminal.writeln('');
}

export default DrawingBoardPanel;
