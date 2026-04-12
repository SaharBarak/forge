/**
 * Progress bars and sparklines using Unicode block characters.
 *
 * Fractional blocks give sub-cell precision in the terminal:
 *   ▏▎▍▌▋▊▉█  (1/8 increments)
 *
 * Sparklines use vertical blocks for mini-charts:
 *   ▁▂▃▄▅▆▇█  (1/8 height increments)
 */

import { forgeTheme, style } from './theme';

const FRACTIONAL_BLOCKS = ['', '▏', '▎', '▍', '▌', '▋', '▊', '▉', '█'] as const;
const SPARKLINE_CHARS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'] as const;

// ---- progress bar ----

/**
 * Render a progress bar of `width` cells showing `ratio` (0–1) completion.
 * Optionally split into two colored segments (e.g. agree/disagree).
 */
export const progressBar = (
  ratio: number,
  width: number,
  color: string = forgeTheme.status.success
): string => {
  const clamped = Math.max(0, Math.min(1, ratio));
  const totalEighths = Math.round(clamped * width * 8);
  const fullBlocks = Math.floor(totalEighths / 8);
  const remainder = totalEighths % 8;

  const filled = '█'.repeat(fullBlocks) + (remainder > 0 ? FRACTIONAL_BLOCKS[remainder] : '');
  const emptyLen = Math.max(0, width - fullBlocks - (remainder > 0 ? 1 : 0));
  const empty = '░'.repeat(emptyLen);

  return style(color, filled) + style(forgeTheme.text.muted, empty);
};

// ---- dual progress bar (agree vs disagree) ----

export const dualProgressBar = (
  agreeRatio: number,
  disagreeRatio: number,
  width: number
): string => {
  const total = agreeRatio + disagreeRatio || 1;
  const agreeWidth = Math.round((agreeRatio / total) * width);
  const disagreeWidth = width - agreeWidth;

  const agreeBar = '█'.repeat(agreeWidth);
  const disagreeBar = '█'.repeat(disagreeWidth);

  return (
    style(forgeTheme.consensus.agree, agreeBar) +
    style(forgeTheme.consensus.disagree, disagreeBar)
  );
};

// ---- sparkline ----

/**
 * Render a sparkline from an array of values. Auto-scales to min/max.
 */
export const sparkline = (
  values: ReadonlyArray<number>,
  color: string = forgeTheme.status.info
): string => {
  if (values.length === 0) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const chars = values
    .map((v) => {
      const idx = Math.round(((v - min) / range) * (SPARKLINE_CHARS.length - 1));
      return SPARKLINE_CHARS[Math.max(0, Math.min(SPARKLINE_CHARS.length - 1, idx))];
    })
    .join('');

  return style(color, chars);
};

// ---- attestation strength dots ----

export const attestationDots = (count: number, max: number = 5): string => {
  const filled = Math.min(count, max);
  const empty = max - filled;
  return (
    style(forgeTheme.consensus.agree, '●'.repeat(filled)) +
    style(forgeTheme.text.muted, '○'.repeat(empty))
  );
};

// ---- percentage label ----

export const percentLabel = (ratio: number): string => {
  const pct = Math.round(ratio * 100);
  const color =
    pct >= 75
      ? forgeTheme.status.success
      : pct >= 40
        ? forgeTheme.status.warning
        : forgeTheme.status.error;
  return style(color, `${pct}%`);
};
