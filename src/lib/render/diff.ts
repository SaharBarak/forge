/**
 * Unified diff rendering for the terminal.
 *
 * Parses unified-diff-format hunks and renders them with semantic colors
 * (green for +, red for -, dim for context) in a framed section. Used when
 * tools edit files, when proposals get revised, or when comparing two
 * versions of a contribution.
 */

import { forgeTheme, style } from './theme';

export interface DiffStats {
  readonly added: number;
  readonly removed: number;
  readonly context: number;
}

/**
 * Render a raw unified-diff string as a colored ANSI block.
 *
 *   ╭─ DIFF · file.ts · +3 -2 ──────────────────
 *   │ @@ -10,7 +10,8 @@
 *   │   const x = 1;
 *   │ - const y = 2;
 *   │ + const y = 3;
 *   │ + const z = 4;
 *   ╰─
 */
export const renderDiff = (
  diffText: string,
  opts: { readonly filePath?: string; readonly title?: string } = {}
): string => {
  const border = forgeTheme.border.accent;
  const label = forgeTheme.text.emphasis;

  const stats = countDiffStats(diffText);
  const titleParts = [
    'DIFF',
    opts.filePath ?? opts.title ?? 'unified',
    `+${stats.added} -${stats.removed}`,
  ];
  const title = titleParts.join(' · ');
  const headerLen = Math.max(0, 60 - title.length - 4);
  const header =
    style(border, '╭─ ') +
    style(`${forgeTheme.bold}${label}`, title) +
    style(border, ` ${'─'.repeat(headerLen)}`) +
    '\n';

  const lines = diffText.split('\n');
  const body = lines
    .map((line) => {
      const prefix = style(border, '│ ');
      if (line.startsWith('+') && !line.startsWith('+++')) {
        return prefix + style(forgeTheme.diff.added, line);
      }
      if (line.startsWith('-') && !line.startsWith('---')) {
        return prefix + style(forgeTheme.diff.removed, line);
      }
      if (line.startsWith('@@')) {
        return prefix + style(forgeTheme.text.emphasis, line);
      }
      if (line.startsWith('+++') || line.startsWith('---')) {
        return prefix + style(forgeTheme.text.muted, line);
      }
      return prefix + style(forgeTheme.diff.context, line);
    })
    .join('\n');

  const footer = '\n' + style(border, `╰${'─'.repeat(60)}`) + '\n';
  return header + body + footer;
};

/**
 * Count added/removed/context lines in a unified diff.
 */
export const countDiffStats = (diffText: string): DiffStats => {
  let added = 0;
  let removed = 0;
  let context = 0;
  for (const line of diffText.split('\n')) {
    if (line.startsWith('+') && !line.startsWith('+++')) added++;
    else if (line.startsWith('-') && !line.startsWith('---')) removed++;
    else if (line.startsWith(' ')) context++;
  }
  return { added, removed, context };
};

/**
 * Build a minimal unified diff from two strings (naive line-based). Good
 * for showing "before vs after" in proposals; not as sophisticated as a
 * real diff algorithm (no Myers, no move detection), but sufficient for
 * terminal display.
 */
export const buildSimpleDiff = (before: string, after: string): string => {
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');
  const max = Math.max(beforeLines.length, afterLines.length);

  const hunks: string[] = ['--- before', '+++ after', `@@ -1,${beforeLines.length} +1,${afterLines.length} @@`];
  for (let i = 0; i < max; i++) {
    const b = beforeLines[i];
    const a = afterLines[i];
    if (b === a) {
      if (b !== undefined) hunks.push(' ' + b);
    } else {
      if (b !== undefined) hunks.push('-' + b);
      if (a !== undefined) hunks.push('+' + a);
    }
  }
  return hunks.join('\n');
};
