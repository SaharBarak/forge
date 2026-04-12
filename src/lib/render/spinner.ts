/**
 * Terminal spinner — braille dot animation for "thinking" states.
 *
 * Designed for xterm.js: uses ANSI cursor control to overwrite the spinner
 * line in-place. Caller drives the frame rate via `tick()`.
 *
 * Usage:
 *   const spinner = createSpinner();
 *   const interval = setInterval(() => {
 *     writeFn(spinner.tick('Thinking'));
 *   }, 80);
 *   // on complete:
 *   clearInterval(interval);
 *   writeFn(spinner.finish('Done'));
 */

import { forgeTheme, style } from './theme';

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'] as const;
const CLEAR_LINE = '\x1b[2K\r';

export interface Spinner {
  /** Advance one frame. Returns ANSI string to write. */
  readonly tick: (label: string) => string;
  /** Show completion mark. Returns ANSI string to write. */
  readonly finish: (label: string) => string;
  /** Show failure mark. Returns ANSI string to write. */
  readonly fail: (label: string) => string;
  /** Current frame index (0-9). */
  readonly frame: () => number;
}

export const createSpinner = (): Spinner => {
  let idx = 0;

  const tick = (label: string): string => {
    const frame = FRAMES[idx % FRAMES.length];
    idx++;
    return `${CLEAR_LINE}${style(forgeTheme.spinner.active, frame)} ${style(forgeTheme.text.muted, label)}`;
  };

  const finish = (label: string): string =>
    `${CLEAR_LINE}${style(forgeTheme.spinner.done, '✔')} ${label}\r\n`;

  const fail = (label: string): string =>
    `${CLEAR_LINE}${style(forgeTheme.spinner.failed, '✘')} ${label}\r\n`;

  const frame = (): number => idx % FRAMES.length;

  return { tick, finish, fail, frame };
};
