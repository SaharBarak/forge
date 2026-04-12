/**
 * Box drawing and separators for terminal panes.
 *
 * All functions are pure: they return ANSI strings. The caller writes them
 * to the appropriate xterm.js instance.
 */

import { forgeTheme, style } from './theme';

// ---- box drawing characters ----

export const BOX = {
  topLeft: '╭',
  topRight: '╮',
  bottomLeft: '╰',
  bottomRight: '╯',
  horizontal: '─',
  vertical: '│',
  cross: '┼',
  teeDown: '┬',
  teeUp: '┴',
  teeRight: '├',
  teeLeft: '┤',
} as const;

// ---- section separators ----

export const separator = (width: number, label?: string): string => {
  if (!label) {
    return style(forgeTheme.border.muted, BOX.horizontal.repeat(width)) + '\r\n';
  }
  const labelLen = label.length + 2; // space padding
  const remaining = Math.max(0, width - labelLen - 4);
  const left = BOX.horizontal.repeat(2);
  const right = BOX.horizontal.repeat(remaining);
  return (
    style(forgeTheme.border.muted, left) +
    ' ' +
    style(forgeTheme.border.accent, label) +
    ' ' +
    style(forgeTheme.border.muted, right) +
    '\r\n'
  );
};

// ---- code block frame ----

export const codeBlockTop = (language: string, width: number): string => {
  const labelPart = language ? ` ${language} ` : '';
  const lineLen = Math.max(0, width - labelPart.length - 2);
  return (
    style(forgeTheme.border.accent, BOX.topLeft + BOX.horizontal) +
    style(forgeTheme.text.muted, labelPart) +
    style(forgeTheme.border.accent, BOX.horizontal.repeat(lineLen)) +
    '\r\n'
  );
};

export const codeBlockBottom = (width: number): string =>
  style(forgeTheme.border.accent, BOX.bottomLeft + BOX.horizontal.repeat(width - 1)) + '\r\n';

// ---- agent message frame ----

export const agentHeader = (
  name: string,
  role: string,
  color: string,
  stance?: 'FOR' | 'AGAINST' | 'NEUTRAL'
): string => {
  const nameStr = style(`${forgeTheme.bold}${color}`, name);
  const roleStr = style(forgeTheme.text.muted, ` ${role}`);
  const stanceStr = stance
    ? ' ' + stanceBadge(stance)
    : '';
  return `${nameStr}${roleStr}${stanceStr}\r\n`;
};

const stanceBadge = (stance: 'FOR' | 'AGAINST' | 'NEUTRAL'): string => {
  const colors: Record<string, string> = {
    FOR: forgeTheme.consensus.agree,
    AGAINST: forgeTheme.consensus.disagree,
    NEUTRAL: forgeTheme.consensus.neutral,
  };
  return style(colors[stance], `[${stance}]`);
};

// ---- phase banner ----

export const phaseBanner = (phaseName: string, width: number): string => {
  const label = ` ${phaseName.toUpperCase()} `;
  const sideLen = Math.max(0, Math.floor((width - label.length) / 2));
  const side = '═'.repeat(sideLen);
  return (
    '\r\n' +
    style(forgeTheme.phase.separator, side) +
    style(forgeTheme.phase.label, label) +
    style(forgeTheme.phase.separator, side) +
    '\r\n\r\n'
  );
};
