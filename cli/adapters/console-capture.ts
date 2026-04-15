/**
 * console-capture — silence stdout/stderr logs while an Ink TUI is mounted.
 *
 * Ink re-renders its entire render tree whenever anything else writes to
 * stdout. Forge has ~50 console.log/error calls scattered across
 * FloorManager, AgentListener, EDAOrchestrator, and MessageBus — every
 * agent turn, floor grant, or research halt fires one, and each write
 * forces Ink to clear-and-redraw. The user sees flickering.
 *
 * Fix: replace console.log / error / warn with a file-backed logger for
 * the duration of the session, then restore on unmount. The transcript
 * and messages.jsonl already capture the important content; these logs
 * were developer-trace anyway.
 */

import * as fs from 'fs';
import * as path from 'path';

type ConsoleMethod = 'log' | 'warn' | 'error' | 'info' | 'debug';

interface CapturedConsole {
  restore: () => void;
  logPath: string;
}

const METHODS: readonly ConsoleMethod[] = ['log', 'warn', 'error', 'info', 'debug'];

/**
 * Redirect all console.* output to `<logDir>/session.log` until the
 * returned `restore()` is called. Safe to call multiple times; later
 * calls no-op until the previous capture is restored.
 */
export function captureConsoleToFile(logDir: string): CapturedConsole {
  try {
    fs.mkdirSync(logDir, { recursive: true });
  } catch {}
  const logPath = path.join(logDir, 'session.log');
  const stream = fs.createWriteStream(logPath, { flags: 'a' });

  const originals: Partial<Record<ConsoleMethod, (...args: unknown[]) => void>> = {};

  const writeLine = (level: ConsoleMethod, args: unknown[]): void => {
    try {
      const ts = new Date().toISOString();
      const rendered = args
        .map((a) => {
          if (a instanceof Error) return `${a.message}\n${a.stack ?? ''}`;
          if (typeof a === 'string') return a;
          try {
            return JSON.stringify(a);
          } catch {
            return String(a);
          }
        })
        .join(' ');
      stream.write(`${ts} [${level}] ${rendered}\n`);
    } catch {
      // swallow — never let logging break the TUI
    }
  };

  for (const m of METHODS) {
    originals[m] = console[m];
    console[m] = (...args: unknown[]) => writeLine(m, args);
  }

  return {
    logPath,
    restore: () => {
      for (const m of METHODS) {
        const orig = originals[m];
        if (orig) console[m] = orig as typeof console.log;
      }
      try {
        stream.end();
      } catch {}
    },
  };
}
